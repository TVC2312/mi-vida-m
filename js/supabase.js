/* Cliente de Supabase (sin build: se importa directo desde un CDN). */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG, isConfigured } from './config.js';

export const supabase = isConfigured()
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,   // no usamos links mágicos
        storageKey: 'jardin-session',
      },
    })
  : null;
