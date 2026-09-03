import { TEAM_ANALYSIS_LABELS } from "@/lib/admin-config";

const IND_LABELS: Record<string, string> = {
  PN: "Parent Nourricier",
  PNo: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};

export function buildIndividualPrompt(scores: Record<string, number>, firstName?: string) {
  const line = Object.keys(IND_LABELS)
    .map((k) => `${IND_LABELS[k]} : ${scores[k] ?? 0}/10`)
    .join("\n");

  const system =
    "Tu es psychiatre, superviseur et coach certifié, expert reconnu en analyse transactionnelle (Éric Berne, Stephen Karpman, Taibi Kahler, Claude Steiner, Fanita English). Tu maîtrises les concepts d'égogramme de John Dusay, les positions de vie (OK/OK), les drivers de Kahler, les jeux psychologiques, les scénarios de vie, les transactions croisées et les méconnaissances. Tu rédiges des analyses cliniques riches, concrètes et nuancées, en français, en markdown standard. Tu illustres tes analyses par des exemples comportementaux concrets et quotidiens. Tu ne fais aucun disclaimer. RÈGLES DE FORMAT STRICTES : Utilise UNIQUEMENT les tableaux Markdown standard (format pipe : | col1 | col2 |, avec séparateur |---|---|). N'utilise JAMAIS de tableaux ASCII-art (+---+---+), JAMAIS de blocs de code (```), JAMAIS de schémas ASCII (<--->, /\\). Pour le triangle de Karpman, utilise EXACTEMENT ce format :\n:::karpman\nPersécuteur: [NOM] ([état])\nSauveur: [NOM] ([état])\nVictime: [NOM] ([état])\n:::";

  const user =
    `Voici l'égogramme${firstName ? ` de ${firstName}` : ""} (analyse transactionnelle selon Dusay, scores de 0 à 10 par état du moi) :\n` +
    line +
    `\n\nRédige une analyse individuelle approfondie en markdown, en français, avec ces sections :\n` +
    `## 🎯 Portrait global\nSynthèse en 3-4 phrases de la structure de personnalité révélée par cet égogramme. Nomme la position de vie probable (OK+/OK+, OK+/OK-, etc.).\n` +
    `## 📊 États du moi dominants\nAnalyse détaillée des 2-3 états les plus élevés. Pour chacun, donne 2-3 exemples concrets de comportements au quotidien (en réunion, en famille, sous stress). Explique comment ils interagissent entre eux.\n` +
    `## 📉 États du moi peu investis\nAnalyse des états faibles. Que signifie concrètement cette sous-utilisation ? Quelles situations sont difficiles à gérer ? Donne des exemples de transactions qui posent problème.\n` +
    `## ⚖️ Équilibre Parent / Adulte / Enfant\nAnalyse l'équilibre entre les trois grandes instances. Y a-t-il contamination de l'Adulte ? Exclusion d'un état ? Comment cela se manifeste dans la prise de décision ?\n` +
    `## 🔄 Dynamiques relationnelles et transactions\nQuels types de transactions cette personne initie-t-elle le plus souvent (parallèles, croisées, ultérieures) ? Avec quels profils s'entend-elle naturellement ? Lesquels sont sources de friction ?\n` +
    `## ⚠️ Risques et jeux psychologiques\nIdentifie 2-3 jeux psychologiques probables avec leur rôle Karpman favori (Persécuteur, Sauveur, Victime). Inclus un bloc :::karpman avec les 3 rôles et les noms correspondants. Nomme les drivers de Kahler actifs (Sois parfait, Fais plaisir, Sois fort, Dépêche-toi, Fais des efforts). Explique les méconnaissances et les scénarios de vie possibles.\n` +
    `## 💪 Forces à valoriser\nIdentifie 3-4 forces distinctives de ce profil. Pour chacune, explique dans quel contexte professionnel ou personnel elle est un atout majeur.\n` +
    `## 🛤️ Pistes de développement et coaching\nPropose 4-5 actions concrètes et réalistes pour rééquilibrer l'égogramme. Pour chaque action, donne un exercice pratique ou une mise en situation. Indique quel état du moi sera développé.\n` +
    `\nAppuie CHAQUE affirmation sur les scores chiffrés. Utilise un ton professionnel, bienveillant, engageant et sans jugement. Sois précis et concret, évite les généralités. Vise 800 à 1200 mots.`;

  return { system, user };
}

