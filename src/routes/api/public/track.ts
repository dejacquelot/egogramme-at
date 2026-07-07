import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const SALT = "egogramme-josien-v1-static-salt";

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}

function hashIp(ip: string): string {
  return createHash("sha256").update(SALT + "|" + ip).digest("hex");
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          const ipHash = hashIp(ip);
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          await supabaseAdmin
            .from("visits")
            .upsert(
              { ip_hash: ipHash },
              { onConflict: "visit_date,ip_hash", ignoreDuplicates: true },
            );
          return Response.json({ ok: true });
        } catch (e) {
          console.error("track error", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});