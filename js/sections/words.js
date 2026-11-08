/* Mis palabras para vos: notitas sueltas. Tabla "words" (kind = frase | amo | razon). */
import { supabase } from '../supabase.js';
import { $, h, emptyEl, observeReveal } from '../ui.js';

const KINDS = { frase: 'Una frase', amo: 'Algo que amo de vos', razon: 'Una razón por la que te elijo' };
let all = [];
let current = null;

function render() {
  const box = $('#notes');
  const list = all.filter((w) => !current || w.kind === current);
  box.replaceChildren(...list.map((w, n) => h('article', {
    class: `note note--${['a', 'b', 'c'][n % 3]} reveal`,
    style: `--rot:${((n * 37) % 5 - 2) * 0.9}deg; --delay:${(n % 4) * 0.07}s`,
  }, w.body, h('span', { class: 'note__kind' }, KINDS[w.kind] || ''))));
  observeReveal(box);
}

function chips() {
  const el = $('#notes-chips');
  const kinds = [...new Set(all.map((w) => w.kind))].filter((k) => KINDS[k]);
  if (kinds.length < 2) { el.hidden = true; return; }
  el.hidden = false;
  const mk = (text, val) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(current === val),
    onclick: () => { current = val; chips(); render(); },
  }, text);
  el.replaceChildren(mk('Todas', null), ...kinds.map((k) => mk(KINDS[k], k)));
}

export async function init() {
  const box = $('#notes');
  box.replaceChildren(emptyEl('Cargando…'));
  try {
    const { data, error } = await supabase.from('words').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) throw error;
    all = data || [];
    if (!all.length) { box.replaceChildren(emptyEl('Estoy escribiendo estas notitas para vos.')); return; }
    chips(); render();
  } catch (e) {
    console.warn('words:', e.message);
    box.replaceChildren(emptyEl('No pude cargar esta parte. Probá recargar la página.'));
  }
}

export function reset() { all = []; current = null; $('#notes').replaceChildren(); $('#notes-chips').replaceChildren(); $('#notes-chips').hidden = true; }
