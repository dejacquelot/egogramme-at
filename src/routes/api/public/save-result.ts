import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";
import { egoScoresSchema } from "@/lib/ego-scores.schema";
import { isQuestionVariantKey } from "@/lib/question-variants";

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

const scoresSchema = egoScoresSchema;

const answersSchema = z.array(z.union([z.boolean(), z.null()])).length(60);

export const Route = createFileRoute("/api/public/save-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const scores = scoresSchema.parse(body?.scores);
          const parsedAnswers = answersSchema.safeParse(body?.answers);
          const answers = parsedAnswers.success ? parsedAnswers.data : null;
          const existingId = typeof body?.resultId === "string" ? body.resultId : null;
          const userId =
            typeof body?.userId === "string" && /^[0-9a-f-]{36}$/i.test(body.userId)
              ? body.userId
              : null;
          const referredBy = typeof body?.referred_by === "string" ? body.referred_by : null;
          const questionVariant = isQuestionVariantKey(body?.questionVariant)
            ? body.questionVariant
            : null;
          const ip = getClientIp(request);
          const ipHash = hashIp(ip);
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          if (existingId) {
            // Update existing result
            const payload: Record<string, unknown> = { scores, ip_hash: ipHash };
            if (answers) payload.answers = answers;
            if (userId) payload.user_id = userId;
            if (questionVariant) payload.question_variant = questionVariant;
            let { error } = await supabaseAdmin
              .from("results")
              .update(payload)
              .eq("id", existingId);
            // Retente sans `question_variant` puis sans `answers` si les colonnes
            // n'existent pas encore (migration pas encore appliquée).
            if (error && questionVariant) {
              const { question_variant: _omitV, ...withoutVariant } = payload;
              error = (
                await supabaseAdmin.from("results").update(withoutVariant).eq("id", existingId)
              ).error;
            }
            if (error && answers) {
              const { answers: _omit, question_variant: _omitV2, ...withoutAnswers } = payload;
              error = (
                await supabaseAdmin.from("results").update(withoutAnswers).eq("id", existingId)
              ).error;
            }
            if (error) throw error;
            return Response.json({ ok: true, id: existingId, ipHash });
          }

          // Insert new result
          const insertData: Record<string, unknown> = { ip_hash: ipHash, scores };
          if (referredBy) insertData.referred_by = referredBy;
          if (answers) insertData.answers = answers;
          if (userId) insertData.user_id = userId;
          if (questionVariant) insertData.question_variant = questionVariant;
          let { data, error } = await supabaseAdmin
            .from("results")
            .insert(insertData)
            .select("id")
            .single();
          // Retente sans `question_variant` puis sans `answers` si les colonnes
          // n'existent pas encore (migration pas encore appliquée).
          if (error && questionVariant) {
            const { question_variant: _omitV, ...withoutVariant } = insertData;
            const retry = await supabaseAdmin
              .from("results")
              .insert(withoutVariant)
              .select("id")
              .single();
            data = retry.data;
            error = retry.error;
          }
          if (error && answers) {
            const { answers: _omit, question_variant: _omitV2, ...withoutAnswers } = insertData;
            const retry = await supabaseAdmin
              .from("results")
              .insert(withoutAnswers)
              .select("id")
              .single();
            data = retry.data;
            error = retry.error;
          }
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