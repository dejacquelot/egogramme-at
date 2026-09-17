import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorMessage } from "@/lib/api-error";

/**
 * Rapport de binôme généré à la demande, sans compte requis (scénario H3) :
 * la génération n'est déclenchée que si quelqu'un clique réellement, et le
 * résultat est réutilisé pour toute personne redemandant la même paire.
 */

async function findLinkedInvitation(
  supabaseAdmin: any,
  a: string,
  b: string,
) {
  const { data, error } = await supabaseAdmin
    .from("invitations")
    .select("id")
    .eq("status", "completed")
    .or(
      `and(inviter_result_id.eq.${a},result_id.eq.${b}),and(inviter_result_id.eq.${b},result_id.eq.${a})`,
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export const Route = createFileRoute("/api/public/duo-report")({
  server: {
    handlers: {
      /** Vérifie si un rapport existe déjà pour cette paire de résultats. */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const a = z.string().uuid().parse(url.searchParams.get("a"));
          const b = z.string().uuid().parse(url.searchParams.get("b"));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const linked = await findLinkedInvitation(supabaseAdmin, a, b);
          if (!linked) {
            return Response.json(
              { ok: false, error: "Ces deux résultats ne sont pas liés par une invitation complétée." },
              { status: 403 },
            );
          }

          const { data, error } = await supabaseAdmin
            .from("team_analyses")
            .select("id, analysis, team_name")
            .contains("member_ids", [a, b])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (!data) return Response.json({ ok: true, exists: false });
          return Response.json({
            ok: true,
            exists: true,
            teamAnalysisId: data.id,
            analysis: data.analysis,
            teamName: data.team_name,
          });
        } catch (e) {
          return Response.json({ ok: false, error: errorMessage(e) }, { status: 400 });
        }
      },

      /** Sauvegarde un rapport de binôme déjà généré côté client (via team-stream). */
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const schema = z.object({
            resultIdA: z.string().uuid(),
            resultIdB: z.string().uuid(),
            analysis: z.string().min(1),
            teamName: z.string().max(120).optional(),
          });
          const { resultIdA, resultIdB, analysis, teamName } = schema.parse(body);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const linked = await findLinkedInvitation(supabaseAdmin, resultIdA, resultIdB);
          if (!linked) {
            return Response.json({ ok: false, error: "Paire non valide." }, { status: 403 });
          }

          // Évite un doublon si les deux personnes déclenchent la génération
          // en même temps.
          const existing = await supabaseAdmin
            .from("team_analyses")
            .select("id")
            .contains("member_ids", [resultIdA, resultIdB])
            .limit(1)
            .maybeSingle();
          if (existing.data) {
            return Response.json({ ok: true, teamAnalysisId: existing.data.id, alreadyExisted: true });
          }

          const { data: rows } = await supabaseAdmin
            .from("results")
            .select("id, first_name, last_name")
            .in("id", [resultIdA, resultIdB]);
          const memberNames = (rows ?? []).map(
            (r: { first_name: string | null; last_name: string | null }, i: number) =>
              [r.first_name, r.last_name].filter(Boolean).join(" ") || `Membre ${i + 1}`,
          );

          const { data: inserted, error } = await supabaseAdmin
            .from("team_analyses")
            .insert({
              team_name: teamName || "",
              member_ids: [resultIdA, resultIdB],
              member_names: memberNames,
              analysis,
              creator_user_id: null,
              kind: "collective",
            })
            .select("id")
            .single();
          if (error) throw error;
          // Tracking H3 : distingue ces rapports (sans compte) de ceux
          // générés depuis Mon Espace pour la courbe /statistiques.
          await supabaseAdmin.from("duo_reports_generated").insert({}).then(
            () => {},
            () => {},
          );
          return Response.json({ ok: true, teamAnalysisId: inserted?.id ?? null });
        } catch (e) {
          return Response.json({ ok: false, error: errorMessage(e) }, { status: 400 });
        }
      },
    },
  },
});
