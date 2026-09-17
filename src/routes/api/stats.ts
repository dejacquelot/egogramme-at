import { createFileRoute } from "@tanstack/react-router";

/**
 * Données brutes de la page statistiques, viralité comprise.
 *
 * Route API classique plutôt que server function : la couche `/_serverFn/*`
 * s'est révélée non fiable en production, et `listAdminStatsData` était appelée
 * avec un repli silencieux qui affichait 0 au lieu de signaler l'échec.
 */

const json = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return Response.json(body, { ...init, headers });
};

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          if (authError) throw authError;

          const [invRes, resRes, taRes, shareRes, binomeInfoRes] = await Promise.all([
            supabaseAdmin
              .from("invitations")
              .select("id, created_at, status, inviter_user_id, inviter_result_id, result_id")
              .order("created_at", { ascending: true })
              .limit(10000),
            supabaseAdmin
              .from("results")
              .select("id, created_at, referred_by")
              .not("ip_hash", "like", "manual-invitation-%")
              .order("created_at", { ascending: true })
              .limit(10000),
            supabaseAdmin
              .from("team_analyses")
              .select("id, created_at, creator_user_id")
              .order("created_at", { ascending: true })
              .limit(10000),
            supabaseAdmin
              .from("share_events")
              .select("id, created_at")
              .order("created_at", { ascending: true })
              .limit(10000),
            supabaseAdmin
              .from("binome_info_clicks")
              .select("id, created_at")
              .order("created_at", { ascending: true })
              .limit(10000)
              .then((r) => r, () => ({ data: [] as { id: string; created_at: string }[], error: null })),
          ]);

          if (invRes.error) throw invRes.error;
          if (resRes.error) throw resRes.error;

          return json({
            ok: true,
            // Volontairement sans identifiant ni donnée nominative : seules les
            // dates sont nécessaires aux courbes et au calcul de viralité.
            users: (authData.users ?? []).map((u) => ({ created_at: u.created_at })),
            invitations: invRes.data ?? [],
            results: resRes.data ?? [],
            teamAnalyses: taRes.data ?? [],
            shareEvents: shareRes.data ?? [],
            binomeInfoClicks: binomeInfoRes.data ?? [],
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("api/stats error", message);
          return json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
