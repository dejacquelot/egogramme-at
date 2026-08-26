import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const scoresSchema = z.object({
  PN: z.number().int().min(0).max(10),
  PNo: z.number().int().min(0).max(10),
  A: z.number().int().min(0).max(10),
  EL: z.number().int().min(0).max(10),
  EAS: z.number().int().min(0).max(10),
  EAR: z.number().int().min(0).max(10),
});

const LABELS: Record<string, string> = {
  PN: "Parent Nourricier",
  PNo: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};

export const generateIndividualAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: { scores: Record<string, number>; firstName?: string }) =>
    z
      .object({
        scores: scoresSchema,
        firstName: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("Clé IA manquante.");

    const line = Object.keys(LABELS)
      .map((k) => `${LABELS[k]} : ${data.scores[k as keyof typeof data.scores]}/10`)
      .join("\n");

    const systemPrompt =
      "Tu es psychiatre et superviseur, expert reconnu en analyse transactionnelle (Berne, Karpman, Kahler). Tu analyses des égogrammes individuels. Tu écris en français, en markdown, sans disclaimer inutile.";

    const userPrompt =
      `Voici l'égogramme${data.firstName ? ` de ${data.firstName}` : ""} (analyse transactionnelle, scores de 0 à 10 par état du moi) :\n` +
      line +
      `\n\nRédige une analyse individuelle approfondie en markdown, en français, avec ces sections :\n` +
      `## Portrait global\n## États du moi dominants\n## États du moi peu investis\n## Équilibre Parent / Adulte / Enfant\n## Dynamiques relationnelles et communication\n## Risques et jeux psychologiques probables (triangle de Karpman, symbiose, méconnaissances, drivers de Kahler)\n## Forces à valoriser\n## Pistes de développement concrètes\n` +
      `Appuie chaque affirmation sur les scores chiffrés, ton professionnel de psychiatre expert en analyse transactionnelle, bienveillant et sans jugement, environ 600 à 900 mots.`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        }),
      },
    );

    if (aiRes.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
    if (!aiRes.ok) {
      console.error("individual-analysis ai error", aiRes.status, await aiRes.text());
      throw new Error("Analyse indisponible.");
    }

    const json = (await aiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) throw new Error("Réponse vide.");
    return { analysis: text };
  });