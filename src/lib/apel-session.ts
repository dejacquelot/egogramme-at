import { z } from "zod";
import { QUESTION_MAPPING } from "./question-mapping";
import type { ReportScores } from "./team-report";

export const APEL_STORAGE_KEY = "egogramme_apel_v1";
export const APEL_TOTAL = 60;
export const APEL_BLOCK = 10;
export const APEL_MAX_MEMBERS = 20;

const memberSchema = z.object({
  id: z.string().min(1).max(80),
  role: z.string().max(80),
  name: z.string().max(80),
  present: z.boolean(),
  answers: z.array(z.boolean().nullable()).length(APEL_TOTAL),
  report: z.string().optional(),
});

export const apelSessionSchema = z
  .object({
    version: z.literal(1),
    step: z.enum(["participants", "test", "pause", "reports", "agreements"]),
    members: z.array(memberSchema).min(1).max(APEL_MAX_MEMBERS),
    consent: z.boolean(),
    cur: z
      .number()
      .int()
      .min(0)
      .max(APEL_TOTAL - 1),
    completedAt: z.string().datetime().optional(),
    collective: z.string().optional(),
    agreements: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          text: z.string().max(2000),
          accepted: z.boolean(),
        }),
      )
      .length(3),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.members.map((m) => m.id)).size !== s.members.length) {
      ctx.addIssue({ code: "custom", message: "Identifiants de participants en double." });
    }
    if (s.step === "participants") return;
    const present = s.members.filter((m) => m.present);
    if (!s.consent || present.length < 2 || present.some((m) => !m.name.trim() || !m.role.trim())) {
      ctx.addIssue({ code: "custom", message: "Participants ou accord de partage incomplets." });
    }
    const answeredThrough = s.step === "test" ? s.cur : s.cur + 1;
    if (present.some((m) => m.answers.slice(0, answeredThrough).some((v) => v === null))) {
      ctx.addIssue({ code: "custom", message: "Des réponses précédentes manquent." });
    }
    if (s.step === "pause" && (s.cur + 1) % APEL_BLOCK !== 0) {
      ctx.addIssue({ code: "custom", message: "Position de pause invalide." });
    }
    if (s.step === "reports" || s.step === "agreements") {
      if (
        !s.completedAt ||
        s.cur !== APEL_TOTAL - 1 ||
        present.some((m) => m.answers.some((v) => v === null))
      ) {
        ctx.addIssue({ code: "custom", message: "Le questionnaire n'est pas terminé." });
      }
    }
  });

export type ApelSession = z.infer<typeof apelSessionSchema>;
export type ApelMember = ApelSession["members"][number];
export type ApelAnswers = ApelMember["answers"];

export const newApelMember = (role: string, id: string): ApelMember => ({
  id,
  role,
  name: "",
  present: false,
  answers: Array(APEL_TOTAL).fill(null),
});

export const newApelSession = (): ApelSession => ({
  version: 1,
  step: "participants",
  members: [
    "Président",
    "Trésorier",
    "Secrétaire",
    "Vice-président",
    "Vice-trésorier",
    "Secrétaire adjoint",
  ].map((role, i) => newApelMember(role, `member-${i}`)),
  consent: false,
  cur: 0,
  agreements: [
    {
      title: "Nos décisions",
      text: "Avant chaque décision importante, nous précisons qui décide et qui doit être consulté.",
      accepted: false,
    },
    {
      title: "Notre charge de travail",
      text: "Chacun peut signaler une surcharge. Nous cherchons ensemble comment répartir les tâches.",
      accepted: false,
    },
    {
      title: "Nos désaccords",
      text: "Nous parlons des faits et de nos besoins, sans juger la personne.",
      accepted: false,
    },
  ],
});

export function apelScores(answers: ApelAnswers): ReportScores {
  const score = (indexes: number[]) =>
    indexes.reduce((sum, index) => sum + (answers[index - 1] === true ? 1 : 0), 0);
  return {
    PNr: score(QUESTION_MAPPING.PNr),
    PNf: score(QUESTION_MAPPING.PNf),
    A: score(QUESTION_MAPPING.A),
    EL: score(QUESTION_MAPPING.EL),
    EAS: score(QUESTION_MAPPING.EAS),
    EAR: score(QUESTION_MAPPING.EAR),
  };
}

export function apelAverage(members: ApelMember[]): ReportScores {
  if (!members.length) throw new Error("Aucun participant pour calculer la moyenne.");
  const scores = members.map((m) => apelScores(m.answers));
  const mean = (key: keyof ReportScores) =>
    scores.reduce((sum, s) => sum + s[key], 0) / scores.length;
  return {
    PNr: mean("PNr"),
    PNf: mean("PNf"),
    A: mean("A"),
    EL: mean("EL"),
    EAS: mean("EAS"),
    EAR: mean("EAR"),
  };
}

export function nextApelQuestion(s: ApelSession): ApelSession {
  const present = s.members.filter((m) => m.present);
  if (s.step !== "test" || present.length < 2 || present.some((m) => m.answers[s.cur] === null)) {
    throw new Error("Chaque participant doit répondre avant de continuer.");
  }
  return (s.cur + 1) % APEL_BLOCK === 0 ? { ...s, step: "pause" } : { ...s, cur: s.cur + 1 };
}

export function continueApelPause(s: ApelSession): ApelSession {
  if (s.step !== "pause") throw new Error("Aucune pause en cours.");
  return s.cur === APEL_TOTAL - 1
    ? { ...s, step: "reports", completedAt: new Date().toISOString() }
    : { ...s, step: "test", cur: s.cur + 1 };
}

export const apelAnalysisSchema = z
  .object({
    mode: z.enum(["individual", "collective"]),
    consent: z.literal(true),
    members: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          role: z.string().trim().min(1).max(80),
          answers: z.array(z.boolean()).length(APEL_TOTAL),
        }),
      )
      .min(1)
      .max(APEL_MAX_MEMBERS),
  })
  .superRefine((v, ctx) => {
    if (
      (v.mode === "individual" && v.members.length !== 1) ||
      (v.mode === "collective" && v.members.length < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Nombre de participants incompatible avec ce rapport.",
      });
    }
  });
