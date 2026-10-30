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
dernière), rapports personnels et collectif en PDF, puis accords modifiables.
Seuls les accords explicitement retenus sont inclus dans leur PDF.

La séance est conservée dans `localStorage` sous `egogramme_apel_v1`, séparément
du solo et du duo. Elle reprend après un rechargement. Le bouton « Effacer cette
séance » supprime les réponses, rapports et accords de cet appareil. Sur un
ordinateur partagé, les rapports restent accessibles tant que la séance n'est
pas effacée. Les rapports ne sont ni envoyés ni ajoutés à Mon Espace.

La génération, déclenchée explicitement après accord des participants, utilise
`POST /api/analysis/apel-stream`. Le serveur valide les participants et leurs
60 réponses puis calcule les scores avec le mapping partagé. Les fonctions
contextualisent les exemples sans déterminer le profil. Aucun résultat n'est
écrit dans Supabase par ce parcours. Les analyses terminées sont conservées
localement ; la reprise ne relance que les rapports manquants.

Le logo est un asset fourni pour ce parcours indépendant, sans affiliation
officielle. L'atelier ne doit pas servir à évaluer une aptitude à une fonction.
