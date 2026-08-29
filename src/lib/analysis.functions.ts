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
      "Tu es psychiatre, superviseur et coach certifié, expert reconnu en analyse transactionnelle (Éric Berne, Stephen Karpman, Taibi Kahler, Claude Steiner, Fanita English). Tu maîtrises les concepts d'égogramme de John Dusay, les positions de vie (OK/OK), les drivers de Kahler, les jeux psychologiques, les scénarios de vie, les transactions croisées et les méconnaissances. Tu rédiges des analyses cliniques riches, concrètes et nuancées, en français, en markdown. Tu illustres tes analyses par des exemples comportementaux concrets et quotidiens. Tu ne fais aucun disclaimer.";

    const userPrompt =
      `Voici l'égogramme${data.firstName ? ` de ${data.firstName}` : ""} (analyse transactionnelle selon Dusay, scores de 0 à 10 par état du moi) :\n` +
      line +
      `\n\nRédige une analyse individuelle approfondie en markdown, en français, avec ces sections :\n` +
      `## 🎯 Portrait global\nSynthèse en 3-4 phrases de la structure de personnalité révélée par cet égogramme. Nomme la position de vie probable (OK+/OK+, OK+/OK-, etc.).\n` +
      `## 📊 États du moi dominants\nAnalyse détaillée des 2-3 états les plus élevés. Pour chacun, donne 2-3 exemples concrets de comportements au quotidien (en réunion, en famille, sous stress). Explique comment ils interagissent entre eux.\n` +
      `## 📉 États du moi peu investis\nAnalyse des états faibles. Que signifie concrètement cette sous-utilisation ? Quelles situations sont difficiles à gérer ? Donne des exemples de transactions qui posent problème.\n` +
      `## ⚖️ Équilibre Parent / Adulte / Enfant\nAnalyse l'équilibre entre les trois grandes instances. Y a-t-il contamination de l'Adulte ? Exclusion d'un état ? Comment cela se manifeste dans la prise de décision ?\n` +
      `## 🔄 Dynamiques relationnelles et transactions\nQuels types de transactions cette personne initie-t-elle le plus souvent (parallèles, croisées, ultérieures) ? Avec quels profils s'entend-elle naturellement ? Lesquels sont sources de friction ?\n` +
      `## ⚠️ Risques et jeux psychologiques\nIdentifie 2-3 jeux psychologiques probables avec leur rôle Karpman favori (Persécuteur, Sauveur, Victime). Nomme les drivers de Kahler actifs (Sois parfait, Fais plaisir, Sois fort, Dépêche-toi, Fais des efforts). Explique les méconnaissances et les scénarios de vie possibles.\n` +
      `## 💪 Forces à valoriser\nIdentifie 3-4 forces distinctives de ce profil. Pour chacune, explique dans quel contexte professionnel ou personnel elle est un atout majeur.\n` +
      `## 🛤️ Pistes de développement et coaching\nPropose 4-5 actions concrètes et réalistes pour rééquilibrer l'égogramme. Pour chaque action, donne un exercice pratique ou une mise en situation. Indique quel état du moi sera développé.\n` +
      `\nAppuie CHAQUE affirmation sur les scores chiffrés. Utilise un ton professionnel, bienveillant, engageant et sans jugement. Sois précis et concret, évite les généralités. Vise 800 à 1200 mots.`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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
      const errBody = await aiRes.text();
      console.error("individual-analysis ai error", aiRes.status, errBody);
      throw new Error(`Erreur IA (${aiRes.status}): ${errBody.slice(0, 200)}`);
    }

    const json = (await aiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) throw new Error("Réponse vide.");
    return { analysis: text };
  });