/* ==========================================================================
   Utilidades de interfaz: DOM, fechas, aparición al scrollear, pétalos, avisos.
   ========================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Crea elementos sin usar innerHTML (así el contenido de la base nunca se interpreta como HTML). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** <svg><use href="#id"/></svg> para usar iconos e ilustraciones del sprite. */
export function svgUse(id, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  if (className) svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '#' + id);
  svg.append(use);
  return svg;
}
export const icon = (name) => svgUse('i-' + name, 'icon');

/** Mensaje amable para secciones vacías o con error. */
export function emptyEl(text, tag = 'div') {
  return h(tag, { class: 'empty' }, svgUse('tulip', 'empty__icon'), text);
}

/* ---------- Fechas (es-AR) ---------- */
export function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {   // "2026-04-17" → fecha local, sin corrimiento de huso
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(v);
}
const fmtLong = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMonth = new Intl.DateTimeFormat('es-AR', { month: 'long' });
export const formatDate = (v) => fmtLong.format(toDate(v));
export const formatShort = (v) => fmtShort.format(toDate(v));
export const monthName = (v) => { const s = fmtMonth.format(toDate(v)); return s.charAt(0).toUpperCase() + s.slice(1); };

/* ---------- Aparición al scrollear ---------- */
let io = null;
export function observeReveal(root = document) {
  const targets = $$('.reveal:not(.is-visible)', root);
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-visible'));
    return;
  }
  io ||= new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((t) => io.observe(t));
}

/* ---------- Pétalos que flotan ---------- */
export function startPetals() {
  const box = $('#petals');
  if (!box || box.childElementCount || prefersReducedMotion()) return;
  const n = window.innerWidth < 640 ? 9 : 16;
  for (let i = 0; i < n; i++) {
    const p = h('span', { class: 'petal' });
    const size = 12 + Math.random() * 12;
    p.style.setProperty('--x', Math.random() * 100 + '%');
    p.style.setProperty('--s', size.toFixed(1) + 'px');
    p.style.setProperty('--d', (16 + Math.random() * 14).toFixed(1) + 's');
    p.style.setProperty('--delay', '-' + (Math.random() * 28).toFixed(1) + 's');
    p.style.setProperty('--drift', (Math.random() * 120 - 60).toFixed(0) + 'px');
    p.append(svgUse('petal'));
    box.append(p);
  }
}

/* ---------- Aviso breve ---------- */
let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 3200);
}

/* ---------- Accesibilidad: mantener el foco dentro de un diálogo ---------- */
export function trapTab(container, e) {
  if (e.key !== 'Tab') return;
  const f = $$('button:not([hidden]):not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])', container)
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
