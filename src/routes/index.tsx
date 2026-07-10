import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Égogramme — Analyse Transactionnelle" },
      {
        name: "description",
        content:
          "Test d'égogramme interactif (60 questions) basé sur l'analyse transactionnelle de Michel Josien. Visualisez en direct vos états du moi.",
      },
      { property: "og:title", content: "Égogramme — Analyse Transactionnelle" },
      {
        property: "og:description",
        content:
          "Répondez à 60 questions et découvrez votre égogramme personnel en direct.",
      },
    ],
  }),
  component: Index,
});

const QUESTIONS: string[] = [
  "On dit que j'ai du sang froid",
  "J'aime bien rire aux dépens des autres",
  "Je me laisse influencer facilement",
  "Je rends visite aux copains malades",
  "Je sais apprécier les imprévus",
  "J'admets très mal la tricherie",
  "J'aime beaucoup les voyages",
  "Je remonte fréquemment le moral aux copains qui dépriment",
  "Je n'arrive pas en retard pour ne pas me faire remarquer",
  "Je suis souvent en désaccord avec mon entourage",
  "On me trouve logique et rationnel",
  "Il faut respecter les délais",
  "Je ne contredis jamais un supérieur hiérarchique",
  "J'aide sans qu'on me le demande",
  "Je sympathise assez souvent avec des inconnus",
  "Les absences doivent être justifiées",
  "Avant d'effectuer un travail, je réfléchis sur la méthode à suivre",
  "Je suis râleur, contestataire",
  "Je suis organisé dans mon travail",
  "Je repère facilement les défauts des autres",
  "Je dis « oui » alors que je voulais dire « non »",
  "Je prête facilement mes affaires",
  "Quand quelqu'un me plaît je n'hésite pas à le lui dire",
  "J'apprécie la discipline",
  "Quand je suis en colère, on m'entend",
  "Je porte souvent des appréciations sur les gens",
  "Confronté à un échec, je réfléchis calmement",
  "Je préfère donner que recevoir",
  "Dans une situation difficile je garde ma présence d'esprit",
  "Quand il convient d'être en smoking, j'ai tendance à mettre une chemise à fleurs",
  "J'accorde de l'importance à ce qu'on pense de moi",
  "Je n'aime pas partir dans l'inconnu, il faut que ce soit planifié",
  "J'aime à rassurer mon entourage",
  "J'évite de prendre des responsabilités",
  "J'adore taquiner",
  "J'ai tendance à passer beaucoup de temps à aider les autres",
  "Ce n'est pas acceptable de doubler dans les files d'attente",
  "Je prévois les conséquences de mes actions",
  "Je choque souvent par mes propos",
  "Je suis plutôt timide",
  "On me trouve enthousiaste",
  "Je remets mes opinions en questions quand il le faut",
  "Quand je suis content ça se voit",
  "Quand un problème se pose, j'amasse le plus de données possibles pour le résoudre objectivement",
  "J'aime la satire et la dérision",
  "J'ai le souci de ne pas importuner les autres",
  "Je ne cache pas mes émotions",
  "Il est intolérable de faire claquer des pétards dans les cimetières",
  "J'ai l'esprit de contradiction",
  "Ça ne me déplairait pas d'être médecin sans frontières",
  "Je me fais petit devant l'autorité",
  "Il est dommage que certaines valeurs se perdent",
  "Avec moi on ne s'ennuie pas",
  "Dans le doute je sais me documenter",
  "Je suis réputé pour la férocité de mes remarques",
  "Dure est la loi, mais c'est la loi",
  "On me dit que je suis trop bon",
  "J'essaie de ressembler à ce que mes parents voulaient que je fusse",
  "J'ai toujours une histoire, drôle ou pas, à raconter",
  "J'ai tendance à prendre les opprimés sous mon aile",
];

