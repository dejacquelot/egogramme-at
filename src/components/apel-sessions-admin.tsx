import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/markdown-text";
import { TEAM_ANALYSIS_LABELS } from "@/lib/admin-config";

type ApelRow = {
  id: string;
  created_at: string;
  present_count: number;
  members: { role: string; scores: Record<string, number>; report: string | null }[];
  collective: string | null;
  agreements: { title: string; text: string; accepted: boolean }[];
};

/** Séances APEL anonymisées (fonctions et scores, sans prénom). */
export function ApelSessionsSection() {
  const [rows, setRows] = useState<ApelRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/apel-sessions", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(body?.error || `Erreur HTTP ${res.status}`);
        if (!cancelled) setRows(body.sessions);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!error && rows.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Séances APEL ({rows.length})</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Enregistrées sans prénom ni nom : les participants sont identifiés par leur fonction.
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Chargement impossible ({error}). Si la table n'existe pas, appliquez la migration
          20260930090000_apel_sessions.sql dans Supabase.
        </p>
      )}
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">
                  {new Date(r.created_at).toLocaleString("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.present_count} présents : {r.members.map((m) => m.role).join(", ")}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpen(open === r.id ? null : r.id)}>
                {open === r.id ? "Masquer" : "Voir le détail"}
              </Button>
            </div>
            {open === r.id && (
              <div className="mt-3 space-y-4 border-t border-border pt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="py-1 pr-3">Fonction</th>
                        {Object.keys(TEAM_ANALYSIS_LABELS).map((k) => (
                          <th key={k} className="py-1 pr-3">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.members.map((m) => (
                        <tr key={m.role} className="border-t border-border">
                          <td className="py-1 pr-3 font-medium">{m.role}</td>
                          {Object.keys(TEAM_ANALYSIS_LABELS).map((k) => (
                            <td key={k} className="py-1 pr-3 tabular-nums">{m.scores?.[k] ?? "–"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {r.collective && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">Rapport collectif</h3>
                    <MarkdownText text={r.collective} />
                  </div>
                )}
                {r.members.some((m) => m.report) &&
                  r.members.map(
                    (m) =>
                      m.report && (
                        <div key={m.role}>
                          <h3 className="mb-1 text-sm font-semibold">Rapport : {m.role}</h3>
                          <MarkdownText text={m.report} />
                        </div>
                      ),
                  )}
                {r.agreements.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">Accords</h3>
                    <ul className="space-y-1 text-sm">
                      {r.agreements.map((a) => (
                        <li key={a.title}>
                          {a.accepted ? "✅" : "⬜"} <strong>{a.title}</strong> : {a.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
