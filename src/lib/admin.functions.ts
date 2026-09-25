import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ADMIN_EMAILS, isAdminEmail } from "@/lib/admin-config";

export const listAdminResults = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data, error } = await supabaseAdmin
      .from("results")
      .select(
        "id, ip_hash, scores, created_at, first_name, last_name, phone, contact_requested, referred_by, question_variant",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    // Retente sans `question_variant` si la colonne n'existe pas encore
    if (error) {
      const retry = await supabaseAdmin
        .from("results")
        .select(
          "id, ip_hash, scores, created_at, first_name, last_name, phone, contact_requested, referred_by",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      data = retry.data;
      error = retry.error;
    }
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

export const updateMyResultName = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; first_name: string; last_name: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        first_name: z.string().trim().max(80),
        last_name: z.string().trim().max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: {
        given_name: data.first_name || "",
        family_name: data.last_name || "",
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" "),
      },
    });
    if (authError) throw authError;

    const { data: rows, error } = await supabaseAdmin
      .from("results")
      .update({
        first_name: data.first_name || null,
        last_name: data.last_name || null,
      })
      .eq("user_id", data.userId);
    if (error) throw error;
    return {
      ok: true as const,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      hasResultRow: Array.isArray(rows) ? rows.length > 0 : true,
    };
  });

/**
 * Persiste une analyse d'équipe déjà générée (via streaming) et renvoie son id.
 * Ne fait aucun appel IA : le texte est fourni par le client après le flux.
 */
export const saveTeamAnalysis = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      ids: string[];
      analysis: string;
      teamName?: string;
      creatorUserId?: string;
      kind?: "individual" | "collective";
    }) =>
      z
        .object({
          ids: z.array(z.string().uuid()).min(1).max(20),
          analysis: z.string().min(1),
          teamName: z.string().max(120).optional(),
          creatorUserId: z.string().uuid().optional(),
          kind: z.enum(["individual", "collective"]).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("results")
      .select("id, first_name, last_name")
      .in("id", data.ids);
    const memberNames = (rows ?? []).map((r: any, i: number) =>
      [r.first_name, r.last_name].filter(Boolean).join(" ") || `Membre ${i + 1}`,
    );

    const basePayload = {
      team_name: data.teamName || "",
      member_ids: data.ids,
      member_names: memberNames,
      analysis: data.analysis,
      creator_user_id: data.creatorUserId ?? null,
    };
    const kind = data.kind ?? (data.ids.length > 1 ? "collective" : "individual");

    let { data: inserted, error } = await supabaseAdmin
      .from("team_analyses")
      .insert({ ...basePayload, kind })
      .select("id")
      .single();

    // Retente sans `kind` si la migration de colonne n'a pas encore été appliquée
    if (error) {
      const retry = await supabaseAdmin
        .from("team_analyses")
        .insert(basePayload)
        .select("id")
        .single();
      inserted = retry.data;
      error = retry.error;
    }
    if (error) {
      throw new Error(
        `Insertion team_analyses refusée : ${error.message}${error.hint ? ` (${error.hint})` : ""}`,
      );
    }

    return { teamAnalysisId: inserted?.id ?? null };
  });

export const deleteMyTeamAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; teamAnalysisId: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        teamAnalysisId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("team_analyses")
      .delete()
      .eq("id", data.teamAnalysisId)
      .eq("creator_user_id", data.userId);
    if (error) throw error;
    return { ok: true as const };
  });

export const listMyTeamAnalyses = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("team_analyses")
      .select("*")
      .eq("creator_user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows ?? [];
  });

/** Renomme une analyse appartenant à l'utilisateur courant. */
export const renameMyAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; analysisId: string; title: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        analysisId: z.string().uuid(),
        title: z.string().max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("team_analyses")
      .update({ team_name: data.title } as Record<string, unknown>)
      .eq("id", data.analysisId)
      .eq("creator_user_id", data.userId)
      .select("id, team_name")
      .maybeSingle();
    if (error) throw error;
    return { ok: true as const, row };
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

