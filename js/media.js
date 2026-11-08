/* ==========================================================================
   Fotos y videos con URLs firmadas (temporales).
   El bucket es privado: sin sesión no se puede pedir ninguna URL.
   ========================================================================== */
import { supabase } from './supabase.js';
import { CONFIG } from './config.js';

const cache = new Map();                          // path -> { url, exp }
const isFresh = (e) => e && e.exp > Date.now();

/** Firma varias rutas de una vez (en tandas de 100). Devuelve Map(path -> url). */
export async function signMany(paths) {
  const out = new Map();
  const need = [];
  for (const p of new Set((paths || []).filter(Boolean))) {
    const c = cache.get(p);
    if (isFresh(c)) out.set(p, c.url); else need.push(p);
  }
  for (let i = 0; i < need.length; i += 100) {
    const chunk = need.slice(i, i + 100);
    const { data, error } = await supabase.storage.from(CONFIG.BUCKET).createSignedUrls(chunk, CONFIG.SIGNED_URL_SECONDS);
    if (error) { console.warn('No se pudieron firmar las URLs:', error.message); continue; }
    for (const item of data || []) {
      if (item.signedUrl && !item.error && item.path) {
        // Renovamos 5 minutos antes de que venza
        cache.set(item.path, { url: item.signedUrl, exp: Date.now() + (CONFIG.SIGNED_URL_SECONDS - 300) * 1000 });
        out.set(item.path, item.signedUrl);
      }
    }
  }
  return out;
}

export async function signOne(path) {
  if (!path) return null;
  return (await signMany([path])).get(path) || null;
}

export function clearMediaCache() { cache.clear(); }

function attach(img, url) {
  if (!url || img.dataset.hydrated) return;
  img.dataset.hydrated = '1';
  const path = img.dataset.path;
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  // Si la URL venció mientras la página estaba abierta, pedimos una nueva (una sola vez)
  let retried = false;
  img.addEventListener('error', async () => {
    if (retried || !path) return;
    retried = true;
    cache.delete(path);
    const fresh = await signOne(path);
    if (fresh) img.src = fresh;
  });
  img.src = url;
}

/** Busca <img data-path="..."> dentro de root y les pone la URL firmada. */
export async function hydrateImages(root) {
  const imgs = [...root.querySelectorAll('img[data-path]:not([data-hydrated])')];
  if (!imgs.length) return;
  const urls = await signMany(imgs.map((i) => i.dataset.path));
  imgs.forEach((img) => attach(img, urls.get(img.dataset.path)));
}
