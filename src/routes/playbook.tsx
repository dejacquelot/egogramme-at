import { createFileRoute } from "@tanstack/react-router";
import playbookCss from "@/styles/playbook.css?url";

const TITLE = "Playbook — Gaëtan de Jacquelot, coach agile augmenté par l'IA";
const DESCRIPTION =
  "Six applications imaginées, construites et publiées avec l'IA : tests de personnalité, orientation, bureau d'association, suivi scolaire et jeu pour enfants.";
const LINKEDIN = "https://www.linkedin.com/in/gaetandejacquelot/";
const SITE = "https://egogramme-at.vercel.app";

type Work = {
  title: string;
  label: string;
  text: string;
  stack: string;
  href: string;
  host: string;
  image: string;
  external?: boolean;
  pan?: boolean;
};

const EGOGRAMME: Work[] = [
  {
    title: "Un moment pour soi",
    label: "Test individuel",
    text: "60 affirmations pour explorer sa façon de réagir, de communiquer et d'entrer en relation, avec une analyse personnalisée.",
    stack: "React · TanStack Start · Supabase · Gemini",
    href: "/",
    host: "egogramme-at.vercel.app",
    image: "/playbook/individuel.jpg",
    pan: true,
  },
  {
    title: "Votre couple mérite de beaux moments",
    label: "Couple",
    text: "Un seul écran pour deux, des pauses pour se parler, puis trois rapports : un pour chacun et un pour le duo.",
    stack: "Parcours à deux · Rapports PDF",
    href: "/duo",
    host: "egogramme-at.vercel.app/duo",
    image: "/playbook/duo.jpg",
    pan: true,
  },
  {
    title: "Ton avenir ne tient pas dans une case",
    label: "Orientation",
    text: "Un parcours pour lycéens : des forces possibles, des pistes de métiers, de petits essais et un dialogue facultatif avec les parents.",
    stack: "Carnet local · IA facultative",
    href: "/orientation",
    host: "egogramme-at.vercel.app/orientation",
    image: "/playbook/orientation.jpg",
    pan: true,
  },
  {
    title: "Notre bureau APEL",
    label: "Bureau d'association",
    text: "De 2 à 6 membres répondent sur un même écran, avec des pauses pour échanger, puis des rapports personnels et collectif.",
    stack: "Séance de groupe · Sans prénom conservé",
    href: "/apel",
    host: "egogramme-at.vercel.app/apel",
    image: "/playbook/apel.jpg",
    pan: true,
  },
];

const QUOTIDIEN: Work[] = [
  {
    title: "Suivi des notes École Directe",
    label: "Moyenne Famille",
    text: "Les moyennes de chaque enfant, les évaluations à anticiper, l'évolution face à la classe et une simulation de notes.",
    stack: "Google AI Studio · Gemini",
    href: "https://moyennes-ecole-directe.ai.studio/",
    host: "moyennes-ecole-directe.ai.studio",
    image: "/playbook/moyennes.jpg",
    external: true,
    pan: true,
  },
  {
    title: "Course au Château",
    label: "Galop Licorne",
    text: "Un jeu pour enfants : choisir son poney, sauter, éviter les bananes et attraper trois étoiles pour devenir licorne ailée.",
    stack: "Google AI Studio · Jeu",
    href: "https://course-de-licorne.ai.studio/",
    host: "course-de-licorne.ai.studio",
    image: "/playbook/licorne.jpg",
    external: true,
  },
];

const STEPS = [
  {
    title: "Partir d'un vrai besoin",
    text: "Une question d'un proche, d'un bureau d'association, d'un lycéen ou d'une famille.",
  },
  {
    title: "Prototyper avec l'IA",
    text: "Un agent de code écrit et corrige ; je garde la main sur le produit, les textes et les choix.",
  },
  {
    title: "Tester en situation",
    text: "Chaque version est relue sur mobile et ordinateur, puis confrontée aux personnes concernées.",
  },
  {
    title: "Publier, puis améliorer",
    text: "Mise en ligne continue et ajustements à partir des retours, par petites itérations.",
  },
];

