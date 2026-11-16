import { createFileRoute } from "@tanstack/react-router";
import { orientationEventSchema } from "@/lib/orientation-stats";

export const Route = createFileRoute("/api/public/track-orientation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = { "Cache-Control": "no-store" };
        let body: unknown;
        try {
          const text = await request.text();
          if (text.length > 2048)
            return Response.json({ error: "Événement trop volumineux." }, { status: 413, headers });
          body = JSON.parse(text);
        } catch {
          return Response.json({ error: "JSON invalide." }, { status: 400, headers });
        }
        const parsed = orientationEventSchema.safeParse(body);
        if (!parsed.success)
          return Response.json({ error: "Événement invalide." }, { status: 400, headers });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("orientation_events").upsert(
            {
              ...parsed.data,
              block: parsed.data.block ?? null,
              attempt_id: parsed.data.attempt_id ?? null,
              duration_ms: parsed.data.duration_ms ?? null,
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
          if (error) throw error;
          return Response.json({ ok: true }, { headers });
        } catch (failure) {
          console.error("orientation tracking unavailable", failure);
          return Response.json(
            { error: "Suivi Orientation indisponible." },
            { status: 503, headers },
          );
        }
      },
    },
  },
});
