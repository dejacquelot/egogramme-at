import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  aggregateOrientation,
  orientationStatsPayloadSchema,
  type OrientationStatsPayload,
} from "@/lib/orientation-stats";

type Props = {
  since: Date;
  periodLabel: string;
  buckets: { key: string; label: string }[];
  bucket: (date: Date) => string;
};

const percent = (value: number | null) => (value == null ? "—" : `${Math.round(value * 100)} %`);

export function OrientationStatistics({ since, periodLabel, buckets, bucket }: Props) {
  const [result, setResult] = useState<{ since: string; payload: OrientationStatsPayload } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const sinceIso = since.toISOString();

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setResult(null);
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session)
          throw new Error("Reconnectez-vous pour consulter les statistiques Orientation.");
        const response = await fetch(
          `/api/admin/orientation-stats?since=${encodeURIComponent(sinceIso)}`,
          {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : `Chargement impossible (HTTP ${response.status}).`;
          throw new Error(message);
        }
        const payload = orientationStatsPayloadSchema.parse(body);
        if (!controller.signal.aborted) setResult({ since: sinceIso, payload });
      } catch (failure) {
        if (!controller.signal.aborted) {
          console.error("orientation statistics loading failed", failure);
          setError(
            failure instanceof Error
              ? failure.message
              : "Chargement des statistiques Orientation impossible.",
          );
        }
      }
    })();
    return () => controller.abort();
  }, [sinceIso, revision]);

  const payload = result?.since === sinceIso ? result.payload : null;
  const metrics = useMemo(
    () => (payload ? aggregateOrientation(payload.events, since, new Date(payload.until)) : null),
    [payload, since],
  );
  const series = useMemo(() => {
    const rows = buckets.map(({ key, label }) => ({
      key,
      label,
      visits: 0,
      started: 0,
      completed: 0,
      ai: 0,
      pdf: 0,
    }));
    const map = new Map(rows.map((row) => [row.key, row]));
    const starts = new Set<string>();
    const completions = new Set<string>();
    for (const event of metrics?.events ?? []) {
      const row = map.get(bucket(new Date(event.created_at)));
      if (!row) continue;
      if (event.kind === "visit") row.visits++;
      if (event.kind === "started" && !starts.has(event.journey_id)) {
        row.started++;
        starts.add(event.journey_id);
      }
      if (event.kind === "test_completed" && !completions.has(event.journey_id)) {
        row.completed++;
        completions.add(event.journey_id);
      }
      if (event.kind === "ai_completed") row.ai++;
      if (event.kind === "pdf_downloaded") row.pdf++;
    }
    return rows;
  }, [metrics, buckets, bucket]);

  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Orientation : parcours et engagement
          </h2>
          <p className="text-xs text-muted-foreground">Page /orientation · {periodLabel}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!payload && !error}
          onClick={() => setRevision((value) => value + 1)}
        >
          Actualiser Orientation
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error} Aucun compteur n'est affiché tant que les données ne sont pas disponibles.
        </p>
      ) : !metrics || !payload ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Chargement des statistiques Orientation…
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Un premier essai préparé</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {percent(metrics.planRate)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.cohortPlanned} sur {metrics.started} parcours démarrés dans la période ont
                renseigné une action et une échéance. Ce n'est pas une preuve que l'essai a été
                réalisé.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Téléchargements du carnet PDF</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">{metrics.pdfDownloads}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {payload.pdfAllTime} depuis le début du suivi. Les téléchargements répétés sont
                comptés. Le navigateur a déclenché le téléchargement ; l'enregistrement sur disque
                n'est pas vérifiable.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-5">
            {[
              ["Visites", metrics.visits],
              ["Parcours démarrés", metrics.started],
              ["Questionnaires terminés", metrics.completed],
              ["Volet parent ouvert", metrics.parentsOpened],
              ["Plans d'essai renseignés", metrics.planned],
            ].map(([label, count]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>

          <div
            className="mt-5 h-72 w-full"
            aria-label="Fréquentation Orientation et événements reçus par période"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="visits"
                  name="Visites"
                  stroke="oklch(0.5 0.1 195)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="started"
                  name="Démarrages"
                  stroke="oklch(0.6 0.17 60)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Questionnaires terminés"
                  stroke="oklch(0.55 0.18 145)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ai"
                  name="Bilans IA terminés"
                  stroke="oklch(0.55 0.2 300)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pdf"
                  name="Téléchargements PDF"
                  stroke="oklch(0.6 0.2 25)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="mt-5 text-sm font-semibold">
            Progression des parcours démarrés dans la période
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Questionnaires terminés : {percent(metrics.completionRate)} ({metrics.cohortCompleted}{" "}
            sur {metrics.started}). Une pause n'est pas un abandon.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {metrics.blocks.map(({ questions, count }) => (
              <div key={questions}>
                <div className="text-xs text-muted-foreground">{questions} questions</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{count}</div>
              </div>
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold">Analyses IA facultatives</h3>
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Bilans terminés dans la période", metrics.aiCompleted],
              ["Demandes dans la période", metrics.aiRequested],
              ["Taux d'échec", percent(metrics.aiFailureRate)],
              [
                "Durée médiane des réussites",
                metrics.medianMs == null
                  ? "—"
                  : `${(metrics.medianMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {metrics.aiFailures} échec(s), {metrics.aiPending} demande(s) sans résultat reçu. Le
            taux d'échec et la durée médiane concernent les demandes de la période ayant reçu un
            résultat à l'actualisation. Les demandes en attente sont exclues du taux d'échec ;
            l'absence d'usage de l'IA n'est pas un échec.
          </p>
          <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            Les visites comptent les ouvertures de page, pas des élèves uniques. Un parcours repose
            sur un identifiant aléatoire, conservé uniquement si le carnet est sauvegardé sur
            l'appareil. Les taux portent sur les parcours démarrés dans la période, tandis que les
            compteurs d'activité incluent aussi les reprises. Un volet parent ouvert ne prouve pas
            une discussion. Aucun score, réponse, métier ou texte personnel n'est remonté. Le suivi
            commence avec cette version, sans reconstituer les carnets anciens. Le signal « Ne pas
            me suivre » du navigateur est respecté.
          </p>
        </>
      )}
    </Card>
  );
}
