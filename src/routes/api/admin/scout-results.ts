import { createFileRoute } from "@tanstack/react-router";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/api/admin/scout-results")({
  server: { handlers: {
    GET: async ({ request }) => {
      const headers = { "Cache-Control": "private, no-store" };
      const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return new Response(null, { status: 401, headers });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return new Response(null, { status: 401, headers });
      if (!user.email_confirmed_at || !isAdminEmail(user.email)) return new Response(null, { status: 403, headers });
      const { data, error } = await supabaseAdmin.from("scout_results")
        .select("id, completed_at, members").order("completed_at", { ascending: false }).limit(100);
      if (error) {
        console.error("admin scout-results", error.code);
        return new Response(null, { status: 503, headers });
      }
      return Response.json(data, { headers });
    },
  } },
});
