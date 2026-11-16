import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin-config";
import { orientationEventRowSchema } from "@/lib/orientation-stats";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/admin/orientation-stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
        if (!bearer) return json({ error: "Non connecté." }, 401);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(bearer[1]);
          if (authError || !auth.user) return json({ error: "Session invalide." }, 401);
          if (!isAdminEmail(auth.user.email)) return json({ error: "Accès refusé." }, 403);

          const since = z
            .string()
            .datetime({ offset: true })
            .safeParse(new URL(request.url).searchParams.get("since"));
          const until = new Date().toISOString();
          if (
            !since.success ||
            new Date(since.data).getTime() > new Date(until).getTime() ||
            new Date(since.data).getTime() < new Date(until).getTime() - 6 * 366 * 86400_000
          ) {
            return json({ error: "Période invalide." }, 400);
          }

          const { count, error: countError } = await supabaseAdmin
            .from("orientation_events")
            .select("id", { head: true, count: "exact" })
            .eq("kind", "pdf_downloaded")
            .lte("created_at", until);
          if (countError) throw countError;
          if (count == null) throw new Error("Compteur PDF absent.");

          const events: z.infer<typeof orientationEventRowSchema>[] = [];
          const pageSize = 1000;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseAdmin
              .from("orientation_events")
              .select("id,journey_id,kind,block,attempt_id,duration_ms,created_at")
              .gte("created_at", since.data)
              .lte("created_at", until)
              .order("created_at")
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            const page = z.array(orientationEventRowSchema).parse(data);
            events.push(...page);
            if (page.length < pageSize) break;
            if (events.length >= 100_000) {
              return json(
                { error: "Période trop volumineuse. Choisissez une période plus courte." },
                422,
              );
            }
          }
          return json({ events, pdfAllTime: count, until });
        } catch (failure) {
          console.error("admin orientation statistics unavailable", failure);
          return json(
            {
              error:
                "Statistiques Orientation indisponibles. Vérifiez la connexion à Supabase et l'application de la migration 20261115090000_orientation_events.sql.",
            },
            503,
          );
        }
      },
    },
  },
});
