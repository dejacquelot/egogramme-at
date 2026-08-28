import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/track-share")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          await supabaseAdmin.from("share_events").insert({});
          return Response.json({ ok: true });
        } catch (e) {
          console.error("track-share error", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
