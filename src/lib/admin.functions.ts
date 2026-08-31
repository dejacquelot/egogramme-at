import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TEAM_ANALYSIS_LABELS } from "@/lib/admin-config";

export const listAdminResults = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("results")
      .select(
        "id, ip_hash, scores, created_at, first_name, last_name, phone, contact_requested, referred_by",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const deleteAdminResult = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("results").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const updateAdminResultName = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; first_name: string; last_name: string }) =>
    z
      .object({
        id: z.string().uuid(),
        first_name: z.string().trim().max(80),
        last_name: z.string().trim().max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("results")
      .update({
        first_name: data.first_name || null,
        last_name: data.last_name || null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return {
      ok: true as const,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
    };
  });

export const generateTeamAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[]; teamName?: string }) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(2).max(20),
        teamName: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
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

    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("Clé IA manquante.");

    const prompt =
      `Équipe${data.teamName ? ` « ${data.teamName} »` : ""} composée de ${members.length} personnes ayant passé un égogramme (analyse transactionnelle selon Dusay, scores de 0 à 10 par état du moi) :\n` +
      members.join("\n") +
      `\n\nRédige une analyse d'équipe approfondie en HTML valide, en français, avec ces sections :\n` +
      `<h2>🎯 Portrait global de l'équipe</h2>\nSynthèse de la dynamique collective. Quel est le « profil dominant » de cette équipe ? Quelle culture relationnelle se dégage ? Position de vie collective probable.\n` +
      `<h2>📊 Cartographie des états du moi</h2>\nTableau comparatif en HTML (<table><thead><tbody><tr><th><td>) avec colonnes : État du moi | Score de chaque membre | Dynamique de la dyade/groupe. Qui porte quel état du moi pour le groupe ? Identifie les spécialisations implicites.\n` +
      `<h2>🤝 Complémentarités et synergies</h2>\nQuels binômes ou trinômes fonctionnent naturellement bien ensemble ? Pourquoi ? Donne des exemples concrets de situations de travail.\n` +
      `<h2>⚠️ Risques relationnels et jeux psychologiques</h2>\nIdentifie 3-4 jeux psychologiques probables ENTRE les membres. Pour le triangle de Karpman collectif, génère une <table> HTML sans bordures avec 3 lignes : ligne 1 = cellule vide | cellule "🔺 Persécuteur" centrée (nom du membre) | cellule vide ; ligne 2 = cellule "↙ Victime" (nom) | cellule vide | cellule "↘ Sauveur" (nom) ; ligne 3 = explication courte. Quelles symbioses institutionnelles peuvent émerger ?\n` +
      `<h2>💬 Dynamiques de communication et de décision</h2>\nComment cette équipe prend-elle ses décisions ? Quels types de transactions dominent en réunion ? Qui parle à qui naturellement ?\n` +
      `<h2>🛠️ Recommandations pour le coach/manager</h2>\nPropose 5-6 actions concrètes : ateliers, rituels d'équipe, changements de posture, exercices de développement. Pour chaque recommandation, précise l'objectif et la mise en œuvre.\n` +
      `<h2>👤 Points de vigilance individuels</h2>\nPour chaque membre, 2-3 lignes personnalisées : sa contribution clé au groupe, son risque principal, et une piste de développement prioritaire.\n` +
      `\nAppuie CHAQUE affirmation sur les scores chiffrés des membres. Compare les profils entre eux. Sois précis, concret, engageant. Vise 1000 à 1500 mots. RAPPEL : HTML uniquement, zéro Markdown.`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: "Tu es psychiatre, superviseur et coach certifié, expert reconnu en analyse transactionnelle (Éric Berne, Stephen Karpman, Taibi Kahler, John Dusay, Claude Steiner). Tu analyses des égogrammes d'équipe pour un coach professionnel. Tu maîtrises les dynamiques de groupe, les transactions croisées, les jeux systémiques, les positions de vie, les symbioses institutionnelles et les processus de groupe. Tu rédiges des analyses cliniques riches, concrètes et nuancées, en français. Tu illustres par des exemples concrets de situations d'équipe. Tu ne fais aucun disclaimer. IMPORTANT : tu génères du HTML valide et lisible dans un navigateur. Utilise <h2> pour les titres de section, <p> pour les paragraphes, <ul>/<li> pour les listes, <strong> pour les mises en gras, <table><thead><tbody><tr><th><td> pour les tableaux comparatifs (jamais de Markdown pipe |), et pour le triangle de Karpman génère une <table> à 3 cellules disposées en triangle visuel : une ligne avec une cellule centrée en haut (Persécuteur), puis une ligne avec deux cellules (Victime à gauche, Sauveur à droite), chaque cellule indique le nom du membre et son rôle. Ne génère JAMAIS de Markdown (pas de #, **, |, -, *). Uniquement du HTML.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
    );

    if (aiRes.status === 429) throw new Error("Trop de requ\u00eates, réessayez dans un instant.");
    if (!aiRes.ok) {
      console.error("team-analysis ai error", aiRes.status, await aiRes.text());
      throw new Error("Analyse indisponible.");
    }

    const json = (await aiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) throw new Error("Réponse vide.");

    // Save team analysis to database
    const memberNames = rows.map((r, i) =>
      [r.first_name, r.last_name].filter(Boolean).join(" ") ||
      `Membre ${i + 1}`,
    );
    await supabaseAdmin.from("team_analyses").insert({
      team_name: data.teamName || "",
      member_ids: data.ids,
      member_names: memberNames,
      analysis: text,
    });

    return { analysis: text };
  });

/**
 * Provisionne (ou réinitialise) le compte email/mot de passe d'un administrateur
 * whitelisté, à partir du mot de passe partagé stocké côté serveur.
 */
export const provisionAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) =>
    z
      .object({
        email: z.string().email().max(200),
        password: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) throw new Error("Forbidden");

    const expected = (process.env["ADMIN_PASSWORD"] ?? "").trim() || "lapin";
    if (!expected) throw new Error("Mot de passe administrateur non configuré.");
    const provided = data.password.trim();
    if (provided !== expected) {
      throw new Error("Identifiants invalides.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw listError;

    const existing = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );

    if (existing) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.password,
        email_confirm: true,
      });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
      });
      if (error) throw error;
    }

    return { ok: true as const };
  });
