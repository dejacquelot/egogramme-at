/** Renders HTML from AI (trusted internal source) or falls back to markdown. */
export function MarkdownText({ text }: { text: string }) {
  // If the response contains HTML tags, render directly
  if (/<(h[1-6]|p|ul|ol|li|table|tr|td|th|strong|em|pre|code|div|blockquote)\b/i.test(text)) {
    return (
      <div
        className="prose prose-sm max-w-none text-sm leading-relaxed
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-1
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1
          [&_p]:text-muted-foreground [&_p]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-muted-foreground [&_ol]:space-y-1
          [&_li]:text-muted-foreground
          [&_strong]:text-foreground [&_strong]:font-semibold
          [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:my-3
          [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
          [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-muted-foreground [&_td]:align-top
          [&_tr:nth-child(even)_td]:bg-muted/40
          [&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-xs [&_pre]:font-mono [&_pre]:leading-tight [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_pre]:my-3
          [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_code]:font-mono
          [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  // Fallback: plain markdown renderer
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
