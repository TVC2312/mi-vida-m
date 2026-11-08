/* ==========================================================================
   CONFIGURACIÓN PÚBLICA
   Acá SOLO va información que puede ser pública (el repo es público):
   - la URL del proyecto de Supabase
   - la clave "anon" (también llamada "publishable key")
   NUNCA pegues acá la clave "service_role" / "secret".
   ========================================================================== */

export const CONFIG = {
  // Supabase → Project Settings → API (o "Connect")
  SUPABASE_URL: 'https://lfqjsfhsgnmwjvimywwr.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_llzqb4VjUWtxkL8yvswUCw_LMqUE0pB',

  // Nombre del bucket privado donde viven fotos y videos
  BUCKET: 'media',

  // Duración de las URLs firmadas (segundos). Después de este tiempo el link deja de funcionar.
  SIGNED_URL_SECONDS: 3600,

  // Expiración de sesión (se aplica en el navegador, además de la expiración propia de Supabase)
  SESSION_MAX_HOURS: 12,     // tope absoluto desde que entró
  INACTIVITY_MINUTES: 60,    // se cierra si no toca nada por este tiempo

  // Pista de la contraseña (opcional). OJO: esto es PÚBLICO, no escribas la contraseña ni nada obvio.
  // Dejalo vacío ('') para no mostrar el botón de pista.
  PASSWORD_HINT: '',
};

export const isConfigured = () =>
  !CONFIG.SUPABASE_URL.includes('TU-PROYECTO') && !CONFIG.SUPABASE_ANON_KEY.startsWith('TU_');
