import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { buildIndividualPrompt } from "@/lib/analysis-prompts";
import { streamGeminiText } from "@/lib/gemini-stream.server";

const scoresSchema = z.object({
  PN: z.number().int().min(0).max(10),
  PNo: z.number().int().min(0).max(10),
  A: z.number().int().min(0).max(10),
  EL: z.number().int().min(0).max(10),
  EAS: z.number().int().min(0).max(10),
  EAR: z.number().int().min(0).max(10),
});

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
