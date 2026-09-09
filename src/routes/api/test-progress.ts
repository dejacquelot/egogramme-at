import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return Response.json(body, { ...init, headers });
};

/**
 * Progression du test égogramme, rattachée au compte.
 *
 * Route API classique (et non server function) : la couche `/_serverFn/*`
 * de TanStack n'est pas fiable en production sur ce projet.
 */

const ANSWER_COUNT = 60;

const getSchema = z.object({
  action: z.literal("get"),
  userId: z.string().uuid(),
});

const saveSchema = z.object({
  action: z.literal("save"),
  userId: z.string().uuid(),
  answers: z.array(z.union([z.boolean(), z.null()])).length(ANSWER_COUNT),
});

const bodySchema = z.discriminatedUnion("action", [getSchema, saveSchema]);

export const Route = createFileRoute("/api/test-progress")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = bodySchema.parse(await request.json());
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (body.action === "get") {
            const { data, error } = await supabaseAdmin
              .from("test_progress")
              .select("answers")
              .eq("user_id", body.userId)
              .maybeSingle();
            if (error) throw new Error(error.message);
            return json({ ok: true, answers: (data as { answers?: unknown } | null)?.answers ?? null });
          }

          const answeredCount = body.answers.filter((v) => v !== null).length;
          const { error } = await supabaseAdmin
            .from("test_progress")
            .upsert(
              {
                user_id: body.userId,
                answers: body.answers,
                answered_count: answeredCount,
                updated_at: new Date().toISOString(),
              } as never,
              { onConflict: "user_id" },
            );
          if (error) throw new Error(error.message);
          return json({ ok: true });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("test-progress error", message);
          return json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
