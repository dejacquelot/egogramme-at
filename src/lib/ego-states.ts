/**
 * Vocabulaire unique des six états du moi.
 *
 * Les clés canoniques sont celles affichées à l'écran : PNr, PNf, A, EL, EAS, EAR.
 *
 * Historique : les résultats déjà enregistrés en base utilisent les anciennes clés
 * `PN` (Parent Nourricier) et `PNo` (Parent Normatif). `normalizeScores` accepte les
 * deux jeux de clés, ce qui évite toute migration de données : un ancien résultat et
 * un nouveau produisent exactement le même objet en sortie.
 *
 * Attention au piège : `PNo` désigne le Parent NORMATIF, alors que la lecture spontanée
 * suggère « Parent NOurricier ». C'est précisément pour lever cette ambiguïté que les
 * clés canoniques sont désormais PNr / PNf.
 */

export type EgoStateKey = "PNr" | "PNf" | "A" | "EL" | "EAS" | "EAR";

export type EgoScores = Record<EgoStateKey, number>;

export const EGO_STATE_KEYS: EgoStateKey[] = ["PNr", "PNf", "A", "EL", "EAS", "EAR"];

/** Libellé complet, seule forme autorisée dans les textes rédigés. */
export const EGO_STATE_LABELS: Record<EgoStateKey, string> = {
  PNr: "Parent Nourricier",
  PNf: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};

/** Anciennes clés de stockage → clé canonique. */
const LEGACY_KEYS: Record<string, EgoStateKey> = {
  PN: "PNr",
  PNo: "PNf",
  PNr: "PNr",
  PNf: "PNf",
  A: "A",
  EL: "EL",
  EAS: "EAS",
  EAR: "EAR",
};

/** Clé canonique correspondant à une clé quelconque, ou `null` si inconnue. */
export function resolveEgoKey(key: string): EgoStateKey | null {
  return LEGACY_KEYS[key] ?? null;
}

/**
 * Ramène n'importe quel objet de scores (ancien ou nouveau format) sur les clés
 * canoniques. Les valeurs sont bornées à l'intervalle 0-10 ; une clé absente vaut 0.
 */
export function normalizeScores(raw: Record<string, unknown> | null | undefined): EgoScores {
  const out = { PNr: 0, PNf: 0, A: 0, EL: 0, EAS: 0, EAR: 0 } as EgoScores;
  if (!raw) return out;

  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const key = LEGACY_KEYS[rawKey];
    if (!key) continue;
    const n = Number(rawValue);
    if (!Number.isFinite(n)) continue;
    out[key] = Math.min(10, Math.max(0, Math.round(n)));
  }
  return out;
}

/**
 * Remplace, dans un texte, toute abréviation d'état du moi par son libellé complet.
 *
 * Sert de garde-fou sur les analyses déjà enregistrées en base, rédigées avant que le
 * prompt n'interdise les abréviations. Deux précautions :
 *  - `PNo` est traité en premier, sinon `PN` capturerait son préfixe ;
 *  - une abréviation déjà suivie de son libellé n'est pas dupliquée.
 */
export function expandEgoStateAbbreviations(text: string): string {
  if (!text) return text;

  const ORDERED: [string, EgoStateKey][] = [
    ["PNo", "PNf"],
    ["PNf", "PNf"],
    ["PNr", "PNr"],
    ["PN", "PNr"],
    ["EAS", "EAS"],
    ["EAR", "EAR"],
    ["EL", "EL"],
  ];

  let out = text;
  for (const [abbrev, key] of ORDERED) {
    const label = EGO_STATE_LABELS[key];
    // (?![\wÀ-ÿ]) : ne coupe pas un mot plus long (PNormatif, ELearning…).
    // (?!\s*\() et (?!\s*:) : laisse intacts les blocs :::pae et les légendes de graphique.
    const re = new RegExp(`\\b${abbrev}(?![\\wÀ-ÿ])(?!\\s*[:(])`, "g");
    out = out.replace(re, (match, offset: number, full: string) => {
      const after = full.slice(offset + match.length, offset + match.length + label.length + 4);
      return after.includes(label) ? match : label;
    });
  }
  return out;
}
