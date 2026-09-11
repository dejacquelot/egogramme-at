import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return Response.json(body, { ...init, headers });
};

/**
 * Route API classique pour la bibliothèque d'analyses de Mon Espace.
 *
 * Elle double les server functions TanStack (`saveTeamAnalysis`,
 * `listMyTeamAnalyses`, ...) : ces dernières transitent par la couche
 * `/_serverFn/*` (sérialisation seroval), qui s'est révélée non fiable en
 * production. Les routes de fichier `/api/*` utilisent un simple `fetch`
 * JSON et sont donc beaucoup plus robustes.
 */

const saveSchema = z.object({
  action: z.literal("save"),
  // Optionnel : l'Administration enregistre des analyses sans propriétaire
  // (creator_user_id = null), donc invisibles dans la bibliothèque personnelle.
  userId: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).min(1).max(20),
  analysis: z.string().min(1),
  teamName: z.string().max(120).optional(),
  kind: z.enum(["individual", "collective"]).optional(),
});

const listSchema = z.object({
  action: z.literal("list"),
  userId: z.string().uuid(),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  userId: z.string().uuid(),
  analysisId: z.string().uuid(),
});

const renameSchema = z.object({
  action: z.literal("rename"),
  userId: z.string().uuid(),
  analysisId: z.string().uuid(),
  title: z.string().max(120),
});

const bodySchema = z.discriminatedUnion("action", [
  saveSchema,
  listSchema,
  deleteSchema,
  renameSchema,
]);

export const Route = createFileRoute("/api/analysis/library")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = bodySchema.parse(await request.json());
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (body.action === "list") {
            const { data, error } = await supabaseAdmin
              .from("team_analyses")
              .select("*")
              .eq("creator_user_id", body.userId)
              .order("created_at", { ascending: false })
              .limit(100);
            if (error) throw new Error(error.message);
            return json({ ok: true, rows: data ?? [] });
          }

          if (body.action === "delete") {
            const { error } = await supabaseAdmin
              .from("team_analyses")
              .delete()
              .eq("id", body.analysisId)
              .eq("creator_user_id", body.userId);
            if (error) throw new Error(error.message);
            return json({ ok: true });
          }

          if (body.action === "rename") {
            const { error } = await supabaseAdmin
              .from("team_analyses")
              .update({ team_name: body.title } as Record<string, unknown>)
              .eq("id", body.analysisId)
              .eq("creator_user_id", body.userId);
            if (error) throw new Error(error.message);
            return json({ ok: true });
          }

          // action === "save"
          const { data: memberRows } = await supabaseAdmin
            .from("results")
            .select("id, first_name, last_name")
            .in("id", body.ids);
          const memberNames = (memberRows ?? []).map(
            (r: any, i: number) =>
              [r.first_name, r.last_name].filter(Boolean).join(" ") || `Membre ${i + 1}`,
          );

          const payload: Record<string, unknown> = {
            team_name: body.teamName || "",
            member_ids: body.ids,
            member_names: memberNames,
            analysis: body.analysis,
            creator_user_id: body.userId ?? null,
            kind: body.kind ?? (body.ids.length > 1 ? "collective" : "individual"),
          };

          let { data: inserted, error } = await supabaseAdmin
            .from("team_analyses")
            .insert(payload as never)
            .select("*")
            .single();

          // Retente sans `kind` si la colonne n'existe pas encore
          if (error) {
            const { kind: _omit, ...withoutKind } = payload;
            const retry = await supabaseAdmin
              .from("team_analyses")
              .insert(withoutKind as never)
              .select("*")
              .single();
            inserted = retry.data;
            error = retry.error;
          }
          if (error) throw new Error(error.message);

          return json({ ok: true, row: inserted });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("analysis/library error", message);
          return json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
