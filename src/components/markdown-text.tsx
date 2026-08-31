/** Full Markdown renderer: headings, bold, italic, lists, pipe tables, :::karpman blocks. */
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
        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:my-3
        [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
        [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-muted-foreground [&_td]:align-top
        [&_tr:nth-child(even)_td]:bg-muted/30
        [&_.karpman]:my-4 [&_.karpman]:rounded-xl [&_.karpman]:border [&_.karpman]:border-amber-200 [&_.karpman]:bg-amber-50 [&_.karpman]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMarkdown(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function renderKarpman(block: string): string {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const get = (role: string) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(role.toLowerCase() + ":"));
    return line ? escapeHtml(line.slice(role.length + 1).trim()) : role;
  };
  const persecuteur = get("Persécuteur") || get("Persecuteur");
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

function renderTable(lines: string[]): string {
  const rows = lines
    .filter((l) => !l.match(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/))
    .map((l) =>
      l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
    );
  if (rows.length === 0) return "";
  const [header, ...body] = rows;
  const th = header.map((c) => `<th>${inlineMarkdown(c)}</th>`).join("");
  const trs = body
    .map((r) => "<tr>" + r.map((c) => `<td>${inlineMarkdown(c)}</td>`).join("") + "</tr>")
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function markdownToHtml(md: string): string {
  // Normalize line endings and strip code block wrappers
  md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  md = md.replace(/^```(?:html|markdown|md)?\n?/i, "").replace(/\n?```\s*$/i, "");

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

  while (i < lines.length) {
    const line = lines[i];

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

    // Pipe table: collect pipe lines, skipping blank lines and --- separators between them
    if (isPipeLine(line)) {
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
