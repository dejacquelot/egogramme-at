import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isAdminEmail } from "@/lib/admin-config";
import {
  listAdminResults,
  deleteAdminResult as deleteAdminResultFn,
  updateAdminResultName as updateAdminResultNameFn,
  generateTeamAnalysis as generateTeamAnalysisFn,
  provisionAdminAccount,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, ImageDown } from "lucide-react";
import {
  downloadTeamReportImage,
  downloadTeamReportPdf,
  downloadIndividualReportPdf,
  downloadIndividualReportImage,
  type TeamReportInput,
} from "@/lib/team-report";
import { generateIndividualAnalysis as generateIndividualAnalysisFn } from "@/lib/analysis.functions";



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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.5l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.15-3.2-.45-4.7H24v9h12.6c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.3z" />
      <path fill="#FBBC05" d="M10.5 19.6a14.6 14.6 0 000 8.8l-7.9 6.1A23.5 23.5 0 01.5 24c0-3.8.9-7.4 2.1-10.5l7.9 6.1z" />
      <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.2 14.6 47.5 24 47.5z" />
    </svg>
  );
}

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === "pinpin" && password === "lapin") {
      localStorage.setItem("egogramme-admin", "true");
      onSuccess();
    } else {
      setLoginError("Identifiants invalides.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">Administration</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Acc&egrave;s r&eacute;serv&eacute; aux comptes autoris&eacute;s.
        </p>
        {loginError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {loginError}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="admin-login">Login</Label>
            <Input id="admin-login" type="text" value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="admin-pwd">Mot de passe</Label>
            <Input id="admin-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Se connecter</Button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/">
            <Button type="button" variant="ghost" size="sm">Retour au test</Button>
          </Link>
        </div>
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

function averageScores(rows: ResultRow[]): Scores {
  const out = { PN: 0, PNo: 0, A: 0, EL: 0, EAS: 0, EAR: 0 } as Scores;
  if (rows.length === 0) return out;
  (Object.keys(out) as CategoryKey[]).forEach((k) => {
    const sum = rows.reduce((acc, r) => acc + (r.scores?.[k] ?? 0), 0);
    out[k] = Math.round((sum / rows.length) * 10) / 10;
  });
  return out;
}

function memberName(r: ResultRow, i: number): string {
  return (
    [r.first_name, r.last_name].filter(Boolean).join(" ") ||
    `Membre ${i + 1} (${shortHash(r.ip_hash)})`
  );
}

/** Minimal markdown renderer for headings, bold, lists and paragraphs. */
function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (/^#{1,6}\s/.test(lines[0]) && lines.length === 1) {
          const levelN = lines[0].match(/^#+/)![0].length;
          const content = lines[0].replace(/^#+\s*/, "");
          return (
            <h3
              key={bi}
              className={
                levelN <= 2
                  ? "text-base font-semibold text-foreground"
                  : "text-sm font-semibold text-foreground"
              }
            >
              {inline(content)}
            </h3>
          );
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5 text-muted-foreground">
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <div key={bi} className="space-y-1">
            {lines.map((l, i) =>
              /^#{1,6}\s/.test(l) ? (
                <h3 key={i} className="text-base font-semibold text-foreground">
                  {inline(l.replace(/^#+\s*/, ""))}
                </h3>
              ) : (
                <p key={i} className="text-muted-foreground">{inline(l)}</p>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
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
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "img" | null>(null);

  const fullName =
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    `Résultat ${row.ip_hash.slice(0, 8)}`;
  const dateLabel = new Date(row.created_at).toLocaleDateString("fr-FR", {
    dateStyle: "long",
  });

  useEffect(() => {
    setAnalysis(null);
    setAiError(null);
  }, [row.id]);

  const handleGenerate = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await generateIndividualAnalysisFn({
        data: {
          scores: row.scores,
          firstName: row.first_name?.trim() || undefined,
        },
      });
      setAnalysis(res.analysis);
    } catch (e) {
      setAiError(
        e instanceof Error && e.message
          ? e.message
          : "Analyse indisponible, réessayez dans un instant.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownload = async (kind: "pdf" | "img") => {
    if (!analysis) return;
    setDownloading(kind);
    try {
      const input = {
        name: fullName,
        date: dateLabel,
        scores: row.scores,
        analysis,
      };
      if (kind === "pdf") await downloadIndividualReportPdf(input);
      else await downloadIndividualReportImage(input);
    } catch {
      setAiError("Téléchargement impossible. Réessayez.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card className="p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Résultat détaillé
          </p>
          <h2 className="mt-1 text-lg font-semibold">{formatDate(row.created_at)}</h2>
          {(row.first_name || row.last_name || row.phone || row.contact_requested) && (
            <div className="mt-2 space-y-0.5 text-sm">
              {(row.first_name || row.last_name) && (
                <p className="font-medium text-foreground">
                  {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                </p>
              )}
              {row.contact_requested && (
                <p className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  ★ Demande de rappel
                </p>
              )}
              {row.phone && (
                <p className="text-sm text-foreground">
                  <a href={`tel:${row.phone}`} className="underline">{row.phone}</a>
                </p>
              )}
            </div>
          )}
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

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Analyse approfondie (IA)</h3>
          {!analysis && !aiLoading && (
            <Button size="sm" onClick={handleGenerate}>
              Générer l&apos;analyse
            </Button>
          )}
        </div>

        {aiLoading && (
          <p className="text-sm text-muted-foreground">Génération de l&apos;analyse en cours…</p>
        )}
        {aiError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {aiError}
          </p>
        )}
        {analysis && (
          <>
            <div className="rounded-md border border-border bg-card p-4">
              <MarkdownText text={analysis} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={downloading === "pdf"}
                onClick={() => handleDownload("pdf")}
              >
                <FileDown className="h-4 w-4" />
                {downloading === "pdf" ? "PDF…" : "Télécharger le rapport PDF"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={downloading === "img"}
                onClick={() => handleDownload("img")}
              >
                <ImageDown className="h-4 w-4" />
                {downloading === "img" ? "Image…" : "Télécharger en image"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Admin() {
  return <AdminDashboard onLogout={() => {}} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  type TeamAnalysisRow = {
    id: string;
    team_name: string;
    member_ids: string[];
    member_names: string[];
    analysis: string;
    created_at: string;
  };
  const [teamAnalyses, setTeamAnalyses] = useState<TeamAnalysisRow[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [taExporting, setTaExporting] = useState<string | null>(null);
  const [taDeletingId, setTaDeletingId] = useState<string | null>(null);

  const saveName = async (row: ResultRow) => {
    setSavingId(row.id);
    setSaveError(null);
    try {
      const res = await updateAdminResultNameFn({
        data: { id: row.id, first_name: editFirst.trim(), last_name: editLast.trim() },
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, first_name: res.first_name, last_name: res.last_name }
            : r,
        ),
      );
      setEditingId(null);
    } catch {
      setSaveError("Modification impossible. Réessayez.");
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await listAdminResults();
        if (cancelled) return;
        setRows((data as unknown) as ResultRow[]);

        // Load team analyses
        const { data: taData } = await supabase
          .from("team_analyses")
          .select("id, team_name, member_ids, member_names, analysis, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!cancelled) setTeamAnalyses((taData ?? []) as TeamAnalysisRow[]);
      } catch {
        if (!cancelled) setLoadError("Chargement impossible. Réessayez.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);


  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const teamRows = rows.filter((r) => teamIds.includes(r.id));
  const teamAverage = averageScores(teamRows);

  const toggleTeam = (id: string) => {
    setAnalysis(null);
    setAnalysisError(null);
    setTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const generateTeamAnalysis = async () => {
    setAnalysing(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const res = await generateTeamAnalysisFn({
        data: { ids: teamIds, teamName: teamName.trim() || undefined },
      });
      setAnalysis(res.analysis);

      // Add to local team analyses list immediately
      const memberNames = teamRows.map((r, i) => memberName(r, i));
      const newTa: TeamAnalysisRow = {
        id: crypto.randomUUID(),
        team_name: teamName.trim(),
        member_ids: teamIds,
        member_names: memberNames,
        analysis: res.analysis,
        created_at: new Date().toISOString(),
      };
      setTeamAnalyses((prev) => [newTa, ...prev]);
    } catch (e) {
      setAnalysisError(
        e instanceof Error && e.message && !/fetch/i.test(e.message)
          ? e.message
          : "Analyse impossible. Réessayez.",
      );
    } finally {
      setAnalysing(false);
    }
  };

  const handleDelete = async (row: ResultRow) => {
    const who = [row.first_name, row.last_name].filter(Boolean).join(" ")
      || formatDate(row.created_at);
    const ok = typeof window !== "undefined"
      && window.confirm(
        `Supprimer définitivement le résultat de « ${who} » ? Cette action est irréversible.`,
      );
    if (!ok) return;
    setDeletingId(row.id);
    setDeleteError(null);
    try {
      await deleteAdminResultFn({ data: { id: row.id } });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (selectedId === row.id) setSelectedId(null);
    } catch {
      setDeleteError("Suppression impossible. Réessayez.");
    } finally {
      setDeletingId(null);
    }
  };

  const reportInput = (): TeamReportInput => ({
    teamName,
    average: teamAverage,
    members: teamRows.map((r, i) => ({
      name: memberName(r, i),
      date: formatDate(r.created_at),
      scores: (Object.fromEntries(
        CATEGORIES.map((c) => [c.key, r.scores?.[c.key] ?? 0]),
      ) as Scores),
    })),
    analysis: analysis ?? "",
  });

  const exportReport = async (kind: "pdf" | "png") => {
    if (!analysis) return;
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === "pdf") await downloadTeamReportPdf(reportInput());
      else await downloadTeamReportImage(reportInput());
    } catch {
      setExportError(
        kind === "pdf"
          ? "Export PDF impossible. Essayez le téléchargement en image."
          : "Export image impossible. Réessayez.",
      );
    } finally {
      setExporting(null);
    }
  };

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

        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Composition d'équipe</h2>
            <p className="text-xs text-muted-foreground">
              Cochez au moins deux résultats dans l'historique pour constituer une équipe.
            </p>
          </div>

          {teamRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun membre sélectionné.
            </p>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Égogramme moyen de l'équipe ({teamRows.length} membre
                    {teamRows.length > 1 ? "s" : ""})
                  </h3>
                  <Bars scores={teamAverage} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Membres</h3>
                  <ul className="space-y-1.5 text-xs">
                    {teamRows.map((r, i) => (
                      <li key={r.id} className="flex items-center gap-2">
                        <span className="flex-1">{memberName(r, i)}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {CATEGORIES.map((c) => r.scores?.[c.key] ?? 0).join(" · ")}
                        </span>
                        <button
                          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          onClick={() => toggleTeam(r.id)}
                        >
                          retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Ordre des scores : {CATEGORIES.map((c) => c.short).join(" · ")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="w-full max-w-xs">
                  <Label htmlFor="teamName" className="text-xs">
                    Nom de l'équipe (optionnel)
                  </Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ex. Comité de direction"
                  />
                </div>
                <Button
                  onClick={generateTeamAnalysis}
                  disabled={analysing || teamRows.length < 2}
                >
                  {analysing ? "Analyse en cours…" : "Générer une analyse"}
                </Button>
                <Button variant="outline" onClick={() => {
                  setTeamIds([]);
                  setAnalysis(null);
                  setAnalysisError(null);
                }}>
                  Vider la sélection
                </Button>
              </div>

              {analysisError && (
                <p className="text-sm text-red-600">{analysisError}</p>
              )}
              {analysis && (
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                    Analyse transactionnelle de l'équipe
                  </p>
                  <MarkdownText text={analysis} />
                  {exportError && (
                    <p className="mt-3 text-sm text-red-600">{exportError}</p>
                  )}
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => exportReport("pdf")}
                      disabled={exporting !== null}
                      className="gap-1.5"
                    >
                      <FileDown className="h-4 w-4" />
                      {exporting === "pdf" ? "Génération…" : "Télécharger le rapport PDF"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportReport("png")}
                      disabled={exporting !== null}
                      className="gap-1.5"
                    >
                      <ImageDown className="h-4 w-4" />
                      {exporting === "png" ? "Génération…" : "Télécharger en image"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

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
            ) : loadError ? (
              <p className="py-8 text-center text-sm text-red-600">{loadError}</p>

            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun résultat enregistré pour l'instant.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium" title="Ajouter à l'équipe">Éq.</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Contact</th>
                    <th className="py-2 pr-3 font-medium">Téléphone</th>
                    <th className="py-2 pr-3 font-medium">IP (hash)</th>
                    {CATEGORIES.map((c) => (
                      <th key={c.key} className="py-2 pr-3 font-medium text-center" title={c.label}>
                        {c.short}
                      </th>
                    ))}
                    <th className="py-2 pr-3 font-medium"></th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={
                        "border-b border-border/50 hover:bg-muted/40 " +
                        (r.id === selectedId ? "bg-muted/60 " : "") +
                        (r.contact_requested ? "bg-amber-50/60 " : "")
                      }
                    >
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                          checked={teamIds.includes(r.id)}
                          onChange={() => toggleTeam(r.id)}
                          aria-label={`Ajouter ${memberName(r, 0)} à l'équipe`}
                        />
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {editingId === r.id ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              className="w-24 rounded border border-border bg-background px-1.5 py-1 text-xs"
                              placeholder="Prénom"
                              value={editFirst}
                              onChange={(e) => setEditFirst(e.target.value)}
                            />
                            <input
                              className="w-24 rounded border border-border bg-background px-1.5 py-1 text-xs"
                              placeholder="Nom"
                              value={editLast}
                              onChange={(e) => setEditLast(e.target.value)}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2"
                              disabled={savingId === r.id}
                              onClick={() => saveName(r)}
                            >
                              {savingId === r.id ? "…" : "OK"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => setEditingId(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {r.contact_requested && (
                              <span
                                title="Demande de rappel"
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white"
                              >
                                ★
                              </span>
                            )}
                            {(r.first_name || r.last_name) ? (
                              <span className="font-medium text-foreground">
                                {[r.first_name, r.last_name].filter(Boolean).join(" ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            <button
                              className="text-primary underline underline-offset-2 hover:opacity-80"
                              onClick={() => {
                                setEditingId(r.id);
                                setEditFirst(r.first_name ?? "");
                                setEditLast(r.last_name ?? "");
                                setSaveError(null);
                              }}
                              title="Modifier prénom et nom"
                            >
                              ✎
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {r.phone ? (
                          <a href={`tel:${r.phone}`} className="text-primary underline underline-offset-2">
                            {r.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                      <td className="py-2 pr-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setSelectedId(r.id);
                          if (typeof window !== "undefined") {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}>
                          Détail
                        </Button>
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r)}
                        >
                          {deletingId === r.id ? "Suppression…" : "Supprimer"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {saveError && (
              <p className="mt-3 text-sm text-red-600">{saveError}</p>
            )}
            {deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}
          </div>
        </Card>

        {teamAnalyses.length > 0 && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold">
              Analyses d'équipe enregistrées ({teamAnalyses.length})
            </h2>
            <div className="mt-4 space-y-3">
              {teamAnalyses.map((ta) => (
                <div key={ta.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">
                        {ta.team_name || "Équipe sans nom"}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatDate(ta.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {(ta.member_names ?? []).length} membre{(ta.member_names ?? []).length > 1 ? "s" : ""}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExpandedTeamId(expandedTeamId === ta.id ? null : ta.id)
                        }
                      >
                        {expandedTeamId === ta.id ? "Masquer" : "Voir l'analyse"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={taDeletingId === ta.id}
                        onClick={async () => {
                          const ok = typeof window !== "undefined" &&
                            window.confirm(`Supprimer l'analyse « ${ta.team_name || "Équipe sans nom"} » ?`);
                          if (!ok) return;
                          setTaDeletingId(ta.id);
                          await supabase.from("team_analyses").delete().eq("id", ta.id);
                          setTeamAnalyses((prev) => prev.filter((t) => t.id !== ta.id));
                          setTaDeletingId(null);
                        }}
                      >
                        {taDeletingId === ta.id ? "…" : "Supprimer"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(ta.member_names ?? []).join(", ")}
                  </p>
                  {expandedTeamId === ta.id && (
                    <div className="mt-3 border-t border-border pt-3">
                      <MarkdownText text={ta.analysis} />
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={taExporting !== null}
                          className="gap-1.5"
                          onClick={async () => {
                            setTaExporting(ta.id + "-pdf");
                            try {
                              const memberRows = rows.filter((r) => (ta.member_ids ?? []).includes(r.id));
                              const avg = averageScores(memberRows);
                              const members = (ta.member_names ?? []).map((name: string, i: number) => ({
                                name,
                                date: memberRows[i] ? formatDate(memberRows[i].created_at) : "",
                                scores: memberRows[i]
                                  ? (Object.fromEntries(CATEGORIES.map((c) => [c.key, memberRows[i].scores?.[c.key] ?? 0])) as Scores)
                                  : ({ PN: 0, PNo: 0, A: 0, EL: 0, EAS: 0, EAR: 0 } as Scores),
                              }));
                              await downloadTeamReportPdf({ teamName: ta.team_name, average: avg, members, analysis: ta.analysis });
                            } catch { toast.error("Export PDF impossible."); }
                            finally { setTaExporting(null); }
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                          {taExporting === ta.id + "-pdf" ? "Génération…" : "Télécharger le rapport PDF"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={taExporting !== null}
                          className="gap-1.5"
                          onClick={async () => {
                            setTaExporting(ta.id + "-img");
                            try {
                              const memberRows = rows.filter((r) => (ta.member_ids ?? []).includes(r.id));
                              const avg = averageScores(memberRows);
                              const members = (ta.member_names ?? []).map((name: string, i: number) => ({
                                name,
                                date: memberRows[i] ? formatDate(memberRows[i].created_at) : "",
                                scores: memberRows[i]
                                  ? (Object.fromEntries(CATEGORIES.map((c) => [c.key, memberRows[i].scores?.[c.key] ?? 0])) as Scores)
                                  : ({ PN: 0, PNo: 0, A: 0, EL: 0, EAS: 0, EAR: 0 } as Scores),
                              }));
                              await downloadTeamReportImage({ teamName: ta.team_name, average: avg, members, analysis: ta.analysis });
                            } catch { toast.error("Export image impossible."); }
                            finally { setTaExporting(null); }
                          }}
                        >
                          <ImageDown className="h-4 w-4" />
                          {taExporting === ta.id + "-img" ? "Génération…" : "Télécharger en image"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}