-- Conserve les 60 réponses brutes du test avec chaque résultat.
-- Permet de recharger ses réponses après un vidage du cache navigateur,
-- ou depuis un autre appareil, et rend chaque analyse rejouable.

alter table public.results
  add column if not exists answers jsonb;
