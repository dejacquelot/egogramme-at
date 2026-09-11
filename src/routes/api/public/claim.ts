import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Rattache à un compte fraîchement créé le résultat et les invitations
 * émises anonymement depuis ce résultat.
 *
 * Exposé en route `/api/*` et non en server function : les appels
 * `/_serverFn/*` échouent en production (erreur de sérialisation Seroval).
 */

const schema = z.object({
  userId: z.string().uuid(),
  resultId: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { userId, resultId } = schema.parse(body);
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const { error: resultError } = await supabaseAdmin
            .from("results")
            .update({ user_id: userId } as Record<string, unknown>)
            .eq("id", resultId)
            .is("user_id", null);
          if (resultError) throw resultError;

          const { data: claimed, error: invitationError } = await supabaseAdmin
            .from("invitations")
            .update({ inviter_user_id: userId } as Record<string, unknown>)
            .eq("inviter_result_id", resultId)
            .is("inviter_user_id", null)
            .select("id");
          if (invitationError) throw invitationError;

          return Response.json({
            ok: true,
            invitationsClaimed: (claimed ?? []).length,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("claim error", msg);
          return Response.json({ ok: false, error: msg }, { status: 400 });
        }
      },
    },
  },
});
