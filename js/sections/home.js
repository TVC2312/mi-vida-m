/* ==========================================================================
   Inicio: saludo, contador en vivo, foto destacada, frase y cierre.
   La fecha de inicio, el nombre y la frase viven en la tabla site_settings.
   ========================================================================== */
import { state } from '../state.js';
import { $, $$, formatDate } from '../ui.js';
import { signOne } from '../media.js';

const LABELS = {
  years: ['año', 'años'], months: ['mes', 'meses'], days: ['día', 'días'],
  hours: ['hora', 'horas'], minutes: ['minuto', 'minutos'], seconds: ['segundo', 'segundos'],
};
let timer = null;

/* Suma meses respetando el fin de mes (31 de enero + 1 mes = 28/29 de febrero) */
function addMonths(date, n) {
  const r = new Date(date.getTime());
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

/** Diferencia calendario exacta entre dos fechas: años, meses, días, horas, minutos y segundos. */
export function diffParts(start, now = new Date()) {
  const zero = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0 };
  if (now <= start) return zero;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let anchor = addMonths(start, months);
  if (anchor > now) { months -= 1; anchor = addMonths(start, months); }
  const years = Math.floor(months / 12);
  months %= 12;
  let rem = Math.floor((now - anchor) / 1000);
  const days = Math.floor(rem / 86400); rem %= 86400;
  const hours = Math.floor(rem / 3600); rem %= 3600;
  const minutes = Math.floor(rem / 60);
  const seconds = rem % 60;
  return { years, months, days, hours, minutes, seconds, totalDays: Math.floor((now - start) / 864e5) };
}

function startCounter(since) {
  const nums = Object.fromEntries($$('.count__num').map((n) => [n.dataset.unit, n]));
  const labels = Object.fromEntries($$('.count__label').map((n) => [n.dataset.label, n]));
  const total = $('#counter-total');
  const sr = $('#counter-sr');
  let lastMinute = -1;

  const tick = () => {
    const now = new Date();
    const p = diffParts(since, now);
    for (const unit of Object.keys(LABELS)) {
      const v = p[unit];
      if (nums[unit].textContent !== String(v)) nums[unit].textContent = v;
      const lab = LABELS[unit][v === 1 ? 0 : 1];
      if (labels[unit].textContent !== lab) labels[unit].textContent = lab;
    }
    // Mesiversario: mismo día del mes que el inicio
    const monthsary = now.getDate() === since.getDate() && (p.years || p.months);
    total.textContent = monthsary
      ? 'Hoy es nuestro mesiversario.'
      : `En total: ${p.totalDays.toLocaleString('es-AR')} ${p.totalDays === 1 ? 'día' : 'días'} juntos.`;
    // Texto para lectores de pantalla: se actualiza una vez por minuto
    if (now.getMinutes() !== lastMinute) {
      lastMinute = now.getMinutes();
      sr.textContent = `Llevamos juntos ${p.years} años, ${p.months} meses, ${p.days} días, ${p.hours} horas y ${p.minutes} minutos.`;
    }
  };
  tick();
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden) tick(); }, 1000);
}

export function init() {
  const s = state.settings;

  $('#hero-name').textContent = s.her_name || 'amor';
  $('#hero-phrase').textContent = s.hero_phrase || '';

  const since = s.together_since ? new Date(s.together_since) : null;
  if (since && !isNaN(since)) {
    startCounter(since);
  } else {
    $('#counter').hidden = true;
    $('#counter-total').textContent = 'Falta cargar "together_since" en la tabla site_settings.';
  }

  // Foto destacada (bucket privado → URL firmada)
  if (s.hero_photo_path) {
    signOne(s.hero_photo_path).then((url) => {
      if (!url) return;
      const img = $('#hero-photo');
      img.alt = s.hero_photo_alt || 'Una foto nuestra';
      img.addEventListener('load', () => { img.hidden = false; $('#hero-placeholder').style.display = 'none'; }, { once: true });
      img.src = url;
    });
  }
  $('.arch').classList.add('protect');

  // Cierre
  $('#footer-phrase').textContent = s.footer_phrase || '';
  $('#footer-sign').textContent = s.signature || s.his_name || '';
}

export function reset() {
  clearInterval(timer);
  timer = null;
  $$('.count__num').forEach((n) => { n.textContent = '0'; });
  $('#counter').hidden = false;
  $('#counter-total').textContent = '';
  $('#counter-sr').textContent = '';
  $('#hero-name').textContent = 'amor';
  $('#hero-phrase').textContent = '';
  const img = $('#hero-photo');
  img.hidden = true; img.removeAttribute('src'); img.alt = '';
  $('#hero-placeholder').style.display = '';
  $('#footer-phrase').textContent = '';
  $('#footer-sign').textContent = '';
}

// (formatDate se importa por si querés mostrar la fecha de inicio en algún texto)
export const _formatDate = formatDate;
