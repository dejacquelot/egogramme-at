import { createFileRoute } from "@tanstack/react-router";

/**
 * Comptage du clic sur "Comment ça marche avec un binôme" (page d'accueil).
 * Aucune donnée personnelle : uniquement une date, pour alimenter la courbe
 * "Clics binôme" dans /statistiques.
 */
export const Route = createFileRoute("/api/public/track-binome-info")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          await supabaseAdmin.from("binome_info_clicks").insert({});
          return Response.json({ ok: true });
        } catch (e) {
          console.error("track-binome-info error", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
