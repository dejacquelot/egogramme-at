/**
 * Parsing du bloc `:::pae` inséré par l'IA dans la section « Équilibre Parent / Adulte / Enfant ».
 *
 * Le bloc ne contient que les scores bruts par état du moi ; les totaux Parent / Adulte / Enfant
 * sont TOUJOURS recalculés ici. L'IA ne peut donc ni se tromper dans l'addition, ni casser la
 * mise en page en dessinant un schéma à la main.
 *
 * Format attendu (ordre et séparateurs libres) :
 *   :::pae
 *   PN: 6 | PNo: 5 | A: 8 | EL: 10 | EAS: 6 | EAR: 6
 *   :::
 */

export type PaePart = { short: string; label: string; value: number };

export type PaeInstance = {
  key: "parent" | "adulte" | "enfant";
  label: string;
  total: number;
  max: number;
  color: string;
  parts: PaePart[];
};

const ALIASES: Record<string, string> = {
  PNo: "PNo",
  PNf: "PNo",
  PNr: "PN",
  PN: "PN",
  A: "A",
  EL: "EL",
  EAS: "EAS",
  EAR: "EAR",
};

const PART_LABELS: Record<string, { short: string; label: string }> = {
  PN: { short: "PNr", label: "Parent Nourricier" },
  PNo: { short: "PNf", label: "Parent Normatif" },
  A: { short: "A", label: "Adulte" },
  EL: { short: "EL", label: "Enfant Libre" },
  EAS: { short: "EAS", label: "Enfant Adapté Soumis" },
  EAR: { short: "EAR", label: "Enfant Adapté Rebelle" },
};

const GROUPS: { key: PaeInstance["key"]; label: string; color: string; keys: string[] }[] = [
  { key: "parent", label: "Parent", color: "#d97706", keys: ["PN", "PNo"] },
  { key: "adulte", label: "Adulte", color: "#2563eb", keys: ["A"] },
  { key: "enfant", label: "Enfant", color: "#16a34a", keys: ["EL", "EAS", "EAR"] },
];

export function parsePaeBlock(block: string): PaeInstance[] | null {
  const found: Record<string, number> = {};
  const re = /\b(PNo|PNf|PNr|PN|EAS|EAR|EL|A)\s*[:=]\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const key = ALIASES[m[1]];
    if (key && found[key] === undefined) found[key] = Math.min(10, Math.max(0, Number(m[2])));
  }
  if (Object.keys(found).length === 0) return null;

  return GROUPS.map((g) => {
    const parts = g.keys
      .filter((k) => found[k] !== undefined)
      .map((k) => ({ short: PART_LABELS[k].short, label: PART_LABELS[k].label, value: found[k] }));
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
