#!/usr/bin/env node
/* ==========================================================================
   Subida masiva de fotos a Supabase (se corre en TU computadora, no en la web).

   Qué hace con cada foto:
     1. Lee la fecha de captura (EXIF). Si no tiene, usa la fecha del archivo.
     2. Corrige la rotación, la comprime (máx. 2200 px, JPEG) y genera una miniatura (600 px).
     3. Sube ambas al bucket privado "media" y crea la fila en la tabla "photos".
     4. Quita los datos EXIF del archivo subido (incluida la ubicación GPS).

   Uso:
     node upload.js <carpeta> [--album "Viajes"] [--tags "mar,verano"] [--dry-run]

   Si no pasás --album, se usa el nombre de la carpeta (y de cada subcarpeta) como álbum.
   Volver a correrlo no duplica: las fotos ya subidas se saltean.
   ========================================================================== */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import exifr from 'exifr';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'media';
const MAX_SIDE = 2200;
const THUMB_SIDE = 600;
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff']);

// ---------- argumentos ----------
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] ?? true; };
const folder = args.find((a, i) => !a.startsWith('--') && !['--album', '--tags'].includes(args[i - 1]));
const dryRun = args.includes('--dry-run');
const albumArg = flag('--album');
const tagsArg = (flag('--tags') || '').toString().split(',').map((s) => s.trim()).filter(Boolean);

if (!folder) {
  console.error('Uso: node upload.js <carpeta> [--album "Nombre"] [--tags "a,b"] [--dry-run]');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Falta completar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el archivo .env (copiá .env.example).');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- utilidades ----------
async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(e.name).toLowerCase())) yield p;
  }
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

async function takenAt(file, buf) {
  try {
    const t = await exifr.parse(buf, ['DateTimeOriginal', 'CreateDate']);
    const d = t?.DateTimeOriginal || t?.CreateDate;
    if (d instanceof Date && !isNaN(d)) return d;
  } catch { /* sin EXIF */ }
  return (await fs.stat(file)).mtime;
}

const root = path.resolve(folder);
const rootName = path.basename(root);

function albumFor(file) {
  if (albumArg) return albumArg;
  const rel = path.relative(root, path.dirname(file));
  return rel ? rel.split(path.sep)[0] : rootName;
}

// ---------- principal ----------
let ok = 0, skipped = 0, failed = 0;

for await (const file of walk(root)) {
  const name = path.relative(root, file);
  try {
    const original = await fs.readFile(file);
    // Huella del contenido: sirve para no subir dos veces la misma foto
    const hash = crypto.createHash('sha1').update(original).digest('hex').slice(0, 10);
    const date = await takenAt(file, original);
    const day = date.toISOString().slice(0, 10);
    const storagePath = `fotos/${day}_${hash}.jpg`;
    const thumbPath = `fotos/thumbs/${day}_${hash}.jpg`;

    const { data: exists } = await supabase.from('photos').select('id').eq('storage_path', storagePath).maybeSingle();
    if (exists) { console.log(`= ya estaba: ${name}`); skipped++; continue; }

    // rotate() sin argumentos aplica la orientación EXIF; al no usar withMetadata() se eliminan los metadatos (GPS incluido)
    const img = sharp(original, { failOn: 'none' }).rotate();
    const big = await img.clone().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    const thumb = await img.clone().resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 74, mozjpeg: true }).toBuffer();

    const kb = (b) => Math.round(b.length / 1024);
    console.log(`+ ${name}  →  ${day}  ${big.info.width}x${big.info.height}  ${kb(original)}KB → ${kb(big.data)}KB  [${albumFor(file)}]`);
    if (dryRun) { ok++; continue; }

    for (const [p, b] of [[storagePath, big.data], [thumbPath, thumb]]) {
      const { error } = await supabase.storage.from(BUCKET).upload(p, b, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    }
    const { error } = await supabase.from('photos').insert({
      storage_path: storagePath, thumb_path: thumbPath, taken_at: date.toISOString(),
      album: albumFor(file), tags: tagsArg, width: big.info.width, height: big.info.height,
    });
    if (error) throw error;
    ok++;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log(`\nListo. Subidas: ${ok}${dryRun ? ' (simulación, no se subió nada)' : ''} · Salteadas: ${skipped} · Con error: ${failed}`);
console.log('Los pies de foto y las etiquetas se pueden editar en Supabase → Table Editor → photos.');
