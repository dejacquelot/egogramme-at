import { createFileRoute } from "@tanstack/react-router";
import { apelSessionSchema } from "@/lib/apel-session";
import { anonymizeApelSession } from "@/lib/apel-anonymize";

/**
 * Enregistre une séance APEL terminée, anonymisée (fonctions et scores
 * uniquement, prénoms remplacés par les fonctions dans les textes).
 */
export const Route = createFileRoute("/api/public/apel-save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = apelSessionSchema.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
          const s = parsed.data;
          if (!s.consent || !s.completedAt || !["reports", "agreements"].includes(s.step)) {
            return Response.json({ ok: false }, { status: 400 });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("apel_sessions")
            .upsert(anonymizeApelSession(s), { onConflict: "client_key" });
          if (error) throw error;
          return Response.json({ ok: true });
        } catch (e) {
          console.error("apel-save error", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
