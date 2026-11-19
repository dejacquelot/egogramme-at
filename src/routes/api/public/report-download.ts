import { createFileRoute } from "@tanstack/react-router";
import { downloadSchema } from "@/lib/report-downloads";

export const Route = createFileRoute("/api/public/report-download")({
  server: { handlers: {
    POST: async ({ request }) => {
      const event = downloadSchema.safeParse(await request.json().catch(() => null));
      if (!event.success) return new Response(null, { status: 400 });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("report_downloads")
        .upsert(event.data, { onConflict: "id", ignoreDuplicates: true });
      if (error) {
        console.error("report-download", error.code);
        return new Response(null, { status: 503 });
      }
      return new Response(null, { status: 204 });
    },
  } },
});
