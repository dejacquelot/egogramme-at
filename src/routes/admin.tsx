import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Égogramme" },
      { name: "description", content: "Espace d'administration privé." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Admin,
});

type CategoryKey = "PN" | "PNo" | "A" | "EL" | "EAS" | "EAR";
type Scores = Record<CategoryKey, number>;

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  short: string;
  color: string;
}[] = [
  { key: "PN", label: "Parent Nourricier", short: "PNr", color: "oklch(0.72 0.15 30)" },
  { key: "PNo", label: "Parent Normatif", short: "PNo", color: "oklch(0.6 0.15 60)" },
  { key: "A", label: "Adulte", short: "A", color: "oklch(0.55 0.15 250)" },
  { key: "EL", label: "Enfant Libre", short: "EL", color: "oklch(0.7 0.17 140)" },
  { key: "EAS", label: "Enfant Adapté Soumis", short: "EAS", color: "oklch(0.6 0.13 310)" },
  { key: "EAR", label: "Enfant Adapté Rebelle", short: "EAR", color: "oklch(0.6 0.2 20)" },
];

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
    balance = "L'Adulte occupe une place centrale et régulatrice : bonne capacité à arbitrer entre les injonctions du Parent et les besoins de l'Enfant.";
  } else if (P > E + 4) {
    balance = "Le Parent l'emporte nettement sur l'Enfant : posture plutôt encadrante, potentiellement au détriment de la spontanéité et du plaisir.";
  } else if (E > P + 4) {
    balance = "L'Enfant domine le Parent : forte réactivité émotionnelle, énergie vive, mais un cadre intérieur qui peut manquer.";
  } else if (A <= 3) {
    balance = "L'Adulte est peu mobilisé, ce qui laisse les décisions osciller entre les scripts parentaux et les réactions de l'Enfant ; renforcer l'Adulte apporterait plus de stabilité.";
  } else {
    balance = "Les trois grandes instances (Parent, Adulte, Enfant) sont globalement équilibrées, ce qui favorise une communication souple.";
  }

  const tParts: string[] = [];
  if (scores.PN >= 7) tParts.push("posture d'aidant naturel, à surveiller pour ne pas glisser vers le sauvetage");
  if (scores.PNo >= 7) tParts.push("tendance à structurer, évaluer, parfois juger");
  if (scores.EL >= 7) tParts.push("expressivité et enthousiasme communicatifs");
  if (scores.EAS >= 7) tParts.push("forte adaptabilité sociale, avec un risque d'oubli de soi");
  if (scores.EAR >= 7) tParts.push("énergie d'opposition qui peut ressourcer comme user la relation");
  if (scores.A >= 7) tParts.push("mode de communication factuel et négociateur");
  if (tParts.length === 0)
    tParts.push("profil sans hyper-investissement marqué : la personne module ses états du moi selon les situations");
  const tendencies = "En relation, on peut s'attendre à : " + tParts.join(" ; ") + ".";

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

type ResultRow = {
  id: string;
  ip_hash: string;
  scores: Scores;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  contact_requested: boolean;
};

