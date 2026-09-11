import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownText } from "@/components/markdown-text";
import { streamAnalysis } from "@/lib/stream-client";
import {
  downloadIndividualReportImage,
  downloadIndividualReportPdf,
  buildIndividualReportUploads,
  type CatKey,
} from "@/lib/team-report";
import { storeReportFiles } from "@/lib/report.functions";
import { supabase } from "@/integrations/supabase/client";
import { completeInvitation, linkResultToUser } from "@/lib/invitation.functions";
import { NavBar } from "@/components/nav-bar";
import { isAdminEmail } from "@/lib/admin-config";
import { progressApi } from "@/lib/progress-api";
import { EgogramCard } from "@/components/egogram-card";
import { type CategoryKey } from "@/lib/egogram-categories";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: (typeof search.ref === "string" ? search.ref : undefined) as string | undefined,
    inv: (typeof search.inv === "string" ? search.inv : undefined) as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "- Test égogramme d'équipe gratuit — mieux vous connaître pour mieux interagir -" },
      {
        name: "description",
        content:
          "Révélez vos modes de fonctionnement relationnel en moins de 5 minutes. Test d'égogramme d'équipe basé sur l'analyse transactionnelle.",
      },
      { property: "og:title", content: "- Test égogramme d'équipe gratuit — mieux vous connaître pour mieux interagir -" },
      {
        property: "og:description",
        content:
          "Révélez vos modes de fonctionnement relationnel en moins de 5 minutes. Test d'égogramme d'équipe basé sur l'analyse transactionnelle.",
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


const MAPPING: Record<CategoryKey, number[]> = {
  PN: [4, 8, 14, 22, 28, 33, 36, 50, 57, 60],
  PNo: [6, 12, 16, 24, 26, 32, 37, 48, 52, 56],
  A: [1, 11, 17, 19, 27, 29, 38, 42, 44, 54],
  EL: [5, 7, 15, 23, 25, 41, 43, 47, 53, 59],
  EAS: [3, 9, 13, 21, 31, 34, 40, 46, 51, 58],
  EAR: [2, 10, 18, 20, 30, 35, 39, 45, 49, 55],
};

const ANSWERS_STORAGE_KEY = "egogramme_answers";

function Index() {
  // Read search params from router
  const { ref: routerRef, inv: routerInv } = Route.useSearch();

  // Auth state
  type UserInfo = { id: string; email: string; firstName: string; lastName: string } | null;
  const [user, setUser] = useState<UserInfo>(null);
  const isAdmin = user !== null && isAdminEmail(user.email);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        setUser({
          id: data.user.id,
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
          id: session.user.id,
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


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // answers[i] = true (Plutôt vrai) | false (Plutôt faux) | undefined
  const [answers, setAnswers] = useState<(boolean | undefined)[]>(
    () => Array(60).fill(undefined),
  );
  const [answersRestored, setAnswersRestored] = useState(false);

  // Restaure les réponses au montage : changement de page, retour depuis Mon Espace,
  // ou retour de la redirection OAuth après création de compte.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ANSWERS_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 60) {
          setAnswers(parsed.map((v) => (typeof v === "boolean" ? v : undefined)));
        }
      }
    } catch {
      // localStorage indisponible (navigation privée, cookies bloqués)
    }
    setAnswersRestored(true);
  }, []);

  // Sauvegarde à chaque réponse, une fois la restauration terminée
  useEffect(() => {
    if (!answersRestored) return;
    try {
      window.localStorage.setItem(
        ANSWERS_STORAGE_KEY,
        JSON.stringify(answers.map((v) => (v === undefined ? null : v))),
      );
    } catch {
      // quota dépassé ou stockage indisponible
    }
  }, [answers, answersRestored]);

  // Synchronisation avec le compte : permet de retrouver ses réponses
  // depuis un autre appareil. Best-effort, ne bloque jamais le test.
  const syncedUserId = useRef<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [progressSynced, setProgressSynced] = useState(false);
  const [reloading, setReloading] = useState(false);

  const countAnswered = (list: (boolean | undefined)[]) =>
    list.filter((a) => a !== undefined).length;

  useEffect(() => {
    if (!answersRestored) return;
    if (!user) {
      syncedUserId.current = null;
      setProgressSynced(false);
      return;
    }
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;

    let cancelled = false;
    void (async () => {
      const remote = await progressApi.get(user.id);
      if (cancelled) return;

      // On conserve la version la plus avancée pour ne jamais perdre de réponses
      const local = answersRef.current;
      const merged =
        remote && countAnswered(remote) > countAnswered(local) ? remote : local;
      setAnswers(merged);
      setProgressSynced(true);

      // Écriture immédiate : garantit qu'une ligne existe pour ce compte même si
      // l'utilisateur quitte la page sans répondre à d'autres questions.
      // On n'écrit jamais un tableau vide : si la lecture a échoué (réseau,
      // serveur), cela écraserait une progression valide déjà enregistrée.
      if (countAnswered(merged) > 0) {
        void progressApi.save(user.id, merged);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, answersRestored]);

  // Rechargement manuel depuis le compte, sans condition de fusion
  const reloadFromAccount = async () => {
    if (!user || reloading) return;
    setReloading(true);
    const remote = await progressApi.get(user.id);
    if (remote) setAnswers(remote);
    setReloading(false);
  };

  // Envoi différé au serveur, uniquement après la fusion initiale
  useEffect(() => {
    if (!progressSynced || !user) return;
    const timer = setTimeout(() => {
      void progressApi.save(user.id, answers);
    }, 800);
    return () => clearTimeout(timer);
  }, [answers, user, progressSynced]);

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

  // Capture referral and invitation params from URL
  const [referredBy] = useState<string | null>(routerRef ?? null);
  const [invToken] = useState<string | null>(routerInv ?? null);
  useEffect(() => {
    if (typeof window !== "undefined" && (routerRef || routerInv)) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      url.searchParams.delete("inv");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  // Save result only when analysis is generated (not on 60-question completion)
  const [resultId, setResultId] = useState<string | null>(null);

  // Bandeau d'accueil : replié par défaut sur mobile pour ne pas repousser
  // la première question sous la ligne de flottaison. Toujours ouvert sur grand écran.
  const [heroOpen, setHeroOpen] = useState(false);

  // Panneau égogramme accessible pendant le test sur mobile
  const [chartOpen, setChartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <header className="border-b border-border">
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600">
          <div className="mx-auto max-w-5xl px-4 py-7 text-center sm:py-12">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/70 sm:text-xs">
              Test égogramme gratuit — mieux vous connaître pour mieux interagir
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Comprenez ce qui se joue dans vos relations et vos équipes
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:mt-4 sm:text-base">
              En 5 minutes, découvrez votre profil relationnel issu de l'Analyse Transactionnelle.
              <span className={heroOpen ? "" : "hidden sm:inline"}>
                {" "}Puis analysez les dynamiques d'un couple, d'une famille, d'une équipe ou d'un collectif.
              </span>
            </p>

            <button
              type="button"
              onClick={() => setHeroOpen((v) => !v)}
              className="mt-3 rounded-full border border-white/45 px-4 py-1 text-xs font-medium text-white/90 sm:hidden"
            >
              {heroOpen ? "Masquer ▴" : "En savoir plus ▾"}
            </button>

            <div className={heroOpen ? "" : "hidden sm:block"}>
              <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-7">
              {[
                "Forces du groupe",
                "Risques de tensions",
                "Jeux psychologiques potentiels",
                "Leviers de coopération",
              ].map((feature) => (
                <li
                  key={feature}
                  className="rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-semibold text-white sm:text-sm"
                >
                  ✅ {feature}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-white/85 sm:text-sm">
              👩‍❤️‍👨 Couple&nbsp;&nbsp;·&nbsp;&nbsp;👨‍👩‍👧 Famille&nbsp;&nbsp;·&nbsp;&nbsp;🧑‍🤝‍🧑 Ami&nbsp;&nbsp;·&nbsp;&nbsp;💼 Collègue&nbsp;&nbsp;·&nbsp;&nbsp;👥 Équipe
            </p>
            <p className="mt-5 text-sm font-bold text-white sm:mt-6 sm:text-base">
              L'IA au service de vos relations. Et gratuitement !
            </p>
            </div>
          </div>
        </div>

        <div className="bg-card">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
            {!user && (
              <RegistrationBlock resultId={resultId} />
            )}

          <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5 sm:gap-4">
            {user ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Link to="/mon-espace" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    👥 Mon Espace
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reloadFromAccount}
                  disabled={reloading}
                  title="Récupérer les réponses enregistrées sur votre compte"
                  className="flex-1 sm:flex-none"
                >
                  {reloading ? "Chargement…" : "↻ Recharger"}
                </Button>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {user.firstName || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={signOut} className="hidden sm:inline-flex">
                  Déconnexion
                </Button>
              </div>
            ) : null}
            {isAdmin && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
              </div>
            )}
          </div>
          </div>
        </div>
      </header>

      {/* Barre de progression collante : repère permanent pendant le défilement */}
      <div className="sticky top-12 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span className="tabular-nums">{answeredCount} / 60</span>
          </div>
          <Progress value={(answeredCount / 60) * 100} className="mt-1.5 h-2" />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section aria-label="Questions" className="space-y-2">
            {QUESTIONS.map((q, i) => {
              const val = answers[i];
              return (
                <Card
                  key={i}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4"
                >
                  <div className="flex gap-2 sm:gap-3">
                    <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground sm:w-6">
                      {i + 1}.
                    </span>
                    <p className="text-sm leading-snug text-foreground">{q}</p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      size="sm"
                      variant={val === true ? "default" : "outline"}
                      onClick={() => setAnswer(i, true)}
                      className="flex-1 sm:flex-none"
                    >
                      <span className="sm:hidden">Vrai</span>
                      <span className="hidden sm:inline">Plutôt vrai</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={val === false ? "default" : "outline"}
                      onClick={() => setAnswer(i, false)}
                      className="flex-1 sm:flex-none"
                    >
                      <span className="sm:hidden">Faux</span>
                      <span className="hidden sm:inline">Plutôt faux</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </section>

          {/* Colonne latérale : grand écran uniquement */}
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
            <EgogramCard scores={scores} total={total} maxScore={maxScore} />
          </aside>
        </div>
      </main>

      {answeredCount === 60 && (
        <section className="mx-auto max-w-5xl px-4 pb-12">
          <ResultSection scores={scores} answers={answers} resultId={resultId} setResultId={setResultId} referredBy={referredBy} invToken={invToken} user={user} userFirstName={user?.firstName} userLastName={user?.lastName} />
        </section>
      )}

      {/* Panneau égogramme mobile : le graphique reste accessible pendant le test */}
      <div className="sticky bottom-0 z-40 lg:hidden">
        {chartOpen && (
          <div className="max-h-[65vh] overflow-y-auto border-t border-border bg-background px-4 pb-3 pt-4 shadow-lg">
            <EgogramCard scores={scores} total={total} maxScore={maxScore} className="p-4" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setChartOpen((v) => !v)}
          aria-expanded={chartOpen}
          className="flex w-full items-center justify-between border-t border-border bg-foreground px-4 py-3 text-sm font-semibold text-background"
        >
          <span>📊 {chartOpen ? "Masquer mon égogramme" : "Voir mon égogramme"}</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal opacity-75 tabular-nums">Σ = {total}</span>
            <span>{chartOpen ? "▼" : "▲"}</span>
          </span>
        </button>
      </div>
    </div>
  );
}

type Scores = Record<CategoryKey, number>;

type UserInfo = { id?: string; email: string; firstName: string; lastName: string } | null;

function ResultSection({
  scores,
  answers,
  resultId,
  setResultId,
  referredBy,
  invToken,
  user,
  userFirstName,
  userLastName,
}: {
  scores: Scores;
  answers: (boolean | undefined)[];
  resultId: string | null;
  setResultId: (id: string) => void;
  referredBy: string | null;
  invToken: string | null;
  user: UserInfo;
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
  const [indivUrls, setIndivUrls] = useState<{ pdfUrl: string; imageUrl: string } | null>(null);
  const [storing, setStoring] = useState(false);



  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
    [],
  );
  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  const persistIdentity = async (id: string) => {
    try {
      await fetch("/api/public/save-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          contact_requested: false,
          phone: null,
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
    setIndivUrls(null);
    try {
      // Save result to DB on first generation
      const saveRes = await fetch("/api/public/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores,
          resultId,
          referred_by: referredBy,
          answers: answers.map((v) => (v === undefined ? null : v)),
          userId: user?.id ?? null,
        }),
      }).then((r) => r.json());
      const savedId = (saveRes?.ok && saveRes?.id) ? saveRes.id as string : resultId;
      if (savedId) {
        setResultId(savedId);
        persistIdentity(savedId);

        // Complete invitation if arrived via ?inv= link
        if (invToken) {
          completeInvitation({ data: { token: invToken, resultId: savedId } }).catch(() => {});
        }

        // Link result to user if already logged in
        if (user?.id) {
          linkResultToUser({ data: { resultId: savedId, userId: user.id } }).catch(() => {});
        }
      }

      const analysisText = await streamAnalysis(
        "/api/analysis/individual-stream",
        { scores, firstName: firstName.trim() },
        (partial) => setAnalysis(partial),
      );

      // Store the generated PDF + image in the background (non-blocking)
      if (savedId && analysisText) {
        setStoring(true);
        void (async () => {
          try {
            const uploads = await buildIndividualReportUploads({
              name: fullName || "Résultat individuel",
              date: dateLabel,
              scores: scores as Record<CatKey, number>,
              analysis: analysisText,
            });
            const urls = await storeReportFiles({
              data: { kind: "individual", refId: savedId, ...uploads },
            });
            setIndivUrls(urls);
          } catch (storeErr) {
            console.error("store individual report error:", storeErr);
          } finally {
            setStoring(false);
          }
        })();
      }
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
        <Button onClick={handleGenerate} disabled={loading || analysis !== null}>
          {loading
            ? "Génération de l'analyse…"
            : analysis
              ? "✅ Analyse générée"
              : "Générer mon analyse"}
        </Button>
      </div>

      {!user && (
        <RegistrationBlock resultId={resultId} />
      )}

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
            {indivUrls ? (
              <>
                <Button asChild>
                  <a href={indivUrls.pdfUrl} target="_blank" rel="noopener noreferrer" download>
                    Télécharger le rapport PDF
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={indivUrls.imageUrl} target="_blank" rel="noopener noreferrer" download>
                    Télécharger en image
                  </a>
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          {storing && !indivUrls && (
            <p className="mt-2 text-xs text-muted-foreground">
              💾 Sauvegarde du rapport en cours…
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function RegistrationBlock({ resultId }: { resultId: string | null }) {
  const [rgpd, setRgpd] = useState(false);
  const [registering, setRegistering] = useState(false);

  const savePending = () => {
    if (resultId && typeof window !== "undefined") {
      localStorage.setItem("egogramme_pending_result", resultId);
    }
  };

  const handleRegisterOAuth = async (provider: "google" | "linkedin_oidc") => {
    if (!rgpd) return;
    setRegistering(true);
    savePending();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/mon-espace`,
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
  };

  return (
    <div className="mt-8 rounded-xl bg-white border border-indigo-200 p-5 shadow-sm">
        <p className="text-sm text-indigo-800 font-semibold mb-3 text-center">
          💾 Enregistrer mon profil pour conserver mes résultats et générer des analyses à plusieurs.
        </p>

        <div className="flex items-start gap-2 mb-4">
          <input
            type="checkbox"
            id="rgpd-consent"
            checked={rgpd}
            onChange={(e) => setRgpd(e.target.checked)}
            className="mt-1 h-4 w-4 accent-indigo-600 cursor-pointer"
          />
          <label htmlFor="rgpd-consent" className="text-xs text-gray-700 cursor-pointer">
            J'accepte que mes réponses et mon profil soient enregistrés dans mon espace personnel.
            {" "}
            <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800">
              Consultez notre politique de confidentialité
            </a>.
          </label>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleRegisterOAuth("google")}
                disabled={!rgpd || registering}
                className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-black font-medium text-sm px-5 py-2.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.5l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.15-3.2-.45-4.7H24v9h12.6c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.3z" />
                  <path fill="#FBBC05" d="M10.5 19.6a14.6 14.6 0 000 8.8l-7.9 6.1A23.5 23.5 0 01.5 24c0-3.8.9-7.4 2.1-10.5l7.9 6.1z" />
                  <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.2 14.6 47.5 24 47.5z" />
                </svg>
                Google
              </button>
              <button
                onClick={() => handleRegisterOAuth("linkedin_oidc")}
                disabled={!rgpd || registering}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white font-medium text-sm px-5 py-2.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </button>
            </div>
    </div>
  );
}
