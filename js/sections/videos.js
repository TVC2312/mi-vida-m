/* ==========================================================================
   Videos: tarjetas con miniatura y reproductor propio.
   Tabla "videos": source = 'storage' (archivo en el bucket privado) o 'link' (YouTube/Vimeo no listado).
   ========================================================================== */
import { supabase } from '../supabase.js';
import { $, h, svgUse, icon, formatDate, emptyEl, observeReveal, trapTab } from '../ui.js';
import { hydrateImages, signOne } from '../media.js';

let bound = false;
let opener = null;

/** Convierte un link de YouTube / Vimeo en una URL de "embed". Devuelve null si no es un proveedor permitido. */
export function embedUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/) || [])[1];
    }
    if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = u.pathname.match(/(\d{6,})/);
      if (m) {
        const hash = u.searchParams.get('h') || (u.pathname.match(/\/(\w{8,})$/) || [])[1];
        return `https://player.vimeo.com/video/${m[1]}${hash && hash !== m[1] ? '?h=' + hash : ''}`;
      }
    }
  } catch { /* link inválido */ }
  return null;
}

const fmtTime = (s) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

/** Reproductor propio para archivos del bucket (controles con el mismo estilo de la web). */
function buildPlayer(url, poster) {
  const video = h('video', {
    src: url, playsinline: true, preload: 'metadata', controlslist: 'nodownload noplaybackrate',
    disablepictureinpicture: true, disableremoteplayback: true, 'aria-label': 'Video',
  });
  if (poster) video.poster = poster;
  video.addEventListener('contextmenu', (e) => e.preventDefault());

  const big = h('button', { type: 'button', class: 'player__big', 'aria-label': 'Reproducir' }, icon('play'));
  const playBtn = h('button', { type: 'button', class: 'player__btn', 'aria-label': 'Reproducir' }, icon('play'));
  const seek = h('input', { type: 'range', class: 'player__seek', min: '0', max: '1000', value: '0', 'aria-label': 'Posición del video' });
  const time = h('span', { class: 'player__time' }, '0:00 / 0:00');
  const muteBtn = h('button', { type: 'button', class: 'player__btn', 'aria-label': 'Silenciar' }, icon('volume'));
  const fsBtn = h('button', { type: 'button', class: 'player__btn', 'aria-label': 'Pantalla completa' }, icon('expand'));
  const wrap = h('div', { class: 'player protect' }, video, big,
    h('div', { class: 'player__controls' }, playBtn, seek, time, muteBtn, fsBtn));

  const setPlayIcon = () => {
    const playing = !video.paused;
    playBtn.replaceChildren(icon(playing ? 'pause' : 'play'));
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    big.hidden = playing;
  };
  const toggle = () => (video.paused ? video.play() : video.pause());
  [big, playBtn].forEach((b) => b.addEventListener('click', toggle));
  video.addEventListener('click', toggle);
  video.addEventListener('play', setPlayIcon);
  video.addEventListener('pause', setPlayIcon);
  video.addEventListener('ended', setPlayIcon);
  const upd = () => {
    if (!seek.matches(':active')) seek.value = video.duration ? (video.currentTime / video.duration) * 1000 : 0;
    time.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
  };
  video.addEventListener('timeupdate', upd);
  video.addEventListener('loadedmetadata', upd);
  seek.addEventListener('input', () => { if (video.duration) video.currentTime = (seek.value / 1000) * video.duration; });
  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    muteBtn.replaceChildren(icon(video.muted ? 'mute' : 'volume'));
    muteBtn.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar');
  });
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else (wrap.requestFullscreen || wrap.webkitRequestFullscreen)?.call(wrap);
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.target === seek) return;
    if (e.key === ' ' && e.target === wrap) { e.preventDefault(); toggle(); }
    if (e.key === 'ArrowRight') video.currentTime += 5;
    if (e.key === 'ArrowLeft') video.currentTime -= 5;
  });
  wrap.tabIndex = 0;
  return wrap;
}

async function openPlayer(v, trigger) {
  const modal = $('#video-modal');
  const stage = $('#vmodal-stage');
  opener = trigger;
  $('#vmodal-title').textContent = v.title;
  $('#vmodal-meta').textContent = [v.recorded_on ? formatDate(v.recorded_on) : '', v.description || ''].filter(Boolean).join(' · ');
  stage.replaceChildren();
  modal.hidden = false;
  document.body.classList.add('no-scroll');
  $('.vmodal__close', modal).focus();

  if (v.source === 'link') {
    const src = embedUrl(v.external_url);
    if (!src) { stage.append(emptyEl('Este link no se puede mostrar acá.')); return; }
    stage.append(h('div', { class: 'player' }, h('iframe', {
      src, title: v.title, allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin',
    })));
    return;
  }
  const [url, poster] = await Promise.all([signOne(v.storage_path), signOne(v.thumb_path)]);
  if (modal.hidden) return;
  if (!url) { stage.append(emptyEl('No pude cargar este video. Probá de nuevo.')); return; }
  stage.append(buildPlayer(url, poster));
}

export function closePlayer() {
  const modal = $('#video-modal');
  if (modal.hidden) return;
  $('#vmodal-stage').replaceChildren();                 // al sacar el <video>/<iframe> se detiene todo
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
  opener?.focus?.();
}

function bind() {
  if (bound) return;
  bound = true;
  const modal = $('#video-modal');
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closePlayer(); });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape' && !document.fullscreenElement) closePlayer();
    else trapTab(modal, e);
  });
}

export async function init() {
  const grid = $('#video-grid');
  grid.replaceChildren(emptyEl('Cargando videos…'));
  try {
    const { data, error } = await supabase.from('videos').select('*')
      .order('recorded_on', { ascending: true, nullsFirst: false }).order('sort_order', { ascending: true });
    if (error) throw error;
    if (!data.length) { grid.replaceChildren(emptyEl('Todavía no hay videos. Los voy a ir sumando.')); return; }
    bind();
    grid.replaceChildren(...data.map((v) => {
      const btn = h('button', { type: 'button', class: 'vcard reveal', 'aria-label': `Reproducir: ${v.title}` },
        h('div', { class: 'vcard__poster protect' },
          v.thumb_path ? h('img', { alt: '', loading: 'lazy', decoding: 'async', draggable: 'false', 'data-path': v.thumb_path }) : svgUse('sunflower-head', 'vcard__flower'),
          h('span', { class: 'vcard__play' }, icon('play'))),
        h('div', { class: 'vcard__body' },
          h('h3', {}, v.title),
          v.recorded_on ? h('p', { class: 'vcard__date' }, formatDate(v.recorded_on)) : null));
      btn.addEventListener('click', () => openPlayer(v, btn));
      return btn;
    }));
    hydrateImages(grid);
    observeReveal(grid);
  } catch (e) {
    console.warn('videos:', e.message);
    grid.replaceChildren(emptyEl('No pude cargar los videos. Probá recargar la página.'));
  }
}

export function reset() { closePlayer(); $('#video-grid').replaceChildren(); }