/** List all registered users with their invitations */
export const listAdminUsers = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) throw authError;

    // Fetch all invitations
    const { data: invitations, error: invError } = await supabaseAdmin
      .from("invitations")
      .select("id, inviter_user_id, invitee_name, invitee_email, status, result_id, created_at, reminded_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (invError) throw invError;

    const { data: teamAnalyses } = await supabaseAdmin
      .from("team_analyses")
      .select("id, creator_user_id")
      .then((r) => r, () => ({ data: [] as { id: string; creator_user_id: string | null }[] }));
    const teamByUser = new Map<string, number>();
    (teamAnalyses ?? []).forEach((ta: any) => {
      const uid = String(ta.creator_user_id ?? "");
      if (!uid) return;
      teamByUser.set(uid, (teamByUser.get(uid) ?? 0) + 1);
    });

    // Build users list
    const users = authData.users.map((u) => {
      const meta = u.user_metadata ?? {};
      const userInvitations = (invitations ?? []).filter((i: any) => i.inviter_user_id === u.id);

      return {
        id: u.id,
        email: u.email ?? "",
        firstName: (meta.given_name as string) ?? (meta.full_name as string)?.split(" ")[0] ?? "",
        lastName: (meta.family_name as string) ?? (meta.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
        avatarUrl: (meta.avatar_url as string) ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        teamAnalysesCount: teamByUser.get(u.id) ?? 0,
        invitations: userInvitations.map((i: any) => ({
          id: i.id,
          inviteeName: i.invitee_name,
          inviteeEmail: i.invitee_email,
          status: i.status,
          createdAt: i.created_at,
        })),
      };
    });

    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

/** Admin stats data that needs service-role access (auth users + invitations) */
export const listAdminStatsData = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) throw authError;

    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from("invitations")
      .select("id, created_at")
      .order("created_at", { ascending: true })
      .limit(10000);
    if (invitationsError) throw invitationsError;

    const { data: teamAnalyses } = await supabaseAdmin
      .from("team_analyses")
      .select("id, created_at, creator_user_id")
      .order("created_at", { ascending: true })
      .limit(10000)
      .then((r) => r, () => ({ data: [] as { id: string; created_at: string; creator_user_id: string | null }[] }));

    return {
      users: authData.users.map((user) => ({
        id: user.id,
        created_at: user.created_at,
      })),
      invitations: (invitations ?? []).map((inv) => ({
        id: inv.id as string,
        created_at: inv.created_at as string,
      })),
      teamAnalysesByUsers: (teamAnalyses ?? [])
        .filter((ta: any) => Boolean(ta.creator_user_id))
        .map((ta: any) => ({
          id: ta.id as string,
          created_at: ta.created_at as string,
          creator_user_id: ta.creator_user_id as string,
        })),
    };
  });

/**
 * Suppression RGPD complète d'un compte utilisateur : ses résultats, ses
 * invitations, ses analyses d'équipe et son compte Supabase Auth.
 *
 * Double garde-fou avant toute purge :
 *  - `requestedByEmail` doit être un email admin whitelisté ;
 *  - `confirmEmail` doit correspondre exactement à l'email du compte visé
 *    (retapé côté client), pour éviter une suppression accidentelle en un
 *    seul clic sur une action irréversible.
 *
 * Ne conserve aucune donnée personnelle après coup : seul un compteur
 * anonyme est journalisé dans `admin_deletion_log` (preuve de conformité).
 */
