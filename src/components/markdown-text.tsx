/** Minimal markdown renderer for headings, bold, lists and paragraphs. */
export function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (/^#{1,6}\s/.test(lines[0]) && lines.length === 1) {
          const levelN = lines[0].match(/^#+/)![0].length;
          const content = lines[0].replace(/^#+\s*/, "");
          return (
            <h3
              key={bi}
              className={
                levelN <= 2
                  ? "text-base font-semibold text-foreground"
                  : "text-sm font-semibold text-foreground"
              }
            >
              {inline(content)}
            </h3>
          );
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5 text-muted-foreground">
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <div key={bi} className="space-y-1">
            {lines.map((l, i) =>
              /^#{1,6}\s/.test(l) ? (
                <h3 key={i} className="text-base font-semibold text-foreground">
                  {inline(l.replace(/^#+\s*/, ""))}
                </h3>
              ) : /^\s*[-*]\s+/.test(l) ? (
                <p key={i} className="pl-4 text-muted-foreground">
                  • {inline(l.replace(/^\s*[-*]\s+/, ""))}
                </p>
              ) : (
                <p key={i} className="text-muted-foreground">
                  {inline(l)}
                </p>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
