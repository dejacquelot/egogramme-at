/**
 * Client de la bibliothèque d'analyses.
 *
 * Passe par la route API `/api/analysis/library` (fetch JSON classique) plutôt
 * que par les server functions TanStack, dont la couche de transport
 * `/_serverFn/*` s'est révélée non fiable en production.
 */

export type LibraryRow = {
  id: string;
  team_name: string;
  member_ids: string[];
  member_names: string[];
  analysis: string;
  created_at: string;
  creator_user_id?: string | null;
  kind?: "individual" | "collective" | null;
  pdf_url?: string | null;
  image_url?: string | null;
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/analysis/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Réponse illisible du serveur (HTTP ${res.status}).`);
  }
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Erreur serveur (HTTP ${res.status}).`);
  }
  return json as T;
}

export const libraryApi = {
  async list(userId: string): Promise<LibraryRow[]> {
    const r = await call<{ rows: LibraryRow[] }>({ action: "list", userId });
    return r.rows ?? [];
  },

  async save(input: {
    userId: string;
    ids: string[];
    analysis: string;
    teamName?: string;
    kind?: "individual" | "collective";
  }): Promise<LibraryRow> {
    const r = await call<{ row: LibraryRow }>({ action: "save", ...input });
    if (!r.row?.id) throw new Error("La base n'a renvoyé aucun identifiant.");
    return r.row;
  },

  async remove(userId: string, analysisId: string): Promise<void> {
    await call({ action: "delete", userId, analysisId });
  },

  async rename(userId: string, analysisId: string, title: string): Promise<void> {
    await call({ action: "rename", userId, analysisId, title });
  },
};
