import { useEffect, useRef, useState } from "react";
import { MarkdownText } from "@/components/markdown-text";
import { QUESTION_VARIANTS } from "@/lib/question-variants";
import { streamAnalysis } from "@/lib/stream-client";
import {
  APEL_BLOCK,
  APEL_MAX_MEMBERS,
  APEL_STORAGE_KEY,
  APEL_TOTAL,
  apelAverage,
  apelScores,
  apelSessionSchema,
  continueApelPause,
  newApelMember,
  newApelSession,
  nextApelQuestion,
  type ApelMember,
  type ApelSession,
} from "@/lib/apel-session";
import {
  downloadAgreementsPdf,
  downloadIndividualReportPdf,
  downloadTeamReportPdf,
} from "@/lib/team-report";

const DISCUSSIONS = [
  "Dans quelle situation de la vie de votre association avez-vous observé ces différences ?",
  "Comment aimez-vous recevoir de l'aide quand vous préparez un événement ?",
  "Quelle différence pourrait devenir une force pour votre prochaine réunion ?",
  "Comment pourriez-vous mieux vous répartir les tâches sans surcharger personne ?",
  "De quoi chacun a-t-il besoin pour exprimer un désaccord sereinement ?",
  "Quel point commun ou quelle différence souhaitez-vous garder en tête pour la suite ?",
];
const STAGES = ["Participants", "Questionnaire", "Pause ensemble", "Rapports", "Nos accords"];
const stageOf = (s: ApelSession) =>
  ({
    participants: 0,
    test: 1,
    pause: 2,
    reports: 3,
    agreements: 4,
  })[s.step];
const displayName = (m: ApelMember) => `${m.name.trim()} (${m.role})`;

