# Égogramme

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Les personnes qui souhaitent comprendre leur fonctionnement relationnel, les binômes et les membres présents d'un bureau APEL.
Le parcours Orientation s'adresse aux lycéens qui explorent leur avenir, avec un dialogue facultatif avec leurs parents.

## Product Purpose

Utiliser un questionnaire d'égogramme comme support de réflexion et de discussion, jamais comme diagnostic ou verdict sur une personne.
Pour l'orientation : relier les réponses à des forces possibles, les confronter à des exemples vécus, explorer des métiers et essayer de petites expériences.

## Capabilities and Constraints

Application web TanStack Start et React, avec Supabase et des analyses générées par Gemini.
Le test existant contient 60 questions réparties entre six états du moi. Le mapping et le calcul des scores doivent rester identiques.
Parcours Orientation validé : test répondu par le lycéen, carnet d'orientation et dialogue parent facultatif. Le parent apporte des observations, pas une évaluation de son enfant.
Un égogramme ne mesure ni les talents, ni les compétences, ni une compatibilité avec un métier. Les pistes ne doivent pas fermer des possibilités ou remplacer un professionnel de l'orientation.

## Brand Commitments

Français sans écriture inclusive. Langage concret, compréhensible sans formation en analyse transactionnelle.
Conserver les parcours existants. Utiliser séparément les quatre scènes de la photo fournie pour la nouvelle page Orientation.

## Evidence on Hand

Questionnaire et mapping existants dans `src/lib/question-variants.ts` et `src/lib/question-mapping.ts`.
Photo Orientation fournie par l'utilisateur : lycéenne au travail, échange avec un adulte, travail entre lycéens, jeunes devant un établissement.
Aucune preuve de validité prédictive de l'égogramme pour l'orientation ou la réussite professionnelle n'est fournie.

## Product Principles

- Le lycéen reste libre de ses choix et de partager ou non son carnet.
- Distinguer les réponses au test, les observations vécues et les hypothèses.
- Ancrer la réflexion dans des situations quotidiennes et des essais concrets.
- Ne pas inventer de score de compatibilité, de talent établi ou de promesse de réussite.
