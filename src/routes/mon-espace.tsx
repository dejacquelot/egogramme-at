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
  remindInvitation,
  deleteInvitation,
} from "@/lib/invitation.functions";
import { generateTeamAnalysis } from "@/lib/admin.functions";
import {
  downloadTeamReportPdf,
  downloadTeamReportImage,
  type CatKey,
  type ReportMember,
  type ReportScores,
} from "@/lib/team-report";

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

const SCORE_LABELS: Record<string, string> = {
  PN: "Parent Nourricier",
  PNo: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};

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

  // Invite form
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Team analysis
  const [teamAnalysis, setTeamAnalysis] = useState<string | null>(null);
  const [generatingTeam, setGeneratingTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState<ReportMember[]>([]);
  const [teamAverage, setTeamAverage] = useState<ReportScores | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "img" | null>(null);

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
        const [result, invs] = await Promise.all([
          getMyResult({ data: { userId: user.id } }),
          listMyInvitations({ data: { userId: user.id } }),
        ]);
        setMyResult(result);
        setInvitations(invs);
      } catch (e) {
        console.error("load data error:", e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user.id]);

  const completedInvitations = invitations.filter((i) => i.status === "completed");
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const handleInvite = async (channel: "email" | "outlook" | "whatsapp" | "sms" | "copy") => {
    if (!invName.trim() && !invEmail.trim()) return;
    if (!myResult) return;
    setInviting(true);
    try {
      const inv = await createInvitation({
        data: {
          inviterUserId: user.id,
          inviterResultId: myResult.id,
          inviteeName: invName.trim() || undefined,
          inviteeEmail: invEmail.trim() || undefined,
        },
      });

      // Add to local list
      setInvitations((prev) => [
        {
          id: inv.id,
          token: inv.token,
          invitee_name: invName.trim() || null,
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

      setInvName("");
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
      await remindInvitation({ data: { invitationId: inv.id } });
      setInvitations((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, reminded_at: new Date().toISOString() } : i)),
      );

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

  const handleGenerateTeam = async () => {
    if (!myResult) return;
    const resultIds = [myResult.id, ...completedInvitations.map((i) => i.result_id!).filter(Boolean)];
    if (resultIds.length < 2) return;
    setGeneratingTeam(true);
    setTeamAnalysis(null);
    try {
      const [res, memberRows] = await Promise.all([
        generateTeamAnalysis({
          data: { ids: resultIds, teamName: `Groupe de ${user.firstName}` },
        }),
        getResultsByIds({ data: { ids: resultIds } }),
      ]);
      setTeamAnalysis(res.analysis);

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
    } catch (e) {
      console.error("team analysis error:", e);
      setTeamAnalysis("Erreur lors de la génération. Réessayez.");
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement de vos données…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Mon Espace Égogramme</h1>
            <p className="text-xs text-muted-foreground">
              {user.firstName} {user.lastName} · {user.email}
            </p>
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

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* My Profile */}
        {myResult && (
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">📊 Mon profil</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(SCORE_LABELS).map(([key, label]) => (
                <div key={key} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{key}</div>
                  <div className="text-2xl font-bold">{myResult.scores[key] ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Test passé le {formatDate(myResult.created_at)}
            </p>
          </Card>
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
          <h2 className="text-base font-semibold mb-2">👥 Inviter des personnes</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Invitez des amis, collègues ou votre équipe. Chacun recevra son analyse individuelle,
            puis vous pourrez générer une analyse collective.
          </p>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="inv-name" className="text-xs">Prénom / Nom</Label>
              <Input
                id="inv-name"
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                placeholder="Marie Dupont"
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
            <Button size="sm" onClick={() => handleInvite("email")} disabled={inviting || (!invName.trim() && !invEmail.trim())}>
              ✉️ Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("outlook")} disabled={inviting || (!invName.trim() && !invEmail.trim())}>
              📧 Outlook
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("whatsapp")} disabled={inviting || (!invName.trim() && !invEmail.trim())}>
              💬 WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("sms")} disabled={inviting || (!invName.trim() && !invEmail.trim())}>
              📱 SMS
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleInvite("copy")} disabled={inviting || (!invName.trim() && !invEmail.trim())}>
              📋 Copier
            </Button>
          </div>
        </Card>

        {/* Invitations List */}
        {invitations.length > 0 && (
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-2">📋 Suivi des invitations</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {completedInvitations.length} / {invitations.length} personne(s) ont répondu
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Nom</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Statut</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/40">
                      <td className="py-2 pr-3 text-xs">{inv.invitee_name || "—"}</td>
                      <td className="py-2 pr-3 text-xs">{inv.invitee_email || "—"}</td>
                      <td className="py-2 pr-3 text-xs">
                        {inv.status === "completed" ? (
                          <span className="text-green-600 font-medium">✅ Répondu</span>
                        ) : (
                          <span className="text-amber-600">⏳ En attente</span>
                        )}
                      </td>
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

            {/* Generate team analysis */}
            {myResult && completedInvitations.length >= 1 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  🎯 {completedInvitations.length + 1} profils disponibles (vous + {completedInvitations.length} invité{completedInvitations.length > 1 ? "s" : ""})
                </p>
                <Button onClick={handleGenerateTeam} disabled={generatingTeam}>
                  {generatingTeam ? "Génération en cours…" : "🤝 Générer l'analyse collective"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Team Analysis Result */}
        {teamAnalysis && (
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">🤝 Analyse collective</h2>
            <MarkdownText text={teamAnalysis} />
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => handleTeamDownload("pdf")} disabled={downloading !== null}>
                {downloading === "pdf" ? "Préparation…" : "📄 Télécharger en PDF"}
              </Button>
              <Button variant="outline" onClick={() => handleTeamDownload("img")} disabled={downloading !== null}>
                {downloading === "img" ? "Préparation…" : "🖼️ Télécharger en image"}
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
