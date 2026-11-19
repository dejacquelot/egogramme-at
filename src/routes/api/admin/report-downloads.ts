import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/api/admin/report-downloads")({
  server: { handlers: {
    GET: async ({ request }) => {
      const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
      const headers = { "Cache-Control": "private, no-store" };
      if (!token) return new Response(null, { status: 401, headers });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user?.email_confirmed_at || !isAdminEmail(user.email))
        return new Response(null, { status: 403, headers });
      const since = z.string().datetime().safeParse(new URL(request.url).searchParams.get("since"));
      if (!since.success) return new Response(null, { status: 400, headers });
      const { data, error } = await supabaseAdmin.rpc("report_download_counts", { since_at: since.data });
      if (error) {
        console.error("report-download-counts", error.code);
        return new Response(null, { status: 503, headers });
      }
      return Response.json(data, { headers });
    },
  } },
});
