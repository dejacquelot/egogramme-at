import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorMessage } from "@/lib/api-error";

/**
 * Contexte minimal pour personnaliser le bandeau des liens de partage
 * informel (?ref=resultId, bouton "Partager le test"). Expose uniquement
 * le prénom éventuel du partageur — jamais d'autre donnée du résultat.
 */
export const Route = createFileRoute("/api/public/share-context")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const resultId = z.string().uuid().parse(url.searchParams.get("resultId"));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data, error } = await supabaseAdmin
            .from("results")
            .select("first_name")
            .eq("id", resultId)
            .maybeSingle();
          if (error) throw error;

          return Response.json({ ok: true, firstName: data?.first_name ?? null });
        } catch (e) {
          return Response.json({ ok: false, error: errorMessage(e) }, { status: 400 });
        }
      },
    },
  },
});
