/* La carta: sobre que se abre y papel con letra manuscrita. Tabla "letters" (se muestra la más reciente publicada). */
import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { $, h, svgUse, emptyEl } from '../ui.js';

const NS = 'http://www.w3.org/2000/svg';

function envelopeSvg() {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 300 200');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `
    <rect x="6" y="20" width="288" height="174" rx="10" class="fill-butter ink-line"/>
    <path d="M8 188 150 98 292 188" class="fill-none ink-line"/>
    <g class="envelope__flap"><path d="M6 24 150 118 294 24Z" class="fill-sun ink-line"/></g>
    <g class="envelope__seal"><circle cx="150" cy="118" r="17" class="fill-cream ink-line"/><path d="M150 128s-9-5.600-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.400-9 12-9 12Z" class="fill-violet"/></g>`;
  return s;
}

export async function init() {
  const root = $('#letter-root');
  root.replaceChildren(emptyEl('Cargando la carta…'));
  try {
    const { data, error } = await supabase.from('letters').select('*')
      .eq('published', true).order('created_at', { ascending: false }).limit(1);
    if (error) throw error;
    const l = data?.[0];
    if (!l) { root.replaceChildren(emptyEl('La carta se está escribiendo. Pronto.')); return; }

    const env = h('button', { type: 'button', class: 'envelope', 'aria-expanded': 'false', 'aria-controls': 'letter-paper', 'aria-label': 'Abrir la carta' }, envelopeSvg());
    const hint = h('p', { class: 'letter__hint' }, 'Tocá el sobre para abrirlo');
    const paragraphs = (l.body || '').split(/\n{2,}/).map((t) => h('p', {}, t.trim())).filter((p) => p.textContent);
    const paper = h('article', { class: 'paper', id: 'letter-paper' },
      l.title ? h('h3', {}, l.title) : null,
      paragraphs,
      h('p', { class: 'paper__sign' }, l.signature || state.settings.signature || '', svgUse('heart-violet')));
    const close = h('button', { type: 'button', class: 'btn btn--small btn--ghost letter__close', hidden: true }, 'Guardar la carta');
    const wrap = h('div', { class: 'letter__wrap' }, h('div', { class: 'letter__clip' }, paper));

    root.className = 'letter';
    root.replaceChildren(env, hint, wrap, close);

    const set = (open) => {
      root.classList.toggle('is-open', open);
      env.setAttribute('aria-expanded', String(open));
      env.setAttribute('aria-label', open ? 'Cerrar la carta' : 'Abrir la carta');
      hint.hidden = open;
      close.hidden = !open;
      if (open) setTimeout(() => paper.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    };
    env.addEventListener('click', () => set(!root.classList.contains('is-open')));
    close.addEventListener('click', () => { set(false); env.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  } catch (e) {
    console.warn('letter:', e.message);
    root.replaceChildren(emptyEl('No pude cargar la carta. Probá recargar la página.'));
  }
}

export function reset() { const r = $('#letter-root'); r.className = 'letter'; r.replaceChildren(); }
