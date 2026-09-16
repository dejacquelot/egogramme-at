/**
 * Parsing du bloc `:::pae` inséré par l'IA dans la section « Équilibre Parent / Adulte / Enfant ».
 *
 * Le bloc ne contient que les scores bruts par état du moi ; les totaux Parent / Adulte / Enfant
 * sont TOUJOURS recalculés ici. L'IA ne peut donc ni se tromper dans l'addition, ni casser la
 * mise en page en dessinant un schéma à la main.
 *
 * Format attendu (ordre et séparateurs libres), en libellés complets :
 *   :::pae
 *   Parent Nourricier: 6 | Parent Normatif: 5 | Adulte: 8 | Enfant Libre: 10 | ...
 *   :::
 *
 * Les abréviations (PNr/PNf, et les anciennes clés PN/PNo) restent acceptées pour que
 * les analyses déjà enregistrées en base continuent de s'afficher correctement.
 */

import { EGO_STATE_LABELS, type EgoStateKey } from "@/lib/ego-states";

export type PaePart = { short: string; label: string; value: number };

export type PaeInstance = {
  key: "parent" | "adulte" | "enfant";
  label: string;
  total: number;
  max: number;
  color: string;
  parts: PaePart[];
};

const PART_LABELS: Record<EgoStateKey, { short: string; label: string }> = {
  PNr: { short: "PNr", label: EGO_STATE_LABELS.PNr },
  PNf: { short: "PNf", label: EGO_STATE_LABELS.PNf },
  A: { short: "A", label: EGO_STATE_LABELS.A },
  EL: { short: "EL", label: EGO_STATE_LABELS.EL },
  EAS: { short: "EAS", label: EGO_STATE_LABELS.EAS },
  EAR: { short: "EAR", label: EGO_STATE_LABELS.EAR },
};

/**
 * Motifs reconnus, du plus spécifique au plus général.
 * L'ordre est critique : « Parent Nourricier » doit être testé avant « PN », et
 * « Enfant Adapté Soumis » avant « Enfant Libre », sinon un préfixe capturerait la suite.
 */
const PATTERNS: { pattern: string; key: EgoStateKey }[] = [
  { pattern: "Parent Nourricier", key: "PNr" },
  { pattern: "Parent Normatif", key: "PNf" },
  { pattern: "Enfant Adapté Soumis", key: "EAS" },
  { pattern: "Enfant Adapte Soumis", key: "EAS" },
  { pattern: "Enfant Adapté Rebelle", key: "EAR" },
  { pattern: "Enfant Adapte Rebelle", key: "EAR" },
  { pattern: "Enfant Libre", key: "EL" },
  { pattern: "Adulte", key: "A" },
  { pattern: "PNo", key: "PNf" },
  { pattern: "PNf", key: "PNf" },
  { pattern: "PNr", key: "PNr" },
  { pattern: "PN", key: "PNr" },
  { pattern: "EAS", key: "EAS" },
  { pattern: "EAR", key: "EAR" },
  { pattern: "EL", key: "EL" },
  { pattern: "A", key: "A" },
];

const GROUPS: { key: PaeInstance["key"]; label: string; color: string; keys: EgoStateKey[] }[] = [
  { key: "parent", label: "Parent", color: "#d97706", keys: ["PNr", "PNf"] },
  { key: "adulte", label: "Adulte", color: "#2563eb", keys: ["A"] },
  { key: "enfant", label: "Enfant", color: "#16a34a", keys: ["EL", "EAS", "EAR"] },
];

export function parsePaeBlock(block: string): PaeInstance[] | null {
  const found: Partial<Record<EgoStateKey, number>> = {};
  const alternatives = PATTERNS.map((p) => p.pattern).join("|");
  const re = new RegExp(`(?:^|[^\\wÀ-ÿ])(${alternatives})\\s*[:=]\\s*(\\d+)`, "gi");

  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const matched = m[1].toLowerCase();
    const entry = PATTERNS.find((p) => p.pattern.toLowerCase() === matched);
    if (!entry || found[entry.key] !== undefined) continue;
    found[entry.key] = Math.min(10, Math.max(0, Number(m[2])));
    // Un chevauchement est possible (« Parent Nourricier: 6 » suivi de « | Parent... »),
    // on repart juste après la valeur lue.
    re.lastIndex = m.index + m[0].length;
  }
  if (Object.keys(found).length === 0) return null;

  return GROUPS.map((g) => {
    const parts = g.keys
      .filter((k) => found[k] !== undefined)
      .map((k) => ({ short: PART_LABELS[k].short, label: PART_LABELS[k].label, value: found[k]! }));
    return {
      key: g.key,
      label: g.label,
      color: g.color,
      max: g.keys.length * 10,
      total: parts.reduce((s, p) => s + p.value, 0),
      parts,
    };
  }).filter((g) => g.parts.length > 0);
}
