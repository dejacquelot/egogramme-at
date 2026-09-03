import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { buildTeamPrompt } from "@/lib/analysis-prompts";
import { streamGeminiText } from "@/lib/gemini-stream.server";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(2).max(20),
  teamName: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/analysis/team-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { ids, teamName } = bodySchema.parse(body);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: rows, error } = await supabaseAdmin
            .from("results")
            .select("id, scores, first_name, last_name, ip_hash")
            .in("id", ids);
          if (error) throw error;
          if (!rows || rows.length < 2) throw new Error("Sélection insuffisante.");

          const members = rows.map((r: any, i: number) => ({
            name:
              [r.first_name, r.last_name].filter(Boolean).join(" ") ||
              `Membre ${i + 1} (${String(r.ip_hash).slice(0, 8)})`,
            scores: (r.scores ?? {}) as Record<string, number>,
          }));

          const { system, user } = buildTeamPrompt(members, teamName);
          return await streamGeminiText(system, user);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("team-stream error", msg);
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
