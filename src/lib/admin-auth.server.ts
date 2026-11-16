import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminEmail } from "@/lib/admin-config";

/**
 * Vérifie côté serveur que la requête provient d'un administrateur connecté.
 * Le jeton est ajouté aux server functions par `attachSupabaseAuth` (src/start.ts).
 */
export async function assertAdminRequest(): Promise<string> {
  const bearer = getRequest()
    ?.headers.get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i);
  if (!bearer) throw new Error("Non connecté.");

  const { data, error } = await supabaseAdmin.auth.getUser(bearer[1]);
  if (error || !data.user) throw new Error("Session invalide.");

  const email = (data.user.email ?? "").trim().toLowerCase();
  if (!isAdminEmail(email)) throw new Error("Accès refusé.");
  return email;
}
