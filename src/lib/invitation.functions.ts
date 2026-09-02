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
    (input: { inviterUserId: string; inviterResultId: string; inviteeName?: string; inviteeEmail?: string }) =>
      z
        .object({
          inviterUserId: z.string().uuid(),
          inviterResultId: z.string().uuid(),
          inviteeName: z.string().max(120).optional(),
          inviteeEmail: z.string().max(200).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .insert({
        inviter_user_id: data.inviterUserId,
        inviter_result_id: data.inviterResultId,
        invitee_name: data.inviteeName || null,
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
      .select("id, token, invitee_name, invitee_email, status, result_id, created_at, reminded_at")
      .eq("inviter_user_id", data.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (invitations ?? []) as Array<{
      id: string;
      token: string;
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

/** Update scores for a result linked to an invitation */
export const updateResultScores = createServerFn({ method: "POST" })
  .inputValidator((input: { resultId: string; scores: Record<string, number> }) =>
    z.object({ resultId: z.string().uuid(), scores: scoresSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("results")
      .update({ scores: data.scores } as Record<string, unknown>)
      .eq("id", data.resultId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Résultat introuvable.");
    return { ok: true };
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
