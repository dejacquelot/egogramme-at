import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Period = "day" | "week" | "month" | "quarter" | "year";

const PERIODS: {
  key: Period;
  label: string;
  days: number;
  buckets: number;
}[] = [
  { key: "day", label: "Par jour (30 j)", days: 30, buckets: 30 },
  { key: "week", label: "Par semaine (12 sem.)", days: 7 * 12, buckets: 12 },
  { key: "month", label: "Par mois (12 mois)", days: 31 * 12, buckets: 12 },
  { key: "quarter", label: "Par trimestre (8 trim.)", days: 92 * 8, buckets: 8 },
  { key: "year", label: "Par année (5 ans)", days: 366 * 5, buckets: 5 },
];

function bucketKey(date: Date, period: Period): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  if (period === "day") {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (period === "week") {
    const tmp = new Date(Date.UTC(y, m, d));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() - dayNum + 1);
    return `${tmp.getUTCFullYear()}-${String(tmp.getUTCMonth() + 1).padStart(2, "0")}-${String(tmp.getUTCDate()).padStart(2, "0")}`;
  }
  if (period === "month") return `${y}-${String(m + 1).padStart(2, "0")}`;
  if (period === "quarter") return `${y}-T${Math.floor(m / 3) + 1}`;
  return `${y}`;
}

function bucketLabel(key: string, period: Period): string {
  if (period === "day") {
    const [, m, d] = key.split("-");
    return `${d}/${m}`;
  }
  if (period === "week") {
    const [, m, d] = key.split("-");
    return `${d}/${m}`;
  }
  if (period === "month") {
    const [y, m] = key.split("-");
    return `${m}/${y.slice(2)}`;
  }
  return key;
}

function buildBuckets(period: Period, count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    if (period === "day") d.setUTCDate(d.getUTCDate() - i);
    else if (period === "week") d.setUTCDate(d.getUTCDate() - i * 7);
    else if (period === "month") d.setUTCMonth(d.getUTCMonth() - i);
    else if (period === "quarter") d.setUTCMonth(d.getUTCMonth() - i * 3);
    else if (period === "year") d.setUTCFullYear(d.getUTCFullYear() - i);
    keys.push(bucketKey(d, period));
  }
  return keys;
}

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistiques — Égogramme" },
      {
        name: "description",
        content:
          "Nombre de visiteurs uniques par jour, semaine, mois, trimestre ou année sur l'égogramme.",
      },
    ],
  }),
  component: Stats,
});

function Stats() {
  const [period, setPeriod] = useState<Period>("day");
  const [rows, setRows] = useState<{ visit_date: string }[]>([]);
  const [resultRows, setResultRows] = useState<{ created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cfg = PERIODS.find((p) => p.key === period)!;
      const since = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        ),
      );
      if (period === "day") since.setUTCDate(since.getUTCDate() - cfg.days);
      else if (period === "week") since.setUTCDate(since.getUTCDate() - cfg.days);
      else if (period === "month") since.setUTCMonth(since.getUTCMonth() - cfg.buckets);
      else if (period === "quarter") since.setUTCMonth(since.getUTCMonth() - cfg.buckets * 3);
      else if (period === "year") since.setUTCFullYear(since.getUTCFullYear() - cfg.buckets);
      const isoDate = since.toISOString();

      const [visitsRes, resultsRes, resultsCountRes] = await Promise.all([
        supabase
          .from("visits")
          .select("visit_date")
          .gte("visit_date", isoDate.slice(0, 10))
          .order("visit_date", { ascending: true }),
        supabase
          .from("results")
          .select("created_at")
          .gte("created_at", isoDate)
          .order("created_at", { ascending: true }),
        supabase.from("results").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setRows((visitsRes.data as { visit_date: string }[] | null) ?? []);
      setResultRows((resultsRes.data as { created_at: string }[] | null) ?? []);
      setTotalResults(resultsCountRes.count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const chartData = useMemo(() => {
    const cfg = PERIODS.find((p) => p.key === period)!;
    const keys = buildBuckets(period, cfg.buckets);
    const visitorsMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    keys.forEach((k) => {
      visitorsMap.set(k, 0);
      completedMap.set(k, 0);
    });
    rows.forEach((r) => {
      const d = new Date(r.visit_date + "T00:00:00Z");
      const key = bucketKey(d, period);
      if (visitorsMap.has(key)) visitorsMap.set(key, (visitorsMap.get(key) ?? 0) + 1);
    });
    resultRows.forEach((r) => {
      const d = new Date(r.created_at);
      const key = bucketKey(d, period);
      if (completedMap.has(key)) completedMap.set(key, (completedMap.get(key) ?? 0) + 1);
    });
    return keys.map((k) => ({
      label: bucketLabel(k, period),
      visitors: visitorsMap.get(k) ?? 0,
      completed: completedMap.get(k) ?? 0,
    }));
  }, [rows, resultRows, period]);

  const totalVisitors = chartData.reduce((a, b) => a + b.visitors, 0);
  const totalCompleted = chartData.reduce((a, b) => a + b.completed, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Statistiques
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Fréquentation du site
            </h1>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              ← Retour au test
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={period === p.key ? "default" : "outline"}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">
                Visiteurs uniques (période)
              </div>
              <div className="text-2xl font-semibold tabular-nums">{totalVisitors}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Tests complétés (période)
              </div>
              <div className="text-2xl font-semibold tabular-nums text-green-600">
                {totalCompleted}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Tests complétés (total)
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {totalResults ?? "—"}
              </div>
            </div>
          </div>

          <div className="mt-6 h-80 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chargement…
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune visite enregistrée sur cette période.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="oklch(0.55 0.15 250)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Visiteurs uniques"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="oklch(0.55 0.18 145)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Tests complétés"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 text-xs text-muted-foreground">
          <p>
            Comptage anonymisé : chaque adresse IP est hachée (SHA-256 + sel)
            avant stockage, ce qui permet d'identifier un visiteur unique par
            jour sans conserver son IP réelle. Les résultats de test sont
            également associés à ce hash.
          </p>
        </Card>
      </main>
    </div>
  );
}
