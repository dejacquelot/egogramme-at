import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { buildTeamPrompt } from "@/lib/analysis-prompts";
import { isQuestionVariantKey, type QuestionVariantKey } from "@/lib/question-variants";
import { streamGeminiText } from "@/lib/gemini-stream.server";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(2).max(20),
  teamName: z.string().max(120).optional(),
});

/**
 * Détermine le contexte dominant de l'équipe : la variante la plus fréquente
 * parmi les résultats des membres (les valeurs manquantes/absentes comptent
 * comme "default"). En cas d'égalité, "default" l'emporte pour rester neutre.
 */
function pickTeamVariant(variants: (string | null | undefined)[]): QuestionVariantKey {
  const counts = new Map<QuestionVariantKey, number>();
  for (const v of variants) {
    const key = isQuestionVariantKey(v) ? v : "default";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: QuestionVariantKey = "default";
  let bestCount = counts.get("default") ?? 0;
  for (const [key, count] of counts) {
    if (key !== "default" && count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

export const Route = createFileRoute("/api/analysis/team-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { ids, teamName } = bodySchema.parse(body);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let { data: rows, error } = await supabaseAdmin
            .from("results")
            .select("id, scores, first_name, last_name, ip_hash, question_variant")
            .in("id", ids);
          // Retente sans `question_variant` si la colonne n'existe pas encore
          if (error) {
            const retry = await supabaseAdmin
              .from("results")
              .select("id, scores, first_name, last_name, ip_hash")
              .in("id", ids);
            rows = retry.data;
            error = retry.error;
          }
          if (error) throw error;
          if (!rows || rows.length < 2) throw new Error("Sélection insuffisante.");

          const members = rows.map((r: any, i: number) => ({
            name:
              [r.first_name, r.last_name].filter(Boolean).join(" ") ||
              `Membre ${i + 1} (${String(r.ip_hash).slice(0, 8)})`,
            scores: (r.scores ?? {}) as Record<string, number>,
          }));
          const teamVariant = pickTeamVariant(rows.map((r: any) => r.question_variant));

          const { system, user } = buildTeamPrompt(members, teamName, teamVariant);
          return await streamGeminiText(system, user, {
            completionMarker: "Points de vigilance individuels",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("team-stream error", msg);
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
