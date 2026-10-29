import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MarkdownText } from "@/components/markdown-text";
import { streamAnalysis } from "@/lib/stream-client";
import { completeInvitation } from "@/lib/invitation.functions";
import { downloadIndividualReportPdf, downloadTeamReportPdf, type CatKey } from "@/lib/team-report";

const STORAGE_KEY = "egogramme_duo_live";
const BLOCK_SIZE = 10;
const TOTAL = 60;

const DISCUSSION_PROMPTS = [
  "Dans quelle situation récente tu m'as vu(e) comme ça ?",
  "Y a-t-il une réponse de l'autre qui t'a surpris(e) ?",
  "Qu'est-ce que tu aimes le plus chez l'autre dans ce que tu viens de voir ?",
  "Sur quelle réponse as-tu hésité ? Pourquoi ?",
  "Quelle réponse de l'autre t'aide à mieux le/la comprendre ?",
  "Qu'est-ce que tu aimerais que l'autre sache de toi, sans jamais l'avoir dit ?",
];

type Answers = (boolean | undefined)[];
type Reports = { a?: string; b?: string; duo?: string };
type Step = "names" | "test" | "pause" | "reports";

type Saved = {
  nameA: string;
  nameB: string;
  a: Answers;
  b: Answers;
  cur: number;
  pausedAt: number;
  step: Step;
  ids: { a?: string; b?: string };
  linked: boolean;
  reports: Reports;
};

const emptyState = (): Saved => ({
  nameA: "",
  nameB: "",
  a: Array(TOTAL).fill(undefined),
  b: Array(TOTAL).fill(undefined),
  cur: 0,
  pausedAt: 0,
  step: "names",
  ids: {},
  linked: false,
  reports: {},
});

function loadState(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw) as Partial<Saved>;
    const fix = (arr: unknown): Answers =>
      Array.isArray(arr) && arr.length === TOTAL
        ? arr.map((v) => (typeof v === "boolean" ? v : undefined))
        : Array(TOTAL).fill(undefined);
    return { ...emptyState(), ...p, a: fix(p.a), b: fix(p.b) };
  } catch {
    return emptyState();
  }
}

const label = (v: boolean | undefined) => (v === true ? "vrai" : v === false ? "faux" : "—");

