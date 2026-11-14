---
name: Égogramme — parcours Orientation
description: Référence du parcours Orientation uniquement, sans refonte des autres pages.
colors:
  primary: "#1f6f6a"
  primary-hover: "#15534f"
  ink: "#203733"
  muted: "#536760"
  background: "#f4f8f5"
  surface: "#ffffff"
  line: "#d5e1dc"
typography:
  display:
    fontFamily: "Nunito Sans, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(32px, 4.7vw, 60px)"
    fontWeight: 900
    lineHeight: 1.09
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Nunito Sans, Segoe UI, Arial, sans-serif"
    fontSize: "17px"
    lineHeight: 1.65
  label:
    fontFamily: "Nunito Sans, Segoe UI, Arial, sans-serif"
    fontSize: "14px"
rounded:
  control: "8px"
  field: "6px"
spacing:
  group: "12px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 21px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 15px"
---

# Design System: Égogramme — Orientation

## Overview

Cette référence décrit uniquement `src/styles/orientation.css` et le parcours
`/orientation`. Les pages Test, Binôme, APEL, Mon Espace et Administration gardent
leurs identités existantes : ne pas leur appliquer automatiquement cette palette.
Les photographies fournies sont utilisées sans filtre, dans quatre fichiers séparés.

## Colors

Le teal porte les actions et les sélections. Le fond clair légèrement vert sépare
les contenus blancs. Le texte secondaire conserve un contraste lisible.
Les avertissements ont un fond et un texte distincts, pas une bordure latérale.

## Typography

Nunito Sans est utilisée pour les titres, le texte et les commandes, avec une pile
de repli système. Les titres ont une graisse forte et une hauteur de ligne compacte.
Le corps est de 17 px, les aides de 14 px. Le texte courant est limité à 72 caractères
en largeur ; les titres utilisent `text-wrap: balance`.

## Layout

Conteneur de 1160 px, marges intérieures de 28 px, puis 20 px sur téléphone.
Les colonnes se replient sous 760 px. Les champs restent à largeur disponible ;
les grandes actions de navigation passent en lignes séparées sur téléphone.
Les textes, photos et formulaires gardent leur ordre de lecture sans défilement horizontal.

## Elevation & Depth

Les surfaces sont plates, séparées par des fonds et des traits fins, sans ombre
décorative. Les photographies gardent leur matière propre.

## Shapes

Les commandes sont arrondies à 8 px, les champs à 6 px. Les formulaires et images
utilisent des arrondis modérés ; les limites des groupes restent explicites.

## Components

Les boutons ont une cible minimale de 48 px. Le primaire est rempli de teal, le
secondaire blanc avec contour. Le focus est un trait bleu de 3 px, décalé de 4 px.
La désactivation est visible et bloque réellement l'action.

Les questions utilisent des boutons radio natifs. Les dimensions de réflexion
utilisent `aria-pressed`, avec une sélection teal. Les champs ont des labels visibles,
des limites de longueur et des placeholders qui ne remplacent pas les consignes.
Les messages d'erreur nomment le problème et la façon de continuer.

Les transitions de couleur durent 150 ms. Les transitions sont désactivées avec
`prefers-reduced-motion`. La largeur de progression n'est pas animée.

## Do's and Don'ts

- **Do** préserver les quatre photos, la lecture sur téléphone et les commandes explicites.
- **Do** garder les explications et les limites de l'égogramme visibles avec les résultats.
- **Don't** présenter une force possible comme un talent mesuré ou un métier obligatoire.
- **Don't** appliquer cette référence locale aux autres parcours sans décision de refonte.
- **Don't** remplacer les labels de champ par des placeholders ou masquer les erreurs.
