import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Download, Compass, RotateCcw } from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/egogram-categories";
import { egogramScores } from "@/lib/egogram-scoring";
import { EgogramCard } from "@/components/egogram-card";
import { MarkdownText } from "@/components/markdown-text";
import { streamAnalysis } from "@/lib/stream-client";
import { downloadIndividualReportPdf } from "@/lib/team-report";
import { trackOrientation } from "@/lib/track-orientation";
import { orientationPlanReady } from "@/lib/orientation-stats";
import {
  ORIENTATION_QUESTIONS,
  ORIENTATION_STRENGTHS,
  ORIENTATION_STORAGE_KEY,
  ORIENTATION_END,
  newOrientationSession,
  orientationSessionSchema,
  orientationAnalysisSchema,
  orientationFocus,
  orientationEvidence,
  buildOrientationNotebook,
  type OrientationSession,
} from "@/lib/orientation";

const STEPS = [
  {
    stage: "test",
    title: "Me connaître",
    photo: "connaitre",
    alt: "Une lycéenne réfléchit devant son ordinateur.",
  },
  {
    stage: "explore",
    title: "Explorer des métiers",
    photo: "explorer",
    alt: "Trois lycéens échangent autour d'un travail.",
  },
  {
    stage: "talk",
    title: "En parler",
    photo: "dialogue",
    alt: "Un jeune et un adulte échangent autour d'une table.",
  },
  {
    stage: "try",
    title: "Essayer",
    photo: "essayer",
    alt: "Deux jeunes devant un établissement, prêts à découvrir la suite.",
  },
] as const;

const CONTRACT =
  "<!-- THESIS: Un carnet de choix ouverts, pas un verdict de métiers. OWN-WORLD: Typographie Nunito Sans et teal du parcours existant, photographies intactes, champs explicites. STORY: Se connaître, explorer, dialoguer si souhaité, essayer. FIRST VIEWPORT: Texte et action à gauche, photographie de réflexion à droite; trois scènes suivantes sous le premier écran. FORM: Parcours en quatre scènes, structure 4, seed e482d899; choix validé, une étape active sur mobile. -->";

const HOME_SEARCH = { ref: undefined, inv: undefined, contexte: undefined, duo: undefined };

