import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { NavBar } from "@/components/nav-bar";
import { trackPage } from "@/lib/track-page";

const TITLE = "Test égogramme à deux — un beau moment pour mieux vous connaître";
const DESCRIPTION =
  "Un seul écran, deux personnes : répondez chacun à 60 affirmations, parlez de vos accords et de vos différences, et recevez 3 rapports. Environ 20 minutes, gratuit, sans inscription.";
const IMAGE = "https://egogramme-at.vercel.app/duo-couple.jpg";

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
      { property: "og:image", content: IMAGE },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: IMAGE },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Young+Serif&display=swap" },
      { rel: "preload", as: "image", href: "/duo-couple.jpg" },
    ],
  }),
  component: DuoLanding,
});

const SERIF = { fontFamily: '"Young Serif", Georgia, "Times New Roman", serif' };

const MOMENTS = [
  {
    when: "Pour commencer",
    title: "Côte à côte, un seul écran",
    text: "Chacun répond à ses 60 affirmations, vrai ou faux, à son rythme.",
  },
  {
    when: "Toutes les 10 questions",
    title: "Une pause pour vous parler",
    text: "Vous voyez vos accords et vos différences, avec une question pour en discuter.",
  },
  {
    when: "À la fin",
    title: "Trois rapports",
    text: "Un pour chacun et un pour votre duo, à télécharger en PDF.",
  },
];

// Extraits réels des questions posées pendant les pauses (duo-live-test.tsx).
const PROMPTS = [
  "Qu'est-ce que tu aimes le plus chez l'autre dans ce que tu viens de voir ?",
  "Qu'est-ce que tu aimerais que l'autre sache de toi, sans jamais l'avoir dit ?",
];

const FOCUS =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-violet-500";

function StartButton() {
  return (
    <a
      href="/?duo=1"
      className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-violet-700 px-7 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgba(91,33,182,0.8)] transition-colors duration-150 hover:bg-violet-800 sm:w-auto ${FOCUS}`}
    >
      Commencer à deux →
    </a>
  );
}

function DuoLanding() {
  const { de } = Route.useSearch();
  useEffect(() => {
    trackPage("duo", "visit");
  }, []);
  const plural = !!de && /\s(et|&)\s/i.test(de);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white text-slate-900">
      <NavBar />
      <main>
        <section className="mx-auto max-w-5xl px-5 pb-12 pt-6 sm:pt-10 md:pb-16 md:pt-14">
          {de && (
            <p className="mb-6 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-violet-900">
              💌 <strong>{de}</strong> {plural ? "vous invitent" : "vous invite"} à faire le test égogramme à deux.
            </p>
          )}
          <div className="grid items-center gap-8 md:grid-cols-[1fr_1.05fr] md:gap-12">
            <div className="order-2 md:order-1">
              <h1
                style={SERIF}
                className="text-[2.15rem] leading-[1.1] tracking-[-0.01em] [text-wrap:balance] sm:text-5xl"
              >
                Votre couple mérite de beaux moments
              </h1>
              <p className="mt-4 max-w-[34rem] text-lg leading-relaxed text-slate-700">
                Installez-vous côte à côte, un seul écran pour deux. Vous répondez chacun à vos
                60 affirmations, puis vous découvrez vos accords, vos différences, et vous prenez
                le temps d'en parler.
              </p>
              <div className="mt-7">
                <StartButton />
              </div>
              <p className="mt-3 text-sm text-slate-600">⏱️ Environ 20 minutes · Gratuit · Sans inscription</p>
            </div>
            <div className="order-1 md:order-2">
              <img
                src="/duo-couple.jpg"
                width={620}
                height={586}
                alt="Un couple souriant fait le test côte à côte devant un ordinateur portable"
                fetchPriority="high"
                className="aspect-[4/3] w-full rounded-2xl object-cover object-[50%_30%] shadow-[0_24px_48px_-24px_rgba(76,29,149,0.45)] md:aspect-auto"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#f8f1e7]">
          <figure className="mx-auto max-w-3xl px-5 py-12 text-center sm:py-16">
            <blockquote
              style={SERIF}
              className="text-2xl leading-snug text-[#3b2a1e] [text-wrap:balance] sm:text-[2rem]"
            >
              « Les tests de personnalité, c'est encore mieux à deux. J'ai adoré la fois où on l'a
              fait ensemble avec ma femme. »
            </blockquote>
            <figcaption className="mt-4 text-sm text-[#7a5c45]">Un participant</figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <h2 style={SERIF} className="text-[1.75rem] leading-tight [text-wrap:balance] sm:text-4xl">
            Vingt minutes rien que pour vous deux
          </h2>
          <ol className="mt-8 grid gap-7 md:grid-cols-3 md:gap-8">
            {MOMENTS.map((m) => (
              <li key={m.title} className="border-t-2 border-violet-200 pt-4">
                <p className="text-sm font-semibold text-violet-700">{m.when}</p>
                <p className="mt-1 text-lg font-semibold">{m.title}</p>
                <p className="mt-1 leading-relaxed text-slate-600">{m.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-12">
            <div>
              <h3 style={SERIF} className="text-2xl leading-tight [text-wrap:balance]">
                Des questions qui ouvrent la conversation
              </h3>
              <p className="mt-3 max-w-[30rem] leading-relaxed text-slate-600">
                À chaque pause, une question vous invite à parler de ce que vous venez de
                découvrir. Par exemple :
              </p>
            </div>
            <div className="space-y-3">
              <p className="mr-8 rounded-2xl rounded-bl-sm bg-violet-700 px-5 py-4 leading-relaxed text-white sm:mr-14">
                {PROMPTS[0]}
              </p>
              <p className="ml-8 rounded-2xl rounded-br-sm bg-[#f8f1e7] px-5 py-4 leading-relaxed text-[#3b2a1e] sm:ml-14">
                {PROMPTS[1]}
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-violet-100">
          <div className="mx-auto max-w-3xl px-5 py-12 text-center sm:py-16">
            <h2 style={SERIF} className="text-[1.75rem] leading-tight sm:text-4xl">
              Ce n'est pas un jugement
            </h2>
            <p className="mx-auto mt-4 max-w-[60ch] text-lg leading-relaxed text-slate-700">
              C'est une grille de lecture issue de l'Analyse Transactionnelle, pour se dire ses
              qualités et ses petits défauts avec bienveillance.
            </p>
            <p className="mx-auto mt-3 max-w-[60ch] leading-relaxed text-slate-600">
              Pour un couple, des amis, une famille, ou deux collègues qui veulent mieux travailler
              ensemble.
            </p>

            <p style={SERIF} className="mt-12 text-2xl [text-wrap:balance]">
              Faites-le avec la personne à côté de vous.
            </p>
            <div className="mt-6">
              <StartButton />
            </div>
            <p className="mx-auto mt-5 max-w-[60ch] text-xs leading-relaxed text-slate-500">
              🔒 Anonyme : vous décidez ensuite si vous voulez garder une trace de vos résultats. Pas un
              diagnostic clinique, une grille de lecture pour mieux communiquer.
            </p>
            <p className="mt-6 text-sm">
              <a
                href="/"
                className={`rounded text-slate-600 underline underline-offset-4 hover:text-slate-900 ${FOCUS}`}
              >
                Je préfère faire le test individuel
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
