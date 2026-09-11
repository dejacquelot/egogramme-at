import { Card } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/egogram-categories";

/**
 * Carte de l'égogramme : graphique en barres + légende détaillée.
 * Composant unique partagé par la page Test (colonne latérale et panneau
 * mobile) et par Mon Espace, afin que le graphique soit identique partout.
 *
 * `compact` réduit la hauteur et masque la légende détaillée : utilisé
 * lorsque plusieurs égogrammes sont affichés sur le même écran.
 */
export function EgogramCard({
  scores,
  total,
  maxScore,
  title = "Votre égogramme",
  subtitle,
  compact = false,
  className = "p-5",
}: {
  scores: Record<string, number>;
  total?: number;
  maxScore?: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}) {
  const sum = total ?? CATEGORIES.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const peak = maxScore ?? Math.max(...CATEGORIES.map((c) => scores[c.key] ?? 0), 1);
  const chartHeight = compact ? "h-52" : "h-72";

  return (
    <Card className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={compact ? "text-base font-semibold" : "text-lg font-semibold"}>{title}</h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          Σ = {sum}
        </span>
      </div>
      {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      
      <>
          {/* Bar chart */}
          <div className="mt-5">
            <div className="flex gap-2">
              {/* Y axis 0-10 */}
              <div className={`flex ${chartHeight} flex-col-reverse justify-between py-1 pr-1 text-[10px] tabular-nums text-muted-foreground`}>
                {Array.from({ length: 11 }, (_, n) => (
                  <span key={n} className="leading-none">
                    {n}
                  </span>
                ))}
              </div>
      
              {/* Chart area */}
              <div className="relative flex-1">
                {/* Gridlines */}
                <div className="absolute inset-0 flex flex-col-reverse justify-between">
                  {Array.from({ length: 11 }, (_, n) => (
                    <div
                      key={n}
                      className={
                        "border-t " +
                        (n === 0
                          ? "border-foreground/40"
                          : "border-border/60")
                      }
                    />
                  ))}
                </div>
      
                {/* Bars */}
                <div className={`relative flex ${chartHeight} items-end gap-2`}>
                  {CATEGORIES.map((cat) => {
                    const score = scores[cat.key] ?? 0;
                    const heightPct = (score / 10) * 100;
                    const isMax = score === peak && score > 0;
                    return (
                      <div
                        key={cat.key}
                        className="flex h-full flex-1 flex-col items-center justify-end"
                      >
                        <div
                          className="relative flex w-full items-end justify-center"
                          style={{ height: `${heightPct}%` }}
                        >
                          <div
                            className="absolute -top-5 text-xs font-semibold tabular-nums text-foreground"
                          >
                            {score}
                          </div>
                          <div
                            className="w-full rounded-t-md transition-all duration-500 ease-out"
                            style={{
                              height: "100%",
                              backgroundColor: cat.color,
                              minHeight: score > 0 ? "3px" : "0",
                              outline: isMax
                                ? "2px solid var(--foreground)"
                                : undefined,
                              outlineOffset: isMax ? "1px" : undefined,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
      
            {/* X axis labels */}
            <div className="mt-2 flex gap-2 pl-5">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="flex-1 text-center text-[11px] font-semibold text-foreground"
                  title={cat.label}
                >
                  {cat.short}
                </div>
              ))}
            </div>
          </div>
      
          {/* Legend / details */}
          {!compact && (
          <ul className="mt-5 space-y-2">
            {CATEGORIES.map((cat) => (
              <li key={cat.key} className="flex items-start gap-2 text-xs">
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {cat.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {scores[cat.key] ?? 0}/10
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          )}
      </>
      
      {!compact && (
      <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">
        D'après Michel Josien, « Techniques de communication
        interpersonnelle », Les Éditions d'Organisation.
      </p>
      )}
    </Card>
  );
}

