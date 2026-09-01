import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { listAdminUsers } from "@/lib/admin.functions";

export const Route = createFileRoute("/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Utilisateurs — Administration Égogramme" },
      { name: "description", content: "Gestion des utilisateurs inscrits" },
    ],
  }),
  component: Utilisateurs,
});

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  invitations: {
    id: string;
    inviteeName: string | null;
    inviteeEmail: string | null;
    status: string;
    createdAt: string;
  }[];
};

function Utilisateurs() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user && isAdminEmail(data.user.email ?? "")) {
        setAuthorized(true);
        try {
          const result = await listAdminUsers();
          setUsers(result as AdminUser[]);
        } catch (e) {
          console.error("load users error:", e);
        }
      }
      setLoading(false);
    });
  }, []);

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <NavBar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <NavBar />
        <div className="flex items-center justify-center py-20">
          <Card className="max-w-md p-8 text-center">
            <h1 className="text-xl font-bold mb-2">Accès réservé</h1>
            <p className="text-sm text-muted-foreground">Vous devez être administrateur pour accéder à cette page.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-bold mb-1">👥 Utilisateurs inscrits</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {users.length} utilisateur{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Utilisateur</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Inscrit le</th>
                <th className="py-2 pr-3 font-medium">Dernière connexion</th>
                <th className="py-2 pr-3 font-medium text-center">Invitations</th>
                <th className="py-2 font-medium text-right">Détails</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isExpanded = expandedUser === u.id;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/40 align-top">
                    <td className="py-2 pr-3 text-xs">
                      <div className="flex items-center gap-2">
                        {u.avatarUrl && (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="h-6 w-6 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="font-medium">
                          {u.firstName} {u.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="py-2 pr-3 text-xs whitespace-nowrap">{fmt(u.createdAt)}</td>
                    <td className="py-2 pr-3 text-xs whitespace-nowrap">{fmt(u.lastSignInAt)}</td>
                    <td className="py-2 pr-3 text-xs text-center">
                      {u.invitations.length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold">{u.invitations.length}</span>
                          <span className="text-muted-foreground">
                            ({u.invitations.filter((i) => i.status === "completed").length} ✅)
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        {isExpanded ? "Masquer" : "Voir"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expanded user detail */}
        {expandedUser && (() => {
          const u = users.find((u) => u.id === expandedUser);
          if (!u) return null;
          return (
            <Card className="mt-4 p-5">
              <div className="flex items-center gap-3 mb-4">
                {u.avatarUrl && (
                  <img src={u.avatarUrl} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
                )}
                <div>
                  <h2 className="text-sm font-bold">{u.firstName} {u.lastName}</h2>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h3 className="font-semibold text-sm mb-2">📅 Informations</h3>
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-border/30">
                        <td className="py-1 text-muted-foreground">Inscription</td>
                        <td className="py-1 font-medium">{fmt(u.createdAt)}</td>
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-1 text-muted-foreground">Dernière connexion</td>
                        <td className="py-1 font-medium">{fmt(u.lastSignInAt)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-muted-foreground">ID</td>
                        <td className="py-1 font-mono text-[10px] text-muted-foreground">{u.id}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">✉️ Invitations envoyées ({u.invitations.length})</h3>
                  {u.invitations.length === 0 ? (
                    <p className="text-muted-foreground">Aucune invitation envoyée.</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="py-1 pr-2 text-left font-medium">Invité</th>
                          <th className="py-1 pr-2 text-left font-medium">Email</th>
                          <th className="py-1 pr-2 text-left font-medium">Statut</th>
                          <th className="py-1 text-left font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {u.invitations.map((inv) => (
                          <tr key={inv.id} className="border-b border-border/30">
                            <td className="py-1 pr-2">{inv.inviteeName || "—"}</td>
                            <td className="py-1 pr-2 text-muted-foreground">{inv.inviteeEmail || "—"}</td>
                            <td className="py-1 pr-2">
                              {inv.status === "completed" ? (
                                <span className="text-green-600">✅ Répondu</span>
                              ) : (
                                <span className="text-amber-600">⏳ En attente</span>
                              )}
                            </td>
                            <td className="py-1 whitespace-nowrap">{fmt(inv.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </Card>
          );
        })()}
      </main>
    </div>
  );
}
