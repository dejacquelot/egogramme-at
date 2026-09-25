-- Mémorise la variante de libellés de questions utilisée pour ce résultat
-- (Standard / Scouts et Guides / Association de Parents d'Élèves), afin que
-- les analyses IA (individuelles et d'équipe) puissent adapter leurs
-- exemples concrets au contexte du public qui a répondu.
alter table public.results
  add column if not exists question_variant text
  check (question_variant in ('default', 'scouts', 'ape'));
