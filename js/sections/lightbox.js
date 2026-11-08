/* Lightbox: foto en grande, flechas, deslizar con el dedo, Esc para cerrar y foco atrapado. */
import { $, formatDate, trapTab } from '../ui.js';
import { signOne, signMany } from '../media.js';

let list = [];
let i = 0;
let opener = null;
let bound = false;
let touchX = null;

const box = () => $('#lightbox');

async function show() {
  const p = list[i];
  if (!p) return;
  const img = $('.lightbox__img', box());
  img.classList.add('is-loading');
  img.alt = p.caption || (p.taken_at ? `Foto del ${formatDate(p.taken_at)}` : 'Foto nuestra');
  $('.lightbox__text', box()).textContent = p.caption || '';
  $('.lightbox__meta', box()).textContent = [p.taken_at ? formatDate(p.taken_at) : '', p.album || '', `${i + 1} / ${list.length}`].filter(Boolean).join(' · ');

  const mine = i;
  const url = await signOne(p.storage_path);
  if (mine !== i || box().hidden) return;                // cambió de foto mientras cargaba
  img.onload = () => img.classList.remove('is-loading');
  img.src = url || '';

  // Precargamos las vecinas
  signMany([list[i + 1]?.storage_path, list[i - 1]?.storage_path]).then((m) =>
    m.forEach((u) => { const pre = new Image(); pre.src = u; }));
}

const go = (d) => { if (list.length < 2) return; i = (i + d + list.length) % list.length; show(); };

export function open(photos, index) {
  list = photos; i = index; opener = document.activeElement;
  bind();
  box().hidden = false;
  document.body.classList.add('no-scroll');
  $('.lightbox__close', box()).focus();
  show();
}

export function close() {
  if (box().hidden) return;
  box().hidden = true;
  document.body.classList.remove('no-scroll');
  const img = $('.lightbox__img', box());
  img.removeAttribute('src');
  list = [];
  opener?.focus?.();
}

function bind() {
  if (bound) return;
  bound = true;
  const el = box();
  el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  $('.lightbox__prev', el).addEventListener('click', () => go(-1));
  $('.lightbox__next', el).addEventListener('click', () => go(1));
  document.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else trapTab(el, e);
  });
  // Deslizar para navegar
  const stage = $('.lightbox__stage', el);
  stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }, { passive: true });
}

export function reset() { close(); }
