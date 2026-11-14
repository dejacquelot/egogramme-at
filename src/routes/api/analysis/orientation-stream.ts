import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  buildOrientationPrompt,
  orientationAnalysisSchema,
  ORIENTATION_END,
} from "@/lib/orientation";
import { streamGeminiText } from "@/lib/gemini-stream.server";

export const Route = createFileRoute("/api/analysis/orientation-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = orientationAnalysisSchema.parse(await request.json());
          const prompt = buildOrientationPrompt(body);
          return await streamGeminiText(prompt.system, prompt.user, {
            completionMarker: ORIENTATION_END,
          });
        } catch (error) {
          if (error instanceof z.ZodError || error instanceof SyntaxError) {
            console.warn("orientation-stream: invalid request");
            return new Response(
              "Accord IA ou questionnaire incomplet. Vérifie tes réponses puis réessaie.",
              {
                status: 400,
              },
            );
          }
          console.error(
            "orientation-stream: generation failed",
            error instanceof Error ? error.name : "unknown",
          );
          return new Response(
            "L'analyse est indisponible. Tu peux continuer ton carnet et réessayer plus tard.",
            {
              status: 502,
            },
          );
        }
      },
    },
  },
});
