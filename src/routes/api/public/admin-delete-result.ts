import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Kept in sync with the admin login constants used client-side.
const ADMIN_USER = "pinpin";
const ADMIN_PASS = "lapin";

const schema = z.object({
  id: z.string().uuid(),
  user: z.string(),
  pass: z.string(),
});

export const Route = createFileRoute("/api/public/admin-delete-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = schema.parse(body);
          if (parsed.user !== ADMIN_USER || parsed.pass !== ADMIN_PASS) {
            return Response.json({ ok: false }, { status: 401 });
          }
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { error } = await supabaseAdmin
            .from("results")
            .delete()
            .eq("id", parsed.id);
          if (error) throw error;
          return Response.json({ ok: true });
        } catch (e) {
          console.error("admin-delete-result error", e);
          return Response.json({ ok: false }, { status: 400 });
        }
      },
    },
  },
});