import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const SALT = "egogramme-josien-v1-static-salt";
const PAGES = ["duo", "apel"];
const KINDS = ["visit", "start", "report"];

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}

/**
 * Comptage anonyme des visites, démarrages et rapports des pages /duo et /apel,
 * pour les courbes de /statistiques. Un événement par type, visiteur et jour.
 */
export const Route = createFileRoute("/api/public/track-page")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as {
            page?: string;
            kind?: string;
          } | null;
          if (!body || !PAGES.includes(body.page ?? "") || !KINDS.includes(body.kind ?? "")) {
            return Response.json({ ok: false }, { status: 400 });
          }
          const visitorHash = createHash("sha256")
            .update(SALT + "|" + getClientIp(request))
            .digest("hex");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("page_events")
            .upsert(
              { page: body.page, kind: body.kind, visitor_hash: visitorHash },
              { onConflict: "page,kind,event_date,visitor_hash", ignoreDuplicates: true },
            );
          if (error) throw error;
          return Response.json({ ok: true });
        } catch (e) {
          console.error("track-page error", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
