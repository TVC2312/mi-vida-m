/* Recuerdos: tarjetas que se voltean. Tabla "memories". */
import { supabase } from '../supabase.js';
import { $, h, svgUse, formatDate, emptyEl, observeReveal } from '../ui.js';
import { hydrateImages } from '../media.js';

export async function init() {
  const grid = $('#memory-grid');
  grid.replaceChildren(emptyEl('Cargando recuerdos…'));
  try {
    const { data, error } = await supabase.from('memories').select('*')
      .order('happened_on', { ascending: true, nullsFirst: false }).order('sort_order', { ascending: true });
    if (error) throw error;
    if (!data.length) { grid.replaceChildren(emptyEl('Estoy juntando recuerdos para vos.')); return; }

    grid.replaceChildren(...data.map((m, n) => {
      const date = m.happened_on ? formatDate(m.happened_on) : '';
      const btn = h('button', {
        type: 'button', class: 'flip reveal', 'aria-pressed': 'false',
        style: `--delay:${Math.min(n % 4, 3) * 0.08}s`,
        'aria-label': `${m.title}. Tocá para dar vuelta la tarjeta.`,
      },
        h('span', { class: 'flip__inner' },
          h('span', { class: 'face face--front' },
            h('span', { class: 'face__photo protect' },
              m.photo_path
                ? h('img', { alt: m.photo_alt || '', loading: 'lazy', decoding: 'async', draggable: 'false', 'data-path': m.photo_path })
                : svgUse('sunflower-head')),
            h('span', { class: 'face__body' },
              date ? h('span', { class: 'face__date' }, date) : null,
              h('h3', {}, m.title),
              h('span', { class: 'face__hint' }, 'Tocá para leer más'))),
          h('span', { class: 'face face--back' },
            date ? h('span', { class: 'face__date' }, date) : null,
            h('h3', {}, m.title),
            h('span', { class: 'face__text' }, m.body || ''))),
      );
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
      });
      return btn;
    }));
    hydrateImages(grid);
    observeReveal(grid);
  } catch (e) {
    console.warn('memories:', e.message);
    grid.replaceChildren(emptyEl('No pude cargar los recuerdos. Probá recargar la página.'));
  }
}

export function reset() { $('#memory-grid').replaceChildren(); }