export function ApelWorkshop() {
  const [s, setS] = useState<ApelSession>(newApelSession);
  const current = useRef(s);
  const busy = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("");
  const [partial, setPartial] = useState("");
  const [tab, setTab] = useState("collective");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [copied, setCopied] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  function update(next: ApelSession) {
    current.current = next;
    setS(next);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(APEL_STORAGE_KEY);
      if (raw) {
        const parsed = apelSessionSchema.parse(JSON.parse(raw));
        current.current = parsed;
        setS(parsed);
      }
    } catch (e) {
      console.error("APEL session recovery failed", e);
      setStorageBlocked(true);
      setStorageWarning(
        "La séance enregistrée ne peut pas être récupérée. Elle n'a pas été écrasée. Vous pouvez l'effacer pour démarrer une nouvelle séance.",
      );
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || storageBlocked) return;
    try {
      localStorage.setItem(APEL_STORAGE_KEY, JSON.stringify(s));
      setStorageWarning("");
    } catch (e) {
      console.error("APEL session storage failed", e);
      setStorageWarning(
        "La sauvegarde sur cet appareil est indisponible. Gardez cette page ouverte et téléchargez vos rapports avant de partir.",
      );
    }
  }, [s, loaded, storageBlocked]);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [s.step, s.cur]);

  const present = s.members.filter((m) => m.present);
  const allAnswered = present.length >= 2 && present.every((m) => m.answers[s.cur] !== null);
  const allReports = !!s.collective && present.every((m) => !!m.report);
  const activeMember = present.find((m) => m.id === tab);
  const activeReport = tab === "collective" ? s.collective : activeMember?.report;
  const date = new Date(s.completedAt ?? Date.now()).toLocaleDateString("fr-FR", {
    dateStyle: "long",
  });

  function changeMember(id: string, patch: Partial<ApelMember>) {
    update({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }

  function start() {
    if (!s.consent || present.length < 2 || present.some((m) => !m.name.trim() || !m.role.trim())) {
      setError(
        "Sélectionnez au moins deux participants, indiquez leurs prénoms et fonctions, puis confirmez l'accord de tous.",
      );
      return;
    }
    setError("");
    update({
      ...s,
      step: "test",
      members: s.members.map((m) => ({ ...m, name: m.name.trim(), role: m.role.trim() })),
    });
  }

  function reset() {
    if (
      busy.current ||
      !window.confirm(
        "Effacer cette séance de cet appareil, y compris les réponses, rapports et accords ?",
      )
    )
      return;
    try {
      localStorage.removeItem(APEL_STORAGE_KEY);
    } catch (e) {
      console.error("APEL session deletion failed", e);
      setStorageWarning(
        "Impossible d'effacer la séance du stockage de ce navigateur. Autorisez le stockage puis réessayez.",
      );
      return;
    }
    setStorageBlocked(false);
    setStorageWarning("");
    setError("");
    setPdfError("");
    setTab("collective");
    update(newApelSession());
  }

  async function generate() {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    setError("");
    try {
      const validated = apelSessionSchema.parse(current.current);
      if (!["reports", "agreements"].includes(validated.step))
        throw new Error("Terminez d'abord le questionnaire.");
      for (const member of validated.members.filter((m) => m.present)) {
        if (current.current.members.find((m) => m.id === member.id)?.report) continue;
        setTask(`Rédaction du rapport de ${member.name}`);
        setPartial("");
        const text = await streamAnalysis(
          "/api/analysis/apel-stream",
          {
            mode: "individual",
            consent: true,
            members: [{ name: member.name, role: member.role, answers: member.answers }],
          },
          setPartial,
        );
        if (!text.trim()) throw new Error(`Le rapport de ${member.name} est vide. Réessayez.`);
        const latest = current.current;
        update({
          ...latest,
          members: latest.members.map((m) => (m.id === member.id ? { ...m, report: text } : m)),
        });
      }
      if (!current.current.collective) {
        setTask("Rédaction du rapport des membres présents");
        setPartial("");
        const text = await streamAnalysis(
          "/api/analysis/apel-stream",
          {
            mode: "collective",
            consent: true,
            members: current.current.members
              .filter((m) => m.present)
              .map((m) => ({ name: m.name, role: m.role, answers: m.answers })),
          },
          setPartial,
        );
        if (!text.trim()) throw new Error("Le rapport collectif est vide. Réessayez.");
        update({ ...current.current, collective: text });
      }
    } catch (e) {
      console.error("APEL report generation failed", e);
      setError(
        e instanceof Error
          ? e.message
          : "La génération a échoué. Vos réponses sont conservées sur cet appareil.",
      );
    } finally {
      busy.current = false;
      setRunning(false);
      setTask("");
      setPartial("");
    }
  }

  async function download(kind: "report" | "agreements") {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPdfError("");
    try {
      if (kind === "agreements") {
        const accepted = s.agreements.filter((a) => a.accepted && a.text.trim());
        await downloadAgreementsPdf({
          date: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
          members: present.map(displayName),
          agreements: accepted,
        });
      } else if (tab === "collective" && s.collective) {
        await downloadTeamReportPdf({
          teamName: "Membres présents du bureau APEL",
          average: apelAverage(present),
          members: present.map((m) => ({
            name: displayName(m),
            date,
            scores: apelScores(m.answers),
          })),
          analysis: s.collective,
        });
      } else if (activeMember?.report) {
        await downloadIndividualReportPdf({
          name: displayName(activeMember),
          date,
          scores: apelScores(activeMember.answers),
          analysis: activeMember.report,
        });
      } else {
        throw new Error("Ce rapport n'est pas encore disponible.");
      }
    } catch (e) {
      console.error("APEL PDF failed", e);
      setPdfError(e instanceof Error ? e.message : "Téléchargement impossible. Réessayez.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function shareLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/apel`);
      setCopied(true);
    } catch (e) {
      console.error("APEL link copy failed", e);
      setError("Copie impossible. Copiez l'adresse de cette page pour la partager.");
    }
  }

  if (!loaded)
    return (
      <p className="apel-loading" role="status">
        Chargement de votre séance…
      </p>
    );

  return (
    <div className="apel">
      <header className="apel-header">
        <div>
          <a href="/">Égogramme</a>
          <p>Un moment pour votre bureau APEL</p>
        </div>
        <img src="/apel-logo.png" alt="APEL" width={95} height={68} />
      </header>
      <nav className="apel-stages" aria-label="Progression de la séance">
        <ol>
          {STAGES.map((stage, i) => (
            <li key={stage} aria-current={stageOf(s) === i ? "step" : undefined}>
              {i + 1}. {stage}
            </li>
          ))}
        </ol>
      </nav>
      <main className="apel-main">
        <div className="apel-tools">
          <a href="/">← Accueil</a>
          <button type="button" className="apel-text" disabled={running} onClick={reset}>
            Effacer cette séance
          </button>
        </div>
        {storageWarning && (
          <p className="apel-alert" role="alert">
            {storageWarning}
          </p>
        )}
        {!storageBlocked && (
          <>
            {s.step === "participants" && (
              <>
                <div className="apel-intro">
                  <h1 ref={titleRef} tabIndex={-1}>
                    Qui est autour de la table ?
                  </h1>
                  <p>
                    Sélectionnez les membres présents. Vous répondrez aux mêmes affirmations, chacun
                    pour vous, puis vous prendrez le temps d'en parler.
                  </p>
                </div>
                <div className="apel-layout">
                  <section className="apel-sheet">
                    <h2>Votre bureau, aujourd'hui</h2>
                    <p>Seuls les membres cochés participent au questionnaire.</p>
                    <div className="apel-roster">
                      {s.members.map((m, i) => (
                        <div key={m.id} className="apel-person">
                          <input
                            type="checkbox"
                            id={`present-${m.id}`}
                            checked={m.present}
                            onChange={(e) => changeMember(m.id, { present: e.target.checked })}
                          />
                          {i < 6 ? (
                            <label htmlFor={`present-${m.id}`}>{m.role}</label>
                          ) : (
                            <input
                              aria-label={`Fonction du membre ${i + 1}`}
                              maxLength={80}
                              value={m.role}
                              onChange={(e) => changeMember(m.id, { role: e.target.value })}
                            />
                          )}
                          <input
                            aria-label={`Prénom : ${m.role}`}
                            type="text"
                            maxLength={80}
                            placeholder="Prénom"
                            value={m.name}
                            disabled={!m.present}
                            onChange={(e) => changeMember(m.id, { name: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="apel-text"
                      disabled={s.members.length >= APEL_MAX_MEMBERS}
                      onClick={() => {
                        if (
                          s.members.some((m) => m.answers.some((v) => v !== null)) &&
                          !window.confirm(
                            "Modifier le groupe effacera les réponses de ce début de questionnaire. Continuer ?",
                          )
                        )
                          return;
                        update({
                          ...s,
                          members: [
                            ...s.members,
                            {
                              ...newApelMember("Autre membre", crypto.randomUUID()),
                              present: true,
                            },
                          ],
                        });
                      }}
                    >
                      + Ajouter un membre
                    </button>
                    <p className="apel-note">
                      De 2 à {APEL_MAX_MEMBERS} participants. Les absents ne sont pas analysés. La
                      fonction ne présume pas de la personnalité.
                    </p>
                  </section>
                  <aside className="apel-summary">
                    <h2>Votre moment ensemble</h2>
                    <ul>
                      {present.length ? (
                        present.map((m) => (
                          <li key={m.id}>
                            <strong>{m.name.trim() || "Prénom à renseigner"}</strong>
                            <br />
                            {m.role}
                          </li>
                        ))
                      ) : (
                        <li>Cochez les personnes présentes.</li>
                      )}
                    </ul>
                    <p>
                      <strong>{present.length} participants</strong> · {present.length} rapports
                      personnels + 1 collectif
                    </p>
                    <p className="apel-note">
                      60 affirmations, une pause toutes les 10 questions. Prévoyez le temps de
                      discuter à votre rythme.
                    </p>
                    <label className="apel-consent">
                      <input
                        type="checkbox"
                        checked={s.consent}
                        onChange={(e) => update({ ...s, consent: e.target.checked })}
                      />
                      <span>
                        Nous sommes tous d'accord pour comparer nos réponses pendant les pauses et
                        générer nos rapports avec l'IA.
                      </span>
                    </label>
                    <button type="button" className="apel-btn" onClick={start}>
                      Commencer avec ce groupe →
                    </button>
                    <p className="apel-note">
                      Les prénoms, fonctions et réponses des présents sont transmis au service
                      d'analyse IA lors de la génération. La séance reste sauvegardée dans ce
                      navigateur, séparément des parcours solo et duo.
                    </p>
                    <p className="apel-note">
                      Sur cet écran partagé, les participants peuvent voir les rapports personnels.
                      Ils ne sont ni envoyés automatiquement ni ajoutés à Mon Espace.
                    </p>
                  </aside>
                </div>
              </>
            )}

            {s.step === "test" && (
              <section className="apel-narrow">
                <p>
                  Question {s.cur + 1} sur {APEL_TOTAL} · Bloc {Math.floor(s.cur / APEL_BLOCK) + 1}{" "}
                  sur 6
                </p>
                <progress
                  aria-label="Progression du questionnaire"
                  max={APEL_TOTAL}
                  value={s.cur}
                />
                <h1 ref={titleRef} tabIndex={-1}>
                  {QUESTION_VARIANTS.ape[s.cur]}
                </h1>
                <p className="apel-note">
                  Chacun répond pour lui-même. Une fois validée, la réponse est masquée jusqu'à la
                  pause. Ce masquage visuel n'est pas une protection d'accès sur un appareil
                  partagé.
                </p>
                <div className="apel-answers">
                  {present.map((m) => (
                    <section key={m.id} className="apel-answer">
                      <span className="apel-avatar" aria-hidden="true">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <h2>{m.name}</h2>
                      <p>{m.role}</p>
                      {m.answers[s.cur] === null ? (
                        <div className="apel-options">
                          {[true, false].map((value) => (
                            <button
                              key={String(value)}
                              type="button"
                              aria-label={`${m.name} : ${value ? "Vrai" : "Faux"}`}
                              onClick={() =>
                                changeMember(m.id, {
                                  answers: m.answers.map((v, i) => (i === s.cur ? value : v)),
                                })
                              }
                            >
                              {value ? "Vrai" : "Faux"}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="apel-sealed">Réponse enregistrée et masquée</p>
                          <button
                            type="button"
                            className="apel-text"
                            onClick={() =>
                              changeMember(m.id, {
                                answers: m.answers.map((v, i) => (i === s.cur ? null : v)),
                              })
                            }
                          >
                            Modifier ma réponse
                          </button>
                        </>
                      )}
                    </section>
                  ))}
                </div>
                <div className="apel-actions">
                  {s.cur === 0 && (
                    <button
                      type="button"
                      className="apel-btn secondary"
                      onClick={() =>
                        update({
                          ...s,
                          step: "participants",
                          consent: false,
                          members: s.members.map((m) => ({
                            ...m,
                            answers: Array(APEL_TOTAL).fill(null),
                          })),
                        })
                      }
                    >
                      ← Modifier les participants
                    </button>
                  )}
                  {s.cur % APEL_BLOCK > 0 && (
                    <button
                      type="button"
                      className="apel-btn secondary"
                      onClick={() => update({ ...s, cur: s.cur - 1 })}
                    >
                      ← Question précédente
                    </button>
                  )}
                  <button
                    type="button"
                    className="apel-btn"
                    disabled={!allAnswered}
                    onClick={() => update(nextApelQuestion(s))}
                  >
                    {(s.cur + 1) % APEL_BLOCK === 0
                      ? "Découvrir nos réponses →"
                      : "Question suivante →"}
                  </button>
                </div>
                <p className="apel-note" role="status">
                  {allAnswered
                    ? "Tout le monde a répondu."
                    : `${present.filter((m) => m.answers[s.cur] === null).length} réponse(s) encore attendue(s).`}
                </p>
              </section>
            )}

            {s.step === "pause" && (
              <section className="apel-narrow">
                <div className="apel-intro">
                  <h1 ref={titleRef} tabIndex={-1}>
                    Et si on en parlait ?
                  </h1>
                  <p>
                    Questions {s.cur - APEL_BLOCK + 2} à {s.cur + 1}. Pas de bonne ou de mauvaise
                    réponse : une différence peut devenir un point de départ pour se comprendre.
                  </p>
                </div>
                {Array.from(
                  { length: APEL_BLOCK },
                  (_, offset) => s.cur - APEL_BLOCK + 1 + offset,
                ).map((i) => {
                  const same = new Set(present.map((m) => m.answers[i])).size === 1;
                  return (
                    <div key={i} className="apel-comparison">
                      <span className={`apel-tag${same ? "" : " difference"}`}>
                        {same ? "Un point commun" : "Des regards différents"}
                      </span>
                      <h2>
                        {i + 1}. {QUESTION_VARIANTS.ape[i]}
                      </h2>
                      {present.map((m) => (
                        <p key={m.id}>
                          {m.name} ({m.role}) : <strong>{m.answers[i] ? "Vrai" : "Faux"}</strong>
                        </p>
                      ))}
                    </div>
                  );
                })}
                <div className="apel-discussion">
                  <h2>Une question pour votre bureau</h2>
                  <p>{DISCUSSIONS[Math.floor(s.cur / APEL_BLOCK)]}</p>
                </div>
                <div className="apel-actions">
                  <button
                    type="button"
                    className="apel-btn"
                    onClick={() => update(continueApelPause(s))}
                  >
                    {s.cur === APEL_TOTAL - 1
                      ? "Passer aux rapports →"
                      : "Continuer le questionnaire →"}
                  </button>
                </div>
              </section>
            )}

            {s.step === "reports" && (
              <section className="apel-narrow">
                <div className="apel-intro">
                  <h1 ref={titleRef} tabIndex={-1}>
                    Votre bureau, autrement
                  </h1>
                  <p>
                    Les 60 questions sont terminées. Ce regard porte uniquement sur{" "}
                    {present.map((m) => m.name).join(", ")}.
                  </p>
                </div>
                {!allReports && (
                  <div className="apel-sheet">
                    <h2>Vos rapports personnalisés</h2>
                    <p>
                      {present.filter((m) => m.report).length} rapport(s) personnel(s) sur{" "}
                      {present.length} disponibles. Rapport collectif :{" "}
                      {s.collective ? "disponible" : "à générer"}.
                    </p>
                    <p className="apel-note">
                      Les analyses sont générées l'une après l'autre. Cela peut prendre plusieurs
                      minutes. Gardez cette page ouverte. En cas d'erreur, seuls les rapports
                      manquants seront relancés.
                    </p>
                    <button
                      type="button"
                      className="apel-btn"
                      disabled={running}
                      onClick={() => void generate()}
                    >
                      {running
                        ? "Génération en cours…"
                        : error
                          ? "Reprendre les rapports manquants"
                          : "Générer nos rapports avec l'IA"}
                    </button>
                    {task && (
                      <p role="status" className="apel-note">
                        {task}…
                      </p>
                    )}
                  </div>
                )}
                {running && partial && (
                  <div className="apel-stream" aria-label="Analyse en cours">
                    <MarkdownText text={partial} />
                  </div>
                )}
                {(s.collective || present.some((m) => m.report)) && (
                  <>
                    <div className="apel-tabs" aria-label="Choisir le rapport">
                      <button
                        type="button"
                        aria-pressed={tab === "collective"}
                        disabled={!s.collective}
                        onClick={() => setTab("collective")}
                      >
                        Notre bureau
                      </button>
                      {present.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={tab === m.id}
                          disabled={!m.report}
                          onClick={() => setTab(m.id)}
                        >
                          {m.name} · {m.role}
                        </button>
                      ))}
                    </div>
                    {activeReport ? (
                      <article className="apel-sheet">
                        <h2>
                          {tab === "collective"
                            ? "La dynamique des membres présents"
                            : `Le profil de ${activeMember?.name}`}
                        </h2>
                        <p className="apel-note">
                          {date} · Lecture indicative, à discuter ensemble.
                        </p>
                        <MarkdownText text={activeReport} />
                        <button
                          type="button"
                          className="apel-btn secondary"
                          disabled={pdfBusy}
                          onClick={() => void download("report")}
                        >
                          {pdfBusy ? "Préparation…" : "Télécharger ce rapport en PDF"}
                        </button>
                      </article>
                    ) : (
                      <p className="apel-note">Sélectionnez un rapport disponible ci-dessus.</p>
                    )}
                  </>
                )}
                <div className="apel-actions">
                  <button
                    type="button"
                    className="apel-btn"
                    disabled={running}
                    onClick={() => update({ ...s, step: "agreements" })}
                  >
                    Choisir nos accords de fonctionnement →
                  </button>
                </div>
              </section>
            )}

            {s.step === "agreements" && (
              <section className="apel-narrow">
                <div className="apel-intro">
                  <h1 ref={titleRef} tabIndex={-1}>
                    Trois accords pour la suite
                  </h1>
                  <p>
                    Voici des suggestions de départ, pas des conclusions de l'IA. Reformulez-les
                    ensemble, puis cochez uniquement les accords que vous retenez.
                  </p>
                </div>
                <section className="apel-sheet">
                  <h2>Nos accords de fonctionnement</h2>
                  <p className="apel-note">{present.map(displayName).join(", ")}</p>
                  {s.agreements.map((a, i) => (
                    <div className="apel-agreement" key={a.title}>
                      <label htmlFor={`agreement-${i}`}>{a.title}</label>
                      <textarea
                        id={`agreement-${i}`}
                        maxLength={2000}
                        value={a.text}
                        onChange={(e) =>
                          update({
                            ...s,
                            agreements: s.agreements.map((g, index) =>
                              index === i ? { ...g, text: e.target.value, accepted: false } : g,
                            ),
                          })
                        }
                      />
                      <label className="apel-consent">
                        <input
                          type="checkbox"
                          checked={a.accepted}
                          disabled={!a.text.trim()}
                          onChange={(e) =>
                            update({
                              ...s,
                              agreements: s.agreements.map((g, index) =>
                                index === i ? { ...g, accepted: e.target.checked } : g,
                              ),
                            })
                          }
                        />
                        <span>Nous retenons cet accord ensemble</span>
                      </label>
                    </div>
                  ))}
                </section>
                <div className="apel-actions">
                  <button
                    type="button"
                    className="apel-btn secondary"
                    onClick={() => update({ ...s, step: "reports" })}
                  >
                    ← Revenir aux rapports
                  </button>
                  <button
                    type="button"
                    className="apel-btn"
                    disabled={pdfBusy || !s.agreements.some((a) => a.accepted && a.text.trim())}
                    onClick={() => void download("agreements")}
                  >
                    {pdfBusy ? "Préparation…" : "Télécharger les accords validés en PDF"}
                  </button>
                </div>
                <div className="apel-discussion">
                  <h2>Un moment à proposer à un autre bureau ?</h2>
                  <p>Partagez le parcours, sans vos réponses ni vos rapports.</p>
                  <button
                    type="button"
                    className="apel-btn secondary"
                    onClick={() => void shareLink()}
                  >
                    {copied ? "Lien copié" : "Copier le lien du test APEL"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
        {error && (
          <p className="apel-alert" role="alert">
            {error}
          </p>
        )}
        {pdfError && (
          <p className="apel-alert" role="alert">
            {pdfError}
          </p>
        )}
      </main>
      <footer className="apel-footer">
        Un support de dialogue, pas un diagnostic ni une évaluation des compétences. Page
        indépendante, sans affiliation officielle à l'APEL.{" "}
        <a href="/confidentialite">Confidentialité</a>
      </footer>
    </div>
  );
}
