import { createFileRoute } from "@tanstack/react-router";
import { isAdminEmail } from "@/lib/admin-config";

const json = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
};

/** Liste des séances APEL anonymisées, réservée aux administrateurs connectés. */
export const Route = createFileRoute("/api/admin/apel-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
          if (!token) return json({ ok: false, error: "Non connecté." }, { status: 401 });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: auth } = await supabaseAdmin.auth.getUser(token);
          if (!isAdminEmail(auth.user?.email)) {
            return json({ ok: false, error: "Accès refusé." }, { status: 403 });
          }
          const { data, error } = await supabaseAdmin
            .from("apel_sessions")
            .select("id, created_at, present_count, members, collective, agreements")
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          return json({ ok: true, sessions: data ?? [] });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("admin apel-sessions error", message);
          return json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
