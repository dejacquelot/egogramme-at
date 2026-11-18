import { createFileRoute } from "@tanstack/react-router";
import { scoutResultsSchema } from "@/lib/scout-results";

export const Route = createFileRoute("/api/public/scout-save")({
  server: { handlers: {
    POST: async ({ request }) => {
      const parsed = scoutResultsSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
      const { id, completed_at, members } = parsed.data;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("scout_results")
        .upsert({ id, completed_at, members }, { onConflict: "id", ignoreDuplicates: true });
      if (error) {
        console.error("scout-save", error.code);
        return Response.json({ ok: false }, { status: 503 });
      }
      return Response.json({ ok: true });
    },
  } },
});