export const deleteAdminUser = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; requestedByEmail: string; confirmEmail: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        requestedByEmail: z.string().email(),
        confirmEmail: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const requestedBy = data.requestedByEmail.trim().toLowerCase();
    if (!isAdminEmail(requestedBy)) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      data.userId,
    );
    if (getUserError || !userData?.user) throw new Error("Utilisateur introuvable.");

    const actualEmail = (userData.user.email ?? "").trim().toLowerCase();
    const confirmed = data.confirmEmail.trim().toLowerCase();
    if (!actualEmail || confirmed !== actualEmail) {
      throw new Error("L'email de confirmation ne correspond pas au compte ciblé.");
    }

    const { data: deletedResults, error: resultsError } = await supabaseAdmin
      .from("results")
      .delete()
      .eq("user_id", data.userId)
      .select("id");
    if (resultsError) throw resultsError;

    const { data: deletedInvitations, error: invitationsError } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("inviter_user_id", data.userId)
      .select("id");
    if (invitationsError) throw invitationsError;

    const { data: deletedTeamAnalyses, error: teamAnalysesError } = await supabaseAdmin
      .from("team_analyses")
      .delete()
      .eq("creator_user_id", data.userId)
      .select("id");
    if (teamAnalysesError) throw teamAnalysesError;

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authDeleteError) throw authDeleteError;

    await supabaseAdmin.from("admin_deletion_log").insert({
      deleted_user_id: data.userId,
      requested_by: requestedBy,
      results_deleted: deletedResults?.length ?? 0,
      invitations_deleted: deletedInvitations?.length ?? 0,
      team_analyses_deleted: deletedTeamAnalyses?.length ?? 0,
    });

    return {
      ok: true as const,
      resultsDeleted: deletedResults?.length ?? 0,
      invitationsDeleted: deletedInvitations?.length ?? 0,
      teamAnalysesDeleted: deletedTeamAnalyses?.length ?? 0,
    };
  });

/**
 * Suppression de compte en libre-service, sans passer par un administrateur.
 * Même effet que `deleteAdminUser` (résultats, invitations, analyses d'équipe,
 * puis le compte auth), mais la garde-fou est ici la ré-saisie du propre
 * email du demandeur — `userId` reste passé par le client comme pour les
 * autres server functions de ce fichier (aucune vérification de session
 * côté serveur n'est en place ailleurs dans ce projet), donc le seul rempart
 * contre un appel accidentel ou malveillant est cette confirmation d'email.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; confirmEmail: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        confirmEmail: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      data.userId,
    );
    if (getUserError || !userData?.user) throw new Error("Compte introuvable.");

    const actualEmail = (userData.user.email ?? "").trim().toLowerCase();
    const confirmed = data.confirmEmail.trim().toLowerCase();
    if (!actualEmail || confirmed !== actualEmail) {
      throw new Error("L'email saisi ne correspond pas à votre compte.");
    }

    const { data: deletedResults, error: resultsError } = await supabaseAdmin
      .from("results")
      .delete()
      .eq("user_id", data.userId)
      .select("id");
    if (resultsError) throw resultsError;

    const { data: deletedInvitations, error: invitationsError } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("inviter_user_id", data.userId)
      .select("id");
    if (invitationsError) throw invitationsError;

    const { data: deletedTeamAnalyses, error: teamAnalysesError } = await supabaseAdmin
      .from("team_analyses")
      .delete()
      .eq("creator_user_id", data.userId)
      .select("id");
    if (teamAnalysesError) throw teamAnalysesError;

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authDeleteError) throw authDeleteError;

    await supabaseAdmin.from("admin_deletion_log").insert({
      deleted_user_id: data.userId,
      requested_by: `self:${actualEmail}`,
      results_deleted: deletedResults?.length ?? 0,
      invitations_deleted: deletedInvitations?.length ?? 0,
      team_analyses_deleted: deletedTeamAnalyses?.length ?? 0,
    });

    return {
      ok: true as const,
      resultsDeleted: deletedResults?.length ?? 0,
      invitationsDeleted: deletedInvitations?.length ?? 0,
      teamAnalysesDeleted: deletedTeamAnalyses?.length ?? 0,
    };
  });