export const Route = createFileRoute("/playbook")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `${SITE}/playbook/og.jpg` },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${SITE}/playbook/og.jpg` },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700&display=swap",
      },
      { rel: "stylesheet", href: playbookCss },
    ],
  }),
  component: PlaybookPage,
});

function WorkCard({ work, featured }: { work: Work; featured?: boolean }) {
  const linkProps = work.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a className={`pb-work${featured ? " pb-work--featured" : ""}`} href={work.href} {...linkProps}>
      <div className="pb-frame">
        <div className="pb-frame-bar" aria-hidden="true">
          {work.host}
        </div>
        <div className="pb-frame-view">
          <img
            src={work.image}
            alt={`Capture d'écran : ${work.label}`}
            loading="lazy"
            decoding="async"
            className={work.pan ? "pb-pan" : undefined}
          />
        </div>
      </div>
      <div className="pb-work-text">
        <h3>{work.label}</h3>
        <p className="pb-work-tagline">{work.title}</p>
        <p>{work.text}</p>
        <p className="pb-work-meta">
          <span>{work.stack}</span>
          <span className="pb-work-open">
            {work.external ? "Ouvrir l'application" : "Voir la page"}
            <span aria-hidden="true"> ↗</span>
            {work.external && <span className="pb-sr"> (nouvel onglet)</span>}
          </span>
        </p>
      </div>
    </a>
  );
}

function PlaybookPage() {
  return (
    <div className="pb">
      <header className="pb-top">
        <p className="pb-name">Gaëtan de Jacquelot</p>
        <a className="pb-top-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
          LinkedIn<span aria-hidden="true"> ↗</span>
          <span className="pb-sr"> (nouvel onglet)</span>
        </a>
      </header>

      <main>
        <section className="pb-hero">
          <h1>
            Des besoins concrets, devenus des applications <em>avec l'IA</em>.
          </h1>
          <div className="pb-hero-side">
            <p className="pb-lead">
              Coach agile, j'imagine, construis et publie des outils pour les couples, les lycéens,
              les associations et les familles. L'IA écrit une grande partie du code ; je garde le
              cap sur l'usage, les textes et la qualité.
            </p>
            <div className="pb-actions">
              <a className="pb-btn" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
                Voir mon profil LinkedIn
                <span className="pb-sr"> (nouvel onglet)</span>
              </a>
              <a className="pb-btn pb-btn--ghost" href="#galerie">
                Parcourir la galerie
              </a>
            </div>
            <p className="pb-tools">
              Agent de code IA · Google AI Studio · Gemini · React · Supabase · Vercel
            </p>
          </div>
        </section>

        <section id="galerie" className="pb-chapter" aria-labelledby="pb-ego">
          <div className="pb-chapter-head">
            <h2 id="pb-ego">Égogramme : un même test, quatre publics</h2>
            <p>
              Un questionnaire de 60 affirmations, décliné pour chaque situation. Le calcul reste
              identique ; l'expérience, les mots et les images changent selon les personnes.
            </p>
          </div>
          <div className="pb-grid">
            {EGOGRAMME.map((work, index) => (
              <WorkCard key={work.href} work={work} featured={index === 0 || index === 3} />
            ))}
          </div>
        </section>

        <section className="pb-chapter" aria-labelledby="pb-daily">
          <div className="pb-chapter-head">
            <h2 id="pb-daily">Projets du quotidien, créés avec Google AI Studio</h2>
            <p>
              Deux applications nées à la maison : l'une pour suivre la scolarité des enfants,
              l'autre pour les faire jouer.
            </p>
          </div>
          <div className="pb-grid">
            {QUOTIDIEN.map((work, index) => (
              <WorkCard key={work.href} work={work} featured={index === 0} />
            ))}
          </div>
        </section>

        <section className="pb-method" aria-labelledby="pb-method">
          <h2 id="pb-method">Ma façon de travailler avec l'IA</h2>
          <ol>
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-close">
          <h2>
            Une idée d'outil, un atelier, une équipe qui veut <em>essayer l'IA</em> ?
          </h2>
          <a className="pb-btn" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
            Échanger sur LinkedIn
            <span className="pb-sr"> (nouvel onglet)</span>
          </a>
        </section>
      </main>

      <footer className="pb-foot">
        <p>Gaëtan de Jacquelot · Playbook réalisé avec l'IA</p>
      </footer>
    </div>
  );
}
