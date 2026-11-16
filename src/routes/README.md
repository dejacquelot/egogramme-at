# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Atelier APEL

`/apel` propose un atelier sur un écran partagé pour 2 à 20 membres présents :
60 questions de la variante APEL, pauses toutes les 10 questions (y compris la
dernière), puis rapports personnels et collectif en PDF et lien de partage.

La séance est conservée dans `localStorage` sous `egogramme_apel_v1`, séparément
du solo et du duo. Elle reprend après un rechargement. Le bouton « Effacer cette
séance » supprime les réponses et les rapports de cet appareil. Sur un
ordinateur partagé, les rapports restent accessibles tant que la séance n'est
pas effacée. Les rapports ne sont pas ajoutés à Mon Espace.

La génération, déclenchée explicitement après accord des participants, utilise
`POST /api/analysis/apel-stream`. Le serveur valide les participants et leurs
60 réponses puis calcule les scores avec le mapping partagé. Les fonctions
contextualisent les exemples sans déterminer le profil. Une fois les rapports
générés, la séance est enregistrée anonymisée dans `apel_sessions` via
`POST /api/public/apel-save` : fonctions, scores et rapports, prénoms remplacés
par les fonctions, sans les réponses brutes. Les analyses terminées sont conservées
localement ; la reprise ne relance que les rapports manquants.

Le logo est un asset fourni pour ce parcours indépendant, sans affiliation
officielle. L'atelier ne doit pas servir à évaluer une aptitude à une fonction.

## Orientation au lycée

`/orientation` (également accessible avec un slash final) propose le parcours
validé « Me connaître → Explorer des métiers → En parler → Essayer ». Les quatre
photographies sont des recadrages séparés du montage fourni par l'utilisateur.
Les 60 questions standard sont conservées avec des exemples de vie au lycée ;
le scoring est partagé avec l'atelier APEL dans `egogram-scoring.ts`.

Les pistes sont des hypothèses de réflexion, pas des talents mesurés ou des
scores de compatibilité professionnelle. Les scores identiques ne produisent
pas de dominante arbitraire. Chaque dimension propose des questions distinctes
pour le lycéen et le parent, une situation quotidienne et une expérience.

L'analyse IA est facultative. `POST /api/analysis/orientation-stream` exige un
accord explicite et 60 réponses booléennes, recalcule les scores côté serveur,
puis utilise les trois champs facultatifs d'intérêts et d'expériences. Les notes
de dialogue et le plan d'action ne sont pas transmis à Gemini. Le rapport doit
atteindre son marqueur final avant d'être ajouté au carnet ou au PDF ; un texte
interrompu est signalé comme incomplet.

Sans option de sauvegarde, le carnet reste en mémoire jusqu'au rechargement.
La sauvegarde sur l'appareil est volontaire, isolée sous
`egogramme_orientation_v1`, avec effacement explicite. Aucune écriture du carnet
en base Supabase ni ajout à Mon Espace. L'accord IA n'est pas sauvegardé.
Le PDF contient le bilan terminé, les questions, les notes et le plan d'action.

Tests ciblés : `node --test tests/orientation.test.cjs tests/apel-session.test.cjs`.

### Statistiques Orientation (S2)

Appliquer `supabase/migrations/20261115090000_orientation_events.sql` dans le
SQL Editor du projet Supabase avant de publier cette version. La table privée
`orientation_events` n'est lisible ni inscriptible avec les rôles publics.
`POST /api/public/track-orientation` accepte exclusivement les identifiants
aléatoires, types d'événements et métadonnées contrôlées ; les dates sont définies
par la base. Il refuse tout champ supplémentaire, dont réponses, notes et scores.
Les renvois HTTP conservent le même identifiant d'événement (insertion idempotente).

Le compteur `pdf_downloaded` est envoyé après création réussie du PDF et
déclenchement du téléchargement navigateur. Deux téléchargements ont deux
identifiants distincts, même le même jour sur le même réseau. Cela ne prouve
pas l'enregistrement sur disque. Les échecs de création ne sont pas comptés.
Les erreurs de suivi sont journalisées sans masquer la disponibilité du carnet.

`GET /api/admin/orientation-stats?since=ISO` vérifie le jeton Supabase et l'adresse
administrateur côté serveur. Il pagine les événements de la période jusqu'à un
instant figé, sans tronquer silencieusement les résultats, et retourne aussi le
total PDF depuis le début. L'absence de table affiche une erreur, pas des zéros.
La section `/stats` réutilise les périodes existantes, dont aujourd'hui par heure
par défaut, et dispose d'une actualisation indépendante.

Les visites comptent les ouvertures de page ; les autres étapes sont comptées
par parcours, pas par élève ou adresse IP. Un identifiant reste en mémoire, ou
dans le carnet si sa sauvegarde volontaire est activée. Les carnets version 1
sans identifiant restent compatibles, sans reconstitution d'événements anciens.
Les ouvertures du volet parent ne prouvent pas une discussion.

Les taux de complétion et de premier essai portent sur les mêmes parcours
démarrés dans la période. Un essai préparé exige une action et une échéance
non vides, pas sa réalisation. La progression par blocs est cumulative pour
cette cohorte : atteindre 60 questions implique avoir atteint les blocs précédents.
Les demandes IA ont un identifiant distinct ; seules les demandes de la période
ayant reçu un résultat participent au taux d'échec. La médiane concerne leurs
réussites, et les demandes sans résultat reçu restent séparées. L'IA est facultative.
Le signal navigateur Do Not Track est respecté.

Tests : `node --test tests/orientation-stats.test.cjs tests/orientation.test.cjs tests/apel-session.test.cjs`.
