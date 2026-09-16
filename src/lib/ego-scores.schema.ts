import { z } from "zod";
import { EGO_STATE_KEYS, normalizeScores, resolveEgoKey, type EgoScores } from "@/lib/ego-states";

/**
 * Schéma de validation des scores d'un égogramme.
 *
 * Accepte indifféremment les clés canoniques (PNr, PNf) et les anciennes clés encore
 * présentes en base (PN, PNo), et renvoie toujours un objet aux clés canoniques.
 * Les six états doivent être fournis, chacun entre 0 et 10.
 */
export const egoScoresSchema = z
  .record(z.string(), z.unknown())
  .superRefine((raw, ctx) => {
    const seen = new Set<string>();

    for (const [key, value] of Object.entries(raw)) {
      const canonical = resolveEgoKey(key);
      if (!canonical) continue;
      if (seen.has(canonical)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `État du moi fourni deux fois : ${canonical}`,
        });
        continue;
      }
      seen.add(canonical);

      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Score invalide pour ${canonical} : attendu un entier entre 0 et 10`,
        });
      }
    }

    const missing = EGO_STATE_KEYS.filter((k) => !seen.has(k));
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `États du moi manquants : ${missing.join(", ")}`,
      });
    }
  })
  .transform((raw): EgoScores => normalizeScores(raw as Record<string, unknown>));
