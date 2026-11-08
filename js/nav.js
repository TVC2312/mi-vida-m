/* Navegación: resalta la sección actual y maneja el menú "Más" del celular. */
import { $, $$ } from './ui.js';

let bound = false;
let spy = null;

export function initNav(onLogout) {
  // Cerrar sesión (menú, barra y cierre)
  $$('.js-logout').forEach((b) => { if (!b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', onLogout); } });

  const sheet = $('#more-sheet');
  const btn = $('#more-btn');
  const setSheet = (open) => {
    sheet.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };

  if (!bound) {
    bound = true;
    btn.addEventListener('click', () => setSheet(sheet.hidden));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a, button')) setSheet(false); });
    document.addEventListener('pointerdown', (e) => {
      if (!sheet.hidden && !e.target.closest('#more-sheet, #more-btn')) setSheet(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sheet.hidden) { setSheet(false); btn.focus(); }
    });
  }

  // Scroll-spy: marca con aria-current el enlace de la sección visible
  spy?.disconnect();
  spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      $$('[data-nav]').forEach((a) => {
        if (a.dataset.nav === id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      // "Más" se resalta cuando la sección activa vive dentro de ese menú
      const inMore = $(`#more-sheet [data-nav="${id}"]`) !== null;
      inMore ? btn.setAttribute('aria-current', 'true') : btn.removeAttribute('aria-current');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => spy.observe(s));
}

export function resetNav() {
  spy?.disconnect();
  $$('[data-nav]').forEach((a) => a.removeAttribute('aria-current'));
  $('#more-sheet').hidden = true;
}
