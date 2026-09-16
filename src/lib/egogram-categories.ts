/**
 * Les six états du moi de l'Analyse Transactionnelle.
 * Partagés entre la page Test et la carte de l'égogramme.
 */
export type CategoryKey =
  | "PNr"
  | "PNf"
  | "A"
  | "EL"
  | "EAS"
  | "EAR";

export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  short: string;
  color: string;
  description: string;
}[] = [
  {
    key: "PNr",
    label: "Parent Nourricier",
    short: "PNr",
    color: "oklch(0.72 0.15 30)",
    description: "Bienveillant, protecteur, encourageant.",
  },
  {
    key: "PNf",
    label: "Parent Normatif",
    short: "PNf",
    color: "oklch(0.6 0.15 60)",
    description: "Cadre, règles, autorité, transmission de valeurs.",
  },
  {
    key: "A",
    label: "Adulte",
    short: "A",
    color: "oklch(0.55 0.15 250)",
    description: "Rationnel, objectif, analytique, factuel.",
  },
  {
    key: "EL",
    label: "Enfant Libre",
    short: "EL",
    color: "oklch(0.7 0.17 140)",
    description: "Spontané, créatif, expressif, joueur.",
  },
  {
    key: "EAS",
    label: "Enfant Adapté Soumis",
    short: "EAS",
    color: "oklch(0.6 0.13 310)",
    description: "Conforme, poli, s'adapte aux attentes.",
  },
  {
    key: "EAR",
    label: "Enfant Adapté Rebelle",
    short: "EAR",
    color: "oklch(0.6 0.2 20)",
    description: "Oppositionnel, provocateur, contestataire.",
  },
];

