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

const scoresSchema = z.object({
  PN: z.number().int().min(0).max(10),
  PNo: z.number().int().min(0).max(10),
  A: z.number().int().min(0).max(10),
  EL: z.number().int().min(0).max(10),
  EAS: z.number().int().min(0).max(10),
  EAR: z.number().int().min(0).max(10),
});

export const Route = createFileRoute("/api/public/save-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const scores = scoresSchema.parse(body?.scores);
          const existingId = typeof body?.resultId === "string" ? body.resultId : null;
          const ip = getClientIp(request);
          const ipHash = hashIp(ip);
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          if (existingId) {
            // Update existing result
            const { error } = await supabaseAdmin
              .from("results")
              .update({ scores, ip_hash: ipHash })
              .eq("id", existingId);
            if (error) throw error;
            return Response.json({ ok: true, id: existingId, ipHash });
          }

          // Insert new result
          const { data, error } = await supabaseAdmin
            .from("results")
            .insert({ ip_hash: ipHash, scores })
            .select("id")
            .single();
          if (error) throw error;
          return Response.json({ ok: true, id: data.id, ipHash });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("save-result error", msg);
          return Response.json({ ok: false, error: msg }, { status: 400 });
        }
      },
    },
  },
});