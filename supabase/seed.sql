-- ============================================================================
-- DATOS DE EJEMPLO — todo lo marcado con [EJEMPLO] es para REEMPLAZAR.
-- Correlo después de schema.sql. Podés editar cada fila luego desde Table Editor.
-- ============================================================================

insert into public.site_settings (key, value) values
  ('her_name',        'Maitena'),
  ('his_name',        'Tiziano'),
  ('together_since',  '2026-04-17T00:00:00-03:00'),   -- hora de Argentina
  ('hero_phrase',     '[EJEMPLO] Gracias por hacer que todos los días se sientan un poco más amarillos.'),
  ('hero_photo_path', ''),                            -- ej: portada/foto.jpg (subila al bucket "media")
  ('hero_photo_alt',  'Maitena y Tiziano'),
  ('footer_phrase',   '[EJEMPLO] Lo mejor de mi historia es que vos estás en ella.'),
  ('signature',       'Tiziano'),
  ('quiz_msg_high',   '[EJEMPLO] ¡Me conocés de memoria! Y lo mejor es que todavía nos quedan mil cosas por descubrir juntos.'),
  ('quiz_msg_mid',    '[EJEMPLO] Nos conocemos un montón, y lo que falta lo vamos a ir aprendiendo juntos.'),
  ('quiz_msg_low',    '[EJEMPLO] Fallar no importa: lo lindo es que cada día nos conocemos un poquito más.')
on conflict (key) do update set value = excluded.value;

insert into public.milestones (happened_on, title, body, sort_order) values
  ('2026-04-17', '[EJEMPLO] El día que empezó todo', '[EJEMPLO] Escribí acá cómo nos conocimos o qué sentiste ese día.', 1),
  ('2026-05-17', '[EJEMPLO] Nuestro primer mes',     '[EJEMPLO] Algo que recuerdes de ese primer mes juntos.', 2);

insert into public.memories (happened_on, title, body, sort_order) values
  ('2026-04-17', '[EJEMPLO] Un recuerdo con girasoles', '[EJEMPLO] Contá en pocas líneas qué pasó y por qué te encanta.', 1),
  (null,         '[EJEMPLO] Nuestra canción favorita',  '[EJEMPLO] Podés mencionar el título, pero no copies la letra.', 2);

insert into public.words (kind, body, sort_order) values
  ('frase', '[EJEMPLO] Me gusta quién soy cuando estoy con vos.', 1),
  ('amo',   '[EJEMPLO] Amo cómo te reís cuando algo te da ternura.', 2),
  ('razon', '[EJEMPLO] Te elijo porque con vos hasta lo simple se vuelve una aventura.', 3);

insert into public.letters (title, body, signature, published) values
  ('[EJEMPLO] Mi querida Maitena',
   E'[EJEMPLO] Acá va el primer párrafo de mi carta. Reemplazá todo este texto por el tuyo.\n\nPodés escribir todos los párrafos que quieras: separalos con una línea en blanco, como este.\n\nTe quiero mucho.',
   'Tiziano', true);

insert into public.quiz_questions (question, options, correct_index, feedback, sort_order) values
  ('[EJEMPLO] ¿Cuál es el color favorito de Maitena?',
   '["Violeta","Amarillo","Verde","Rojo"]', 1, '¡Obvio! El amarillo manda siempre.', 1),
  ('[EJEMPLO] ¿Qué flor le gusta más?',
   '["Rosas","Orquídeas","Girasoles","Margaritas"]', 2, 'Los girasoles, siempre mirando al sol.', 2);
-- Agregá hasta llegar a 10 preguntas (Table Editor → quiz_questions → Insert row).
-- En "options" va un array JSON y "correct_index" es la posición correcta, empezando en 0.
