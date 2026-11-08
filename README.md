# Para Maitena 🌻

Web privada y de solo lectura: HTML + CSS + JavaScript puro (sin build), login con Supabase y todo el contenido personal guardado en Supabase. **Este repositorio solo contiene código y diseño.**

```
maitena-web/
├── index.html                 ← estructura + ilustraciones SVG (sin contenido personal)
├── css/styles.css             ← todo el diseño (tokens de color/tipografía al principio)
├── js/
│   ├── config.js              ← ✏️ AQUÍ pegás la URL y la anon key de Supabase
│   ├── main.js, auth.js, nav.js, media.js, ui.js, supabase.js, state.js
│   └── sections/              ← una carpeta de módulos: inicio, historia, galería, videos, recuerdos, palabras, carta, quiz
├── supabase/
│   ├── schema.sql             ← tablas + seguridad (RLS) + bucket privado
│   └── seed.sql               ← datos de ejemplo marcados con [EJEMPLO]
├── tools/upload-photos/       ← script local para subir carpetas de fotos (NO se publica)
├── .gitignore                 ← protege tu .env
└── .nojekyll
```

---

## Qué tan segura es esta solución (en pocas líneas)

**Lo que sí garantiza (lo hace el servidor, no el navegador):**
- Las tablas tienen Row Level Security: sin sesión iniciada, la base devuelve **cero filas**, aunque alguien conozca la URL y la anon key.
- El bucket `media` es privado: sin sesión no se puede ni listar ni firmar una URL.
- Nadie puede escribir ni borrar desde la web: no existen políticas de insert/update/delete.
- No hay registro público: solo entran los usuarios que vos creaste.
- El repositorio público no contiene fotos, textos ni preguntas.

**Sus límites reales:**
- **Capturas y grabaciones:** quien ve una foto o un video siempre puede sacarle captura o grabar la pantalla. "Sin botón de descarga" y el bloqueo del clic derecho frenan lo casual, no a alguien decidido (las herramientas del navegador igual muestran la URL).
- **Las URLs firmadas** son temporales (1 hora, configurable), pero durante ese tiempo cualquiera que tenga el link puede abrirlo, sin sesión.
- **Quien tenga el mail y la contraseña ve todo.** Usá contraseñas largas y únicas. Supabase limita los intentos fallidos, pero no es infalible.
- **La expiración de sesión por inactividad y por tiempo máximo (60 min / 12 h) la aplica el navegador.** Es una comodidad, no una barrera: el token de Supabase se renueva por su cuenta y la expiración "dura" del lado del servidor es una función de planes pagos.
- **La "pista de la contraseña" es pública** (está en `config.js`). Dejala vacía o poné algo que no revele nada útil.
- Los textos y metadatos de las tablas viajan al navegador cuando ella inicia sesión, como en cualquier sitio.

Para una sorpresa romántica entre dos personas es un nivel muy razonable. No lo uses para información realmente confidencial.

---

## Guía paso a paso

