/** Full Markdown renderer: headings, bold, italic, lists, pipe tables, :::karpman / :::pae blocks. */
import { parsePaeBlock } from "@/lib/pae";
import { expandEgoStateAbbreviations } from "@/lib/ego-states";

export function MarkdownText({ text }: { text: string }) {
  const html = markdownToHtml(text);
  return (
    <div
      className="space-y-0 text-sm leading-relaxed
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-5 [&_h2]:mb-2
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1
        [&_p]:text-muted-foreground [&_p]:mb-2 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground [&_ul]:space-y-1 [&_ul]:mb-2
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-muted-foreground [&_ol]:space-y-1 [&_ol]:mb-2
        [&_li]:text-muted-foreground
        [&_strong]:text-foreground [&_strong]:font-semibold
        [&_em]:italic
        [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border
        [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3
        [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote_p]:mb-1 [&_blockquote_p:last-child]:mb-0
        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:my-3
        [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
        [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-muted-foreground [&_td]:align-top
        [&_tr:nth-child(even)_td]:bg-muted/30
        [&_.karpman]:my-4 [&_.karpman]:rounded-xl [&_.karpman]:border [&_.karpman]:border-amber-200 [&_.karpman]:bg-amber-50 [&_.karpman]:p-4
        [&_.pae]:my-4 [&_.pae]:rounded-xl [&_.pae]:border [&_.pae]:border-border [&_.pae]:bg-muted/30 [&_.pae]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMarkdown(s: string): string {
  // Garde-fou : les analyses enregistrées avant l'interdiction des abréviations
  // contiennent encore « PNo 8 » ou « PNf 8 ». On rétablit le libellé complet à
  // l'affichage. Le bloc :::pae et le triangle de Karpman ne passent pas par ici.
  return escapeHtml(expandEgoStateAbbreviations(s))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function renderKarpman(block: string): string {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const get = (role: string) => {
    const line = lines.find((l) => norm(l).startsWith(norm(role) + ":"));
    return line ? escapeHtml(line.slice(line.indexOf(":") + 1).trim()) : role;
  };
  const persecuteur = get("Persécuteur");
  const sauveur = get("Sauveur");
  const victime = get("Victime");

  return `<div class="karpman">
    <p style="font-weight:600;margin-bottom:8px;color:#92400e;">🔺 Triangle de Karpman</p>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:0.75rem;">
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:8px 16px;text-align:center;min-width:160px;">
        <div style="font-weight:600;color:#92400e;">⚔️ Persécuteur</div>
        <div style="color:#78350f;">${persecuteur}</div>
      </div>
      <div style="display:flex;gap:32px;align-items:flex-start;">
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:8px 16px;text-align:center;min-width:140px;">
          <div style="font-weight:600;color:#92400e;">😢 Victime</div>
          <div style="color:#78350f;">${victime}</div>
        </div>
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:8px 16px;text-align:center;min-width:140px;">
          <div style="font-weight:600;color:#92400e;">🤲 Sauveur</div>
          <div style="color:#78350f;">${sauveur}</div>
        </div>
      </div>
      <div style="font-size:0.65rem;color:#78350f;margin-top:2px;">↗ ← → ↖ (les rôles circulent)</div>
    </div>
  </div>`;
}

function renderPae(block: string): string {
  const groups = parsePaeBlock(block);
  if (!groups) return "";

  const cards = groups
    .map((g) => {
      const pct = g.max > 0 ? Math.round((g.total / g.max) * 100) : 0;
      const detail = g.parts
        .map((p) => `<span style="white-space:nowrap;">${p.short} ${p.value}</span>`)
        .join('<span style="opacity:.4;"> · </span>');
      return `<div style="flex:1 1 0;min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;">
        <div style="font-size:0.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${g.color};">${g.label}</div>
        <div style="font-size:1.25rem;font-weight:700;color:#0f172a;line-height:1.2;margin-top:2px;">${g.total}<span style="font-size:0.75rem;font-weight:500;color:#64748b;">/${g.max}</span></div>
        <div style="height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin:6px 0;">
          <div style="height:100%;width:${pct}%;background:${g.color};border-radius:999px;"></div>
        </div>
        <div style="font-size:0.65rem;color:#64748b;">${detail}</div>
      </div>`;
    })
    .join("");

  return `<div class="pae">
    <p style="font-weight:600;margin-bottom:8px;color:#0f172a;">⚖️ Répartition de l'énergie</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">${cards}</div>
  </div>`;
}

function renderTable(lines: string[]): string {
  const rows = lines
    .filter((l) => !l.match(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/))
    .map((l) =>
      l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
    );
  if (rows.length === 0) return "";
  const [header, ...body] = rows;
  // Normalise le nombre de colonnes : une ligne plus courte est complétée, une ligne
  // plus longue voit son surplus fusionné dans la dernière cellule (aucune perte de contenu).
  const cols = header.length;
  const normalize = (r: string[]) => {
    if (r.length === cols) return r;
    if (r.length < cols) return [...r, ...Array(cols - r.length).fill("")];
    return [...r.slice(0, cols - 1), r.slice(cols - 1).join(" ")];
  };
  const th = header.map((c) => `<th>${inlineMarkdown(c)}</th>`).join("");
  const trs = body
    .map((r) => "<tr>" + normalize(r).map((c) => `<td>${inlineMarkdown(c)}</td>`).join("") + "</tr>")
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function markdownToHtml(md: string): string {
  // Normalize line endings (les fences ``` sont gérées dans la boucle principale)
  md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const out: string[] = [];
  const lines = md.split("\n");
  let i = 0;

  // Helper: is this line a pipe-table row?
  const isPipeLine = (l: string) => /\|/.test(l) && l.trim().includes("|");
  // Helper: is this a separator line like |:---|:---|
  const isSepLine = (l: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(l.trim());
  // Helper: is this an ASCII table border like +---+---+
  const isAsciiBorder = (l: string) => /^\s*\+[-=+]+\+\s*$/.test(l.trim());
  // Helper: is this an ASCII table data row like | cell | cell |
  const isAsciiDataRow = (l: string) => /^\s*\|/.test(l) && !isSepLine(l);
  // Helper: a fence opening/closing a code block
  const isFence = (l: string) => /^\s*(```|~~~)/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block anywhere in the document: unwrap it and re-render its content.
    // L'IA a pour consigne de ne jamais produire de bloc de code ; quand elle en produit
    // un quand même, on ne veut ni afficher les ``` littéralement ni perdre le contenu.
    if (isFence(line)) {
      i++;
      const inner: string[] = [];
      while (i < lines.length && !isFence(lines[i])) {
        inner.push(lines[i]);
        i++;
      }
      i++; // closing fence (or end of input)
      const innerText = inner.join("\n").trim();
      if (innerText) out.push(markdownToHtml(innerText));
      continue;
    }

    // :::karpman block
    if (line.trim() === ":::karpman") {
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        blockLines.push(lines[i]);
        i++;
      }
      out.push(renderKarpman(blockLines.join("\n")));
      i++;
      continue;
    }

    // :::pae block (équilibre Parent / Adulte / Enfant)
    if (line.trim() === ":::pae") {
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        blockLines.push(lines[i]);
        i++;
      }
      out.push(renderPae(blockLines.join("\n")));
      i++;
      continue;
    }

    // ASCII-art table: +---+---+ borders with | data | rows
    if (isAsciiBorder(line)) {
      const asciiLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (isAsciiBorder(lines[i]) || isAsciiDataRow(lines[i])) {
          asciiLines.push(lines[i]);
          i++;
        } else if (cur === "" && i + 1 < lines.length && (isAsciiBorder(lines[i + 1]) || isAsciiDataRow(lines[i + 1]))) {
          i++;
        } else {
          break;
        }
      }
      // Extract data rows (skip border lines)
      const dataRows = asciiLines
        .filter((l) => !isAsciiBorder(l))
        .map((l) => l.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
      if (dataRows.length > 0) {
        const [header, ...body] = dataRows;
        const th = header.map((c) => `<th>${inlineMarkdown(c)}</th>`).join("");
        const trs = body
          .map((r) => "<tr>" + r.map((c) => `<td>${inlineMarkdown(c)}</td>`).join("") + "</tr>")
          .join("");
        out.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      }
      continue;
    }

    // Pipe table — uniquement si la ligne séparateur Markdown (|---|---|) est présente.
    // Sans cette règle, un schéma dessiné à la main dont les lignes contiennent des « | »
    // était avalé comme un tableau et produisait une mise en page bancale.
    if (isPipeLine(line) && !isSepLine(line)) {
      let probe = i + 1;
      while (probe < lines.length && lines[probe].trim() === "") probe++;
      if (probe < lines.length && isSepLine(lines[probe])) {
        const tableLines: string[] = [];
        while (i < lines.length) {
          const cur = lines[i].trim();
          if (isPipeLine(lines[i]) || isSepLine(lines[i])) {
            tableLines.push(lines[i]);
            i++;
          } else if (cur === "" && i + 1 < lines.length && (isPipeLine(lines[i + 1]) || isSepLine(lines[i + 1]))) {
            // Skip blank line between table rows
            i++;
          } else if (cur === "---" || cur === "***" || cur === "___") {
            // Skip horizontal rules between table rows (sometimes generated by AI)
            if (i + 1 < lines.length && (isPipeLine(lines[i + 1]) || isSepLine(lines[i + 1]))) {
              i++;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        out.push(renderTable(tableLines));
        continue;
      }
    }

    // Horizontal rule (---, ***, ___) → real visual separation instead of literal dashes
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }

    // Blockquote: collect consecutive "> " lines
    if (/^\s*>\s?/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        const content = lines[i].replace(/^\s*>\s?/, "");
        if (content.trim()) quoted.push(`<p>${inlineMarkdown(content)}</p>`);
        i++;
      }
      if (quoted.length) out.push(`<blockquote>${quoted.join("")}</blockquote>`);
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level = Math.min(hMatch[1].length, 3);
      const tag = level === 1 ? "h2" : "h3";
      out.push(`<${tag}>${inlineMarkdown(hMatch[2])}</${tag}>`);
      i++;
      continue;
    }

    // Unordered list: collect block
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Empty line → skip (spacing handled by CSS)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    out.push(`<p>${inlineMarkdown(line)}</p>`);
    i++;
  }

  return out.join("\n");
}
