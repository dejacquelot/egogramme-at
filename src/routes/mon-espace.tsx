import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownText } from "@/components/markdown-text";
import { supabase } from "@/integrations/supabase/client";
import {
  linkResultToUser,
  createInvitation,
  listMyInvitations,
  getMyResult,
  getResultsByIds,
  saveInvitationScores,
  remindInvitation,
  resetInvitation,
  deleteInvitation,
  updateInvitationName,
} from "@/lib/invitation.functions";
import { saveTeamAnalysis, listMyTeamAnalyses, updateMyResultName, deleteMyTeamAnalysis, renameMyAnalysis } from "@/lib/admin.functions";
import {
  downloadTeamReportPdf,
  downloadTeamReportImage,
  downloadIndividualReportPdf,
  downloadIndividualReportImage,
  buildIndividualReportUploads,
  buildTeamReportUploads,
  type CatKey,
  type ReportMember,
  type ReportScores,
} from "@/lib/team-report";
import { storeReportFiles } from "@/lib/report.functions";
import { streamAnalysis } from "@/lib/stream-client";
import { NavBar } from "@/components/nav-bar";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/mon-espace")({
  head: () => ({
    meta: [
      { title: "Mon Espace — Égogramme" },
      { name: "description", content: "Gérez vos invitations et analyses collectives" },
    ],
  }),
  component: MonEspace,
});

type UserInfo = { id: string; email: string; firstName: string; lastName: string };

type Invitation = {
  id: string;
  token: string;
  invitee_first_name: string | null;
  invitee_last_name: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  status: string;
  result_id: string | null;
  created_at: string;
  reminded_at: string | null;
};

