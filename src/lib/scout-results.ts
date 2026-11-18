import { z } from "zod";
import { apelScores, type ApelSession } from "./apel-session";

const score = z.number().int().min(0).max(10);
const scores = z.object({ PNr: score, PNf: score, A: score, EL: score, EAS: score, EAR: score }).strict();
export const scoutResultsSchema = z.object({
  id: z.string().uuid(),
  consent: z.literal(true),
  completed_at: z.string().datetime(),
  members: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    role: z.enum(["Chef", "Parent"]),
    scores,
  }).strict()).min(2).max(20).refine(ms => ms.filter(m => m.role === "Chef").length >= 2),
}).strict();

export type ScoutResults = z.infer<typeof scoutResultsSchema>;

export function scoutResults(s: ApelSession): ScoutResults {
  const present = s.members.filter(m => m.present);
  if (!s.consent || !s.scoutAdminId || !["reports", "agreements"].includes(s.step) ||
      present.some(m => m.answers.some(a => a === null))) {
    throw new Error("Seule une séance terminée et acceptée peut être enregistrée.");
  }
  return scoutResultsSchema.parse({
    id: s.scoutAdminId, consent: true, completed_at: s.completedAt,
    members: present.map(m => ({ name: m.name, role: m.role, scores: apelScores(m.answers) })),
  });
}

export function chiefMean(members: ScoutResults["members"], key: keyof z.infer<typeof scores>) {
  const chiefs = members.filter(m => m.role === "Chef");
  return chiefs.reduce((sum, m) => sum + m.scores[key], 0) / chiefs.length;
}
