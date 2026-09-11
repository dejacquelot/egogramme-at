/**
 * Les erreurs remontées par Supabase ne sont pas des instances d'`Error` mais
 * des objets simples ({ message, details, hint, code }). Les sérialiser avec
 * `String(e)` produit « [object Object] » et masque totalement la cause.
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [o.message, o.details, o.hint].filter(Boolean);
    if (parts.length) {
      return parts.join(" — ") + (o.code ? ` (${o.code})` : "");
    }
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