export function OrientationWorkshop() {
  const [session, setSession] = useState<OrientationSession>(newOrientationSession);
  const [loaded, setLoaded] = useState(false);
  const [remember, setRemember] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<CategoryKey>("A");
  const [showParent, setShowParent] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const observed = useRef({
    visitId: "",
    started: false,
    blocks: new Set<number>(),
    complete: false,
    planReady: false,
  });

  useEffect(() => {
    let restored = newOrientationSession();
    try {
      const raw = window.localStorage.getItem(ORIENTATION_STORAGE_KEY);
      if (raw) {
        const saved = orientationSessionSchema.parse(JSON.parse(raw));
        restored = saved;
        setSelected(orientationFocus(saved.answers)[0] ?? "A");
        setRemember(true);
      }
    } catch {
      console.warn("orientation: saved notebook unavailable");
      setStorageReady(false);
      setStorageError(
        "Le carnet enregistré n'a pas pu être ouvert. Tu peux continuer sans sauvegarde ou effacer ce carnet.",
      );
    }
    // Restored work is not backfilled into usage statistics.
    observed.current = {
      visitId: "",
      started: restored.stage !== "welcome" || restored.answers.some((answer) => answer !== null),
      blocks: new Set(
        Array.from({ length: 6 }, (_, block) => block + 1).filter((block) =>
          restored.answers.slice((block - 1) * 10, block * 10).every((answer) => answer !== null),
        ),
      ),
      complete: restored.answers.every((answer) => answer !== null),
      planReady: orientationPlanReady(restored.plan),
    };
    setSession({ ...restored, analyticsId: restored.analyticsId ?? crypto.randomUUID() });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !session.analyticsId) return;
    const current = observed.current;
    if (current.visitId !== session.analyticsId) {
      current.visitId = session.analyticsId;
      trackOrientation(session.analyticsId, "visit");
    }
    for (let block = 1; block <= 6; block++) {
      if (
        !current.blocks.has(block) &&
        session.answers.slice((block - 1) * 10, block * 10).every((answer) => answer !== null)
      ) {
        current.blocks.add(block);
        trackOrientation(session.analyticsId, "block_completed", { block });
      }
    }
    if (!current.complete && session.answers.every((answer) => answer !== null)) {
      current.complete = true;
      trackOrientation(session.analyticsId, "test_completed");
    }
    const ready = orientationPlanReady(session.plan);
    if (ready && !current.planReady) trackOrientation(session.analyticsId, "plan_ready");
    current.planReady = ready;
  }, [loaded, session.analyticsId, session.answers, session.plan]);

  useEffect(() => {
    if (!loaded || !storageReady) return;
    try {
      if (remember) {
        window.localStorage.setItem(ORIENTATION_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(ORIENTATION_STORAGE_KEY);
      }
    } catch {
      console.warn("orientation: local storage unavailable");
      setStorageReady(false);
      setStorageError(
        "La sauvegarde sur cet appareil est indisponible. Garde cette page ouverte et télécharge ton carnet avant de partir.",
      );
    }
  }, [session, remember, loaded, storageReady]);

  useEffect(() => {
    if (loaded) heading.current?.focus();
  }, [session.stage, session.block, loaded]);

  const complete = session.answers.every((answer) => answer !== null);
  const answered = session.answers.filter((answer) => answer !== null).length;
  const scores = egogramScores(session.answers);
  const focus = orientationFocus(session.answers);
  const strength = ORIENTATION_STRENGTHS[selected];
  const evidence = orientationEvidence(session.answers, selected);
  const stageIndex = STEPS.findIndex((step) => step.stage === session.stage);
  const currentStep = STEPS[Math.max(0, stageIndex)];
  const blockStart = session.block * 10;
  const blockRemaining = session.answers
    .slice(blockStart, blockStart + 10)
    .filter((answer) => answer === null).length;

  const go = (stage: OrientationSession["stage"]) => {
    if (busy || (stage !== "welcome" && stage !== "test" && !complete)) return;
    if (stage === "test" && !observed.current.started) {
      observed.current.started = true;
      trackOrientation(session.analyticsId, "started");
    }
    setError("");
    setSession((previous) => ({ ...previous, stage }));
  };

  const answerQuestion = (index: number, answer: boolean) => {
    setSession((previous) => ({
      ...previous,
      answers: previous.answers.map((value, i) => (i === index ? answer : value)),
      report: "",
    }));
    setDraft("");
  };

  const changeReflection = (key: keyof OrientationSession["reflection"], value: string) => {
    setSession((previous) => ({
      ...previous,
      reflection: { ...previous.reflection, [key]: value },
      report: "",
    }));
    setDraft("");
  };

  const changeNote = (key: string, value: string) =>
    setSession((previous) => ({ ...previous, notes: { ...previous.notes, [key]: value } }));

  const changeRemember = (value: boolean) => {
    setStorageReady(true);
    setStorageError("");
    setRemember(value);
  };

  const changePlan = (key: keyof OrientationSession["plan"], value: string) =>
    setSession((previous) => ({ ...previous, plan: { ...previous.plan, [key]: value } }));

  const generate = async () => {
    if (inFlight.current) return;
    const request = orientationAnalysisSchema.safeParse({
      consent,
      answers: session.answers,
      reflection: session.reflection,
    });
    if (!request.success) {
      setError(
        "Termine les 60 questions et donne ton accord pour transmettre tes réponses à l'IA.",
      );
      return;
    }
    inFlight.current = true;
    setConfirmReset(false);
    setBusy(true);
    setError("");
    setDraft("");
    const attemptId = crypto.randomUUID();
    const requestedAt = performance.now();
    const duration = () => Math.round(performance.now() - requestedAt);
    trackOrientation(session.analyticsId, "ai_requested", { attempt_id: attemptId });
    try {
      const report = await streamAnalysis(
        "/api/analysis/orientation-stream",
        request.data,
        setDraft,
      );
      if (!report.trimEnd().endsWith(ORIENTATION_END)) {
        throw new Error(
          "L'analyse a été interrompue. Le texte affiché est incomplet : réessaie pour obtenir un bilan entier.",
        );
      }
      setSession((previous) => ({ ...previous, report }));
      setDraft("");
      trackOrientation(session.analyticsId, "ai_completed", {
        attempt_id: attemptId,
        duration_ms: duration(),
      });
    } catch (failure) {
      trackOrientation(session.analyticsId, "ai_failed", {
        attempt_id: attemptId,
        duration_ms: duration(),
      });
      setError(
        failure instanceof Error
          ? failure.message
          : "L'analyse n'a pas abouti. Réessaie plus tard.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const download = async () => {
    setExporting(true);
    setError("");
    try {
      await downloadIndividualReportPdf({
        name: "Mon carnet d'orientation",
        date: new Date().toLocaleDateString("fr-FR"),
        scores,
        analysis: buildOrientationNotebook(session),
      });
      trackOrientation(session.analyticsId, "pdf_downloaded");
    } catch {
      setError(
        "Le PDF n'a pas pu être créé. Ton carnet reste affiché ; réessaie le téléchargement.",
      );
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    if (inFlight.current) return;
    try {
      window.localStorage.removeItem(ORIENTATION_STORAGE_KEY);
    } catch {
      setStorageError(
        "Le carnet ne peut pas être effacé du stockage de ce navigateur. Vérifie ses réglages avant de fermer la page.",
      );
      return;
    }
    observed.current = {
      visitId: "",
      started: false,
      blocks: new Set(),
      complete: false,
      planReady: false,
    };
    setSession({ ...newOrientationSession(), analyticsId: crypto.randomUUID() });
    setRemember(false);
    setStorageReady(true);
    setConsent(false);
    setDraft("");
    setError("");
    setStorageError("");
    setConfirmReset(false);
    setShowParent(false);
  };

  const selectExperiment = () => {
    setSession((previous) => ({
      ...previous,
      stage: "try",
      plan: { ...previous.plan, experiment: strength.experiment },
    }));
  };

  const report = draft || session.report;

  return (
    <div className="orientation" lang="fr">
      <div dangerouslySetInnerHTML={{ __html: CONTRACT }} />
      <header className="ori-header">
        <Link to="/" search={HOME_SEARCH} className="ori-brand">
          <Compass aria-hidden="true" /> Égogramme
        </Link>
        <Link to="/" search={HOME_SEARCH} className="ori-return">
          Retour au test classique <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <main className="ori-main">
        {storageError && (
          <p role="alert" className="ori-error">
            {storageError}
          </p>
        )}
        {session.stage === "welcome" ? (
          <>
            <section className="ori-hero">
              <div className="ori-hero-copy">
                <h1 ref={heading} tabIndex={-1}>
                  Ton avenir ne tient pas dans une case.
                </h1>
                <p className="ori-lead">
                  Mieux te connaître. Explorer des métiers. Trouver ton prochain petit pas.
                </p>
                <p>
                  Tu es au lycée et tu te poses des questions sur la suite ? Pars de ta façon de
                  fonctionner, de ce que tu aimes et de ce que tu vis vraiment.
                </p>
                <button className="ori-primary" disabled={!loaded} onClick={() => go("test")}>
                  {answered ? "Reprendre mon parcours" : "Commencer mon parcours"}{" "}
                  <ArrowRight size={20} aria-hidden="true" />
                </button>
                <p className="ori-meta">60 questions · À ton rythme · Sans compte</p>
              </div>
              <figure className="ori-hero-image">
                <img
                  src="/orientation-connaitre.jpg"
                  width={762}
                  height={506}
                  alt={STEPS[0].alt}
                  fetchPriority="high"
                />
                <figcaption>Me connaître, avant de choisir.</figcaption>
              </figure>
            </section>
            <div className="ori-truth">
              <strong>Une piste de départ, pas un verdict.</strong>
              <p>
                L'égogramme aide à réfléchir à tes habitudes relationnelles. Il ne mesure pas tes
                talents et ne peut pas déterminer le métier qui te correspond. Tes envies, tes
                apprentissages et tes expériences restent essentiels.
              </p>
            </div>
            <section className="ori-scenes" aria-label="La suite du parcours">
              {STEPS.slice(1).map((step, i) => (
                <article key={step.stage}>
                  <img
                    src={`/orientation-${step.photo}.jpg`}
                    width={762}
                    height={506}
                    alt={step.alt}
                    loading="lazy"
                  />
                  <h2>
                    <span>{i + 2}</span> {step.title}
                  </h2>
                  <p>
                    {
                      [
                        "Des forces possibles et des exemples de métiers, avec des questions pour vérifier si tu en as vraiment envie.",
                        "Des questions pour toi et tes parents. Tu réponds en premier et tu choisis ce que tu veux partager.",
                        "Une petite expérience, une date et un bilan. Pas besoin de décider de toute ta vie aujourd'hui.",
                      ][i]
                    }
                  </p>
                </article>
              ))}
            </section>
            <section className="ori-start-note">
              <h2>Ton carnet, tes choix.</h2>
              <p>
                Les réponses sont calculées dans ton navigateur. L'analyse IA est facultative et
                nécessite un accord séparé. Ne saisis ni nom complet, ni lycée, ni coordonnées, ni
                information sensible.
              </p>
              <label className="ori-check">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={!loaded}
                  onChange={(event) => changeRemember(event.target.checked)}
                />
                <span>
                  Garder mon carnet sur cet appareil. Toute personne utilisant ce navigateur pourra
                  le retrouver ; évite cette option sur un ordinateur partagé.
                </span>
              </label>
              <button className="ori-primary" disabled={!loaded} onClick={() => go("test")}>
                C'est parti <ArrowRight size={18} aria-hidden="true" />
              </button>
            </section>
          </>
        ) : (
          <>
            <nav className="ori-steps" aria-label="Étapes du parcours">
              <ol>
                {STEPS.map((step, i) => (
                  <li key={step.stage}>
                    <button
                      aria-current={session.stage === step.stage ? "step" : undefined}
                      disabled={busy || (i > 0 && !complete)}
                      onClick={() => go(step.stage)}
                    >
                      <span>{i + 1}</span>
                      <span>{step.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="ori-mobile-step">
                Étape {stageIndex + 1} sur 4 · {currentStep.title}
              </p>
            </nav>

            {session.stage === "test" ? (
              <section className="ori-questionnaire">
                <div className="ori-question-header">
                  <h1 ref={heading} tabIndex={-1}>
                    Me connaître, sans bonne ni mauvaise réponse.
                  </h1>
                  <p>
                    Réponds toi-même en pensant à plusieurs situations : cours, maison, amis,
                    loisirs. Tes parents peuvent expliquer un mot, mais pas choisir une réponse à ta
                    place.
                  </p>
                  <p className="ori-meta">
                    « Parent » et « Enfant » sont ici des noms de modes de fonctionnement. Ils ne
                    désignent ni ton âge, ni tes parents.
                  </p>
                  <div className="ori-progress-label">
                    <span>
                      Questions {blockStart + 1} à {blockStart + 10}
                    </span>
                    <span>{answered} / 60 réponses</span>
                  </div>
                  <progress max={60} value={answered} aria-label="Réponses au questionnaire">
                    {answered} / 60
                  </progress>
                </div>
                {ORIENTATION_QUESTIONS.slice(blockStart, blockStart + 10).map((question, i) => {
                  const index = blockStart + i;
                  return (
                    <fieldset className="ori-question" key={index} disabled={busy}>
                      <legend>
                        <span>{index + 1}.</span> {question}
                      </legend>
                      <div className="ori-answer-row">
                        {[true, false].map((value) => (
                          <label
                            key={String(value)}
                            className={
                              session.answers[index] === value
                                ? "ori-answer is-chosen"
                                : "ori-answer"
                            }
                          >
                            <input
                              type="radio"
                              name={`ori-question-${index}`}
                              checked={session.answers[index] === value}
                              onChange={() => answerQuestion(index, value)}
                            />
                            {value ? "Plutôt vrai" : "Plutôt faux"}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
                <div className="ori-actions">
                  <button
                    className="ori-secondary"
                    disabled={busy}
                    onClick={() =>
                      session.block === 0
                        ? go("welcome")
                        : setSession((previous) => ({ ...previous, block: previous.block - 1 }))
                    }
                  >
                    <ArrowLeft size={18} aria-hidden="true" />{" "}
                    {session.block ? "Questions précédentes" : "Accueil"}
                  </button>
                  <button
                    className="ori-primary"
                    disabled={busy || blockRemaining > 0}
                    onClick={() => {
                      if (session.block < 5)
                        setSession((previous) => ({ ...previous, block: previous.block + 1 }));
                      else if (complete) {
                        setSelected(focus[0] ?? "A");
                        go("explore");
                      }
                    }}
                  >
                    {session.block === 5 ? "Découvrir mon carnet" : "Questions suivantes"}{" "}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
                <p className="ori-help" aria-live="polite">
                  {blockRemaining
                    ? `Encore ${blockRemaining} réponse${blockRemaining > 1 ? "s" : ""} à donner dans ce groupe.`
                    : "Tu peux continuer, ou prendre le temps de relire tes réponses."}
                </p>
              </section>
            ) : (
              <>
                <section className="ori-stage-intro">
                  <div>
                    <h1 ref={heading} tabIndex={-1}>
                      {
                        {
                          explore: "Des forces à explorer. Des métiers à découvrir.",
                          talk: "En parler, sans décider à ta place.",
                          try: "Un petit essai vaut mieux qu'une grande étiquette.",
                        }[session.stage]
                      }
                    </h1>
                    <p className="ori-lead">
                      {
                        {
                          explore:
                            "Ton égogramme ouvre des questions. Tes expériences leur donnent du sens.",
                          talk: "Tu réponds d'abord. Ton parent décrit ensuite ce qu'il a observé. Vous cherchez des exemples, pas une note.",
                          try: "Choisis une piste qui t'intrigue, teste un petit morceau de son quotidien, puis fais le bilan.",
                        }[session.stage]
                      }
                    </p>
                  </div>
                  <img
                    src={`/orientation-${currentStep.photo}.jpg`}
                    width={762}
                    height={506}
                    alt={currentStep.alt}
                  />
                </section>

                {(session.stage === "explore" || session.stage === "talk") && (
                  <>
                    {session.stage === "explore" && (
                      <div className="ori-summary">
                        <p>
                          {focus.length ? (
                            <>
                              Tu as davantage répondu « plutôt vrai » dans{" "}
                              {focus
                                .map((key) => CATEGORIES.find((c) => c.key === key)!.label)
                                .join(", ")}
                              . Ce ne sont pas des notes de talent.
                            </>
                          ) : (
                            "Tes six scores sont identiques : aucune dominante ne se dégage. Pars de tes envies et de tes expériences, sans forcer une interprétation."
                          )}
                        </p>
                        <details>
                          <summary>Voir mon égogramme et ses six dimensions</summary>
                          <EgogramCard
                            scores={scores}
                            compact
                            title="Mon égogramme"
                            subtitle="Nombre de réponses « plutôt vrai », sur 10 par dimension. Ni note scolaire, ni comparaison avec d'autres jeunes."
                            className="ori-chart"
                          />
                        </details>
                      </div>
                    )}
                    <section className="ori-strengths">
                      <h2>
                        {session.stage === "talk"
                          ? "Choisis un sujet pour votre échange"
                          : "Six sujets pour explorer tes forces possibles"}
                      </h2>
                      <p>
                        Aucune dimension ne résume une personne. Tu peux explorer chacune, quel que
                        soit son score.
                      </p>
                      <div
                        className="ori-dimensions"
                        role="group"
                        aria-label="Choisir une dimension de réflexion"
                      >
                        {CATEGORIES.map((c) => (
                          <button
                            key={c.key}
                            disabled={busy}
                            aria-pressed={selected === c.key}
                            onClick={() => setSelected(c.key)}
                          >
                            <span>{ORIENTATION_STRENGTHS[c.key].title}</span>
                            <small>
                              {c.label} · {scores[c.key]}/10
                            </small>
                          </button>
                        ))}
                      </div>
                      <div className="ori-strength-detail">
                        <div className="ori-strength-copy">
                          <h3>{strength.title}</h3>
                          <p>{strength.hypothesis}</p>
                          {session.stage === "explore" && (
                            <>
                              <details className="ori-evidence">
                                <summary>Sur quelles réponses réfléchir ?</summary>
                                {evidence.length ? (
                                  <ul>
                                    {evidence.map((item) => (
                                      <li key={item.number}>
                                        Question {item.number} — {item.text}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>
                                    Aucune réponse « plutôt vrai » dans cette dimension. Cela ne
                                    prouve pas que cette force te manque.
                                  </p>
                                )}
                                <p>
                                  Ce sont des réponses déclarées, pas des compétences observées.
                                </p>
                              </details>
                              <h4>Des exemples de métiers à explorer</h4>
                              <p>{strength.families}</p>
                            </>
                          )}
                          <p className="ori-caution">{strength.caution}</p>
                        </div>
                        <div className="ori-observation">
                          <label htmlFor="ori-student-note">
                            <strong>Pour toi</strong>
                            <span>{strength.studentQuestion}</span>
                          </label>
                          <textarea
                            id="ori-student-note"
                            rows={4}
                            maxLength={2000}
                            value={session.notes[`${selected}-student`] ?? ""}
                            onChange={(event) =>
                              changeNote(`${selected}-student`, event.target.value)
                            }
                            placeholder="Un exemple vécu, ce que j'ai fait, ce que j'ai aimé…"
                          />
                          <p className="ori-help">
                            Cette note reste dans le carnet, sans envoi à l'IA.
                          </p>
                          {session.stage === "talk" && (
                            <>
                              <label className="ori-check">
                                <input
                                  type="checkbox"
                                  checked={showParent}
                                  onChange={(event) => {
                                    setShowParent(event.target.checked);
                                    if (event.target.checked)
                                      trackOrientation(session.analyticsId, "parent_opened");
                                  }}
                                />
                                <span>Je souhaite ajouter une observation de mon parent.</span>
                              </label>
                              {showParent && (
                                <>
                                  <label htmlFor="ori-parent-note">
                                    <strong>Pour ton parent</strong>
                                    <span>{strength.parentQuestion}</span>
                                  </label>
                                  <textarea
                                    id="ori-parent-note"
                                    rows={4}
                                    maxLength={2000}
                                    value={session.notes[`${selected}-parent`] ?? ""}
                                    onChange={(event) =>
                                      changeNote(`${selected}-parent`, event.target.value)
                                    }
                                    placeholder="J'ai observé une situation précise…"
                                  />
                                  <p className="ori-help">
                                    Décris des faits, sans comparer, interpréter ou choisir un
                                    métier à sa place. Cette note n'est pas envoyée à l'IA.
                                  </p>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {session.stage === "talk" && (
                        <div className="ori-experiment">
                          <h3>Pour ancrer cette piste dans le quotidien</h3>
                          <p>{strength.experiment}</p>
                          <button className="ori-secondary" onClick={selectExperiment}>
                            Choisir cet essai <ArrowRight size={18} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </section>
                  </>
                )}

                {session.stage === "explore" && (
                  <section className="ori-ai">
                    <h2>Mes envies rendent les pistes plus personnelles.</h2>
                    <p>
                      Ces trois réponses sont facultatives. Elles aident l'IA à ne pas se limiter
                      aux scores. Si tu les laisses vides, elle proposera seulement des exemples
                      exploratoires.
                    </p>
                    <fieldset disabled={busy} className="ori-reflection">
                      <label htmlFor="ori-interests">
                        Qu'est-ce que tu aimes faire ou apprendre, même en dehors du lycée ?
                      </label>
                      <textarea
                        id="ori-interests"
                        rows={3}
                        maxLength={600}
                        value={session.reflection.interests}
                        onChange={(event) => changeReflection("interests", event.target.value)}
                        placeholder="Des activités, matières ou sujets qui t'attirent…"
                      />
                      <label htmlFor="ori-proud">
                        Raconte un moment où tu étais fier de ce que tu avais fait.
                      </label>
                      <textarea
                        id="ori-proud"
                        rows={3}
                        maxLength={600}
                        value={session.reflection.proudMoment}
                        onChange={(event) => changeReflection("proudMoment", event.target.value)}
                        placeholder="Ce qui s'est passé et ce que tu as fait concrètement…"
                      />
                      <label htmlFor="ori-curiosity">
                        Quel métier ou domaine aimerais-tu découvrir ?
                      </label>
                      <textarea
                        id="ori-curiosity"
                        rows={2}
                        maxLength={600}
                        value={session.reflection.curiosity}
                        onChange={(event) => changeReflection("curiosity", event.target.value)}
                        placeholder="Même une idée encore floue…"
                      />
                    </fieldset>
                    <p className="ori-help">
                      Pas de nom complet, de coordonnées, de lycée ou d'information sensible.
                      Modifier ces réponses efface le bilan précédent ; relance l'IA pour
                      l'actualiser.
                    </p>
                    <label className="ori-check">
                      <input
                        type="checkbox"
                        checked={consent}
                        disabled={busy}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      <span>
                        J'accepte de transmettre mes 60 réponses et ces trois champs au service IA
                        de Google (Gemini) pour générer mes pistes. Les notes de dialogue et mon
                        plan d'action ne seront pas envoyés. L'IA peut se tromper : je vérifierai
                        les pistes.
                      </span>
                    </label>
                    <button className="ori-primary" disabled={busy || !consent} onClick={generate}>
                      {busy
                        ? "Création de mes pistes…"
                        : session.report
                          ? "Refaire mon bilan IA"
                          : "Explorer mes pistes avec l'IA"}{" "}
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                    <p className="ori-help" aria-live="polite">
                      {busy
                        ? "L'analyse s'affiche progressivement. Ton carnet reste disponible si le service échoue."
                        : "Tu peux aussi continuer sans IA."}
                    </p>
                    {error && (
                      <p role="alert" className="ori-error">
                        {error}
                      </p>
                    )}
                    {report && (
                      <div className="ori-report" aria-busy={busy}>
                        <p className="ori-report-status">
                          {busy
                            ? "Analyse en cours — attends la fin avant de l'utiliser."
                            : draft
                              ? "Texte en cours ou incomplet — il n'est pas ajouté au PDF."
                              : "Bilan IA terminé · Hypothèses à vérifier"}
                        </p>
                        <MarkdownText text={report.replace(ORIENTATION_END, "")} />
                      </div>
                    )}
                  </section>
                )}

                {session.stage === "talk" && (
                  <div className="ori-truth">
                    <strong>Un échange facultatif, pas une validation obligatoire.</strong>
                    <p>
                      Tu peux en parler avec un autre adulte de confiance, ou continuer seul. Si vos
                      points de vue diffèrent, gardez les deux exemples et cherchez un petit essai
                      pour mieux comprendre. Tu n'as pas besoin de convaincre ton parent
                      aujourd'hui.
                    </p>
                  </div>
                )}

                {session.stage === "try" && (
                  <section className="ori-plan">
                    <h2>Mon prochain petit pas</h2>
                    <p>
                      Observer une activité, rencontrer un professionnel, visiter une formation,
                      faire un mini-projet… Choisis quelque chose de réaliste, sans engagement de
                      scolarité.
                    </p>
                    <label htmlFor="ori-career">Le métier ou le domaine que je veux explorer</label>
                    <input
                      id="ori-career"
                      maxLength={200}
                      value={session.plan.career}
                      onChange={(event) => changePlan("career", event.target.value)}
                      placeholder="Une piste qui m'intrigue…"
                    />
                    <label htmlFor="ori-experiment">Ce que je vais essayer concrètement</label>
                    <textarea
                      id="ori-experiment"
                      rows={4}
                      maxLength={1000}
                      value={session.plan.experiment}
                      onChange={(event) => changePlan("experiment", event.target.value)}
                      placeholder="Une petite action précise, pas « choisir mon métier »…"
                    />
                    <div className="ori-plan-pair">
                      <div>
                        <label htmlFor="ori-when">Quand ?</label>
                        <input
                          id="ori-when"
                          maxLength={200}
                          value={session.plan.when}
                          onChange={(event) => changePlan("when", event.target.value)}
                          placeholder="Une date ou un moment réaliste…"
                        />
                      </div>
                      <div>
                        <label htmlFor="ori-support">Qui peut m'aider ?</label>
                        <input
                          id="ori-support"
                          maxLength={300}
                          value={session.plan.support}
                          onChange={(event) => changePlan("support", event.target.value)}
                          placeholder="Un proche, un professeur, un professionnel…"
                        />
                      </div>
                    </div>
                    <label htmlFor="ori-learned">Après l'essai : ce que j'ai appris</label>
                    <textarea
                      id="ori-learned"
                      rows={4}
                      maxLength={1000}
                      value={session.plan.learned}
                      onChange={(event) => changePlan("learned", event.target.value)}
                      placeholder="Qu'ai-je aimé ? Qu'est-ce qui m'a moins plu ? Qu'aimerais-je apprendre ? Quelle autre piste essayer ?"
                    />
                    <div className="ori-close">
                      <strong>Changer d'avis fait aussi partie du chemin.</strong>
                      <p>
                        Tu peux garder une piste, en découvrir une autre ou prendre plus de temps.
                        Le but est d'apprendre sur toi, pas de te fixer une étiquette.
                      </p>
                    </div>
                  </section>
                )}

                <section className="ori-resources">
                  <h2>Vérifier les métiers et les formations</h2>
                  <p>
                    Pour aller plus loin, parle à ton professeur principal, à un Psy-EN (psychologue
                    de l'Éducation nationale) ou à un CIO (centre d'information et d'orientation).
                  </p>
                  <div>
                    <a href="https://www.onisep.fr/" target="_blank" rel="noreferrer">
                      Explorer les fiches Onisep <ArrowRight size={16} aria-hidden="true" />
                    </a>
                    <a
                      href="https://www.monorientationenligne.fr/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Échanger avec Mon orientation en ligne{" "}
                      <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                </section>
                <div className="ori-actions">
                  <button
                    className="ori-secondary"
                    disabled={busy}
                    onClick={() =>
                      go(
                        session.stage === "explore"
                          ? "test"
                          : session.stage === "talk"
                            ? "explore"
                            : "talk",
                      )
                    }
                  >
                    <ArrowLeft size={18} aria-hidden="true" /> Étape précédente
                  </button>
                  {session.stage !== "try" ? (
                    <button
                      className="ori-primary"
                      disabled={busy}
                      onClick={() => go(session.stage === "explore" ? "talk" : "try")}
                    >
                      {session.stage === "explore"
                        ? "En parler ou continuer seul"
                        : "Préparer mon prochain essai"}{" "}
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  ) : (
                    <button className="ori-primary" disabled={exporting} onClick={download}>
                      <Download size={18} aria-hidden="true" />{" "}
                      {exporting ? "Création du PDF…" : "Télécharger mon carnet PDF"}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {session.stage !== "welcome" && (
          <div className="ori-save">
            <label className="ori-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => changeRemember(event.target.checked)}
              />
              <span>Garder mon carnet sur cet appareil. À éviter sur un ordinateur partagé.</span>
            </label>
            <p className="ori-help">
              {storageError
                ? "La sauvegarde n'est pas à jour. Le carnet reste disponible dans cette page."
                : remember
                  ? "Ton carnet est conservé dans ce navigateur, pas dans Mon Espace. L'accord IA sera redemandé après un rechargement."
                  : "Sans sauvegarde, quitter ou recharger cette page efface ta progression."}
            </p>
            {complete && (
              <p className="ori-help">
                Le PDF contient toutes les notes saisies, y compris celles de ton parent. Relis-le
                avant de choisir à qui le partager.
              </p>
            )}
            {complete && session.stage !== "try" && (
              <button className="ori-text-button" disabled={busy || exporting} onClick={download}>
                <Download size={16} aria-hidden="true" /> Télécharger mon carnet PDF
              </button>
            )}
          </div>
        )}
        {error && session.stage !== "explore" && (
          <p role="alert" className="ori-error">
            {error}
          </p>
        )}
        <footer className="ori-footer">
          <Link to="/confidentialite">Confidentialité</Link>
          <button
            className="ori-text-button"
            disabled={busy || !loaded}
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw size={15} aria-hidden="true" /> Effacer mon carnet
          </button>
        </footer>
        {confirmReset && (
          <div className="ori-reset" role="group" aria-label="Confirmer l'effacement">
            <p>
              Effacer les réponses, le bilan et les notes de ce carnet sur cet appareil ? Cette
              action ne peut pas être annulée.
            </p>
            <button className="ori-secondary" onClick={() => setConfirmReset(false)}>
              Garder mon carnet
            </button>
            <button className="ori-danger" disabled={busy} onClick={reset}>
              Oui, effacer le carnet
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
