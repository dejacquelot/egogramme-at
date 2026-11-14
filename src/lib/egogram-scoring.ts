import { QUESTION_MAPPING } from "./question-mapping";
import type { ReportScores } from "./team-report";

export function egogramScores(answers: readonly (boolean | null)[]): ReportScores {
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
