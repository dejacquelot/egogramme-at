import { z } from "zod";
import { apelSessionSchema, newApelMember, newApelSession, type ApelMember } from "./apel-session";

export const SCOUT_MAX = 20;
export const SCOUT_STORAGE_KEY = "egogramme_scout_v1";
export const scoutChiefs = (members: ApelMember[]) =>
  members.filter((member) => member.present && member.role === "Chef");

export function newScoutSession() {
  return {
    ...newApelSession(),
    members: Array.from({ length: 8 }, (_, i) => ({
      ...newApelMember(i < 4 ? "Chef" : "Parent", `scout-${i}`),
      present: i < 4,
    })),
  };
}

export const scoutSessionSchema = apelSessionSchema.superRefine((s, ctx) => {
  if (s.members.some((m) => !["Chef", "Parent"].includes(m.role)) ||
      (s.step !== "participants" && scoutChiefs(s.members).length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La séance nécessite deux chefs de la même maîtrise." });
  }
});
