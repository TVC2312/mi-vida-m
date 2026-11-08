/* ==========================================================================
   Login, cierre de sesión y expiración.
   - Supabase Auth (email + contraseña). No hay registro público.
   - Además de la expiración propia de Supabase (el token dura ~1 hora y se renueva),
     cerramos la sesión por inactividad y por tiempo máximo (ver config.js).
   ========================================================================== */
import { supabase } from './supabase.js';
import { CONFIG, isConfigured } from './config.js';
import { $ } from './ui.js';

const K_LOGIN = 'jardin_login_at';
const K_ACTIVE = 'jardin_last_active';

const store = {
  get: (k) => { try { const v = localStorage.getItem(k); return v == null ? null : Number(v); } catch { return undefined; } },
  set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* modo privado: sin política local */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* nada */ } },
};

let authed = false;
let handlers = { onLogin() {}, onLogout() {} };
let watchTimer = null;
let lastWrite = 0;

/** Devuelve el motivo si la sesión ya no es válida según nuestra política, o null si está bien. */
function expiredReason() {
  const login = store.get(K_LOGIN), active = store.get(K_ACTIVE), t = Date.now();
  if (login === undefined || active === undefined) return null;          // sin localStorage: no podemos medir
  if (login === null || active === null) return 'missing';
  if (t - login > CONFIG.SESSION_MAX_HOURS * 3600e3) return 'max';
  if (t - active > CONFIG.INACTIVITY_MINUTES * 60e3) return 'idle';
  return null;
}

const REASON_TEXT = {
  idle: 'Cerramos tu sesión por inactividad. Volvé a entrar cuando quieras.',
  max: 'Tu sesión venció por seguridad. Volvé a entrar.',
  missing: 'Volvé a entrar para continuar.',
  expired: 'Tu sesión venció. Volvé a entrar.',
  manual: 'Cerraste sesión. ¡Hasta pronto!',
};

function markActivity() {
  if (!authed) return;
  const t = Date.now();
  if (t - lastWrite < 15000) return;          // no escribimos en cada movimiento
  lastWrite = t;
  store.set(K_ACTIVE, t);
}

function startWatch() {
  lastWrite = 0;
  markActivity();
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, markActivity, { passive: true, capture: true }));
  // Mirar un video también cuenta como actividad
  ['play', 'timeupdate'].forEach((ev) => document.addEventListener(ev, markActivity, true));
  document.addEventListener('visibilitychange', checkPolicy);
  watchTimer = setInterval(checkPolicy, 30000);
}

function stopWatch() {
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) =>
    window.removeEventListener(ev, markActivity, { capture: true }));
  ['play', 'timeupdate'].forEach((ev) => document.removeEventListener(ev, markActivity, true));
  document.removeEventListener('visibilitychange', checkPolicy);
  clearInterval(watchTimer);
}

async function checkPolicy() {
  if (!authed) return;
  const reason = expiredReason();
  if (reason) { await supabase.auth.signOut({ scope: 'local' }); leave(reason); }
}

/** Limpia todo y avisa a la app. Es idempotente. */
function leave(reason) {
  if (!authed) return;
  authed = false;
  stopWatch();
  store.del(K_LOGIN); store.del(K_ACTIVE);
  handlers.onLogout(REASON_TEXT[reason] || '');
}

export async function logout() {
  try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* igual cerramos la vista */ }
  leave('manual');
}

function friendlyError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (error?.status === 429 || msg.includes('rate limit') || msg.includes('too many'))
    return 'Hiciste varios intentos seguidos. Esperá un ratito y probá de nuevo.';
  if (msg.includes('not confirmed'))
    return 'Tu usuario todavía no está activado. Avisale a quien lo creó.';
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || error?.status === 400)
    return 'Mmm, esos datos no coinciden. Revisalos y probá de nuevo, sin apuro.';
  if (msg.includes('fetch') || msg.includes('network') || !error?.status)
    return 'No pude conectarme. Revisá tu internet y probá de nuevo.';
  return 'Algo salió mal. Probá de nuevo en un momento.';
}

export function setLoginInfo(text) {
  const el = $('#login-hint');
  el.textContent = text || '';
  el.hidden = !text;
}

export async function initAuth(cb) {
  handlers = cb;
  const form = $('#login-form');
  const errBox = $('#login-error');
  const submit = $('#login-submit');

  // Mostrar / ocultar contraseña
  const pwd = $('#login-password');
  const toggle = $('#toggle-password');
  toggle.addEventListener('click', () => {
    const show = pwd.type === 'password';
    pwd.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggle.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
  });

  // Pista opcional (pública, ver config.js)
  const hintBtn = $('#hint-btn');
  if (CONFIG.PASSWORD_HINT) {
    hintBtn.hidden = false;
    hintBtn.addEventListener('click', () => setLoginInfo('Pista: ' + CONFIG.PASSWORD_HINT));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    if (!isConfigured()) {
      errBox.textContent = 'Falta configurar Supabase: completá la URL y la anon key en js/config.js.';
      return;
    }
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) { errBox.textContent = 'Completá tu mail y tu contraseña.'; return; }

    submit.disabled = true;
    submit.textContent = 'Entrando…';
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const t = Date.now();
      store.set(K_LOGIN, t); store.set(K_ACTIVE, t);
      authed = true;
      startWatch();
      form.password.value = '';
      setLoginInfo('');
      handlers.onLogin(data.session);
    } catch (err) {
      errBox.textContent = friendlyError(err);
      pwd.select();
    } finally {
      submit.disabled = false;
      submit.textContent = 'Entrar';
    }
  });

  if (!isConfigured()) { handlers.onLogout(''); return; }

  // Si Supabase cierra la sesión por su cuenta (por ejemplo, no pudo renovar el token)
  supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') leave('expired'); });

  // ¿Ya había una sesión abierta en este navegador?
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { handlers.onLogout(''); return; }
  authed = true;
  const reason = expiredReason();
  if (reason) { await supabase.auth.signOut({ scope: 'local' }); leave(reason); return; }
  startWatch();
  handlers.onLogin(session);
}
