/* ==========================================================================
   Punto de entrada. Reglas de oro:
   1) Sin sesión no se pide NADA a Supabase ni se dibuja contenido.
   2) Al cerrar sesión se vacía todo el contenido de la página.
   ========================================================================== */
import { supabase } from './supabase.js';
import { initAuth, logout, setLoginInfo } from './auth.js';
import { state } from './state.js';
import { $, startPetals, observeReveal, toast } from './ui.js';
import { clearMediaCache } from './media.js';
import { initNav, resetNav } from './nav.js';
import * as home from './sections/home.js';
import * as timeline from './sections/timeline.js';
import * as gallery from './sections/gallery.js';
import * as lightbox from './sections/lightbox.js';
import * as videos from './sections/videos.js';
import * as memories from './sections/memories.js';
import * as words from './sections/words.js';
import * as letter from './sections/letter.js';
import * as quiz from './sections/quiz.js';

const loginScreen = $('#login-screen');
const app = $('#app');
const veil = $('#veil');

function showLogin(message = '') {
  app.hidden = true;
  veil.hidden = true;
  loginScreen.hidden = false;
  document.body.classList.remove('is-locked', 'no-scroll');
  document.title = 'Para vos';
  setLoginInfo(message);
  window.scrollTo(0, 0);
}

async function loadSettings() {
  const { data, error } = await supabase.from('site_settings').select('key,value');
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
}

async function enterApp() {
  loginScreen.hidden = true;
  veil.hidden = false;
  document.body.classList.remove('is-locked');

  try {
    state.settings = await loadSettings();
  } catch (e) {
    console.warn('No se pudieron leer los ajustes:', e.message);
    state.settings = {};
    toast('No pude cargar todo. Probá recargar la página.');
  }

  document.title = state.settings.her_name ? `${state.settings.her_name} · Para vos` : 'Para vos';
  app.hidden = false;
  initNav(() => logout());
  home.init();                         // portada y contador
  veil.hidden = true;                  // el resto se carga mientras ella ya está mirando la portada

  await Promise.allSettled([
    timeline.init(), gallery.init(), videos.init(), memories.init(), words.init(), letter.init(), quiz.init(),
  ]);
  observeReveal(app);

  // Si entró con un #ancla (por ejemplo #fotos), la llevamos ahí cuando ya hay contenido
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

function leaveApp(message) {
  lightbox.close();
  videos.closePlayer();
  [home, timeline, gallery, videos, memories, words, letter, quiz].forEach((m) => m.reset());
  resetNav();
  clearMediaCache();
  state.settings = {};
  history.replaceState(null, '', location.pathname + location.search);
  showLogin(message);
}

// Sin menú contextual sobre imágenes y videos (frena el "guardar imagen" casual; no evita capturas)
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('img, video, .protect')) e.preventDefault();
});

async function boot() {
  startPetals();
  // Cualquier cierre de sesión (manual, por inactividad, por vencimiento o sin configurar) pasa por leaveApp.
  await initAuth({
    onLogin: () => enterApp(),
    onLogout: (message) => leaveApp(message),
  });
}

boot();
