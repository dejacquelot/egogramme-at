import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { chiefMean, type ScoutResults } from "@/lib/scout-results";
import { REPORT_CATEGORIES } from "@/lib/team-report";

export function ScoutResultsSection() {
  const [rows, setRows] = useState<Omit<ScoutResults, "consent">[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/scout-results", {
          cache: "no-store", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const results = await res.json();
        if (active) setRows(results);
      } catch {
        if (active) setError(true);
      }
    }
    void load();
    return () => { active = false; };
  }, []);
  return <Card className="p-5">
    <h2 className="text-lg font-semibold">Résultats scouts</h2>
    <p className="text-sm text-muted-foreground">Séances partagées avec l’accord des participants, de la plus récente à la plus ancienne (100 maximum).</p>
    {error ? <p role="alert">Impossible de charger les résultats scouts. Rechargez la page pour réessayer.</p>
      : rows === null ? <p role="status">Chargement…</p>
      : rows.length === 0 ? <p>Aucune séance scoute partagée.</p>
      : rows.map(r => <details key={r.id} className="mt-3 rounded-lg border p-3">
          <summary className="cursor-pointer">{new Date(r.completed_at).toLocaleString("fr-FR")} · {r.members.length} participants</summary>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">Scores individuels et moyenne des chefs sur 10</caption>
            <thead><tr><th>Prénom et rôle</th>{REPORT_CATEGORIES.map(c => <th key={c.key} scope="col" title={c.label}>{c.key}</th>)}</tr></thead>
            <tbody>{r.members.map((m,i) => <tr key={i}><th scope="row">{m.name} · {m.role}</th>
              {REPORT_CATEGORIES.map(c => <td key={c.key}>{m.scores[c.key]}</td>)}</tr>)}</tbody>
            <tfoot><tr><th scope="row">Moyenne des chefs présents</th>
              {REPORT_CATEGORIES.map(c => <td key={c.key}>{chiefMean(r.members,c.key).toLocaleString("fr-FR",{maximumFractionDigits:2})}</td>)}</tr></tfoot>
          </table></div>
        </details>)}
  </Card>;
}
