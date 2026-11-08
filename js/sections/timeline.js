/* Nuestra historia: línea de tiempo vertical. Los hitos vienen de la tabla "milestones". */
import { supabase } from '../supabase.js';
import { $, h, svgUse, formatDate, emptyEl, observeReveal } from '../ui.js';
import { hydrateImages } from '../media.js';

export async function init() {
  const ol = $('#timeline');
  ol.replaceChildren(emptyEl('Cargando nuestra historia…', 'li'));
  try {
    const { data, error } = await supabase
      .from('milestones').select('*')
      .order('happened_on', { ascending: true }).order('sort_order', { ascending: true });
    if (error) throw error;
    if (!data.length) { ol.replaceChildren(emptyEl('Estoy ordenando los momentos importantes. Vuelvo pronto.', 'li')); return; }

    ol.replaceChildren(...data.map((m) => h('li', { class: 'tl-item reveal' },
      svgUse('sunflower-head', 'tl-item__dot'),
      h('article', { class: 'tl-card' },
        h('time', { class: 'tl-date', datetime: m.happened_on }, formatDate(m.happened_on)),
        h('h3', {}, m.title),
        m.body ? h('p', {}, m.body) : null,
        m.photo_path
          ? h('figure', { class: 'tl-photo protect' },
              h('img', { alt: m.photo_alt || m.title, loading: 'lazy', decoding: 'async', draggable: 'false', 'data-path': m.photo_path }))
          : null,
      ),
    )));
    hydrateImages(ol);
    observeReveal(ol);
  } catch (e) {
    console.warn('timeline:', e.message);
    ol.replaceChildren(emptyEl('No pude cargar esta parte. Probá recargar la página.', 'li'));
  }
}

export function reset() { $('#timeline').replaceChildren(); }