const AUTH_KEY = "egogramme_admin_auth_v1";
const VALID_USER = "pinpin";
const VALID_PASS = "lapin";

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.trim() === VALID_USER && pass === VALID_PASS) {
      try {
        sessionStorage.setItem(AUTH_KEY, "1");
      } catch {}
      onSuccess();
    } else {
      setErr(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">Administration</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Accès réservé. Entrez vos identifiants.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="user" className="text-xs">Identifiant</Label>
            <Input
              id="user"
              autoComplete="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="pass" className="text-xs">Mot de passe</Label>
            <Input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          {err && (
            <p className="text-xs text-red-600">Identifiants incorrects.</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <Link to="/stats">
              <Button type="button" variant="outline" size="sm">
                Retour
              </Button>
            </Link>
            <Button type="submit" size="sm">Se connecter</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function shortHash(h: string): string {
  if (!h) return "—";
  return h.slice(0, 8) + "…" + h.slice(-4);
}

function Bars({ scores }: { scores: Scores }) {
  const maxScore = Math.max(...Object.values(scores), 1);
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex h-56 flex-col-reverse justify-between py-1 pr-1 text-[10px] tabular-nums text-muted-foreground">
          {Array.from({ length: 11 }, (_, n) => (
            <span key={n} className="leading-none">{n}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col-reverse justify-between">
            {Array.from({ length: 11 }, (_, n) => (
              <div
                key={n}
                className={"border-t " + (n === 0 ? "border-foreground/40" : "border-border/60")}
              />
            ))}
          </div>
          <div className="relative flex h-56 items-end gap-2">
            {CATEGORIES.map((cat) => {
              const score = scores[cat.key] ?? 0;
              const heightPct = (score / 10) * 100;
              const isMax = score === maxScore && score > 0;
              return (
                <div key={cat.key} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div className="relative flex w-full items-end justify-center" style={{ height: `${heightPct}%` }}>
                    <div className="absolute -top-5 text-xs font-semibold tabular-nums">{score}</div>
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: "100%",
                        backgroundColor: cat.color,
                        minHeight: score > 0 ? "3px" : "0",
                        outline: isMax ? "2px solid var(--foreground)" : undefined,
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
      <div className="mt-2 flex gap-2 pl-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex-1 text-center text-[11px] font-semibold">
            {cat.short}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultDetail({ row, onClose }: { row: ResultRow; onClose: () => void }) {
  const interp = useMemo(() => buildInterpretation(row.scores), [row.scores]);
  return (
    <Card className="p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Résultat détaillé
          </p>
          <h2 className="mt-1 text-lg font-semibold">{formatDate(row.created_at)}</h2>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
            IP hash : {row.ip_hash}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold mb-3">Diagramme</h3>
          <Bars scores={row.scores} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Scores</h3>
          <ul className="space-y-1.5 text-xs">
            {CATEGORIES.map((cat) => (
              <li key={cat.key} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1">{cat.label}</span>
                <span className="tabular-nums text-muted-foreground">{row.scores[cat.key]}/10</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-4 text-sm leading-relaxed">
        <div>
          <h3 className="font-semibold">Profil global</h3>
          <p className="mt-1 text-muted-foreground">{interp.overview}</p>
        </div>
        <div>
          <h3 className="font-semibold">États dominants</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {interp.dominants.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
        {interp.lows.length > 0 && (
          <div>
            <h3 className="font-semibold">États peu investis</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {interp.lows.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
        <div>
          <h3 className="font-semibold">Équilibre Parent / Adulte / Enfant</h3>
          <p className="mt-1 text-muted-foreground">{interp.balance}</p>
        </div>
        <div>
          <h3 className="font-semibold">Tendances relationnelles</h3>
          <p className="mt-1 text-muted-foreground">{interp.tendencies}</p>
        </div>
        <div>
          <h3 className="font-semibold">Pistes de développement</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {interp.advice.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(AUTH_KEY) === "1");
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />;

  return <AdminDashboard onLogout={() => {
    try { sessionStorage.removeItem(AUTH_KEY); } catch {}
    setAuthed(false);
  }} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("results")
        .select("id, ip_hash, scores, created_at, first_name, last_name, phone, contact_requested")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      setRows(((data as unknown) as ResultRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Administration
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Résultats des tests
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/stats">
              <Button variant="outline" size="sm">← Statistiques</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {selected && (
          <ResultDetail row={selected} onClose={() => setSelectedId(null)} />
        )}

        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              Historique {loading ? "" : `(${rows.length})`}
            </h2>
            <p className="text-xs text-muted-foreground">
              Cliquez sur un IP hash pour voir le détail.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun résultat enregistré pour l'instant.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">IP (hash)</th>
                    {CATEGORIES.map((c) => (
                      <th key={c.key} className="py-2 pr-3 font-medium text-center" title={c.label}>
                        {c.short}
                      </th>
                    ))}
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={
                        "border-b border-border/50 hover:bg-muted/40 " +
                        (r.id === selectedId ? "bg-muted/60" : "")
                      }
                    >
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          className="font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80"
                          onClick={() => {
                            setSelectedId(r.id);
                            if (typeof window !== "undefined") {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          title={r.ip_hash}
                        >
                          {shortHash(r.ip_hash)}
                        </button>
                      </td>
                      {CATEGORIES.map((c) => (
                        <td key={c.key} className="py-2 pr-3 text-center tabular-nums text-xs">
                          {r.scores?.[c.key] ?? 0}
                        </td>
                      ))}
                      <td className="py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setSelectedId(r.id);
                          if (typeof window !== "undefined") {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}>
                          Détail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}