/**
 * Indicateurs de viralité calculés à partir des données brutes de /api/stats.
 *
 * Deux mécanismes de propagation coexistent et sont fusionnés ici :
 *  - l'invitation nommée      → invitations.inviter_result_id → invitations.result_id
 *  - le partage de lien brut  → results.referred_by (paramètre ?ref=)
 */

export type StatsInvitation = {
  id: string;
  created_at: string;
  status: string | null;
  inviter_user_id: string | null;
  inviter_result_id: string | null;
  result_id: string | null;
};

export type StatsResult = {
  id: string;
  created_at: string;
  referred_by: string | null;
};

export type StatsPayload = {
  users: { created_at: string }[];
  invitations: StatsInvitation[];
  results: StatsResult[];
  teamAnalyses: { id: string; created_at: string; creator_user_id: string | null }[];
  shareEvents: { id: string; created_at: string }[];
  binomeInfoClicks: { id: string; created_at: string }[];
  duoReportsGenerated: { id: string; created_at: string }[];
};

export const EMPTY_STATS: StatsPayload = {
  users: [],
  invitations: [],
  results: [],
  teamAnalyses: [],
  shareEvents: [],
  binomeInfoClicks: [],
  duoReportsGenerated: [],
};

export async function loadStats(): Promise<StatsPayload> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Réponse illisible du serveur (HTTP ${res.status}).`);
  }
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || `Erreur serveur (HTTP ${res.status}).`);
  }
  return {
    users: body.users ?? [],
    invitations: body.invitations ?? [],
    results: body.results ?? [],
    teamAnalyses: body.teamAnalyses ?? [],
    shareEvents: body.shareEvents ?? [],
    binomeInfoClicks: body.binomeInfoClicks ?? [],
    duoReportsGenerated: body.duoReportsGenerated ?? [],
  };
}

/**
 * Associe chaque résultat au résultat de la personne qui l'a fait venir,
 * quel que soit le canal. Calculé sur l'historique complet : le parrain d'un
 * résultat récent peut dater d'avant la période observée.
 */
export function buildParentMap(payload: StatsPayload): Map<string, string> {
  const parent = new Map<string, string>();
  payload.results.forEach((r) => {
    if (r.referred_by) parent.set(r.id, r.referred_by);
  });
  payload.invitations.forEach((inv) => {
    if (inv.result_id && inv.inviter_result_id) parent.set(inv.result_id, inv.inviter_result_id);
  });
  return parent;
}

export type Virality = {
  completed: number;
  invitationsSent: number;
  invitationsAccepted: number;
  acceptanceRate: number;
  invitationsPerParticipant: number;
  k: number;
  distinctInviters: number;
  secondGeneration: number;
  shares: number;
  binomeInfoClicks: number;
  duoReportsGenerated: number;
  arrivalsFromLink: number;
  teamAnalyses: number;
  accounts: number;
};

const inRange = (iso: string, since: Date) => new Date(iso) >= since;

export function computeVirality(
  payload: StatsPayload,
  since: Date,
  parent: Map<string, string>,
): Virality {
  const results = payload.results.filter((r) => inRange(r.created_at, since));
  const invitations = payload.invitations.filter((i) => inRange(i.created_at, since));
  const accepted = invitations.filter((i) => i.status === "completed");

  const inviters = new Set(
    invitations
      .map((i) => i.inviter_user_id ?? i.inviter_result_id)
      .filter((v): v is string => Boolean(v)),
  );

  // Génération 2+ : le parrain de ce résultat a lui-même un parrain.
  const secondGeneration = results.filter((r) => {
    const p = parent.get(r.id);
    return Boolean(p && parent.has(p));
  }).length;

  const completed = results.length;
  const invitationsSent = invitations.length;
  const acceptanceRate = invitationsSent > 0 ? accepted.length / invitationsSent : 0;
  const invitationsPerParticipant = completed > 0 ? invitationsSent / completed : 0;

  return {
    completed,
    invitationsSent,
    invitationsAccepted: accepted.length,
    acceptanceRate,
    invitationsPerParticipant,
    k: invitationsPerParticipant * acceptanceRate,
    distinctInviters: inviters.size,
    secondGeneration,
    shares: payload.shareEvents.filter((s) => inRange(s.created_at, since)).length,
    binomeInfoClicks: payload.binomeInfoClicks.filter((c) => inRange(c.created_at, since)).length,
    duoReportsGenerated: payload.duoReportsGenerated.filter((d) => inRange(d.created_at, since))
      .length,
    arrivalsFromLink: results.filter((r) => Boolean(r.referred_by)).length,
    teamAnalyses: payload.teamAnalyses.filter((t) => inRange(t.created_at, since)).length,
    accounts: payload.users.filter((u) => inRange(u.created_at, since)).length,
  };
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)} %`;
}

/** Lecture du coefficient viral : en dessous de 1, la propagation s'éteint. */
export function kVerdict(k: number): { label: string; tone: "off" | "low" | "near" | "viral" } {
  if (k <= 0) return { label: "Aucune propagation", tone: "off" };
  if (k < 0.5) return { label: "Propagation qui s'éteint", tone: "low" };
  if (k < 1) return { label: "Propagation qui ralentit", tone: "near" };
  return { label: "Propagation auto-entretenue", tone: "viral" };
}
