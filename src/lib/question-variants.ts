/**
 * Variantes de libellés pour les 60 questions du test.
 * Chaque variante ne change QUE le texte affiché : l'ordre (et donc le
 * mapping vers les états du moi via MAPPING dans index.tsx) reste identique
 * pour les 3 tableaux, question par question.
 */
export type QuestionVariantKey = "default" | "scouts" | "ape";

export const QUESTION_VARIANT_LABELS: Record<QuestionVariantKey, string> = {
  default: "Standard",
  scouts: "Scouts et Guides",
  ape: "APEL",
};

/**
 * Contexte injecté dans les prompts d'analyse IA pour que les exemples
 * concrets (situations, vocabulaire) correspondent au public ayant répondu
 * avec cette variante de questions. `audience` est vide pour "default" (aucun
 * ajout au prompt) ; `examples` et `meetingContext` remplacent des membres de
 * phrase fixes dans analysis-prompts.ts.
 */
export const QUESTION_VARIANT_CONTEXT_PROMPTS: Record<
  QuestionVariantKey,
  { audience: string; examples: string; meetingContext: string }
> = {
  default: {
    audience: "",
    examples: "en réunion, en famille, sous stress",
    meetingContext: "en réunion",
  },
  scouts: {
    audience:
      "Le public ayant répondu est composé de chefs et cheftaines Scouts et Guides, jeunes adultes ayant des responsabilités d'encadrement de jeunes. Adapte TOUS tes exemples concrets à cet univers (camps, veillées, réunions de chefs, activités avec les jeunes, la loi scoute) plutôt qu'à un contexte professionnel classique.",
    examples: "en camp, en réunion de chefs, en veillée, sous stress",
    meetingContext: "en réunion de chefs ou pendant un camp",
  },
  ape: {
    audience:
      "Le public ayant répondu est composé de membres actifs d'une APEL (Association de Parents d'Élèves de l'Enseignement Libre) : bureau de l'association, organisation d'événements scolaires. Adapte TOUS tes exemples concrets à cet univers (réunions de bureau, kermesse, sorties scolaires, buvette, relations avec l'école) plutôt qu'à un contexte professionnel classique.",
    examples: "en réunion de bureau, en famille, lors d'un événement scolaire, sous stress",
    meetingContext: "en réunion de bureau ou lors de l'organisation d'un événement",
  },
};

const DEFAULT_QUESTIONS: string[] = [
  "On dit que j'ai du sang froid",
  "J'aime bien rire aux dépens des autres",
  "Je me laisse influencer facilement",
  "Je rends visite aux copains malades",
  "Je sais apprécier les imprévus",
  "J'admets très mal la tricherie",
  "J'aime beaucoup les voyages",
  "Je remonte fréquemment le moral aux copains qui dépriment",
  "Je n'arrive pas en retard pour ne pas me faire remarquer",
  "Je suis souvent en désaccord avec mon entourage",
  "On me trouve logique et rationnel",
  "Il faut respecter les délais",
  "Je ne contredis jamais un supérieur hiérarchique",
  "J'aide sans qu'on me le demande",
  "Je sympathise assez souvent avec des inconnus",
  "Les absences doivent être justifiées",
  "Avant d'effectuer un travail, je réfléchis sur la méthode à suivre",
  "Je suis râleur, contestataire",
  "Je suis organisé dans mon travail",
  "Je repère facilement les défauts des autres",
  "Je dis « oui » alors que je voulais dire « non »",
  "Je prête facilement mes affaires",
  "Quand quelqu'un me plaît je n'hésite pas à le lui dire",
  "J'apprécie la discipline",
  "Quand je suis en colère, on m'entend",
  "Je porte souvent des appréciations sur les gens",
  "Confronté à un échec, je réfléchis calmement",
  "Je préfère donner que recevoir",
  "Dans une situation difficile je garde ma présence d'esprit",
  "Quand il convient d'être en smoking, j'ai tendance à mettre une chemise à fleurs",
  "J'accorde de l'importance à ce qu'on pense de moi",
  "Je n'aime pas partir dans l'inconnu, il faut que ce soit planifié",
  "J'aime à rassurer mon entourage",
  "J'évite de prendre des responsabilités",
  "J'adore taquiner",
  "J'ai tendance à passer beaucoup de temps à aider les autres",
  "Ce n'est pas acceptable de doubler dans les files d'attente",
  "Je prévois les conséquences de mes actions",
  "Je choque souvent par mes propos",
  "Je suis plutôt timide",
  "On me trouve enthousiaste",
  "Je remets mes opinions en questions quand il le faut",
  "Quand je suis content ça se voit",
  "Quand un problème se pose, j'amasse le plus de données possibles pour le résoudre objectivement",
  "J'aime la satire et la dérision",
  "J'ai le souci de ne pas importuner les autres",
  "Je ne cache pas mes émotions",
  "Il est intolérable de faire claquer des pétards dans les cimetières",
  "J'ai l'esprit de contradiction",
  "Ça ne me déplairait pas d'être médecin sans frontières",
  "Je me fais petit devant l'autorité",
  "Il est dommage que certaines valeurs se perdent",
  "Avec moi on ne s'ennuie pas",
  "Dans le doute je sais me documenter",
  "Je suis réputé pour la férocité de mes remarques",
  "Dure est la loi, mais c'est la loi",
  "On me dit que je suis trop bon",
  "J'essaie de ressembler à ce que mes parents voulaient que je fusse",
  "J'ai toujours une histoire, drôle ou pas, à raconter",
  "J'ai tendance à prendre les opprimés sous mon aile",
];

