import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownText } from "@/components/markdown-text";
import { generateIndividualAnalysis } from "@/lib/analysis.functions";
import {
  downloadIndividualReportImage,
  downloadIndividualReportPdf,
  type CatKey,
} from "@/lib/team-report";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["dejacquelot@gmail.com"];

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
  // Auth state
  type UserInfo = { email: string; firstName: string; lastName: string } | null;
  const [user, setUser] = useState<UserInfo>(null);
  const isAdmin = user !== null && ADMIN_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        setUser({
          email: data.user.email ?? "",
          firstName: (meta.given_name as string) ?? (meta.full_name as string)?.split(" ")[0] ?? "",
          lastName: (meta.family_name as string) ?? (meta.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
        });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser({
          email: session.user.email ?? "",
          firstName: (meta.given_name as string) ?? (meta.full_name as string)?.split(" ")[0] ?? "",
          lastName: (meta.family_name as string) ?? (meta.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
        });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

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
  const checkAll = () => setAnswers(Array(60).fill(true));

  const maxScore = Math.max(...Object.values(scores), 1);

  // Capture referral param from URL
  const [referredBy, setReferredBy] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setReferredBy(ref);
        // Clean URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.pathname);
      }
    }
  }, []);

  // Save result only when analysis is generated (not on 60-question completion)
  const [resultId, setResultId] = useState<string | null>(null);

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
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {user.firstName || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Déconnexion
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={signInWithGoogle} className="gap-1.5">
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.5l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.15-3.2-.45-4.7H24v9h12.6c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.3z" />
                  <path fill="#FBBC05" d="M10.5 19.6a14.6 14.6 0 000 8.8l-7.9 6.1A23.5 23.5 0 01.5 24c0-3.8.9-7.4 2.1-10.5l7.9 6.1z" />
                  <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.2 14.6 47.5 24 47.5z" />
                </svg>
                Se connecter
              </Button>
            )}
            {isAdmin && (
              <>
                <Link to="/stats">
                  <Button variant="outline" size="sm">
                    Statistiques
                  </Button>
                </Link>
                <Link to="/admin">
                  <Button variant="outline" size="sm">
                    Administration
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={checkAll}>
                  Tout cocher ✅
                </Button>
              </>
            )}
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
          <ResultSection scores={scores} resultId={resultId} setResultId={setResultId} referredBy={referredBy} userFirstName={user?.firstName} userLastName={user?.lastName} />
        </section>
      )}
    </div>
  );
}

type Scores = Record<CategoryKey, number>;

function ResultSection({
  scores,
  resultId,
  setResultId,
  referredBy,
  userFirstName,
  userLastName,
}: {
  scores: Scores;
  resultId: string | null;
  setResultId: (id: string) => void;
  referredBy: string | null;
  userFirstName?: string;
  userLastName?: string;
}) {
  const [firstName, setFirstName] = useState(userFirstName ?? "");
  const [lastName, setLastName] = useState(userLastName ?? "");

  // Auto-fill from Google profile when user logs in
  useEffect(() => {
    if (userFirstName && !firstName) setFirstName(userFirstName);
    if (userLastName && !lastName) setLastName(userLastName);
  }, [userFirstName, userLastName]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "img" | null>(null);



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
      // Save result to DB on first generation
      const saveRes = await fetch("/api/public/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, resultId, referred_by: referredBy }),
      }).then((r) => r.json());
      if (saveRes?.ok && saveRes?.id) setResultId(saveRes.id as string);

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

      <ShareInviteButton resultId={resultId} />
    </Card>
  );
}

function ShareInviteButton({ resultId }: { resultId: string | null }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://egogramme-at.vercel.app";
  const url = resultId ? `${baseUrl}?ref=${resultId}` : baseUrl;
  const title = "Découvre ton profil relationnel";
  const text = "Je viens de faire ce test qui m'a donné une analyse de mon profil relationnel. Il permet ensuite d'analyser comment on fonctionne entre nous et d'avoir des pistes de coaching. Ça me tenterait bien qu'on le fasse — ça prend 5 minutes 🤝";

  const handleShare = async () => {
    fetch("/api/public/track-share", { method: "POST" }).catch(() => {});
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleEmail = () => {
    fetch("/api/public/track-share", { method: "POST" }).catch(() => {});
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${text}\n\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleOutlook = () => {
    fetch("/api/public/track-share", { method: "POST" }).catch(() => {});
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${text}\n\n${url}`);
    window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`, "_blank");
  };

  const handleWhatsApp = () => {
    fetch("/api/public/track-share", { method: "POST" }).catch(() => {});
    const msg = encodeURIComponent(`${text}\n\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="mt-8 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 p-6 text-center">
      <p className="text-sm text-yellow-700 mb-1 font-medium">
        Vous venez de découvrir votre profil — bravo ! 🎉
      </p>
      <p className="text-sm text-yellow-700 mb-4">
        L'égogramme révèle aussi <strong>comment vous fonctionnez à plusieurs</strong> :
        complémentarités, tensions, leviers relationnels.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={handleEmail} className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-sm px-5 py-3 shadow-md transition-colors cursor-pointer">
          ✉️ Email
        </button>
        <button onClick={handleOutlook} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm px-5 py-3 shadow-md transition-colors cursor-pointer">
          📧 Outlook
        </button>
        <button onClick={handleWhatsApp} className="inline-flex items-center gap-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-5 py-3 shadow-md transition-colors cursor-pointer">
          💬 WhatsApp
        </button>
        <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-black font-semibold text-sm px-5 py-3 shadow-md transition-colors cursor-pointer">
          📋 Copier
        </button>
      </div>
      <p className="mt-3 text-xs text-yellow-600">
        5 minutes · gratuit · 100 % confidentiel
      </p>
      {copied && (
        <p className="mt-2 text-sm text-green-600 font-medium">✅ Lien copié dans le presse-papier !</p>
      )}
    </div>
  );
}
