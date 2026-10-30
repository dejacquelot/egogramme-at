/**
 * Garde-fous de lisibilité pour les rapports générés par l'IA, partagés par
 * l'affichage écran (markdown-text.tsx) et le PDF (team-report.ts).
 * - flèches LaTeX ($\rightarrow$) converties en vraies flèches ;
 * - schémas dessinés en caractères de boîte (───>, │, └┘) remplacés par une
 *   liste « A → B », ou supprimés s'ils ne contiennent aucun échange lisible ;
 * - bloc :::echanges (« qui parle à qui ») analysé en lignes structurées.
 */

const LATEX_ARROWS: [RegExp, string][] = [
  [/\$?\s*\\{1,2}(?:long)?leftrightarrow\s*\$?/g, "↔"],
  [/\$?\s*\\{1,2}(?:Long)?Rightarrow\s*\$?/g, "⇒"],
  [/\$?\s*\\{1,2}(?:long)?rightarrow\s*\$?/g, "→"],
  [/\$?\s*\\{1,2}(?:long)?leftarrow\s*\$?/g, "←"],
  [/\$?\s*\\{1,2}to\b\s*\$?/g, "→"],
];

export function cleanLatex(s: string): string {
  let out = s;
  for (const [re, arrow] of LATEX_ARROWS) out = out.replace(re, ` ${arrow} `);
  return out.replace(/ {2,}/g, " ");
}

const BOX = /[─━│┃└┘┌┐├┤┬┴┼═║╔╗╚╝╭╮╯╰]/;

export function isDiagramLine(line: string): boolean {
  return BOX.test(line);
}

/** Ligne courte composée uniquement d'une parenthèse ou d'un crochet, typique des légendes de schéma. */
function isDiagramCaption(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && t.length <= 60 && /^[([].*[)\]]$/.test(t);
}

/**
 * À partir d'une ligne de schéma, lit la suite de lignes qui le composent et
 * renvoie les échanges lisibles (« A (x) → B (y) ») ainsi que l'indice suivant.
 */
export function readDiagram(lines: string[], start: number): { items: string[]; next: number } {
  let i = start;
  const run: string[] = [];
  while (i < lines.length) {
    const l = lines[i];
    if (isDiagramLine(l) || isDiagramCaption(l)) {
      run.push(l);
      i++;
    } else if (l.trim() === "") {
      let probe = i + 1;
      while (probe < lines.length && lines[probe].trim() === "") probe++;
      if (probe < lines.length && (isDiagramLine(lines[probe]) || isDiagramCaption(lines[probe]))) {
        i = probe;
      } else break;
    } else break;
  }
  const items: string[] = [];
  const seen: string[] = [];
  for (let k = 0; k < run.length; k++) {
    const l = run[k];
    const matches = [...l.matchAll(/\[([^\]]+)\]\s*(\(([^)]*)\))?/g)];
    const nodes = matches.map((m) => (m[3] ? `${m[1].trim()} (${m[3].trim()})` : m[1].trim()));
    const names = matches.map((m) => m[1].trim());
    if (nodes.length >= 2 && /[>→]/.test(l)) {
      items.push(nodes.join(" → "));
    } else if (nodes.length === 1 && /[<>→←]/.test(l) && seen.length > 0) {
      // Nœud seul relié par des flèches aux nœuds précédents (└──> [C] <──┘),
      // sa légende éventuelle est sur la ligne suivante.
      let label = nodes[0];
      const caption = run[k + 1];
      if (!matches[0][3] && caption && isDiagramCaption(caption) && !isDiagramLine(caption)) {
        label = `${names[0]} ${caption.trim()}`;
        k++;
      }
      const sources = seen.filter((n) => n !== names[0]);
      if (sources.length) items.push(`${sources.join(", ")} → ${label}`);
    }
    for (const n of names) if (!seen.includes(n)) seen.push(n);
  }
  return { items, next: i };
}

export type Exchange = { from: string; to: string; example: string };

/** Lignes du bloc :::echanges : « Claire (pose le cadre) -> Ksénia (s'y range) : exemple ». */
export function parseExchanges(block: string): Exchange[] {
  return block
    .split("\n")
    .map((l) => l.trim().replace(/^[-*]\s+/, ""))
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/\s*(?:->|→|=>)\s*/);
      if (parts.length < 2) return null;
      const from = parts[0].trim();
      const rest = parts.slice(1).join(" → ");
      // L'exemple suit le premier « : » placé après la parenthèse du destinataire.
      const close = rest.indexOf(")");
      const colon = rest.indexOf(":", close >= 0 ? close : 0);
      const to = (colon >= 0 ? rest.slice(0, colon) : rest).trim();
      const example = colon >= 0 ? rest.slice(colon + 1).trim() : "";
      return from && to ? { from, to, example } : null;
    })
    .filter((x): x is Exchange => x !== null);
}