type MyResult = {
  id: string;
  scores: Record<string, number>;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

type StoredTeamAnalysis = {
  id: string;
  team_name: string;
  member_ids: string[];
  member_names: string[];
  analysis: string;
  created_at: string;
  creator_user_id: string | null;
  kind?: string | null;
};

const SCORE_LABELS: Record<string, string> = {
  PN: "Parent Nourricier",
  PNo: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};

const SCORE_KEYS: CatKey[] = ["PN", "PNo", "A", "EL", "EAS", "EAR"];

const CATEGORIES: {
  key: string;
  label: string;
  short: string;
  color: string;
  description: string;
}[] = [
  { key: "PN", label: "Parent Nourricier", short: "PNr", color: "oklch(0.72 0.15 30)", description: "Bienveillant, protecteur, encourageant." },
  { key: "PNo", label: "Parent Normatif", short: "PNf", color: "oklch(0.6 0.15 60)", description: "Cadre, règles, autorité, transmission de valeurs." },
  { key: "A", label: "Adulte", short: "A", color: "oklch(0.55 0.15 250)", description: "Rationnel, objectif, analytique, factuel." },
  { key: "EL", label: "Enfant Libre", short: "EL", color: "oklch(0.7 0.17 140)", description: "Spontané, créatif, expressif, joueur." },
  { key: "EAS", label: "Enfant Adapté Soumis", short: "EAS", color: "oklch(0.6 0.13 310)", description: "Conforme, poli, s'adapte aux attentes." },
  { key: "EAR", label: "Enfant Adapté Rebelle", short: "EAR", color: "oklch(0.6 0.2 20)", description: "Oppositionnel, provocateur, contestataire." },
];

function EgogrammeChart({ title, scores, subtitle }: { title: string; scores: Record<string, number>; subtitle?: string }) {
  const total = CATEGORIES.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const maxScore = Math.max(...CATEGORIES.map((c) => scores[c.key] ?? 0));

  return (
    <Card className="p-5 flex-1 min-w-0">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">Σ = {total}</span>
      </div>

      {/* Bar chart */}
      <div className="mt-4">
        <div className="flex gap-2">
          {/* Y axis */}
          <div className="flex h-52 flex-col-reverse justify-between py-1 pr-1 text-[10px] tabular-nums text-muted-foreground">
            {Array.from({ length: 11 }, (_, n) => (
              <span key={n} className="leading-none">{n}</span>
            ))}
          </div>
          {/* Chart area */}
          <div className="relative flex-1">
            {/* Gridlines */}
            <div className="absolute inset-0 flex flex-col-reverse justify-between">
              {Array.from({ length: 11 }, (_, n) => (
                <div key={n} className={"border-t " + (n === 0 ? "border-foreground/40" : "border-border/60")} />
              ))}
            </div>
            {/* Bars */}
            <div className="relative flex h-52 items-end gap-1">
              {CATEGORIES.map((cat) => {
                const score = scores[cat.key] ?? 0;
                const heightPct = (score / 10) * 100;
                const isMax = score === maxScore && score > 0;
                return (
                  <div key={cat.key} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div className="relative flex w-full items-end justify-center" style={{ height: `${heightPct}%` }}>
                      <div className="absolute -top-5 text-xs font-semibold tabular-nums text-foreground">{score}</div>
                      <div
                        className="w-full rounded-t-md transition-all duration-500 ease-out"
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
        {/* X axis labels */}
        <div className="mt-2 flex gap-1 pl-5">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex-1 text-center text-[10px] font-semibold text-foreground" title={cat.label}>
              {cat.short}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-4 space-y-1.5">
        {CATEGORIES.map((cat) => (
          <li key={cat.key} className="flex items-start gap-2 text-[11px]">
            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            <div className="flex-1">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-foreground">{cat.label}</span>
                <span className="tabular-nums text-muted-foreground">{scores[cat.key] ?? 0}/10</span>
              </div>
              <p className="text-muted-foreground">{cat.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
        D'après Michel Josien, « Techniques de communication interpersonnelle », Les Éditions d'Organisation.
      </p>
      {subtitle && <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

function MonEspace() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-4">Accès réservé</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Connectez-vous pour accéder à votre espace personnel.
          </p>
          <Link to="/" className="text-primary underline text-sm">
            Retour au test
          </Link>
        </Card>
      </div>
    );
  }

  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: UserInfo }) {
  const [myResult, setMyResult] = useState<MyResult | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<string[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState({ first: "", last: "" });
  const [savingName, setSavingName] = useState(false);

  // Invite form
  const [invFirstName, setInvFirstName] = useState("");
  const [invLastName, setInvLastName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Team analysis
  const [teamAnalysis, setTeamAnalysis] = useState<string | null>(null);
  const [generatingTeam, setGeneratingTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState<ReportMember[]>([]);
  const [teamAverage, setTeamAverage] = useState<ReportScores | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "img" | null>(null);
  const [teamUrls, setTeamUrls] = useState<{ pdfUrl: string; imageUrl: string } | null>(null);
  const [storingTeam, setStoringTeam] = useState(false);
  const [invScores, setInvScores] = useState<Record<string, Record<string, number>>>({});
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingScoresId, setSavingScoresId] = useState<string | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, { first: string; last: string }>>({});
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [savedNameId, setSavedNameId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [storedTeamAnalyses, setStoredTeamAnalyses] = useState<StoredTeamAnalysis[]>([]);

  // Bibliothèque d'analyses
  const [libraryFilter, setLibraryFilter] = useState<"all" | "individual" | "collective">("all");
  const [librarySearch, setLibrarySearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StoredTeamAnalysis | null>(null);

  // Individual analysis
  const [individualAnalysis, setIndividualAnalysis] = useState<string | null>(null);
  const [generatingIndiv, setGeneratingIndiv] = useState(false);
  const [downloadingIndiv, setDownloadingIndiv] = useState<"pdf" | "img" | null>(null);
  const [indivUrls, setIndivUrls] = useState<{ pdfUrl: string; imageUrl: string } | null>(null);
  const [storingIndiv, setStoringIndiv] = useState(false);

  // Actions
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://egogramme-at.vercel.app";

  // On mount: link pending result + load data
  useEffect(() => {
    (async () => {
      // Check for pending result from registration flow
      if (typeof window !== "undefined") {
        const pendingResultId = localStorage.getItem("egogramme_pending_result");
        if (pendingResultId) {
          try {
            await linkResultToUser({ data: { resultId: pendingResultId, userId: user.id } });
          } catch (e) {
            console.error("link result error:", e);
          }
          localStorage.removeItem("egogramme_pending_result");
          localStorage.removeItem("egogramme_pending_inv");
        }
      }

      // Load data
      try {
        const [result, invs, storedTeams] = await Promise.all([
          getMyResult({ data: { userId: user.id } }),
          listMyInvitations({ data: { userId: user.id } }),
          listMyTeamAnalyses({ data: { userId: user.id } }),
        ]);
        setMyResult(result);
        if (result) {
          setNameDraft({
            first: result.first_name ?? user.firstName ?? "",
            last: result.last_name ?? user.lastName ?? "",
          });
        }
        setInvitations(invs);
        setStoredTeamAnalyses(storedTeams as StoredTeamAnalysis[]);

        // Compute team average if there are answered or manually filled invitations
        const invitationsWithScores = invs.filter((i: Invitation) => i.result_id);
        if (result && invitationsWithScores.length > 0) {
          const cats: CatKey[] = ["PN", "PNo", "A", "EL", "EAS", "EAR"];
          const resultIds = [result.id, ...invitationsWithScores.map((i: Invitation) => i.result_id!).filter(Boolean)];
          try {
            const memberRows = await getResultsByIds({ data: { ids: resultIds } });
            const returnedIds = new Set(memberRows.map((r: any) => r.id));

            // Build scores lookup by result_id and detect results with missing scores
            const scoresMap: Record<string, Record<string, number>> = {};
            const validIds = new Set<string>();
            const scoreKeys = ["PN", "PNo", "A", "EL", "EAS", "EAR"];
            memberRows.forEach((r: any) => {
              const hasScores = r.scores && scoreKeys.some((k) => typeof r.scores[k] === "number" && r.scores[k] > 0);
              if (hasScores) {
                scoresMap[r.id] = r.scores;
                validIds.add(r.id);
              }
            });
            setInvScores(scoresMap);

            // Detect completed invitations whose result was deleted or has no scores
            const updatedInvs = invs.map((i: Invitation) => {
              if (i.status === "completed" && i.result_id && !validIds.has(i.result_id)) {
                return { ...i, status: "deleted" };
              }
              return i;
            });
            setInvitations(updatedInvs);

            const validMembers = memberRows.filter((r: any) => validIds.has(r.id));
            const members: ReportMember[] = validMembers.map((r: any) => ({
              name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Membre",
              date: new Date(r.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" }),
              scores: Object.fromEntries(cats.map((c) => [c, r.scores[c] ?? 0])) as ReportScores,
            }));
            setTeamMembers(members);
            if (members.length >= 2) {
              const avg = Object.fromEntries(
                cats.map((c) => [c, Math.round(members.reduce((s, m) => s + m.scores[c], 0) / members.length)]),
              ) as ReportScores;
              setTeamAverage(avg);
            }
          } catch (e) {
            console.error("compute team avg error:", e);
          }
        }
      } catch (e) {
        console.error("load data error:", e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user.id]);

  const completedInvitations = invitations.filter((i) => i.status === "completed");
  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const deletedInvitations = invitations.filter((i) => i.status === "deleted");
  const invitationsWithScores = invitations.filter((i) => i.result_id && i.status !== "deleted");
  const selectableInvitations = invitations.filter((i) => i.result_id && i.status !== "deleted");
  const selectedSelectableInvitations = selectableInvitations.filter((i) => selectedInvitationIds.includes(i.id));
  const selectedResultIds = [
    ...(myResult && selectedInvitationIds.includes("__self__") ? [myResult.id] : []),
    ...selectedSelectableInvitations.map((i) => i.result_id!).filter(Boolean),
  ] as string[];
  const selfSelected = selectedInvitationIds.includes("__self__");

  const totalSelectable = selectableInvitations.length + (myResult ? 1 : 0);
  const allSelected = totalSelectable > 0 && selectedResultIds.length === totalSelectable;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedInvitationIds([]);
    } else {
      setSelectedInvitationIds([
        ...(myResult ? ["__self__"] : []),
        ...selectableInvitations.map((i) => i.id),
      ]);
    }
  };

  const refreshLibrary = async () => {
    try {
      const rows = await listMyTeamAnalyses({ data: { userId: user.id } });
      setStoredTeamAnalyses(rows as StoredTeamAnalysis[]);
    } catch (e) {
      console.error("refresh library error:", e);
    }
  };

  const analysisKind = (a: StoredTeamAnalysis) =>
    a.kind === "individual" || (!a.kind && (a.member_ids?.length ?? 0) <= 1)
      ? "individual"
      : "collective";

  const filteredAnalyses = storedTeamAnalyses.filter((a) => {
    if (libraryFilter !== "all" && analysisKind(a) !== libraryFilter) return false;
    const q = librarySearch.trim().toLowerCase();
    if (!q) return true;
    const names = Array.isArray(a.member_names) ? a.member_names.join(" ") : "";
    return `${a.team_name} ${names}`.toLowerCase().includes(q);
  });

  const individualCount = storedTeamAnalyses.filter((a) => analysisKind(a) === "individual").length;
  const collectiveCount = storedTeamAnalyses.length - individualCount;

  const refreshTeamFromInvitations = async (nextInvitations: Invitation[]) => {
    if (!myResult) return;
    const resultIds = [
      myResult.id,
      ...nextInvitations
        .filter((i) => i.result_id && i.status !== "deleted")
        .map((i) => i.result_id!),
    ];
    if (resultIds.length < 2) {
      setTeamMembers([]);
      setTeamAverage(null);
      return;
    }

    const memberRows = await getResultsByIds({ data: { ids: resultIds } });
    const validMembers = memberRows.filter((r) =>
      SCORE_KEYS.some((key) => typeof r.scores?.[key] === "number"),
    );
    const members: ReportMember[] = validMembers.map((r) => ({
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Membre",
      date: new Date(r.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" }),
      scores: Object.fromEntries(SCORE_KEYS.map((c) => [c, r.scores[c] ?? 0])) as ReportScores,
    }));
    setTeamMembers(members);
    if (members.length >= 2) {
      setTeamAverage(
        Object.fromEntries(
          SCORE_KEYS.map((c) => [c, Math.round(members.reduce((s, m) => s + m.scores[c], 0) / members.length)]),
        ) as ReportScores,
      );
    } else {
      setTeamAverage(null);
    }
  };

  const toggleSelectedInvitation = (invitationId: string) => {
    setSelectedInvitationIds((prev) =>
      prev.includes(invitationId) ? prev.filter((id) => id !== invitationId) : [...prev, invitationId],
    );
  };

  useEffect(() => {
    if (!myResult) return;
    setSelectedInvitationIds((prev) => (prev.includes("__self__") ? prev : ["__self__", ...prev]));
  }, [myResult]);

  useEffect(() => {
    setSelectedInvitationIds((prev) => (myResult ? prev : prev.filter((id) => id !== "__self__")));
  }, [myResult]);

  const handleScoreChange = (inv: Invitation, key: CatKey, value: string) => {
    const normalized = value.replace(/\D/g, "").slice(0, 2);
    setScoreDrafts((prev) => ({
      ...prev,
      [inv.id]: {
        ...prev[inv.id],
        [key]: normalized,
      },
    }));
  };

  const handleNameChange = (inv: Invitation, key: "first" | "last", value: string) => {
    setNameDrafts((prev) => ({
      ...prev,
      [inv.id]: {
        first: prev[inv.id]?.first ?? inv.invitee_first_name ?? "",
        last: prev[inv.id]?.last ?? inv.invitee_last_name ?? "",
        [key]: value,
      },
    }));
  };

  const handleSaveScores = async (inv: Invitation) => {
    if (inv.status === "completed") return;
    setSavingScoresId(inv.id);
    try {
      const existing = inv.result_id ? (invScores[inv.result_id] ?? {}) : {};
      const draft = scoreDrafts[inv.id] ?? {};
      const entries = SCORE_KEYS.map((key) => {
        const raw = draft[key] ?? (existing[key] === undefined ? "" : String(existing[key]));
        const value = Number(raw);
        if (raw === "" || !Number.isInteger(value) || value < 0 || value > 10) {
          throw new Error("Chaque score doit être un nombre entier entre 0 et 10.");
        }
        return [key, value] as const;
      });
      const scores = Object.fromEntries(entries) as ReportScores;
      const res = await saveInvitationScores({ data: { invitationId: inv.id, scores } });
      setInvScores((prev) => ({ ...prev, [res.resultId]: scores }));
      setScoreDrafts((prev) => ({
        ...prev,
        [inv.id]: Object.fromEntries(SCORE_KEYS.map((key) => [key, String(scores[key])])) as Record<string, string>,
      }));
      const nextInvitations = invitations.map((i) => (i.id === inv.id ? { ...i, result_id: res.resultId } : i));
      setInvitations(nextInvitations);
      await refreshTeamFromInvitations(nextInvitations);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur lors de l'enregistrement des scores.");
      console.error("save scores error:", e);
    } finally {
      setSavingScoresId(null);
    }
  };

  const handleSaveInvitationName = async (inv: Invitation) => {
    const draft = nameDrafts[inv.id];
    if (!draft) return;
    const first = draft.first.trim();
    const last = draft.last.trim();
    const currentFirst = (inv.invitee_first_name ?? inv.invitee_name ?? "").trim();
    const currentLast = (inv.invitee_last_name ?? "").trim();
    if (first === currentFirst && last === currentLast) return;
    setSavingNameId(inv.id);
    try {
      const res = await updateInvitationName({
        data: {
          invitationId: inv.id,
          firstName: first,
          lastName: last,
        },
      });
      setInvitations((prev) =>
        prev.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                invitee_first_name: res.invitee_first_name,
                invitee_last_name: res.invitee_last_name,
                invitee_name: res.invitee_name,
              }
            : i,
        ),
      );
      setNameDrafts((prev) => ({
        ...prev,
        [inv.id]: { first: res.invitee_first_name || "", last: res.invitee_last_name || "" },
      }));
      setSavedNameId(inv.id);
      window.setTimeout(() => setSavedNameId((id) => (id === inv.id ? null : id)), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur lors de la mise à jour du prénom/nom.");
      console.error("save invitation name error:", e);
    } finally {
      setSavingNameId(null);
    }
  };

  const handleInvite = async (channel: "email" | "outlook" | "whatsapp" | "sms" | "copy") => {
    const firstName = invFirstName.trim();
    const lastName = invLastName.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    if (!fullName && !invEmail.trim()) return;
    if (!myResult) return;
    setInviting(true);
    try {
      const inv = await createInvitation({
        data: {
          inviterUserId: user.id,
          inviterResultId: myResult.id,
          inviteeFirstName: firstName || undefined,
          inviteeLastName: lastName || undefined,
          inviteeName: fullName || undefined,
          inviteeEmail: invEmail.trim() || undefined,
        },
      });

      // Add to local list
      setInvitations((prev) => [
        {
          id: inv.id,
          token: inv.token,
          invitee_first_name: firstName || null,
          invitee_last_name: lastName || null,
          invitee_name: fullName || null,
          invitee_email: invEmail.trim() || null,
          status: "pending",
          result_id: null,
          created_at: new Date().toISOString(),
          reminded_at: null,
        },
        ...prev,
      ]);

      const url = `${baseUrl}?inv=${inv.token}`;
      const inviterName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      const text = `${inviterName} vous invite à découvrir votre profil relationnel via un test d'égogramme. Chaque participant reçoit son analyse individuelle, puis une analyse collective est générée. Ça prend 5 minutes 🤝`;

      if (channel === "email") {
        window.open(`mailto:${invEmail.trim()}?subject=${encodeURIComponent("Découvre ton profil relationnel")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
      } else if (channel === "outlook") {
        window.open(`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(invEmail.trim())}&subject=${encodeURIComponent("Découvre ton profil relationnel")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
      } else if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
      } else if (channel === "sms") {
        window.open(`sms:?body=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
      } else {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
      }

      setInvFirstName("");
      setInvLastName("");
      setInvEmail("");
    } catch (e) {
      console.error("invite error:", e);
    } finally {
      setInviting(false);
    }
  };

  const handleRemind = async (inv: Invitation) => {
    setRemindingId(inv.id);
    try {
      if (inv.status === "deleted") {
        // Reset invitation back to pending since the result was deleted
        await resetInvitation({ data: { invitationId: inv.id } });
        setInvitations((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, status: "pending", result_id: null, reminded_at: new Date().toISOString() } : i)),
        );
      } else {
        await remindInvitation({ data: { invitationId: inv.id } });
        setInvitations((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, reminded_at: new Date().toISOString() } : i)),
        );
      }

      const url = `${baseUrl}?inv=${inv.token}`;
      const inviterName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      const name = inv.invitee_name || "là";
      const text = `Coucou ${name} ! ${inviterName} attend ta réponse au test d'égogramme pour pouvoir générer l'analyse collective. Ça prend 5 minutes 🤝`;

      if (inv.invitee_email) {
        window.open(`mailto:${inv.invitee_email}?subject=${encodeURIComponent("Rappel : ton test d'égogramme t'attend !")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
      }
    } catch (e) {
      console.error("remind error:", e);
    } finally {
      setRemindingId(null);
    }
  };

  const handleDeleteInv = async (inv: Invitation) => {
    if (!confirm(`Supprimer l'invitation de ${inv.invitee_name || inv.invitee_email || "cette personne"} ?`)) return;
    setDeletingId(inv.id);
    try {
      await deleteInvitation({ data: { invitationId: inv.id } });
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e) {
      console.error("delete error:", e);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    setSelectedInvitationIds((prev) =>
      prev.filter((id) => invitations.some((inv) => inv.id === id && inv.result_id && inv.status !== "deleted")),
    );
  }, [invitations]);

  const handleGenerateTeam = async () => {
    const resultIds = selectedResultIds;
    if (resultIds.length < 2) return;
    setGeneratingTeam(true);
    setTeamAnalysis(null);
    setTeamUrls(null);
    try {
      const namesForTitle = [
        ...(selfSelected && myResult ? [myResult.first_name || user.firstName || "Vous"] : []),
        ...selectedSelectableInvitations.map(
          (i) => i.invitee_first_name || i.invitee_name || "Participant",
        ),
      ];
      const teamName =
        namesForTitle.length > 0 && namesForTitle.length <= 3
          ? `${namesForTitle.join(" & ")} — ${formatDate(new Date().toISOString())}`
          : `Groupe de ${namesForTitle.length} — ${formatDate(new Date().toISOString())}`;
      // Stream the analysis text + fetch member rows in parallel
      const memberRowsPromise = getResultsByIds({ data: { ids: resultIds } });
      const analysisText = await streamAnalysis(
        "/api/analysis/team-stream",
        { ids: resultIds, teamName },
        (partial) => setTeamAnalysis(partial),
      );
      const memberRows = await memberRowsPromise;

      // Build report members for PDF/image download
      const cats: CatKey[] = ["PN", "PNo", "A", "EL", "EAS", "EAR"];
      const members: ReportMember[] = memberRows.map((r) => ({
        name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Membre",
        date: new Date(r.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" }),
        scores: Object.fromEntries(cats.map((c) => [c, r.scores[c] ?? 0])) as ReportScores,
      }));
      setTeamMembers(members);

      const avg = Object.fromEntries(
        cats.map((c) => [c, Math.round(members.reduce((s, m) => s + m.scores[c], 0) / members.length)]),
      ) as ReportScores;
      setTeamAverage(avg);

      // Persist the analysis + store the PDF/image in the background (non-blocking)
      if (analysisText) {
        setStoringTeam(true);
        void (async () => {
          try {
            const saved = await saveTeamAnalysis({
              data: { ids: resultIds, analysis: analysisText, teamName, creatorUserId: user.id, kind: "collective" },
            });
            if (saved.teamAnalysisId) {
              void refreshLibrary();
              const uploads = await buildTeamReportUploads({
                teamName,
                average: avg,
                members,
                analysis: analysisText,
              });
              const urls = await storeReportFiles({
                data: { kind: "team", refId: saved.teamAnalysisId, ...uploads },
              });
              setTeamUrls(urls);
            }
          } catch (storeErr) {
            console.error("store team report error:", storeErr);
          } finally {
            setStoringTeam(false);
          }
        })();
      }
    } catch (e) {
      console.error("team analysis error:", e);
      const msg = e instanceof Error && e.message ? e.message : "Erreur lors de la génération. Réessayez.";
      setTeamAnalysis(msg);
    } finally {
      setGeneratingTeam(false);
    }
  };

  const handleTeamDownload = async (kind: "pdf" | "img") => {
    if (!teamAnalysis || !teamAverage) return;
    setDownloading(kind);
    try {
      const input = {
        teamName: `Groupe de ${user.firstName}`,
        average: teamAverage,
        members: teamMembers,
        analysis: teamAnalysis,
      };
      if (kind === "pdf") await downloadTeamReportPdf(input);
      else await downloadTeamReportImage(input);
    } catch (e) {
      console.error("download error:", e);
    } finally {
      setDownloading(null);
    }
  };

  const handleGenerateIndividual = async () => {
    const resultId = selectedResultIds.length === 1 ? selectedResultIds[0] : myResult?.id;
    if (!resultId) return;
    setGeneratingIndiv(true);
    setIndividualAnalysis(null);
    setIndivUrls(null);
    try {
      // Résout le profil ciblé : soit le vôtre, soit celui d'un invité sélectionné
      let firstName = user.firstName || "Utilisateur";
      let lastName = user.lastName || "";
      let scores = myResult?.scores ?? ({} as Record<string, number>);
      let createdAt = myResult?.created_at ?? new Date().toISOString();

      if (!myResult || resultId !== myResult.id) {
        const rows = await getResultsByIds({ data: { ids: [resultId] } });
        const row = rows[0];
        if (!row) throw new Error("Profil introuvable.");
        firstName = row.first_name || "Participant";
        lastName = row.last_name || "";
        scores = row.scores as Record<string, number>;
        createdAt = row.created_at;
      }

      const analysisText = await streamAnalysis(
        "/api/analysis/individual-stream",
        { scores, firstName },
        (partial) => setIndividualAnalysis(partial),
      );

      // Persiste l'analyse dans la bibliothèque + génère PDF/image en arrière-plan
      if (analysisText) {
        setStoringIndiv(true);
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Résultat individuel";
        void (async () => {
          try {
            await saveTeamAnalysis({
              data: {
                ids: [resultId],
                analysis: analysisText,
                teamName: `${fullName} — ${formatDate(new Date().toISOString())}`,
                creatorUserId: user.id,
                kind: "individual",
              },
            });
            void refreshLibrary();

            const cats: CatKey[] = ["PN", "PNo", "A", "EL", "EAS", "EAR"];
            const uploads = await buildIndividualReportUploads({
              name: fullName,
              date: new Date(createdAt).toLocaleDateString("fr-FR", { dateStyle: "long" }),
              scores: Object.fromEntries(cats.map((c) => [c, scores[c] ?? 0])) as ReportScores,
              analysis: analysisText,
            });
            const urls = await storeReportFiles({
              data: { kind: "individual", refId: resultId, ...uploads },
            });
            setIndivUrls(urls);
          } catch (storeErr) {
            console.error("store individual report error:", storeErr);
          } finally {
            setStoringIndiv(false);
          }
        })();
      }
    } catch (e) {
      console.error("individual analysis error:", e);
      const msg = e instanceof Error && e.message ? e.message : "Erreur lors de la génération. Réessayez.";
      setIndividualAnalysis(msg);
    } finally {
      setGeneratingIndiv(false);
    }
  };

  const canGenerateSelectedTeam = selectedResultIds.length >= 2;
  const canGenerateIndividual = selectedResultIds.length === 1 || (selectedResultIds.length === 0 && !!myResult);

  const handleIndivDownload = async (kind: "pdf" | "img") => {
    if (!individualAnalysis || !myResult) return;
    setDownloadingIndiv(kind);
    try {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Résultat individuel";
      const cats: CatKey[] = ["PN", "PNo", "A", "EL", "EAS", "EAR"];
      const input = {
        name: fullName,
        date: new Date(myResult.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" }),
        scores: Object.fromEntries(cats.map((c) => [c, myResult.scores[c] ?? 0])) as ReportScores,
        analysis: individualAnalysis,
      };
      if (kind === "pdf") await downloadIndividualReportPdf(input);
      else await downloadIndividualReportImage(input);
    } catch (e) {
      console.error("indiv download error:", e);
    } finally {
      setDownloadingIndiv(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSaveName = async () => {
    if (!myResult) return;
    setSavingName(true);
    try {
      const res = await updateMyResultName({
        data: {
          userId: user.id,
          first_name: nameDraft.first.trim(),
          last_name: nameDraft.last.trim(),
        },
      });
      setMyResult((prev) =>
        prev
          ? {
              ...prev,
              first_name: res.first_name,
              last_name: res.last_name,
            }
          : prev,
      );
      setUser((prev) =>
        prev
          ? {
              ...prev,
              firstName: res.first_name || prev.firstName,
              lastName: res.last_name || prev.lastName,
            }
          : prev,
      );
      setEditingName(false);
    } catch (e) {
      console.error("save name error:", e);
      alert("Impossible d'enregistrer le prénom et le nom.");
    } finally {
      setSavingName(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement de vos données…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Mon Espace Égogramme</h1>
            {myResult && !editingName ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {myResult.first_name || user.firstName} {myResult.last_name || user.lastName} · {user.email}
                </span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingName(true)}>
                  Modifier prénom/nom
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  value={nameDraft.first}
                  onChange={(e) => setNameDraft((prev) => ({ ...prev, first: e.target.value }))}
                  placeholder="Prénom"
                  className="h-8 w-36"
                />
                <Input
                  value={nameDraft.last}
                  onChange={(e) => setNameDraft((prev) => ({ ...prev, last: e.target.value }))}
                  placeholder="Nom"
                  className="h-8 w-36"
                />
                <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} disabled={savingName}>
                  Annuler
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-primary underline">
              Refaire le test
            </Link>
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 pb-32 space-y-8">
        {/* My Profile */}
        {myResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EgogrammeChart
              title="Votre égogramme"
              scores={myResult.scores}
              subtitle={`Test passé le ${formatDate(myResult.created_at)}`}
            />
            {teamAverage ? (
              <EgogrammeChart
                title="Votre égogramme d'équipe"
                scores={teamAverage}
                subtitle={`Moyenne de ${teamMembers.length} profil${teamMembers.length > 1 ? "s" : ""}`}
              />
            ) : (
              <Card className="p-5 flex-1 flex flex-col items-center justify-center text-center">
                <h2 className="text-base font-semibold mb-3">Votre égogramme d'équipe</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Invitez au moins une personne pour voir l'égogramme d'équipe.
                </p>
                <p className="text-xs text-muted-foreground">
                  La moyenne des scores de votre groupe apparaîtra ici.
                </p>
              </Card>
            )}
          </div>
        )}

        {!myResult && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Vous n'avez pas encore de résultat lié à votre compte.
            </p>
            <Link to="/" className="text-primary underline text-sm">
              Passer le test
            </Link>
          </Card>
        )}

        {/* Invite Section */}
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-2">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            Inviter des personnes
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Invitez des amis, collègues ou votre équipe. Chacun recevra son analyse individuelle,
            puis vous pourrez générer une analyse collective.
          </p>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            <div>
              <Label htmlFor="inv-first-name" className="text-xs">Prénom</Label>
              <Input
                id="inv-first-name"
                value={invFirstName}
                onChange={(e) => setInvFirstName(e.target.value)}
                placeholder="Marie"
              />
            </div>
            <div>
              <Label htmlFor="inv-last-name" className="text-xs">Nom</Label>
              <Input
                id="inv-last-name"
                value={invLastName}
                onChange={(e) => setInvLastName(e.target.value)}
                placeholder="Dupont"
              />
            </div>
            <div>
              <Label htmlFor="inv-email" className="text-xs">Email (optionnel)</Label>
              <Input
                id="inv-email"
                type="email"
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                placeholder="marie@exemple.com"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleInvite("email")} disabled={inviting || (!invFirstName.trim() && !invLastName.trim() && !invEmail.trim())}>
              ✉️ Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("outlook")} disabled={inviting || (!invFirstName.trim() && !invLastName.trim() && !invEmail.trim())}>
              📧 Outlook
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("whatsapp")} disabled={inviting || (!invFirstName.trim() && !invLastName.trim() && !invEmail.trim())}>
              💬 WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("sms")} disabled={inviting || (!invFirstName.trim() && !invLastName.trim() && !invEmail.trim())}>
              📱 SMS
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("copy")} disabled={inviting || (!invFirstName.trim() && !invLastName.trim() && !invEmail.trim())}>
              📋 Copier
            </Button>
          </div>
        </Card>

        {/* Invitations List */}
        {(invitations.length > 0 || myResult) && (
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-2">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              Sélectionner les profils et générer une analyse
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {completedInvitations.length} / {invitations.length} personne(s) ont répondu · cochez
              <strong className="mx-1">1 profil</strong>pour une analyse individuelle,
              <strong className="mx-1">2 ou plus</strong>pour une analyse collective.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium text-center">
                      <label className="flex cursor-pointer flex-col items-center gap-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Tout sélectionner ou tout désélectionner"
                        />
                        <span className="text-[10px] normal-case">{allSelected ? "Aucun" : "Tous"}</span>
                      </label>
                    </th>
                    <th className="py-2 pr-3 font-medium">Prénom</th>
                    <th className="py-2 pr-3 font-medium">Nom</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Statut</th>
                   <th className="py-2 pr-3 font-medium text-center">PNr</th>
                   <th className="py-2 pr-3 font-medium text-center">PNf</th>
                   <th className="py-2 pr-3 font-medium text-center">A</th>
                   <th className="py-2 pr-3 font-medium text-center">EL</th>
                   <th className="py-2 pr-3 font-medium text-center">EAS</th>
                   <th className="py-2 pr-3 font-medium text-center">EAR</th>
                   <th className="py-2 pr-3 font-medium">Date</th>
                   <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myResult && (
                    <tr className="border-b border-border/50 bg-muted/30">
                      <td className="py-2 pr-3 text-center text-xs">
                        <label className="flex cursor-pointer flex-col items-center gap-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-primary"
                            checked={selfSelected}
                            onChange={() => toggleSelectedInvitation("__self__")}
                            aria-label="Inclure votre profil dans l'analyse collective"
                          />
                          <span className={selfSelected ? "text-[10px] font-medium text-primary" : "text-[10px] text-muted-foreground"}>
                            {selfSelected ? "Inclus" : "Exclu"}
                          </span>
                        </label>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {myResult.first_name || user.firstName || "Vous"}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {myResult.last_name || user.lastName || "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs">{user.email}</td>
                      <td className="py-2 pr-3 text-xs">
                        <span className="text-indigo-600 font-medium">👤 Vous</span>
                      </td>
                      {SCORE_KEYS.map((key) => (
                        <td key={key} className="py-2 pr-3 text-xs text-center tabular-nums">
                          {myResult.scores[key] ?? "—"}
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        {formatDate(myResult.created_at)}
                      </td>
                      <td className="py-2 text-right text-xs">
                        <span className={selfSelected ? "font-medium text-green-600" : "font-medium text-muted-foreground"}>
                          {selfSelected ? "Inclus" : "Exclu"}
                        </span>
                      </td>
                    </tr>
                  )}
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/40">
                      <td className="py-2 pr-3 text-center text-xs">
                        {inv.result_id && inv.status !== "deleted" ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-primary"
                            checked={selectedInvitationIds.includes(inv.id)}
                            onChange={() => toggleSelectedInvitation(inv.id)}
                            aria-label={`Sélectionner ${inv.invitee_first_name || inv.invitee_name || "cette personne"}`}
                          />
                        ) : (
                          <span className="text-muted-foreground" title="Saisissez d'abord les scores">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <Input
                          value={nameDrafts[inv.id]?.first ?? inv.invitee_first_name ?? inv.invitee_name ?? ""}
                          onChange={(e) => handleNameChange(inv, "first", e.target.value)}
                          onBlur={() => handleSaveInvitationName(inv)}
                          className="h-8 w-32"
                          placeholder="Prénom"
                        />
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Input
                            value={nameDrafts[inv.id]?.last ?? inv.invitee_last_name ?? ""}
                            onChange={(e) => handleNameChange(inv, "last", e.target.value)}
                            onBlur={() => handleSaveInvitationName(inv)}
                            className="h-8 w-32"
                            placeholder="Nom"
                          />
                          {savingNameId === inv.id && <span className="text-[10px] text-muted-foreground">…</span>}
                          {savedNameId === inv.id && <span className="text-[10px] text-green-600">✓</span>}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs">{inv.invitee_email || "—"}</td>
                      <td className="py-2 pr-3 text-xs">
                        {inv.status === "completed" ? (
                          <span className="text-green-600 font-medium">✅ Répondu</span>
                        ) : inv.status === "deleted" ? (
                          <span className="text-red-500 font-medium">🗑️ Supprimé</span>
                        ) : inv.result_id ? (
                          <span className="text-indigo-600 font-medium">✍️ Saisi</span>
                        ) : (
                          <span className="text-amber-600">⏳ En attente</span>
                        )}
                      </td>
                      {SCORE_KEYS.map((key) => {
                        const s = inv.result_id ? invScores[inv.result_id] : undefined;
                        const value = scoreDrafts[inv.id]?.[key] ?? (s?.[key] === undefined ? "" : String(s[key]));
                        const editable = inv.status === "pending";
                        return (
                          <td key={key} className="py-2 pr-3 text-xs text-center tabular-nums">
                            {editable ? (
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                step={1}
                                value={value}
                                onChange={(e) => handleScoreChange(inv, key, e.target.value)}
                                className="mx-auto h-8 w-14 px-1 text-center text-xs"
                              />
                            ) : s ? (
                              s[key] ?? "—"
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        {formatDate(inv.created_at)}
                        {inv.reminded_at && (
                          <span className="block text-[10px] text-muted-foreground">
                            Relancé le {formatDate(inv.reminded_at)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right space-x-1">
                        {inv.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveScores(inv)}
                            disabled={savingScoresId === inv.id}
                          >
                            {savingScoresId === inv.id ? "…" : "💾 Enregistrer"}
                          </Button>
                        )}
                        {(inv.status === "pending" || inv.status === "deleted") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemind(inv)}
                            disabled={remindingId === inv.id}
                          >
                            {remindingId === inv.id ? "…" : "🔔 Relancer"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteInv(inv)}
                          disabled={deletingId === inv.id}
                        >
                          {deletingId === inv.id ? "…" : "🗑️"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Résumé de sélection (les actions sont dans la barre collante en bas) */}
            <div className="mt-6 pt-4 border-t border-border">
              {selectedResultIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Cochez au moins un profil ci-dessus pour générer une analyse.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  🎯 {selectedResultIds.length} profil{selectedResultIds.length > 1 ? "s" : ""} sélectionné{selectedResultIds.length > 1 ? "s" : ""}
                  {" — "}
                  {selfSelected ? "vous" : "sans vous"}
                  {selectedSelectableInvitations.length > 0 &&
                    ` + ${selectedSelectableInvitations.length} invité${selectedSelectableInvitations.length > 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Individual Analysis Result */}
        {individualAnalysis && (
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">📊 Mon analyse individuelle</h2>
            <MarkdownText text={individualAnalysis} />
            <div className="mt-6 flex flex-wrap gap-2">
              {indivUrls ? (
                <>
                  <Button asChild>
                    <a href={indivUrls.pdfUrl} target="_blank" rel="noopener noreferrer" download>
                      📄 Télécharger en PDF
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={indivUrls.imageUrl} target="_blank" rel="noopener noreferrer" download>
                      🖼️ Télécharger en image
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => handleIndivDownload("pdf")} disabled={downloadingIndiv !== null}>
                    {downloadingIndiv === "pdf" ? "Préparation…" : "📄 Télécharger en PDF"}
                  </Button>
                  <Button variant="outline" onClick={() => handleIndivDownload("img")} disabled={downloadingIndiv !== null}>
                    {downloadingIndiv === "img" ? "Préparation…" : "🖼️ Télécharger en image"}
                  </Button>
                </>
              )}
            </div>
            {storingIndiv && !indivUrls && (
              <p className="mt-2 text-xs text-muted-foreground">💾 Sauvegarde du rapport en cours…</p>
            )}
          </Card>
        )}

        {/* Team Analysis Result */}
        {teamAnalysis && (
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">🤝 Analyse collective</h2>
            <MarkdownText text={teamAnalysis} />
            <div className="mt-6 flex flex-wrap gap-2">
              {teamUrls ? (
                <>
                  <Button asChild>
                    <a href={teamUrls.pdfUrl} target="_blank" rel="noopener noreferrer" download>
                      📄 Télécharger en PDF
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={teamUrls.imageUrl} target="_blank" rel="noopener noreferrer" download>
                      🖼️ Télécharger en image
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => handleTeamDownload("pdf")} disabled={downloading !== null}>
                    {downloading === "pdf" ? "Préparation…" : "📄 Télécharger en PDF"}
                  </Button>
                  <Button variant="outline" onClick={() => handleTeamDownload("img")} disabled={downloading !== null}>
                    {downloading === "img" ? "Préparation…" : "🖼️ Télécharger en image"}
                  </Button>
                </>
              )}
            </div>
            {storingTeam && !teamUrls && (
              <p className="mt-2 text-xs text-muted-foreground">💾 Sauvegarde du rapport en cours…</p>
            )}
          </Card>
        )}

        {/* ③ Bibliothèque d'analyses */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
              Bibliothèque d'analyses ({storedTeamAnalyses.length})
            </h2>
            <Input
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Rechercher un nom…"
              className="h-8 w-full sm:w-56"
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ["all", `Toutes (${storedTeamAnalyses.length})`],
              ["individual", `Individuelles (${individualCount})`],
              ["collective", `Collectives (${collectiveCount})`],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={libraryFilter === value ? "default" : "outline"}
                onClick={() => setLibraryFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {pendingDelete && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <span>
                « {pendingDelete.team_name || "Analyse"} » sera supprimée.
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStoredTeamAnalyses((prev) =>
                      [...prev, pendingDelete].sort((a, b) => b.created_at.localeCompare(a.created_at)),
                    );
                    setPendingDelete(null);
                  }}
                >
                  ↩️ Annuler
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deletingTeamId === pendingDelete.id}
                  onClick={async () => {
                    const target = pendingDelete;
                    setDeletingTeamId(target.id);
                    try {
                      await deleteMyTeamAnalysis({ data: { userId: user.id, teamAnalysisId: target.id } });
                      setPendingDelete(null);
                    } catch (e) {
                      console.error("delete analysis error:", e);
                      setStoredTeamAnalyses((prev) =>
                        [...prev, target].sort((a, b) => b.created_at.localeCompare(a.created_at)),
                      );
                      setPendingDelete(null);
                      alert("Impossible de supprimer cette analyse.");
                    } finally {
                      setDeletingTeamId(null);
                    }
                  }}
                >
                  {deletingTeamId === pendingDelete.id ? "Suppression…" : "Confirmer"}
                </Button>
              </div>
            </div>
          )}

          {filteredAnalyses.length > 0 ? (
            <div className="space-y-3">
              {filteredAnalyses.map((ta) => {
                const memberNames = Array.isArray(ta.member_names) ? ta.member_names : [];
                const kind = analysisKind(ta);
                return (
                  <div key={ta.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              kind === "individual"
                                ? "rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
                                : "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                            }
                          >
                            {kind === "individual" ? "👤 Individuelle" : "🤝 Collective"}
                          </span>
                          {renamingId === ta.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                className="h-8 w-64"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  const title = renameDraft.trim();
                                  setRenamingId(null);
                                  setStoredTeamAnalyses((prev) =>
                                    prev.map((a) => (a.id === ta.id ? { ...a, team_name: title } : a)),
                                  );
                                  try {
                                    await renameMyAnalysis({
                                      data: { userId: user.id, analysisId: ta.id, title },
                                    });
                                  } catch (e) {
                                    console.error("rename analysis error:", e);
                                  }
                                }}
                              >
                                OK
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-left text-sm font-medium hover:underline"
                              title="Cliquez pour renommer"
                              onClick={() => {
                                setRenamingId(ta.id);
                                setRenameDraft(ta.team_name || "");
                              }}
                            >
                              {ta.team_name || "Analyse sans titre"} ✏️
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(ta.created_at)}
                          {memberNames.length > 0 && ` · ${memberNames.join(", ")}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedTeamId(expandedTeamId === ta.id ? null : ta.id)}
                        >
                          {expandedTeamId === ta.id ? "Masquer" : "Voir"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            setStoredTeamAnalyses((prev) => prev.filter((t) => t.id !== ta.id));
                            setPendingDelete(ta);
                          }}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                    {expandedTeamId === ta.id && (
                      <div className="mt-3 border-t border-border pt-3">
                        <MarkdownText text={ta.analysis} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {storedTeamAnalyses.length === 0
                  ? "Aucune analyse enregistrée pour l'instant. Sélectionnez un ou plusieurs profils ci-dessus, puis générez une analyse — elle sera archivée ici automatiquement."
                  : "Aucune analyse ne correspond à ce filtre."}
              </p>
            </div>
          )}
        </Card>
      </main>

      {/* Barre d'action collante */}
      {selectedResultIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm">
              <strong>{selectedResultIds.length}</strong> profil{selectedResultIds.length > 1 ? "s" : ""} sélectionné{selectedResultIds.length > 1 ? "s" : ""}
              <span className="ml-2 text-xs text-muted-foreground">
                {selfSelected ? "vous inclus" : "sans vous"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelectedInvitationIds([])}>
                Tout décocher
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateIndividual}
                disabled={generatingIndiv || generatingTeam || !canGenerateIndividual}
                title={
                  canGenerateIndividual
                    ? undefined
                    : "Sélectionnez exactement 1 profil pour une analyse individuelle"
                }
              >
                {generatingIndiv
                  ? "Génération…"
                  : individualAnalysis
                    ? "🔄 Régénérer l'analyse individuelle"
                    : "📊 Analyse individuelle"}
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateTeam}
                disabled={generatingTeam || generatingIndiv || !canGenerateSelectedTeam}
                title={
                  canGenerateSelectedTeam
                    ? undefined
                    : "Sélectionnez au moins 2 profils pour une analyse collective"
                }
              >
                {generatingTeam
                  ? "Génération…"
                  : teamAnalysis
                    ? "🔄 Régénérer l'analyse collective"
                    : "🤝 Analyse collective"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
