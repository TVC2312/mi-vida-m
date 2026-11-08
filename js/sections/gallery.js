/* ==========================================================================
   Galería: mosaico (masonry), orden, agrupado por año/mes, filtros y lazy loading.
   Tabla "photos": storage_path (original comprimida), thumb_path (miniatura),
   taken_at (fecha de captura), caption, album, tags[], width, height.
   ========================================================================== */
import { supabase } from '../supabase.js';
import { $, h, formatShort, monthName, emptyEl, observeReveal } from '../ui.js';
import { hydrateImages } from '../media.js';
import * as lightbox from './lightbox.js';

let photos = [];
let view = [];                                    // lo que se ve ahora (en el orden mostrado)
const f = { sort: 'asc', group: true, album: null, tag: null };
let resizeTimer = null;
let cols = 0;
let bound = false;

const colCount = () => (window.innerWidth >= 1000 ? 4 : window.innerWidth >= 640 ? 3 : 2);

/** Reparte las fotos en columnas, siempre en la más baja (conserva el orden de lectura aproximado). */
function masonry(list) {
  const n = colCount();
  const columns = Array.from({ length: n }, () => ({ el: h('div', { class: 'masonry__col' }), height: 0 }));
  list.forEach((p, i) => {
    const target = columns.reduce((a, b) => (b.height < a.height ? b : a));
    const ratio = p.width && p.height ? p.height / p.width : 0.75;
    target.height += ratio;
    target.el.append(card(p, i));
  });
  return h('div', { class: 'masonry' }, columns.map((c) => c.el));
}

function card(p) {
  const idx = view.indexOf(p);
  const date = p.taken_at ? formatShort(p.taken_at) : '';
  const btn = h('button', {
    type: 'button', class: 'photo protect',
    'aria-label': `Ver foto${p.caption ? ': ' + p.caption : ''}${date ? ', ' + date : ''}`,
    onclick: () => lightbox.open(view, idx),
  },
    h('img', {
      alt: p.caption || (date ? `Foto del ${date}` : 'Foto nuestra'),
      loading: 'lazy', decoding: 'async', draggable: 'false',
      'data-path': p.thumb_path || p.storage_path,
      width: p.width || null, height: p.height || null,
    }),
    date ? h('span', { class: 'photo__date' }, date) : null,
  );
  return btn;
}

function filtered() {
  let list = photos.filter((p) => (!f.album || p.album === f.album) && (!f.tag || (p.tags || []).includes(f.tag)));
  const dir = f.sort === 'asc' ? 1 : -1;
  list = [...list].sort((a, b) => dir * (new Date(a.taken_at || 0) - new Date(b.taken_at || 0)));
  return list;
}

function render() {
  const root = $('#gallery');
  view = filtered();
  cols = colCount();
  $('#gallery-count').textContent = `${view.length} ${view.length === 1 ? 'foto' : 'fotos'}`;
  $('#sort-label').textContent = f.sort === 'asc' ? 'De las primeras a las últimas' : 'De las últimas a las primeras';

  if (!view.length) { root.replaceChildren(emptyEl('No hay fotos con ese filtro todavía.')); return; }

  if (!f.group) { root.replaceChildren(masonry(view)); hydrateImages(root); return; }

  // Agrupar por año → mes
  const years = new Map();
  for (const p of view) {
    const d = p.taken_at ? new Date(p.taken_at) : null;
    const y = d ? d.getFullYear() : 'Sin fecha';
    const m = d ? d.getMonth() : -1;
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y);
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(p);
  }
  const blocks = [];
  for (const [y, months] of years) {
    const g = h('section', { class: 'gallery__group' }, h('h3', { class: 'gallery__year' }, String(y)));
    for (const [m, list] of months) {
      if (m >= 0) g.append(h('h4', { class: 'gallery__month' }, monthName(new Date(2000, m, 1))));
      g.append(masonry(list));
    }
    blocks.push(g);
  }
  root.replaceChildren(...blocks);
  hydrateImages(root);
}

function chipRow(el, label, values, key) {
  el.replaceChildren();
  if (!values.length) { el.hidden = true; return; }
  el.hidden = false;
  const mk = (text, val) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(f[key] === val),
    onclick: () => { f[key] = val; chipRow(el, label, values, key); render(); },
  }, text);
  el.append(mk(`Todas (${label})`, null), ...values.map((v) => mk(v, v)));
}

export async function init() {
  const root = $('#gallery');
  root.replaceChildren(emptyEl('Cargando fotos…'));
  try {
    const { data, error } = await supabase.from('photos').select('*').order('taken_at', { ascending: true });
    if (error) throw error;
    photos = data || [];
    if (!photos.length) { root.replaceChildren(emptyEl('Todavía no hay fotos acá. Muy pronto vas a ver muchas.')); return; }

    $('#gallery-tools').hidden = false;
    chipRow($('#album-chips'), 'álbumes', [...new Set(photos.map((p) => p.album).filter(Boolean))].sort(), 'album');
    chipRow($('#tag-chips'), 'etiquetas', [...new Set(photos.flatMap((p) => p.tags || []))].sort(), 'tag');

    if (!bound) {
      bound = true;
      $('#sort-btn').addEventListener('click', () => { f.sort = f.sort === 'asc' ? 'desc' : 'asc'; render(); });
      $('#group-toggle').addEventListener('change', (e) => { f.group = e.target.checked; render(); });
      // Si cambia la cantidad de columnas (girar el celu), reacomodamos
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (photos.length && colCount() !== cols) render(); }, 200);
      });
    }
    render();
    observeReveal($('#gallery-tools').parentElement);
  } catch (e) {
    console.warn('gallery:', e.message);
    root.replaceChildren(emptyEl('No pude cargar las fotos. Probá recargar la página.'));
  }
}

export function reset() {
  photos = []; view = [];
  Object.assign(f, { sort: 'asc', group: true, album: null, tag: null });
  $('#gallery').replaceChildren();
  $('#album-chips').replaceChildren();
  $('#tag-chips').replaceChildren();
  $('#gallery-tools').hidden = true;
  $('#group-toggle').checked = true;
}
