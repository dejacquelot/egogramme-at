import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";

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

const schema = z.object({
  id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  contact_requested: z.boolean(),
  phone: z.string().trim().max(40).optional().nullable(),
});

export const Route = createFileRoute("/api/public/save-contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = schema.parse(body);
          if (parsed.contact_requested) {
            if (!parsed.phone || parsed.phone.length < 4) {
              return Response.json(
                { ok: false, error: "phone_required" },
                { status: 400 },
              );
            }
          }
          const ipHash = hashIp(getClientIp(request));
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { error } = await supabaseAdmin
            .from("results")
            .update({
              first_name: parsed.first_name,
              last_name: parsed.last_name,
              phone: parsed.contact_requested ? parsed.phone : null,
              contact_requested: parsed.contact_requested,
            })
            .eq("id", parsed.id)
            .eq("ip_hash", ipHash);
          if (error) throw error;
          return Response.json({ ok: true });
        } catch (e) {
          console.error("save-contact error", e);
          return Response.json({ ok: false }, { status: 400 });
        }
      },
    },
  },
});