export function DuoLiveTest({
  questions,
  mapping,
  questionVariant,
  onExit,
}: {
  questions: string[];
  mapping: Record<CatKey, number[]>;
  questionVariant: string;
  onExit: () => void;
}) {
  const [s, setS] = useState<Saved>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState("");
  const [tab, setTab] = useState<"a" | "b" | "duo">("duo");
  const [pdfBusy, setPdfBusy] = useState<"a" | "b" | "duo" | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    setS(loadState());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* stockage indisponible : la session reste utilisable en mémoire */
    }
  }, [s, loaded]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [s.step, s.cur]);

  const patch = (p: Partial<Saved>) => setS((prev) => ({ ...prev, ...p }));

  const scoresOf = (answers: Answers) => {
    const out = { PNr: 0, PNf: 0, A: 0, EL: 0, EAS: 0, EAR: 0 } as Record<CatKey, number>;
    (Object.keys(mapping) as CatKey[]).forEach((k) =>
      mapping[k].forEach((n) => {
        if (answers[n - 1] === true) out[k] += 1;
      }),
    );
    return out;
  };

  const answer = (who: "a" | "b", value: boolean | undefined) =>
    setS((prev) => {
      const next = [...prev[who]];
      next[prev.cur] = value;
      return { ...prev, [who]: next };
    });

  const bothAnswered = s.a[s.cur] !== undefined && s.b[s.cur] !== undefined;

  const goNext = () => {
    const nextCur = s.cur + 1;
    if (nextCur >= TOTAL) {
      patch({ cur: nextCur, step: "reports", pausedAt: nextCur });
    } else if (nextCur % BLOCK_SIZE === 0) {
      patch({ cur: nextCur, step: "pause" });
    } else {
      patch({ cur: nextCur });
    }
  };

  const endBlock = () => {
    // Revenir en arrière n'est jamais nécessaire : on mémorise simplement la pause vue.
    patch({ step: "test", pausedAt: s.cur });
  };

  const startTest = () => {
    if (!s.nameA.trim() || !s.nameB.trim()) return;
    patch({ step: "test", nameA: s.nameA.trim(), nameB: s.nameB.trim() });
  };

  const restart = () => {
    if (!window.confirm("Recommencer à zéro ? Les réponses de cette session seront effacées.")) return;
    started.current = false;
    setS(emptyState());
    setError(null);
  };

  // Enchaînement séquentiel et reprenable : chaque étape terminée est mémorisée,
  // ce qui évite de rejouer (et de payer en quota IA) ce qui a déjà réussi.
  const runPipeline = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    let cur = s;
    const commit = (p: Partial<Saved>) => {
      cur = { ...cur, ...p };
      patch(p);
    };
    try {
      const saveOne = async (who: "a" | "b") => {
        const name = who === "a" ? cur.nameA : cur.nameB;
        setCurrentTask(`Enregistrement du résultat de ${name}`);
        const answers = who === "a" ? cur.a : cur.b;
        const res = await fetch("/api/public/save-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: scoresOf(answers),
            resultId: null,
            referred_by: null,
            answers: answers.map((v) => (v === undefined ? null : v)),
            userId: null,
            questionVariant,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!json?.ok || !json?.id) throw new Error(`Enregistrement impossible pour ${name}.`);
        const id = json.id as string;
        await fetch("/api/public/save-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            first_name: name,
            last_name: "—",
            contact_requested: false,
            phone: null,
          }),
        }).catch(() => {});
        commit({ ids: { ...cur.ids, [who]: id } });
      };

      if (!cur.ids.a) await saveOne("a");
      if (!cur.ids.b) await saveOne("b");

      if (!cur.linked) {
        setCurrentTask("Liaison de vos deux profils");
        const res = await fetch("/api/public/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviterResultId: cur.ids.a, inviteeFirstName: cur.nameB }),
        });
        const json = await res.json().catch(() => null);
        if (!json?.ok || !json?.token) {
          throw new Error(
            [json?.error, json?.detail].filter(Boolean).join(" — ") ||
              `Liaison impossible (HTTP ${res.status}).`,
          );
        }
        await completeInvitation({ data: { token: json.token as string, resultId: cur.ids.b! } });
        commit({ linked: true });
      }

      const individual = async (who: "a" | "b") => {
        if (cur.reports[who]) return;
        const name = who === "a" ? cur.nameA : cur.nameB;
        setCurrentTask(`Rédaction du rapport de ${name}`);
        setPartial("");
        const text = await streamAnalysis(
          "/api/analysis/individual-stream",
          {
            scores: scoresOf(who === "a" ? cur.a : cur.b),
            firstName: name,
            questionVariant,
          },
          setPartial,
        );
        if (!text) throw new Error(`Rapport vide pour ${name}.`);
        commit({ reports: { ...cur.reports, [who]: text } });
      };
      await individual("a");
      await individual("b");

      if (!cur.reports.duo) {
        setCurrentTask("Rédaction de votre rapport à deux");
        setPartial("");
        const text = await streamAnalysis(
          "/api/analysis/team-stream",
          { ids: [cur.ids.a, cur.ids.b] },
          setPartial,
        );
        if (!text) throw new Error("Rapport à deux vide.");
        await fetch("/api/public/duo-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultIdA: cur.ids.a, resultIdB: cur.ids.b, analysis: text }),
        }).catch(() => {});
        commit({ reports: { ...cur.reports, duo: text } });
      }
      setCurrentTask(null);
      setPartial("");
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Une étape a échoué. Vos réponses sont conservées, vous pouvez reprendre.",
      );
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!loaded || s.step !== "reports" || started.current) return;
    started.current = true;
    void runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, s.step]);

  const blockStart = Math.max(0, s.cur - BLOCK_SIZE);
  const blockIndex = s.step === "pause" ? s.cur / BLOCK_SIZE : Math.floor(s.cur / BLOCK_SIZE) + 1;
  const diffs = useMemo(() => {
    if (s.step !== "pause") return { same: [] as number[], diff: [] as number[] };
    const same: number[] = [];
    const diff: number[] = [];
    for (let i = blockStart; i < s.cur; i++) (s.a[i] === s.b[i] ? same : diff).push(i);
    return { same, diff };
  }, [s.step, s.a, s.b, s.cur, blockStart]);

  const share = async () => {
    const url = `${window.location.origin}/`;
    const text = `On vient de faire le test égogramme à deux, sur le même écran — 20 minutes pour se découvrir autrement. Essayez, vous aussi !\n\n${url}`;
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    try {
      if (nav.share) {
        await nav.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* partage annulé */
    }
  };

  const downloadPdf = async (who: "a" | "b" | "duo") => {
    const analysis = s.reports[who];
    if (!analysis) return;
    setPdfBusy(who);
    try {
      const date = new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });
      if (who === "duo") {
        const sa = scoresOf(s.a);
        const sb = scoresOf(s.b);
        const average = { ...sa } as Record<CatKey, number>;
        (Object.keys(sa) as CatKey[]).forEach((k) => {
          average[k] = Math.round((sa[k] + sb[k]) / 2);
        });
        await downloadTeamReportPdf({
          teamName: `${s.nameA} & ${s.nameB}`,
          average,
          members: [
            { name: s.nameA, date, scores: sa },
            { name: s.nameB, date, scores: sb },
          ],
          analysis,
        });
      } else {
        await downloadIndividualReportPdf({
          name: who === "a" ? s.nameA : s.nameB,
          date,
          scores: scoresOf(who === "a" ? s.a : s.b),
          analysis,
        });
      }
    } catch {
      setError("Téléchargement impossible. Réessayez.");
    } finally {
      setPdfBusy(null);
    }
  };

  if (!loaded) return null;

  const Header = (
    <div className="mb-4 flex items-center justify-between text-sm">
      <button type="button" onClick={onExit} className="text-muted-foreground underline-offset-2 hover:underline">
        ← Retour à l'accueil
      </button>
      {s.step !== "names" && (
        <button type="button" onClick={restart} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          Recommencer
        </button>
      )}
    </div>
  );

  if (s.step === "names") {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        {Header}
        <Card className="space-y-4 p-5 sm:p-6">
          <div>
            <h1 className="text-xl font-bold">Le test à deux, sur le même écran</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous répondez aux 60 questions chacun de votre côté de l'écran, sans voir la réponse de
              l'autre. Toutes les 10 questions, une pause : vous découvrez ensemble où vous vous
              ressemblez et où vous différez. À la fin : un rapport pour chacun, plus un rapport à deux.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="duo-a">Prénom de la personne 1</Label>
              <Input id="duo-a" value={s.nameA} maxLength={80} placeholder="Léa" onChange={(e) => patch({ nameA: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="duo-b">Prénom de la personne 2</Label>
              <Input id="duo-b" value={s.nameB} maxLength={80} placeholder="Marc" onChange={(e) => patch({ nameB: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            🔒 Pas de compte nécessaire. Un test, pas un jugement : l'objectif est la curiosité, pas
            le procès. Comptez environ 20 minutes avec les pauses.
          </p>
          <Button onClick={startTest} disabled={!s.nameA.trim() || !s.nameB.trim()} className="w-full">
            Commencer à deux →
          </Button>
        </Card>
      </div>
    );
  }

  if (s.step === "pause") {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        {Header}
        <Card className="space-y-4 p-5 text-center sm:p-6">
          <div className="text-4xl">💬</div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bloc {blockIndex} / {TOTAL / BLOCK_SIZE} terminé · {s.cur} / {TOTAL}
          </p>
          <Progress value={(s.cur / TOTAL) * 100} />
          <h2 className="text-lg font-bold">Prenez deux minutes</h2>
          <p className="text-sm text-muted-foreground">
            Sur ces 10 questions, vous avez répondu pareil {diffs.same.length} fois.
            {diffs.diff.length > 0 ? " Voici où vous différez :" : " Belle harmonie !"}
          </p>
          {diffs.diff.length > 0 && (
            <ul className="space-y-2 text-left text-sm">
              {diffs.diff.map((i) => (
                <li key={i} className="rounded-lg border border-border p-3">
                  <p>« {questions[i]} »</p>
                  <p className="mt-1 text-xs font-medium text-violet-700">
                    {s.nameA} : {label(s.a[i])} · {s.nameB} : {label(s.b[i])}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {diffs.same.length > 0 && (
            <p className="text-left text-xs text-muted-foreground">
              ✓ D'accord sur : {diffs.same.slice(0, 2).map((i) => `« ${questions[i]} »`).join(" · ")}
              {diffs.same.length > 2 ? ` et ${diffs.same.length - 2} autre(s)` : ""}
            </p>
          )}
          <div className="rounded-lg bg-violet-50 p-3 text-sm text-violet-900">
            💡 Pour en parler : <i>« {DISCUSSION_PROMPTS[(blockIndex - 1) % DISCUSSION_PROMPTS.length]} »</i>
          </div>
          <Button onClick={endBlock} className="w-full">
            Continuer : questions {s.cur + 1} à {s.cur + BLOCK_SIZE} →
          </Button>
        </Card>
      </div>
    );
  }

  if (s.step === "test") {
    const q = questions[s.cur];
    const column = (who: "a" | "b", name: string, tone: string) => {
      const v = s[who][s.cur];
      return (
        <div className={`rounded-xl border-2 p-3 ${tone}`}>
          <p className="mb-2 text-sm font-bold">{name}</p>
          {v === undefined ? (
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => answer(who, true)}>Plutôt vrai</Button>
              <Button variant="outline" onClick={() => answer(who, false)}>Plutôt faux</Button>
            </div>
          ) : (
            <div className="rounded-lg bg-muted p-3 text-center text-sm">
              🔒 Réponse cachée
              <p className="mt-1 text-xs text-muted-foreground">choisie ✓</p>
              <button type="button" className="mt-1 text-xs underline" onClick={() => answer(who, undefined)}>
                Modifier
              </button>
            </div>
          )}
        </div>
      );
    };
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {Header}
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {s.cur + 1} / {TOTAL}</span>
          <span>Bloc {Math.floor(s.cur / BLOCK_SIZE) + 1} / {TOTAL / BLOCK_SIZE}</span>
        </div>
        <Progress value={(s.cur / TOTAL) * 100} className="mb-5" />
        <Card className="mb-4 p-5 text-center text-base font-medium leading-snug sm:text-lg">{q}</Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {column("a", `🟠 ${s.nameA}`, "border-orange-300")}
          {column("b", `🟣 ${s.nameB}`, "border-violet-300")}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Répondez chacun votre tour sans montrer votre choix — la révélation a lieu à la fin du bloc.
        </p>
        <Button className="mt-4 w-full" disabled={!bothAnswered} onClick={goNext}>
          {s.cur + 1 === TOTAL
            ? "Terminer et générer nos rapports →"
            : (s.cur + 1) % BLOCK_SIZE === 0
              ? "Terminer le bloc et révéler →"
              : "Question suivante →"}
        </Button>
        {s.cur > 0 && s.cur % BLOCK_SIZE !== 0 && (
          <button
            type="button"
            className="mt-2 w-full text-center text-xs text-muted-foreground underline"
            onClick={() => patch({ cur: s.cur - 1 })}
          >
            ← Question précédente
          </button>
        )}
      </div>
    );
  }

  // step === "reports"
  const done = !!(s.reports.a && s.reports.b && s.reports.duo);
  const tasks = [
    { label: "Enregistrement des résultats", ok: !!(s.ids.a && s.ids.b) },
    { label: "Liaison de vos deux profils", ok: s.linked },
    { label: `Rapport de ${s.nameA}`, ok: !!s.reports.a },
    { label: `Rapport de ${s.nameB}`, ok: !!s.reports.b },
    { label: "Rapport à deux", ok: !!s.reports.duo },
  ];
  const activeText = tab === "a" ? s.reports.a : tab === "b" ? s.reports.b : s.reports.duo;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {Header}
      <Card className="space-y-4 p-5 sm:p-6">
        <h1 className="text-xl font-bold">
          {done ? "🎉 Vos trois rapports sont prêts" : "Génération de vos rapports…"}
        </h1>
        <ul className="space-y-1 text-sm">
          {tasks.map((t) => (
            <li key={t.label} className={t.ok ? "text-green-700" : "text-muted-foreground"}>
              {t.ok ? "✓" : "○"} {t.label}
            </li>
          ))}
        </ul>
        {running && currentTask && (
          <p className="text-sm font-medium text-violet-800">⏳ {currentTask}…</p>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <Button size="sm" className="mt-2 block" onClick={() => void runPipeline()} disabled={running}>
              Reprendre là où ça s'est arrêté
            </Button>
          </div>
        )}
        {!done && running && partial && (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-3 text-sm">
            <MarkdownText text={partial} />
          </div>
        )}
      </Card>

      {(s.reports.a || s.reports.b || s.reports.duo) && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["a", s.nameA, s.reports.a],
                ["b", s.nameB, s.reports.b],
                ["duo", "Notre duo", s.reports.duo],
              ] as const
            ).map(([key, name, txt]) => (
              <Button
                key={key}
                size="sm"
                variant={tab === key ? "default" : "outline"}
                disabled={!txt}
                onClick={() => setTab(key)}
              >
                {key === "duo" ? "🤝" : "👤"} {name}
              </Button>
            ))}
          </div>
          {activeText && (
            <Card className="p-5 text-sm leading-relaxed">
              <MarkdownText text={activeText} />
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                disabled={pdfBusy !== null}
                onClick={() => void downloadPdf(tab)}
              >
                {pdfBusy === tab ? "Préparation…" : "📄 Télécharger le PDF"}
              </Button>
              {done && s.reports.duo && tab !== "duo" && (
                <Button size="sm" className="mt-4 ml-2" onClick={() => setTab("duo")}>
                  🤝 Voir notre rapport de duo
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {done && (
        <Card className="mt-5 space-y-3 border-2 border-violet-300 bg-violet-50 p-5">
          <p className="text-sm font-semibold text-violet-900">
            💌 Ça vous a plu ? Proposez à un autre couple ou à des amis de le faire, eux aussi.
          </p>
          <Button onClick={() => void share()}>{copied ? "Lien copié ✓" : "Partager l'expérience"}</Button>
        </Card>
      )}
    </div>
  );
}
