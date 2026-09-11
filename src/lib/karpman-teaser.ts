/**
 * Amorce d'analyse duo calculée à partir du seul égogramme de l'utilisateur.
 *
 * Règle absolue : tout ce qui est produit ici est déductible des scores de la
 * personne. Ce qui dépend d'un second égogramme n'est jamais inventé — il est
 * explicitement désigné comme manquant.
 */

export type TeaserRole = "Persécuteur" | "Sauveur" | "Victime";

export type DuoTeaser = {
  /** Rôle que la personne occupe le plus facilement dans le triangle. */
  role: TeaserRole;
  icon: string;
  /** État du moi qui porte ce rôle. */
  driverLabel: string;
  driverScore: number;
  /** Constat, appuyé sur le score. */
  headline: string;
  /** Mécanique du triangle selon le profil d'en face. */
  mechanism: string;
  /** Ce qui reste indéterminable sans le second égogramme. */
  unknown: string;
  /** Lecture de l'Adulte : capacité à repérer le jeu et en sortir. */
  adult: string;
  /** Nuance liée à l'Enfant Adapté Rebelle, le cas échéant. */
  nuance: string | null;
};

const ROLE_ICON: Record<TeaserRole, string> = {
  "Persécuteur": "⚔️",
  "Sauveur": "🤲",
  "Victime": "😢",
};

export function buildDuoTeaser(scores: Record<string, number>): DuoTeaser {
  const pn = scores.PN ?? 0;
  const pno = scores.PNo ?? 0;
  const eas = scores.EAS ?? 0;
  const ear = scores.EAR ?? 0;
  const a = scores.A ?? 0;

  // Correspondance classique entre états du moi et rôles du triangle :
  // Parent Normatif → Persécuteur, Parent Nourricier → Sauveur,
  // Enfant Adapté Soumis → Victime.
  const candidates: Array<{ role: TeaserRole; label: string; score: number }> = [
    { role: "Persécuteur", label: "Parent Normatif", score: pn },
    { role: "Sauveur", label: "Parent Nourricier", score: pno },
    { role: "Victime", label: "Enfant Adapté Soumis", score: eas },
  ];
  const top = candidates.reduce((best, c) => (c.score > best.score ? c : best));

  let headline = "";
  let mechanism = "";
  let unknown = "";

  if (top.role === "Persécuteur") {
    headline =
      `Avec un Parent Normatif à ${pn}/10, vous prenez facilement la place du ` +
      `Persécuteur : vous rappelez le cadre, vous corrigez, vous attendez que ce soit fait correctement.`;
    mechanism =
      "Face à quelqu'un dont l'Enfant Adapté Soumis domine, le triangle se referme en quelques minutes : " +
      "il cède, vous insistez, il s'efface un peu plus. Face à un Enfant Adapté Rebelle, c'est l'inverse — " +
      "chaque rappel du cadre déclenche une opposition, et l'escalade s'installe. Face à un Adulte solide, " +
      "le jeu ne s'amorce tout simplement pas.";
    unknown =
      "Lequel de ces trois scénarios est le vôtre dépend entièrement de la personne en face de vous.";
  } else if (top.role === "Sauveur") {
    headline =
      `Avec un Parent Nourricier à ${pno}/10, vous glissez naturellement vers le rôle du ` +
      `Sauveur : vous aidez souvent avant même qu'on vous l'ait demandé.`;
    mechanism =
      "Le Sauveur fabrique la Victime qu'il soulage : plus vous prenez en charge, moins l'autre a de raisons " +
      "d'agir. Et comme l'aide non demandée n'est presque jamais reconnue, la lassitude finit par vous faire " +
      "basculer dans le rôle du Persécuteur — « après tout ce que j'ai fait ». C'est le retournement le plus " +
      "fréquent du triangle.";
    unknown =
      "Reste à savoir si la personne en face installe la Victime que vous soulagez, ou si elle refuse cette place.";
  } else {
    headline =
      `Avec un Enfant Adapté Soumis à ${eas}/10, vous occupez facilement la place de la ` +
      `Victime : vous cédez, vous encaissez, vous dites oui alors que vous pensez non.`;
    mechanism =
      "Cette place appelle immédiatement les deux autres rôles : un Persécuteur qui exige, ou un Sauveur qui " +
      "prend les décisions à votre place. Les deux vous coûtent la même chose — votre puissance d'agir — mais " +
      "le second est beaucoup plus difficile à repérer, parce qu'il se présente comme de la bienveillance.";
    unknown =
      "C'est l'égogramme de l'autre qui dira si vous avez en face un Persécuteur ou un Sauveur.";
  }

  const adult =
    a >= 8
      ? `Votre Adulte à ${a}/10 est votre meilleure protection : c'est lui qui permet de nommer le jeu pendant qu'il se joue, et donc d'en sortir.`
      : a <= 4
        ? `Votre Adulte à ${a}/10 vous laisse peu de recul pour repérer le jeu au moment où il s'installe. C'est le levier de développement le plus rentable.`
        : `Votre Adulte à ${a}/10 vous donne un recul correct, à condition que la situation ne soit pas trop chargée émotionnellement.`;

  const nuance =
    ear >= 8 && top.role !== "Victime"
      ? `Votre Enfant Adapté Rebelle à ${ear}/10 ajoute une seconde entrée dans le triangle : quand le cadre vient d'ailleurs, c'est l'opposition qui prend le relais.`
      : null;

  return {
    role: top.role,
    icon: ROLE_ICON[top.role],
    driverLabel: top.label,
    driverScore: top.score,
    headline,
    mechanism,
    unknown,
    adult,
    nuance,
  };
}

/** Sections réellement produites par l'analyse duo/équipe (voir buildTeamPrompt). */
export const DUO_SECTIONS: Array<{ icon: string; title: string; teaser: string }> = [
  {
    icon: "🎯",
    title: "Portrait global de la relation",
    teaser: "La culture relationnelle qui se dégage de vos deux profils et la position de vie dominante.",
  },
  {
    icon: "📊",
    title: "Cartographie des états du moi",
    teaser: "Qui porte quel état du moi pour l'autre, état par état, score par score.",
  },
  {
    icon: "🤝",
    title: "Complémentarités et synergies",
    teaser: "Ce qui fonctionne naturellement entre vous, et pourquoi, avec des situations concrètes.",
  },
  {
    icon: "💬",
    title: "Dynamiques de communication",
    teaser: "Vos transactions dominantes, et comment les décisions se prennent réellement entre vous.",
  },
  {
    icon: "🛠️",
    title: "Recommandations concrètes",
    teaser: "5 à 6 actions, rituels et changements de posture adaptés à votre duo.",
  },
  {
    icon: "👤",
    title: "Points de vigilance individuels",
    teaser: "Pour chacun : sa contribution clé, son risque principal, sa piste de développement.",
  },
];