### 1. Crear el proyecto en Supabase
1. Entrá a [supabase.com](https://supabase.com) → **New project** (plan Free).
2. Poné nombre, una contraseña de base de datos (guardala) y la región más cercana (por ejemplo *South America – São Paulo*).
3. Esperá un par de minutos a que termine.

### 2. Correr el SQL
1. Menú **SQL Editor** → **New query**.
2. Pegá todo `supabase/schema.sql` → **Run**. Debe decir *Success*.
3. Nueva query: pegá `supabase/seed.sql` → **Run** (datos de ejemplo; después los reemplazás).
4. Verificá en **Table Editor** que aparecen las 8 tablas y en **Storage** el bucket `media` marcado como *Private*.

### 3. Crear los dos usuarios y desactivar el registro público
1. **Authentication → Users → Add user → Create new user.**
2. Completá mail y contraseña, y **marcá "Auto Confirm User"**. Repetí para el segundo usuario.
3. **Authentication → Sign In / Providers** (en algunas versiones: *Providers → Email*): desactivá **"Allow new users to sign up"**. Así nadie más puede crearse una cuenta.
4. Opcional: en *Sessions* podés ajustar la duración del token (por defecto 1 h, se renueva solo).

### 4. Pegar la URL y la anon key en el código
1. **Project Settings → API** (o el botón **Connect**).
2. Copiá la **Project URL** y la clave **anon / publishable**.
3. Abrí `js/config.js` y reemplazá `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

**¿Por qué la anon key puede ser pública y la service_role nunca?**
La anon key solo identifica al proyecto y le da al visitante los permisos del rol `anon`, que acá es *ninguno*: las políticas RLS bloquean todo hasta que haya sesión, y con sesión solo se puede leer. Está pensada para vivir en el navegador. La **service_role** (o *secret key*) **se salta toda la seguridad**: puede leer, escribir y borrar todo. Si se filtra, cualquiera dueño de esa clave controla tu proyecto. Por eso solo vive en tu `.env` local, que está en `.gitignore`. Si alguna vez la subís por error, regenerala en *Project Settings → API* de inmediato.

### 5. Cargar el contenido

**A mano desde el panel (textos, hitos, quiz, carta):** *Table Editor* → tabla → **Insert row**.
| Tabla | Qué cargar |
|---|---|
| `site_settings` | Nombre, `together_since` (formato `2026-04-17T00:00:00-03:00`), `hero_phrase`, `footer_phrase`, `signature`, mensajes del quiz y `hero_photo_path` |
| `milestones` | Hitos de la historia: fecha, título, texto y `photo_path` opcional |
| `memories` | Tarjetas: título, texto, fecha, foto opcional |
| `words` | `kind` = `frase`, `amo` o `razon` + el texto |
| `letters` | La carta (`body`): párrafos separados por una línea en blanco. Se muestra la más reciente con `published` activado |
| `quiz_questions` | `question`, `options` (array JSON, ej. `["Sí","No","Tal vez"]`), `correct_index` (empieza en 0), `feedback`. Cargá 10 |
| `videos` | `source='link'` + `external_url` (YouTube no listado/Vimeo), o `source='storage'` + `storage_path` |

**Fotos sueltas a mano:** en **Storage → media** subí el archivo (por ejemplo a una carpeta `historia/`). En la tabla correspondiente poné la ruta en `photo_path`, por ejemplo `historia/primera-cita.jpg`. Para la galería, agregá una fila en `photos` con `storage_path` (y `thumb_path` opcional), `taken_at`, `album`, `tags` y `caption`. Para la portada: subí la foto a `portada/` y poné esa ruta en `hero_photo_path`.

**Videos guardados en Supabase:** subilos a `media/videos/` (máx. 50 MB cada uno en el plan Free; comprimilos antes con HandBrake si hace falta) y creá la fila en `videos`. Para YouTube, subí el video como **No listado** y pegá el link.

**Muchas fotos de una vez (script local):**
```bash
cd tools/upload-photos
cp .env.example .env          # y completá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm install
node upload.js "C:\ruta\a\mis-fotos" --dry-run     # simulación: muestra qué haría
node upload.js "C:\ruta\a\mis-fotos" --album "Viajes" --tags "mar,verano"
```
Lee la fecha EXIF, comprime (máx. 2200 px), genera miniaturas, **elimina la ubicación GPS** de lo que sube y crea las filas en `photos`. Si no indicás `--album`, usa el nombre de cada carpeta como álbum. Correrlo dos veces no duplica fotos. Requiere [Node.js](https://nodejs.org) 18+. Los pies de foto los agregás después en `photos.caption`.

### 6. Subir a GitHub y activar GitHub Pages
1. Creá un repositorio **público** en GitHub (por ejemplo `para-maitena`).
2. **Antes de subir**, confirmá que no hay `.env` en el proyecto y que `.gitignore` está presente.
3. Desde la carpeta del proyecto:
```bash
git init
git add .
git status                      # revisá que NO aparezca ningún .env
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/para-maitena.git
git push -u origin main
```
4. En GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, rama `main`, carpeta `/ (root)` → **Save**.
5. En 1–2 minutos queda en `https://TU-USUARIO.github.io/para-maitena/`. Compartile ese link.

`tools/upload-photos` se sube al repo pero es solo código (nunca el `.env`); no afecta a la web.

### 7. El proyecto gratuito se pausa
Los proyectos del plan Free **se pausan tras 1 semana sin actividad**. Si pasa, la web va a mostrar errores de conexión al iniciar sesión.
- **Reactivar:** entrá a [supabase.com/dashboard](https://supabase.com/dashboard), abrí el proyecto y usá el botón **Restore / Unpause project**. Tarda unos minutos y no pierde datos.
- **Evitarlo:** que alguno de los dos entre a la web al menos una vez por semana. Ojo: si lo van a abrir en una fecha especial (aniversario, cumpleaños), entrá unos días antes para comprobar que esté activo.
- Los datos de proyectos pausados se conservan un tiempo limitado: descargá un respaldo de vez en cuando (Table Editor → Export).

---

## Personalizar
- **Colores y tipografías:** variables al inicio de `css/styles.css` (`--sun`, `--butter`, `--cream`, `--ink`, `--violet`).
- **Tiempo de sesión:** `js/config.js` (`SESSION_MAX_HOURS`, `INACTIVITY_MINUTES`).
- **Probar en tu compu:** `npx serve .` o `python3 -m http.server 8000` en la carpeta del proyecto y abrí `http://localhost:8000`.

## Accesibilidad y rendimiento
Contraste AA en texto, navegación completa con teclado, enlace "saltar al contenido", textos alternativos tomados de la base, `prefers-reduced-motion` respetado, imágenes con lazy loading y miniaturas, y sin frameworks.