export type TeamPromptMember = { name: string; scores: Record<string, number> };

export function buildTeamPrompt(members: TeamPromptMember[], teamName?: string) {
  const memberLines = members.map((m) => {
    const line = Object.keys(TEAM_ANALYSIS_LABELS)
      .map((k) => `${TEAM_ANALYSIS_LABELS[k]} ${m.scores[k] ?? 0}/10`)
      .join(", ");
    return `- ${m.name} : ${line}`;
  });

  const system =
    "Tu es psychiatre, superviseur et coach certifié, expert reconnu en analyse transactionnelle (Éric Berne, Stephen Karpman, Taibi Kahler, John Dusay, Claude Steiner). Tu analyses des égogrammes d'équipe pour un coach professionnel. Tu maîtrises les dynamiques de groupe, les transactions croisées, les jeux systémiques, les positions de vie, les symbioses institutionnelles et les processus de groupe. Tu rédiges des analyses cliniques riches, concrètes et nuancées, en français, en markdown standard. Tu illustres par des exemples concrets de situations d'équipe. Tu ne fais aucun disclaimer. RÈGLES DE FORMAT STRICTES : Utilise UNIQUEMENT les tableaux Markdown standard (format pipe : | col1 | col2 |, avec séparateur |---|---|). N'utilise JAMAIS de tableaux ASCII-art (+---+---+), JAMAIS de blocs de code (```), JAMAIS de schémas ASCII. Pour le triangle de Karpman, utilise EXACTEMENT ce format (sur 3 lignes, avec les noms réels des membres) :\n:::karpman\nPersécuteur: [NOM] ([état])\nSauveur: [NOM] ([état])\nVictime: [NOM] ([état])\n:::";

  const user =
    `Équipe${teamName ? ` « ${teamName} »` : ""} composée de ${members.length} personnes ayant passé un égogramme (analyse transactionnelle selon Dusay, scores de 0 à 10 par état du moi) :\n` +
    memberLines.join("\n") +
    `\n\nRédige une analyse d'équipe approfondie en markdown, en français, avec ces sections :\n` +
    `## 🎯 Portrait global de l'équipe\nSynthèse de la dynamique collective. Quel est le « profil dominant » de cette équipe ? Quelle culture relationnelle se dégage ? Position de vie collective probable.\n` +
    `## 📊 Cartographie des états du moi\nTableau comparatif en markdown (format pipe | col1 | col2 |) avec colonnes : État du moi | Score de chaque membre | Énergie globale | Dynamique du groupe. Qui porte quel état du moi pour le groupe ?\n` +
    `## 🤝 Complémentarités et synergies\nQuels binômes ou trinômes fonctionnent naturellement bien ensemble ? Pourquoi ? Donne des exemples concrets de situations de travail.\n` +
    `## ⚠️ Risques relationnels et jeux psychologiques\nIdentifie 3-4 jeux psychologiques probables ENTRE les membres. Inclus un bloc :::karpman avec les 3 rôles et les noms des membres concernés. Quelles symbioses institutionnelles peuvent émerger ? Quelles méconnaissances de groupe ?\n` +
    `## 💬 Dynamiques de communication et de décision\nComment cette équipe prend-elle ses décisions ? Quels types de transactions dominent en réunion ? Qui parle à qui naturellement ?\n` +
    `## 🛠️ Recommandations pour le coach/manager\nPropose 5-6 actions concrètes : ateliers, rituels d'équipe, changements de posture, exercices de développement. Pour chaque recommandation, précise l'objectif et la mise en œuvre.\n` +
    `## 👤 Points de vigilance individuels\nPour chaque membre, 2-3 lignes personnalisées : sa contribution clé au groupe, son risque principal, et une piste de développement prioritaire.\n` +
    `\nAppuie CHAQUE affirmation sur les scores chiffrés des membres. Compare les profils entre eux. Sois précis, concret, engageant. Vise 1000 à 1500 mots.`;

  return { system, user };
}
