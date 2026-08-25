import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Test égogramme gratuit — mieux vous connaître pour mieux interagir" },
      {
        name: "description",
        content:
          "Révélez votre mode de fonctionnement relationnel en moins de 5 minutes. Test d'égogramme interactif basé sur l'analyse transactionnelle.",
      },
      { property: "og:title", content: "Test égogramme gratuit — mieux vous connaître pour mieux interagir" },
      {
        property: "og:description",
        content:
          "Découvrez votre égogramme personnel et développez des relations plus fluides, équilibrées et constructives.",
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
            Test égogramme gratuit — mieux vous connaître pour mieux interagir
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Révélez votre mode de fonctionnement relationnel
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            L'égogramme est une cartographie visuelle de votre personnalité issue
            de l'Analyse Transactionnelle. En moins de 5 minutes, ce test vous
            permet de :
          </p>
          <ul className="mt-3 max-w-2xl space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Mieux vous connaître</strong> : décoder vos réflexes automatiques et vos leviers d'énergie au quotidien.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Améliorer vos échanges</strong> : comprendre pourquoi le courant passe (ou coince) avec vos proches ou vos collègues.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Ajuster votre posture</strong> : développer des relations plus fluides, équilibrées et constructives.
              </span>
            </li>
          </ul>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Il n'y a pas de "bon" ou de "mauvais" résultat : c'est simplement une
            photo à un instant T de votre dynamique personnelle.
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

      {answeredCount === 60 && (
        <section className="mx-auto max-w-5xl px-4 pb-12">
          <ResultSection scores={scores} resultId={resultId} />
        </section>
      )}
    </div>
  );
}

type Scores = Record<CategoryKey, number>;

function ResultSection({
  scores,
  resultId,
}: {
  scores: Scores;
  resultId: string | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "img" | null>(null);

  // Optional callback section (revealed by a button).
  const [showCallback, setShowCallback] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
    [],
  );
  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  const persistIdentity = async (contactRequested: boolean) => {
    if (!resultId) return;
    try {
      await fetch("/api/public/save-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resultId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          contact_requested: contactRequested,
          phone: contactRequested ? phone.trim() : null,
        }),
      });
    } catch {
      /* non-blocking */
    }
  };

  const handleGenerate = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Merci d'indiquer votre prénom et votre nom.");
      return;
    }
    setLoading(true);
    try {
      persistIdentity(false);
      const res = await generateIndividualAnalysis({
        data: { scores, firstName: firstName.trim() },
      });
      setAnalysis(res.analysis);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Analyse indisponible, réessayez dans un instant.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (kind: "pdf" | "img") => {
    if (!analysis) return;
    setDownloading(kind);
    try {
      const input = {
        name: fullName || "Résultat individuel",
        date: dateLabel,
        scores: scores as Record<CatKey, number>,
        analysis,
      };
      if (kind === "pdf") await downloadIndividualReportPdf(input);
      else await downloadIndividualReportImage(input);
    } catch {
      setError("Téléchargement impossible. Réessayez.");
    } finally {
      setDownloading(null);
    }
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Merci d'indiquer votre prénom et votre nom.");
      return;
    }
    if (phone.trim().length < 4) {
      setFormError("Merci d'indiquer un numéro de téléphone valide.");
      return;
    }
    if (!resultId) {
      setFormError("Votre résultat n'est pas encore enregistré, réessayez dans un instant.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/save-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resultId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          contact_requested: true,
          phone: phone.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setFormError("Enregistrement impossible. Veuillez réessayer.");
        return;
      }
      setSubmitted(true);
    } catch {
      setFormError("Enregistrement impossible. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Votre test est terminé
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Analyse transactionnelle
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Indiquez votre prénom et votre nom, puis générez votre analyse
        approfondie. Elle apparaîtra ci-dessous et pourra être téléchargée en
        PDF ou en image.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="report-firstName" className="text-xs">Prénom</Label>
          <Input
            id="report-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>
        <div>
          <Label htmlFor="report-lastName" className="text-xs">Nom</Label>
          <Input
            id="report-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading
            ? "Génération de l'analyse…"
            : analysis
              ? "Régénérer mon analyse"
              : "Générer mon analyse"}
        </Button>
      </div>

      {analysis && (
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-base font-semibold text-foreground">
            Interprétation clinique de votre égogramme
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Lecture indicative, à visée pédagogique — ne remplace pas un
            entretien avec un professionnel.
          </p>
          <div className="mt-4">
            <MarkdownText text={analysis} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => handleDownload("pdf")} disabled={downloading !== null}>
              {downloading === "pdf" ? "Préparation…" : "Télécharger le rapport PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload("img")}
              disabled={downloading !== null}
            >
              {downloading === "img" ? "Préparation…" : "Télécharger en image"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-6">
        {!showCallback ? (
          <Button variant="outline" onClick={() => setShowCallback(true)}>
            Souhaitez-vous être rappelé·e pour débriefer votre égogramme ?
          </Button>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-base font-semibold">Être rappelé·e par un coach</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Laissez vos coordonnées pour un échange de 15 minutes avec un coach.
              Prénom, nom et numéro de téléphone sont obligatoires.
            </p>

            {submitted ? (
              <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                Merci {firstName} ! Vos coordonnées ont bien été enregistrées —
                vous serez rappelé·e sous peu.
              </p>
            ) : (
              <form onSubmit={handleSubmitContact} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cb-firstName" className="text-xs">Prénom</Label>
                    <Input
                      id="cb-firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cb-lastName" className="text-xs">Nom</Label>
                    <Input
                      id="cb-lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cb-phone" className="text-xs">Téléphone</Label>
                  <Input
                    id="cb-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="+33 6 12 34 56 78"
                    required
                  />
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Envoi…" : "Demander à être rappelé·e"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCallback(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
