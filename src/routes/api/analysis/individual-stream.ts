import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { buildIndividualPrompt } from "@/lib/analysis-prompts";
import { egoScoresSchema } from "@/lib/ego-scores.schema";
import { streamGeminiText } from "@/lib/gemini-stream.server";

const scoresSchema = egoScoresSchema;

export const Route = createFileRoute("/api/analysis/individual-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const scores = scoresSchema.parse(body?.scores);
          const firstName =
            typeof body?.firstName === "string" ? body.firstName.slice(0, 80) : undefined;
          const { system, user } = buildIndividualPrompt(scores, firstName);
          return await streamGeminiText(system, user);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("individual-stream error", msg);
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
