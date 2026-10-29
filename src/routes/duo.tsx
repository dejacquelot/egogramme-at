import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/nav-bar";

const TITLE = "Test égogramme à deux — mieux vous connaître en binôme";
const DESCRIPTION =
  "Deux personnes, un seul écran : répondez ensemble, découvrez vos différences et recevez 2 rapports individuels + 1 rapport à deux.";

export const Route = createFileRoute("/duo")({
  validateSearch: (search: Record<string, unknown>) => ({
    de:
      typeof search.de === "string" && search.de.trim()
        ? search.de.trim().slice(0, 60)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: DuoLanding,
});

const STEPS = [
  { icon: "👥", title: "Vous répondez ensemble", text: "Un seul écran, 60 affirmations, chacun sa réponse." },
  { icon: "💬", title: "Toutes les 10 questions", text: "Vous découvrez vos accords et vos différences, et vous en parlez." },
  { icon: "📄", title: "3 rapports à la fin", text: "Un pour chacun, un pour votre duo, à télécharger en PDF." },
];

function DuoLanding() {
  const { de } = Route.useSearch();
  const plural = !!de && /\s(et|&)\s/i.test(de);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {de && (
          <p className="mb-5 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-violet-900 shadow-sm">
            💌 <strong>{de}</strong> {plural ? "vous invitent" : "vous invite"} à faire le test égogramme à deux.
          </p>
        )}
        <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Mieux vous connaître, à deux
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Couple, amis, famille, collègues : partagez vos qualités et vos petits défauts, et repartez avec une
          meilleure compréhension de vous-mêmes et de votre binôme. Environ 20 minutes, sans inscription.
        </p>

        <ol className="mt-8 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-2xl" aria-hidden>{s.icon}</span>
              <div>
                <p className="font-semibold text-slate-900">
                  {i + 1}. {s.title}
                </p>
                <p className="text-sm text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <a
          href="/?duo=1"
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-violet-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-violet-800 sm:w-auto"
        >
          Commencer à deux →
        </a>
        <p className="mt-4 text-xs text-slate-500">
          🔒 Anonyme : vous décidez ensuite si vous voulez garder une trace de vos résultats. Test d'analyse
          transactionnelle, une grille de lecture pour mieux communiquer, pas un diagnostic clinique.
        </p>
        <p className="mt-6 text-sm">
          <a href="/" className="text-slate-500 underline-offset-2 hover:underline">
            Je préfère faire le test seul(e)
          </a>
        </p>
      </main>
    </div>
  );
}
