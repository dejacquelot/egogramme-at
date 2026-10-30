import { apelScores, type ApelSession } from "./apel-session";

const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Remplace chaque prénom saisi par la fonction de la personne. */
export function anonymizeText(text: string, people: { name: string; role: string }[]): string {
  let out = text;
  const sorted = [...people]
    .filter((p) => p.name.trim().length >= 2)
    .sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    out = out.replace(
      new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(p.name.trim())}(?![\\p{L}\\p{N}])`, "giu"),
      p.role,
    );
  }
  return out;
}

export function anonymizeApelSession(s: ApelSession) {
  const present = s.members.filter((m) => m.present);
  const people = present.map((m) => ({ name: m.name, role: m.role }));
  const clean = (t?: string) => (t ? anonymizeText(t, people) : null);
  return {
    client_key: s.completedAt ?? "",
    present_count: present.length,
    members: present.map((m) => ({
      role: m.role,
      scores: apelScores(m.answers),
      report: clean(m.report),
    })),
    collective: clean(s.collective),
    agreements: [],
  };
}
