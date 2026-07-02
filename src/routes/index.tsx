import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

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
  const [hideChart, setHideChart] = useState(false);

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
              <Switch
                id="hide-chart"
                checked={hideChart}
                onCheckedChange={setHideChart}
              />
              <Label htmlFor="hide-chart" className="text-sm">
                Masquer le diagramme
              </Label>
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

              {hideChart ? (
                <p className="mt-6 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Le diagramme est masqué pendant la saisie. Activez le bouton
                  pour l'afficher.
                </p>
              ) : (
                <>
                  {/* Bar chart */}
                  <div className="mt-5">
                    <div className="flex h-56 items-end gap-2">
                      {CATEGORIES.map((cat) => {
                        const score = scores[cat.key];
                        const heightPct = (score / 10) * 100;
                        return (
                          <div
                            key={cat.key}
                            className="flex flex-1 flex-col items-center gap-1"
                          >
                            <div className="text-xs font-semibold tabular-nums text-foreground">
                              {score}
                            </div>
                            <div className="flex h-full w-full items-end rounded-md bg-muted/50">
                              <div
                                className="w-full rounded-md transition-all duration-500 ease-out"
                                style={{
                                  height: `${heightPct}%`,
                                  backgroundColor: cat.color,
                                  minHeight: score > 0 ? "4px" : "0",
                                  boxShadow:
                                    score === maxScore && score > 0
                                      ? "0 0 0 2px oklch(from " +
                                        cat.color +
                                        " l c h / 0.3)"
                                      : undefined,
                                }}
                              />
                            </div>
                            <div
                              className="text-[10px] font-medium text-muted-foreground text-center leading-tight"
                              title={cat.label}
                            >
                              {cat.short}
                            </div>
                          </div>
                        );
                      })}
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
              )}

              <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">
                D'après Michel Josien, « Techniques de communication
                interpersonnelle », Les Éditions d'Organisation.
              </p>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