/**
 * Exemples contextuels ajoutés entre parenthèses après chaque question
 * standard, plutôt que de la remplacer entièrement (cf. critique AT :
 * remplacer l'item générique casse la validité trans-situationnelle du
 * test — un exemple entre parenthèses la préserve tout en gagnant en
 * pertinence perçue pour le public visé).
 *
 * Corrections apportées par rapport aux versions précédentes :
 * - #13 / #51 : un seul référent d'autorité (au lieu de « chef de groupe ou
 *   l'aumônier » / « directeur ou la présidente »), pour éviter l'item à
 *   double référent (double-barreled) qui force une réponse unique sur deux
 *   figures d'autorité de nature différente.
 * - #4 : intensité comportementale alignée sur l'original (« rendre visite »,
 *   pas « prendre des nouvelles », qui était un comportement bien moins
 *   engageant et gonflait artificiellement le score).
 * - #50 / #56 : les exemples n'affirment plus l'adhésion de principe au
 *   groupe (effet plafond quasi garanti chez des volontaires déjà engagés),
 *   ils introduisent un vrai coût ou une vraie tension à accepter.
 */
const CONTEXT_EXAMPLES: ReadonlyArray<{ scouts: string; ape: string }> = [
  { scouts: "face à un imprévu en camp", ape: "face à un imprévu lors d'une kermesse" },
  { scouts: "en chambrant les autres chefs", ape: "en taquinant les autres parents" },
  { scouts: "par l'avis du groupe", ape: "par l'avis des autres parents" },
  { scouts: "à un scout malade", ape: "à un parent ou un enfant malade" },
  { scouts: "un changement de programme en camp", ape: "un imprévu lors de l'organisation d'un événement scolaire" },
  { scouts: "pendant un jeu ou une épreuve", ape: "dans les comptes de l'association" },
  { scouts: "les randonnées ou camps itinérants", ape: "les sorties scolaires" },
  { scouts: "à un jeune qui a le mal du pays au camp", ape: "à un parent découragé par l'organisation" },
  { scouts: "au rassemblement", ape: "aux réunions" },
  { scouts: "avec les autres chefs sur l'organisation du camp", ape: "avec les autres parents ou la direction de l'école" },
  { scouts: "dans l'organisation d'une activité", ape: "dans la gestion du budget de l'association" },
  { scouts: "du programme de camp", ape: "pour préparer la kermesse ou la fête de l'école" },
  { scouts: "le chef de groupe", ape: "le directeur de l'établissement" },
  { scouts: "un scout en difficulté", ape: "à l'organisation d'un événement" },
  { scouts: "les scouts d'une autre unité", ape: "de nouveaux parents" },
  { scouts: "aux réunions", ape: "aux réunions de l'association" },
  { scouts: "avant une activité de camp", ape: "avant d'organiser un événement" },
  { scouts: "quand le programme du camp ne me convient pas", ape: "quand les décisions de l'association ne me conviennent pas" },
  { scouts: "dans la préparation de mes camps", ape: "dans la préparation des événements" },
  { scouts: "dans l'organisation d'un camp", ape: "dans l'organisation d'un événement" },
  { scouts: "pour une mission au camp", ape: "pour une mission dans l'association" },
  { scouts: "mon matériel de camping", ape: "mon matériel pour un événement de l'école" },
  { scouts: "une idée proposée en réunion", ape: "une idée proposée en réunion" },
  { scouts: "les règles du camp", ape: "les règles de l'association" },
  { scouts: "pendant un camp", ape: "en réunion" },
  { scouts: "sur l'attitude des scouts", ape: "sur l'investissement des autres parents" },
  { scouts: "un échec d'activité", ape: "un échec d'organisation" },
  { scouts: "mon temps pour encadrer", ape: "mon temps à l'association" },
  { scouts: "un incident en camp", ape: "un imprévu pendant un événement" },
  { scouts: "l'uniforme", ape: "un événement avec un code vestimentaire" },
  { scouts: "ce que les autres chefs pensent de mon encadrement", ape: "ce que les autres parents pensent de mon implication" },
  { scouts: "avant de partir en camp", ape: "avant d'organiser un événement" },
  { scouts: "les scouts avant une activité qui les inquiète", ape: "les parents inquiets pour un événement" },
  { scouts: "une activité risquée", ape: "un poste au bureau de l'association" },
  { scouts: "les autres chefs", ape: "les autres membres du bureau" },
  { scouts: "un scout en difficulté", ape: "les autres parents dans l'organisation" },
  { scouts: "son tour de garde", ape: "son tour lors d'une buvette" },
  { scouts: "avant une activité", ape: "avant un événement" },
  { scouts: "devant les autres chefs", ape: "en réunion" },
  { scouts: "devant un groupe de scouts", ape: "devant un groupe de parents" },
  { scouts: "pendant les activités de camp", ape: "pendant la préparation des événements" },
  { scouts: "mes choix d'encadrement", ape: "mes idées pour l'association" },
  { scouts: "après une activité réussie", ape: "après un événement réussi" },
  { scouts: "un problème d'organisation de camp", ape: "un problème d'organisation d'événement" },
  { scouts: "pendant les veillées", ape: "pendant les réunions ou soirées de l'association" },
  { scouts: "les autres chefs", ape: "les autres parents" },
  { scouts: "devant mon équipe", ape: "devant les autres parents" },
  { scouts: "ne pas respecter le silence lors d'une veillée", ape: "ne pas respecter les règles de sécurité lors d'un événement" },
  { scouts: "face aux décisions du chef de groupe", ape: "face aux décisions du bureau" },
  { scouts: "partir en mission humanitaire même sans confort", ape: "m'investir dans une cause caritative même sans reconnaissance" },
  { scouts: "devant le chef de groupe", ape: "devant le directeur de l'établissement" },
  { scouts: "les traditions scoutes", ape: "les traditions de l'école" },
  { scouts: "en activité", ape: "en réunion" },
  { scouts: "en consultant le livre du chef", ape: "en consultant les statuts de l'association" },
  { scouts: "envers les autres chefs", ape: "envers les autres parents" },
  { scouts: "même quand la loi scoute me semble dépassée", ape: "même quand le règlement de l'association me semble excessif" },
  { scouts: "avec les scouts", ape: "avec les autres parents" },
  { scouts: "au chef que mes propres chefs voulaient que je devienne", ape: "à ce que mes propres parents auraient souhaité" },
  { scouts: "autour du feu de camp", ape: "lors des réunions" },
  { scouts: "le scout le plus fragile du groupe", ape: "le parent le plus isolé du groupe" },
];

const SCOUTS_QUESTIONS: string[] = DEFAULT_QUESTIONS.map(
  (q, i) => `${q} (par exemple, ${CONTEXT_EXAMPLES[i].scouts})`,
);

const APE_QUESTIONS: string[] = DEFAULT_QUESTIONS.map(
  (q, i) => `${q} (par exemple, ${CONTEXT_EXAMPLES[i].ape})`,
);

export const QUESTION_VARIANTS: Record<QuestionVariantKey, string[]> = {
  default: DEFAULT_QUESTIONS,
  scouts: SCOUTS_QUESTIONS,
  ape: APE_QUESTIONS,
};

export function isQuestionVariantKey(v: unknown): v is QuestionVariantKey {
  return v === "default" || v === "scouts" || v === "ape";
}
