import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";
import { errorMessage } from "@/lib/api-error";

const SALT = "egogramme-josien-v1-static-salt";

/** Plafond de créations anonymes par empreinte IP sur 24 h. */
const MAX_PER_DAY = 20;

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}

function hashIp(ip: string): string {
  return createHash("sha256").update(SALT + "|" + ip).digest("hex");
}

/**
 * Les erreurs Supabase ne sont pas des `Error` mais des objets simples
 * ({ message, details, hint, code }). `String(e)` produisait « [object Object] »,
 * ce qui masquait complètement la cause réelle. Voir `@/lib/api-error`.
 */

const createSchema = z.object({
  inviterResultId: z.string().uuid(),
  inviteeFirstName: z.string().trim().min(1).max(120),
  inviteeLastName: z.string().trim().max(120).optional(),
  notifyEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/public/invite")({
  server: {
    handlers: {
      /** Crée une invitation sans exiger de compte. */
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const input = createSchema.parse(body);
          const ipHash = hashIp(getClientIp(request));
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          // Le résultat de l'inviteur doit exister : il sert d'ancrage à
          // l'invitation en l'absence de compte.
          const { data: origin, error: originError } = await supabaseAdmin
            .from("results")
            .select("id")
            .eq("id", input.inviterResultId)
            .maybeSingle();
          if (originError) throw originError;
          if (!origin) {
            return Response.json(
              { ok: false, error: "Résultat introuvable." },
              { status: 404 },
            );
          }

          // Garde anti-abus. Si la colonne `created_ip_hash` n'existe pas
          // encore, on n'échoue pas : la limite est simplement inactive.
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count, error: countError } = await supabaseAdmin
            .from("invitations")
            .select("id", { count: "exact", head: true })
            .eq("created_ip_hash", ipHash)
            .gte("created_at", since);
          if (!countError && (count ?? 0) >= MAX_PER_DAY) {
            return Response.json(
              {
                ok: false,
                error:
                  "Vous avez atteint la limite d'invitations pour aujourd'hui. Réessayez demain.",
              },
              { status: 429 },
            );
          }

          const firstName = input.inviteeFirstName.trim();
          const lastName = input.inviteeLastName?.trim() || null;
          const insertData: Record<string, unknown> = {
            inviter_user_id: null,
            inviter_result_id: input.inviterResultId,
            invitee_first_name: firstName,
            invitee_last_name: lastName,
            invitee_name: [firstName, lastName].filter(Boolean).join(" "),
            created_ip_hash: ipHash,
          };
          if (input.notifyEmail) insertData.notify_email = input.notifyEmail;

          let { data, error } = await supabaseAdmin
            .from("invitations")
            .insert(insertData)
            .select("id, token")
            .single();

          // Retente sans les colonnes ajoutées par la migration, au cas où
          // celle-ci n'aurait pas encore été appliquée en production.
          if (error) {
            const {
              created_ip_hash: _ip,
              notify_email: _mail,
              ...fallback
            } = insertData;
            const retry = await supabaseAdmin
              .from("invitations")
              .insert(fallback)
              .select("id, token")
              .single();
            data = retry.data;
            error = retry.error;
          }
          if (error) throw error;
          if (!data) throw new Error("Invitation non créée.");

          return Response.json({ ok: true, id: data.id, token: data.token });
        } catch (e) {
          const msg = errorMessage(e);
          console.error("invite create error", msg);
          // Cas typique : la migration des invitations anonymes n'a pas été
          // appliquée, `inviter_user_id` est encore NOT NULL.
          const notMigrated =
            /inviter_user_id/.test(msg) &&
            /null|not-null|violates/i.test(msg);
          if (notMigrated) {
            return Response.json(
              {
                ok: false,
                error:
                  "Le partage sans compte n'est pas encore activé sur le serveur.",
                detail: msg,
                hint: "Appliquer la migration 20260911120000_anonymous_invitations.sql",
              },
              { status: 503 },
            );
          }
          return Response.json({ ok: false, error: msg }, { status: 400 });
        }
      },

      /** État des invitations émises depuis un résultat, sans compte requis. */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const resultId = z
            .string()
            .uuid()
            .parse(url.searchParams.get("resultId"));
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data, error } = await supabaseAdmin
            .from("invitations")
            .select(
              "id, token, invitee_first_name, invitee_name, status, result_id, created_at",
            )
            .eq("inviter_result_id", resultId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return Response.json({ ok: true, invitations: data ?? [] });
        } catch (e) {
          const msg = errorMessage(e);
          return Response.json({ ok: false, error: msg }, { status: 400 });
        }
      },
    },
  },
});
