import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAILS, TEAM_ANALYSIS_LABELS } from "@/lib/admin-config";

function assertAdmin(claims: Record<string, unknown>): string {
  const email = String((claims as { email?: string }).email ?? "").toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new Error("Forbidden");
  }
  return email;
}

export const listAdminResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("results")
      .select(
        "id, ip_hash, scores, created_at, first_name, last_name, phone, contact_requested",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const deleteAdminResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("results").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const generateTeamAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; teamName?: string }) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(2).max(20),
        teamName: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("results")
      .select("id, scores, created_at, first_name, last_name, ip_hash")
      .in("id", data.ids);
    if (error) throw error;
    if (!rows || rows.length < 2) throw new Error("Sélection insuffisante.");

    const members = rows.map((r, i) => {
      const s = (r.scores ?? {}) as Record<string, number>;
      const name =
        [r.first_name, r.last_name].filter(Boolean).join(" ") ||
        `Membre ${i + 1} (${String(r.ip_hash).slice(0, 8)})`;
      const line = Object.keys(TEAM_ANALYSIS_LABELS)
        .map((k) => `${TEAM_ANALYSIS_LABELS[k]} ${s[k] ?? 0}/10`)
        .join(", ");
      return `- ${name} : ${line}`;
    });

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Clé IA manquante.");

    const prompt =
      `Équipe${data.teamName ? ` « ${data.teamName} »` : ""} composée de ${members.length} personnes ayant passé un égogramme (analyse transactionnelle, scores de 0 à 10 par état du moi) :\n` +
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

    if (aiRes.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
    if (aiRes.status === 402) throw new Error("Crédits IA épuisés.");
    if (!aiRes.ok) {
      console.error("team-analysis ai error", aiRes.status, await aiRes.text());
      throw new Error("Analyse indisponible.");
    }

    const json = (await aiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Réponse vide.");
    return { analysis: text };
  });