type CategoryKey =
  | "PN"
  | "PNo"
  | "A"
  | "EL"
  | "EAS"
  | "EAR";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  short: string;
  color: string;
  description: string;
}[] = [
  {
    key: "PN",
    label: "Parent Nourricier",
    short: "PNr",
    color: "oklch(0.72 0.15 30)",
    description: "Bienveillant, protecteur, encourageant.",
  },
  {
    key: "PNo",
    label: "Parent Normatif",
    short: "PNo",
    color: "oklch(0.6 0.15 60)",
    description: "Cadre, règles, autorité, transmission de valeurs.",
  },
  {
    key: "A",
    label: "Adulte",
    short: "A",
    color: "oklch(0.55 0.15 250)",
    description: "Rationnel, objectif, analytique, factuel.",
  },
  {
    key: "EL",
    label: "Enfant Libre",
    short: "EL",
    color: "oklch(0.7 0.17 140)",
    description: "Spontané, créatif, expressif, joueur.",
  },
  {
    key: "EAS",
    label: "Enfant Adapté Soumis",
    short: "EAS",
    color: "oklch(0.6 0.13 310)",
    description: "Conforme, poli, s'adapte aux attentes.",
  },
  {
    key: "EAR",
    label: "Enfant Adapté Rebelle",
    short: "EAR",
    color: "oklch(0.6 0.2 20)",
    description: "Oppositionnel, provocateur, contestataire.",
  },
];

const MAPPING: Record<CategoryKey, number[]> = {
  PN: [4, 8, 14, 22, 28, 33, 36, 50, 57, 60],
  PNo: [6, 12, 16, 24, 26, 32, 37, 48, 52, 56],
  A: [1, 11, 17, 19, 27, 29, 38, 42, 44, 54],
  EL: [5, 7, 15, 23, 25, 41, 43, 47, 53, 59],
  EAS: [3, 9, 13, 21, 31, 34, 40, 46, 51, 58],
  EAR: [2, 10, 18, 20, 30, 35, 39, 45, 49, 55],
};

