import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Kept in sync with the admin login constants used client-side.
const ADMIN_USER = "pinpin";
const ADMIN_PASS = "lapin";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(2).max(20),
  teamName: z.string().max(120).optional(),
  user: z.string(),
  pass: z.string(),
});

const LABELS: Record<string, string> = {
  PN: "Parent Nourricier",
  PNo: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};

export const Route = createFileRoute("/api/public/team-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = schema.parse(body);
          if (parsed.user !== ADMIN_USER || parsed.pass !== ADMIN_PASS) {
            return Response.json({ ok: false }, { status: 401 });
          }

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data, error } = await supabaseAdmin
            .from("results")
            .select("id, scores, created_at, first_name, last_name, ip_hash")
            .in("id", parsed.ids);
          if (error) throw error;
          if (!data || data.length < 2) {
            return Response.json({ ok: false, error: "Sélection insuffisante." }, { status: 400 });
          }

          const members = data.map((r, i) => {
            const s = (r.scores ?? {}) as Record<string, number>;
            const name =
              [r.first_name, r.last_name].filter(Boolean).join(" ") ||
              `Membre ${i + 1} (${String(r.ip_hash).slice(0, 8)})`;
            const line = Object.keys(LABELS)
              .map((k) => `${LABELS[k]} ${s[k] ?? 0}/10`)
              .join(", ");
            return `- ${name} : ${line}`;
          });

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) {
            return Response.json({ ok: false, error: "Clé IA manquante." }, { status: 500 });
          }

          const prompt =
            `Équipe${parsed.teamName ? ` « ${parsed.teamName} »` : ""} composée de ${members.length} personnes ayant passé un égogramme (analyse transactionnelle, scores de 0 à 10 par état du moi) :\n` +
            members.join("\n") +
            `\n\nRédige une analyse d'équipe structurée en markdown, en français, avec ces sections :\n` +
            `## Portrait global de l'équipe\n## Cartographie des états du moi dominants et absents\n## Complémentarités et synergies\n## Risques relationnels et jeux psychologiques probables (triangle de Karpman, symbiose, méconnaissances)\n## Dynamiques de décision et de communication\n## Recommandations opérationnelles pour le manager/coach\n## Points de vigilance individuels (sans jugement, en nommant les personnes)\n` +
            `Sois précis, appuie chaque affirmation sur les scores, garde un ton professionnel de psychiatre expert en analyse transactionnelle, environ 600 à 900 mots.`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "Tu es psychiatre et superviseur, expert reconnu en analyse transactionnelle (Berne, Karpman, Kahler). Tu analyses des égogrammes d'équipe pour un coach professionnel. Tu écris en français, en markdown, sans disclaimer inutile.",
                },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (aiRes.status === 429) {
            return Response.json({ ok: false, error: "Trop de requêtes, réessayez dans un instant." }, { status: 429 });
          }
          if (aiRes.status === 402) {
            return Response.json({ ok: false, error: "Crédits IA épuisés." }, { status: 402 });
          }
          if (!aiRes.ok) {
            const t = await aiRes.text();
            console.error("team-analysis ai error", aiRes.status, t);
            return Response.json({ ok: false, error: "Analyse indisponible." }, { status: 502 });
          }

          const json = await aiRes.json();
          const text: string = json?.choices?.[0]?.message?.content ?? "";
          if (!text) {
            return Response.json({ ok: false, error: "Réponse vide." }, { status: 502 });
          }
          return Response.json({ ok: true, analysis: text });
        } catch (e) {
          console.error("team-analysis error", e);
          return Response.json({ ok: false, error: "Requête invalide." }, { status: 400 });
        }
      },
    },
  },
});