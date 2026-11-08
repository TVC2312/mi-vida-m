/* ==========================================================================
   Quiz: preguntas de la tabla "quiz_questions" (options = array JSON, correct_index = posición correcta).
   Los mensajes finales según el puntaje salen de site_settings (quiz_msg_high / mid / low).
   ========================================================================== */
import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { $, h, svgUse, emptyEl } from '../ui.js';

const DEFAULTS = {
  high: '¡Me conocés de memoria! Pero lo mejor es que todavía nos quedan mil cosas por descubrir juntos.',
  mid: 'Nos conocemos un montón, y lo que falta lo vamos a ir aprendiendo juntos.',
  low: 'Fallar no importa: lo lindo es que cada día nos conocemos un poquito más.',
};

let questions = [];
let idx = 0;
let score = 0;

function shuffle(a) { return a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]); }

function message(ratio) {
  const s = state.settings;
  if (ratio >= 0.8) return s.quiz_msg_high || DEFAULTS.high;
  if (ratio >= 0.5) return s.quiz_msg_mid || DEFAULTS.mid;
  return s.quiz_msg_low || DEFAULTS.low;
}

function renderQuestion() {
  const root = $('#quiz-root');
  const q = questions[idx];
  let answered = false;

  const bar = h('span', { class: 'quiz__bar' });
  const feedback = h('div', { class: 'quiz__feedback', role: 'status', hidden: true });
  const next = h('button', { type: 'button', class: 'btn quiz__next', hidden: true }, idx === questions.length - 1 ? 'Ver mi resultado' : 'Siguiente');
  const opts = h('div', { class: 'quiz__opts', role: 'group', 'aria-label': 'Opciones' });

  q.options.forEach((text, i) => {
    const b = h('button', { type: 'button', class: 'opt' }, h('span', {}, text), h('span', { class: 'opt__mark', 'aria-hidden': 'true' }));
    b.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const ok = i === q.correct_index;
      if (ok) score++;
      [...opts.children].forEach((o, j) => {
        o.setAttribute('aria-disabled', 'true');
        if (j === q.correct_index) { o.classList.add('is-correct'); o.querySelector('.opt__mark').textContent = '✓'; }
        else if (j === i) o.classList.add('is-wrong');
      });
      feedback.hidden = false;
      feedback.replaceChildren(
        h('strong', {}, ok ? '¡Sí! Esa es.' : 'Casi…'),
        h('p', {}, q.feedback || (ok ? 'Bien ahí.' : 'La respuesta correcta está marcada en amarillo.')));
      next.hidden = false;
      next.focus();
    });
    opts.append(b);
  });

  next.addEventListener('click', () => { idx++; idx < questions.length ? renderQuestion() : renderResult(); });

  root.replaceChildren(
    h('div', { class: 'quiz__top' }, h('span', {}, `Pregunta ${idx + 1} de ${questions.length}`), h('span', {}, `${score} ${score === 1 ? 'acierto' : 'aciertos'}`)),
    h('div', { class: 'quiz__progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(questions.length), 'aria-valuenow': String(idx) }, bar),
    h('h3', { class: 'quiz__q', tabindex: '-1' }, q.question),
    opts, feedback, next);
  requestAnimationFrame(() => { bar.style.width = (idx / questions.length) * 100 + '%'; });
}

function renderResult() {
  const root = $('#quiz-root');
  const ratio = score / questions.length;
  const again = h('button', { type: 'button', class: 'btn btn--ghost' }, 'Jugar de nuevo');
  again.addEventListener('click', start);
  root.replaceChildren(h('div', { class: 'quiz__result' },
    svgUse('sunflower-head', 'quiz__flower'),
    h('p', { class: 'quiz__score' }, String(score), h('small', {}, ` / ${questions.length}`)),
    h('p', { class: 'quiz__msg', tabindex: '-1' }, message(ratio)),
    again));
  root.querySelector('.quiz__msg').focus({ preventScroll: true });
}

function start() { idx = 0; score = 0; questions = questions.map((q) => q); renderQuestion(); }

export async function init() {
  const root = $('#quiz-root');
  root.replaceChildren(emptyEl('Cargando preguntas…'));
  try {
    const { data, error } = await supabase.from('quiz_questions').select('*').order('sort_order', { ascending: true }).limit(10);
    if (error) throw error;
    questions = (data || []).filter((q) => Array.isArray(q.options) && q.options.length >= 2 && q.options[q.correct_index] != null);
    if (!questions.length) { root.replaceChildren(emptyEl('Las preguntas están en camino.')); return; }
    start();
  } catch (e) {
    console.warn('quiz:', e.message);
    root.replaceChildren(emptyEl('No pude cargar el quiz. Probá recargar la página.'));
  }
}

export function reset() { questions = []; idx = 0; score = 0; $('#quiz-root').replaceChildren(); }