function Index() {
  // answers[i] = true (Plutôt vrai) | false (Plutôt faux) | undefined
  const [answers, setAnswers] = useState<(boolean | undefined)[]>(
    () => Array(60).fill(undefined),
  );

  // Track a unique visit once per session
  useEffect(() => {
    fetch("/api/public/track", { method: "POST" }).catch(() => {});
  }, []);

  const setAnswer = (index: number, value: boolean) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = next[index] === value ? undefined : value;
      return next;
    });
  };

  const scores = useMemo(() => {
    const s: Record<CategoryKey, number> = {
      PN: 0,
      PNo: 0,
      A: 0,
      EL: 0,
      EAS: 0,
      EAR: 0,
    };
    (Object.keys(MAPPING) as CategoryKey[]).forEach((key) => {
      MAPPING[key].forEach((qNum) => {
        if (answers[qNum - 1] === true) s[key] += 1;
      });
    });
    return s;
  }, [answers]);

  const answeredCount = answers.filter((a) => a !== undefined).length;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const reset = () => setAnswers(Array(60).fill(undefined));

  const maxScore = Math.max(...Object.values(scores), 1);

  const interpretation = useMemo(
    () => (answeredCount === 60 ? buildInterpretation(scores) : null),
    [answeredCount, scores],
  );

  // Save result once when the 60 questions are answered
  const savedRef = useRef(false);
  const [resultId, setResultId] = useState<string | null>(null);
  useEffect(() => {
    if (answeredCount === 60 && !savedRef.current) {
      savedRef.current = true;
      fetch("/api/public/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.ok && j?.id) setResultId(j.id as string);
        })
        .catch(() => {});
    }
    if (answeredCount < 60) {
      savedRef.current = false;
      setResultId(null);
    }
  }, [answeredCount, scores]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Cours 101 — Analyse Transactionnelle
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Égogramme personnel
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Répondez aux 60 affirmations par « Plutôt vrai » ou « Plutôt faux ».
            Votre égogramme se met à jour en direct selon la méthode de Michel
            Josien.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>
                  {answeredCount} / 60
                </span>
              </div>
              <Progress value={(answeredCount / 60) * 100} className="mt-1.5 h-2" />
            </div>
            <div className="flex items-center gap-2">
              <Link to="/stats">
                <Button variant="outline" size="sm">
                  Statistiques
                </Button>
              </Link>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              Réinitialiser
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section aria-label="Questions" className="space-y-2">
            {QUESTIONS.map((q, i) => {
              const val = answers[i];
              return (
                <Card
                  key={i}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex gap-3">
                    <span className="text-sm font-semibold text-muted-foreground w-6 shrink-0">
                      {i + 1}.
                    </span>
                    <p className="text-sm text-foreground">{q}</p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      size="sm"
                      variant={val === true ? "default" : "outline"}
                      onClick={() => setAnswer(i, true)}
                      className="flex-1 sm:flex-none"
                    >
                      Plutôt vrai
                    </Button>
                    <Button
                      size="sm"
                      variant={val === false ? "default" : "outline"}
                      onClick={() => setAnswer(i, false)}
                      className="flex-1 sm:flex-none"
                    >
                      Plutôt faux
                    </Button>
                  </div>
                </Card>
              );
            })}
          </section>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Votre égogramme</h2>
                <span className="text-xs text-muted-foreground">
                  Σ = {total}
                </span>
              </div>

              <>
                  {/* Bar chart */}
                  <div className="mt-5">
                    <div className="flex gap-2">
                      {/* Y axis 0-10 */}
                      <div className="flex h-72 flex-col-reverse justify-between py-1 pr-1 text-[10px] tabular-nums text-muted-foreground">
                        {Array.from({ length: 11 }, (_, n) => (
                          <span key={n} className="leading-none">
                            {n}
                          </span>
                        ))}
                      </div>

                      {/* Chart area */}
                      <div className="relative flex-1">
                        {/* Gridlines */}
                        <div className="absolute inset-0 flex flex-col-reverse justify-between">
                          {Array.from({ length: 11 }, (_, n) => (
                            <div
                              key={n}
                              className={
                                "border-t " +
                                (n === 0
                                  ? "border-foreground/40"
                                  : "border-border/60")
                              }
                            />
                          ))}
                        </div>

                        {/* Bars */}
                        <div className="relative flex h-72 items-end gap-2">
                          {CATEGORIES.map((cat) => {
                            const score = scores[cat.key];
                            const heightPct = (score / 10) * 100;
                            const isMax = score === maxScore && score > 0;
                            return (
                              <div
                                key={cat.key}
                                className="flex h-full flex-1 flex-col items-center justify-end"
                              >
                                <div
                                  className="relative flex w-full items-end justify-center"
                                  style={{ height: `${heightPct}%` }}
                                >
                                  <div
                                    className="absolute -top-5 text-xs font-semibold tabular-nums text-foreground"
                                  >
                                    {score}
                                  </div>
                                  <div
                                    className="w-full rounded-t-md transition-all duration-500 ease-out"
                                    style={{
                                      height: "100%",
                                      backgroundColor: cat.color,
                                      minHeight: score > 0 ? "3px" : "0",
                                      outline: isMax
                                        ? "2px solid var(--foreground)"
                                        : undefined,
                                      outlineOffset: isMax ? "1px" : undefined,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* X axis labels */}
                    <div className="mt-2 flex gap-2 pl-5">
                      {CATEGORIES.map((cat) => (
                        <div
                          key={cat.key}
                          className="flex-1 text-center text-[11px] font-semibold text-foreground"
                          title={cat.label}
                        >
                          {cat.short}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend / details */}
                  <ul className="mt-5 space-y-2">
                    {CATEGORIES.map((cat) => (
                      <li key={cat.key} className="flex items-start gap-2 text-xs">
                        <span
                          className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between gap-2">
                            <span className="font-medium text-foreground">
                              {cat.label}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {scores[cat.key]}/10
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            {cat.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
              </>

              <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">
                D'après Michel Josien, « Techniques de communication
                interpersonnelle », Les Éditions d'Organisation.
              </p>
            </Card>
          </aside>
        </div>
      </main>

      {interpretation && (
        <section className="mx-auto max-w-5xl px-4 pb-12">
          <Card className="p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Interprétation clinique de votre égogramme
              </h2>
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Analyse transactionnelle
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Lecture indicative, à visée pédagogique — ne remplace pas un
              entretien avec un professionnel.
            </p>

            <div className="mt-5 space-y-5 text-sm leading-relaxed text-foreground">
              <div>
                <h3 className="font-semibold">Profil global</h3>
                <p className="mt-1 text-muted-foreground">{interpretation.overview}</p>
              </div>

              <div>
                <h3 className="font-semibold">États du moi dominants</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {interpretation.dominants.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              {interpretation.lows.length > 0 && (
                <div>
                  <h3 className="font-semibold">États peu investis</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {interpretation.lows.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-semibold">Équilibre Parent / Adulte / Enfant</h3>
                <p className="mt-1 text-muted-foreground">{interpretation.balance}</p>
              </div>

              <div>
                <h3 className="font-semibold">Tendances relationnelles</h3>
                <p className="mt-1 text-muted-foreground">{interpretation.tendencies}</p>
              </div>

              <div>
                <h3 className="font-semibold">Pistes de développement</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {interpretation.advice.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

type Scores = Record<CategoryKey, number>;

const DOMINANT_DESCRIPTIONS: Record<CategoryKey, string> = {
  PN: "Parent Nourricier marqué : posture chaleureuse, protectrice, orientée vers le soin et l'encouragement des autres. Attention au risque de sur-protection ou de sauvetage (triangle dramatique de Karpman).",
  PNo: "Parent Normatif fort : sens du cadre, des règles et des valeurs. Peut être structurant pour l'entourage, mais gare à la rigidité, au jugement ou au discours moralisateur.",
  A: "Adulte solide : traitement rationnel de l'information, prise de décision fondée sur les faits, capacité à négocier et à résoudre les problèmes de manière posée.",
  EL: "Enfant Libre présent : spontanéité, créativité, expression émotionnelle assumée, capacité à jouer et à ressentir du plaisir. Peut parfois manquer de filtre selon le contexte.",
  EAS: "Enfant Adapté Soumis dominant : forte capacité d'adaptation, politesse, coopération. Risque de se sur-adapter, d'avoir du mal à dire non et d'accumuler du ressentiment.",
  EAR: "Enfant Adapté Rebelle marqué : énergie contestataire, esprit critique, refus des injonctions. Peut se traduire par de l'opposition systématique et des conflits interpersonnels.",
};

const LOW_DESCRIPTIONS: Record<CategoryKey, string> = {
  PN: "Peu de Parent Nourricier : difficulté à se montrer bienveillant, à réconforter ou à se réconforter soi-même.",
  PNo: "Peu de Parent Normatif : difficulté à poser un cadre, à faire respecter des règles ou à s'auto-discipliner.",
  A: "Adulte peu mobilisé : décisions plus souvent guidées par l'émotion ou l'injonction que par l'analyse objective.",
  EL: "Enfant Libre discret : peu d'expression spontanée, du plaisir ou de la créativité ; risque de rigidité intérieure.",
  EAS: "Enfant Adapté Soumis faible : peu de conformisme social ; peut compliquer l'insertion dans des cadres très normés.",
  EAR: "Enfant Adapté Rebelle faible : peu de contestation, difficulté à dire non ou à défendre son territoire.",
};

function level(n: number): "élevé" | "modéré" | "faible" {
  if (n >= 7) return "élevé";
  if (n >= 4) return "modéré";
  return "faible";
}

function buildInterpretation(scores: Scores) {
  const entries = (Object.keys(scores) as CategoryKey[]).map((k) => ({
    key: k,
    score: scores[k],
    label: CATEGORIES.find((c) => c.key === k)!.label,
  }));
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const top = sorted.filter((e) => e.score === sorted[0].score);
  const lows = sorted.filter((e) => e.score <= 2);

  const P = scores.PN + scores.PNo;
  const A = scores.A;
  const E = scores.EL + scores.EAS + scores.EAR;
  const total = P + A + E || 1;
  const pctP = Math.round((P / total) * 100);
  const pctA = Math.round((A / total) * 100);
  const pctE = Math.round((E / total) * 100);

  const overview =
    `Le profil présente un Parent à ${P}/20 (${pctP}% de l'énergie totale), ` +
    `un Adulte à ${A}/10 (${pctA}%) et un Enfant à ${E}/30 (${pctE}%). ` +
    `L'état du moi le plus investi est le ${top.map((t) => t.label).join(" et ")}` +
    `, ce qui colore la manière habituelle d'entrer en relation.`;

  const dominants = top.map((t) => `${t.label} (${t.score}/10) — ${DOMINANT_DESCRIPTIONS[t.key]}`);
  const lowsText = lows.map((l) => `${l.label} (${l.score}/10) — ${LOW_DESCRIPTIONS[l.key]}`);

  let balance: string;
  if (A >= 7 && pctA >= 25) {
    balance =
      "L'Adulte occupe une place centrale et régulatrice : bonne capacité à arbitrer entre les injonctions du Parent et les besoins de l'Enfant.";
  } else if (P > E + 4) {
    balance =
      "Le Parent l'emporte nettement sur l'Enfant : posture plutôt encadrante, potentiellement au détriment de la spontanéité et du plaisir.";
  } else if (E > P + 4) {
    balance =
      "L'Enfant domine le Parent : forte réactivité émotionnelle, énergie vive, mais un cadre intérieur qui peut manquer.";
  } else if (A <= 3) {
    balance =
      "L'Adulte est peu mobilisé, ce qui laisse les décisions osciller entre les scripts parentaux et les réactions de l'Enfant ; renforcer l'Adulte apporterait plus de stabilité.";
  } else {
    balance =
      "Les trois grandes instances (Parent, Adulte, Enfant) sont globalement équilibrées, ce qui favorise une communication souple.";
  }

  const tParts: string[] = [];
  if (scores.PN >= 7) tParts.push("posture d'aidant naturel, à surveiller pour ne pas glisser vers le sauvetage");
  if (scores.PNo >= 7) tParts.push("tendance à structurer, évaluer, parfois juger");
  if (scores.EL >= 7) tParts.push("expressivité et enthousiasme communicatifs");
  if (scores.EAS >= 7) tParts.push("forte adaptabilité sociale, avec un risque d'oubli de soi");
  if (scores.EAR >= 7) tParts.push("énergie d'opposition qui peut ressourcer comme user la relation");
  if (scores.A >= 7) tParts.push("mode de communication factuel et négociateur");
  if (tParts.length === 0)
    tParts.push(
      "profil sans hyper-investissement marqué : la personne module ses états du moi selon les situations",
    );
  const tendencies =
    "En relation, on peut s'attendre à : " + tParts.join(" ; ") + ".";

  const advice: string[] = [];
  if (level(scores.A) !== "élevé")
    advice.push("Renforcer l'Adulte : prendre le temps de collecter des faits avant de réagir, reformuler, poser des questions ouvertes.");
  if (scores.EAS >= 7)
    advice.push("Travailler l'affirmation de soi pour transformer la sur-adaptation en accord conscient (dire un vrai « oui » ou un vrai « non »).");
  if (scores.EAR >= 7)
    advice.push("Distinguer l'opposition automatique du désaccord argumenté, pour préserver la qualité du lien.");
  if (scores.PN >= 8)
    advice.push("Vérifier que l'aide apportée est demandée et respecte l'autonomie de l'autre (éviter le rôle de Sauveur).");
  if (scores.PNo >= 8)
    advice.push("Assouplir le discours normatif : passer du « il faut » au « je propose », pour ouvrir le dialogue.");
  if (scores.EL <= 3)
    advice.push("Faire une place au plaisir et à la spontanéité : activités créatives, jeu, expression des émotions positives.");
  if (scores.PN <= 3)
    advice.push("Cultiver l'auto-bienveillance : se parler à soi-même comme on parlerait à un ami cher.");
  if (advice.length === 0)
    advice.push("Continuer à observer, dans les situations tendues, quel état du moi prend le devant — c'est déjà un excellent levier de conscience.");

  return { overview, dominants, lows: lowsText, balance, tendencies, advice };
}
