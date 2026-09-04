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

/** Fetch results by IDs (for report generation) */
export const getResultsByIds = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("results")
      .select("id, scores, first_name, last_name, created_at")
      .in("id", data.ids);
    if (error) throw error;
    return (rows ?? []) as Array<{
      id: string;
      scores: Record<string, number>;
      first_name: string | null;
      last_name: string | null;
      created_at: string;
    }>;
  });

/** Link a result to an authenticated user */
export const linkResultToUser = createServerFn({ method: "POST" })
  .inputValidator((input: { resultId: string; userId: string }) =>
    z.object({ resultId: z.string().uuid(), userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("results")
      .update({ user_id: data.userId } as Record<string, unknown>)
      .eq("id", data.resultId);
    if (error) throw error;
    return { ok: true };
  });

/** Create an invitation */
export const createInvitation = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { inviterUserId: string; inviterResultId: string; inviteeFirstName?: string; inviteeLastName?: string; inviteeName?: string; inviteeEmail?: string }) =>
      z
        .object({
          inviterUserId: z.string().uuid(),
          inviterResultId: z.string().uuid(),
          inviteeFirstName: z.string().max(120).optional(),
          inviteeLastName: z.string().max(120).optional(),
          inviteeName: z.string().max(240).optional(),
          inviteeEmail: z.string().max(200).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const firstName = data.inviteeFirstName?.trim() || null;
    const lastName = data.inviteeLastName?.trim() || null;
    const combined =
      data.inviteeName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      null;
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .insert({
        inviter_user_id: data.inviterUserId,
        inviter_result_id: data.inviterResultId,
        invitee_first_name: firstName,
        invitee_last_name: lastName,
        invitee_name: combined,
        invitee_email: data.inviteeEmail || null,
      } as Record<string, unknown>)
      .select("id, token")
      .single();
    if (error) throw error;
    return inv as { id: string; token: string };
  });

/** List invitations for a user */
export const listMyInvitations = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitations, error } = await supabaseAdmin
      .from("invitations")
      .select("id, token, invitee_first_name, invitee_last_name, invitee_name, invitee_email, status, result_id, created_at, reminded_at")
      .eq("inviter_user_id", data.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (invitations ?? []) as Array<{
      id: string;
      token: string;
      invitee_first_name: string | null;
      invitee_last_name: string | null;
      invitee_name: string | null;
      invitee_email: string | null;
      status: string;
      result_id: string | null;
      created_at: string;
      reminded_at: string | null;
    }>;
  });

/** Get user's own result */
export const getMyResult = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin
      .from("results")
      .select("id, scores, first_name, last_name, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return result as { id: string; scores: Record<string, number>; first_name: string | null; last_name: string | null; created_at: string } | null;
  });

/** Create or update provisional scores for an invitation that has not been answered yet */
export const saveInvitationScores = createServerFn({ method: "POST" })
  .inputValidator((input: { invitationId: string; scores: Record<string, number> }) =>
    z.object({ invitationId: z.string().uuid(), scores: scoresSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select("id, invitee_first_name, invitee_last_name, invitee_name, status, result_id")
      .eq("id", data.invitationId)
      .maybeSingle();
    if (invitationError) throw invitationError;
    if (!invitation) throw new Error("Invitation introuvable.");
    if (invitation.status === "completed") {
      throw new Error("Cette invitation a déjà été répondue et n'est plus éditable.");
    }

    if (invitation.result_id) {
      const { data: updated, error } = await supabaseAdmin
        .from("results")
        .update({ scores: data.scores } as Record<string, unknown>)
        .eq("id", invitation.result_id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("Résultat introuvable.");
      return { ok: true, resultId: updated.id as string };
    }

    // Prefer the dedicated first/last columns; fall back to splitting the
    // legacy single-field name on whitespace for older invitations.
    let firstName = (invitation.invitee_first_name as string | null)?.trim() || "";
    let lastName = (invitation.invitee_last_name as string | null)?.trim() || "";
    if (!firstName && !lastName) {
      const parts = String(invitation.invitee_name ?? "").trim().split(/\s+/).filter(Boolean);
      firstName = parts[0] ?? "";
      lastName = parts.slice(1).join(" ");
    }
    const insertData: Record<string, unknown> = {
      ip_hash: `manual-invitation-${data.invitationId}`,
      scores: data.scores,
      first_name: firstName || null,
      last_name: lastName || null,
    };
    const { data: result, error: insertError } = await supabaseAdmin
      .from("results")
      .insert(insertData)
      .select("id")
      .single();
    if (insertError) throw insertError;

    const { data: linkedInvitation, error: updateInvitationError } = await supabaseAdmin
      .from("invitations")
      .update({ result_id: result.id } as Record<string, unknown>)
      .eq("id", data.invitationId)
      .neq("status", "completed")
      .select("id")
      .maybeSingle();
    if (updateInvitationError) throw updateInvitationError;
    if (!linkedInvitation) throw new Error("Cette invitation a déjà été répondue et n'est plus éditable.");
    return { ok: true, resultId: result.id as string };
  });

/** Update reminded_at */
export const remindInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { invitationId: string }) =>
    z.object({ invitationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invitations")
      .update({ reminded_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", data.invitationId);
    if (error) throw error;
    return { ok: true };
  });

/** Delete invitation */
export const deleteInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { invitationId: string }) =>
    z.object({ invitationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("id", data.invitationId);
    if (error) throw error;
    return { ok: true };
  });

export const updateInvitationName = createServerFn({ method: "POST" })
  .inputValidator((input: { invitationId: string; firstName: string; lastName: string }) =>
    z
      .object({
        invitationId: z.string().uuid(),
        firstName: z.string().trim().max(120),
        lastName: z.string().trim().max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const combined = [data.firstName, data.lastName].filter(Boolean).join(" ");
    const { data: updated, error } = await supabaseAdmin
      .from("invitations")
      .update({
        invitee_first_name: data.firstName || null,
        invitee_last_name: data.lastName || null,
        invitee_name: combined || null,
      } as Record<string, unknown>)
      .eq("id", data.invitationId);
      .select("id, invitee_first_name, invitee_last_name, invitee_name")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Invitation introuvable.");
    return {
      ok: true as const,
      invitee_first_name: updated.invitee_first_name as string | null,
      invitee_last_name: updated.invitee_last_name as string | null,
      invitee_name: updated.invitee_name as string | null,
    };
  });

/** Reset a deleted/completed invitation back to pending (e.g. when result was deleted) */
export const resetInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { invitationId: string }) =>
    z.object({ invitationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invitations")
      .update({ status: "pending", result_id: null, reminded_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", data.invitationId);
    if (error) throw error;
    return { ok: true };
  });

/** Complete invitation when invitee finishes test */
export const completeInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; resultId: string }) =>
    z.object({ token: z.string().min(1), resultId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invitations")
      .update({ status: "completed", result_id: data.resultId } as Record<string, unknown>)
      .eq("token", data.token)
      .eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });
