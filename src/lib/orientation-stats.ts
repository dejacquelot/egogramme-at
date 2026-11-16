import { z } from "zod";

const eventBase = z
  .object({
    id: z.string().uuid(),
    journey_id: z.string().uuid(),
    kind: z.enum([
      "visit",
      "started",
      "block_completed",
      "test_completed",
      "parent_opened",
      "plan_ready",
      "pdf_downloaded",
      "ai_requested",
      "ai_completed",
      "ai_failed",
    ]),
    block: z.number().int().min(1).max(6).nullish(),
    attempt_id: z.string().uuid().nullish(),
    duration_ms: z.number().int().min(0).max(2_147_483_647).nullish(),
  })
  .strict();

function validateMetadata(event: z.infer<typeof eventBase>, ctx: z.RefinementCtx) {
  const ai = event.kind.startsWith("ai_");
  const terminal = event.kind === "ai_completed" || event.kind === "ai_failed";
  for (const [field, expected] of [
    ["block", event.kind === "block_completed"],
    ["attempt_id", ai],
    ["duration_ms", terminal],
  ] as const) {
    if ((event[field] != null) !== expected) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Métadonnée incompatible avec cet événement.",
      });
    }
  }
}

export const orientationEventSchema = eventBase.superRefine(validateMetadata);
export const orientationEventRowSchema = eventBase
  .extend({
    block: z.number().int().min(1).max(6).nullable(),
    attempt_id: z.string().uuid().nullable(),
    duration_ms: z.number().int().min(0).max(2_147_483_647).nullable(),
    created_at: z.string().datetime({ offset: true }),
  })
  .superRefine(validateMetadata);

export type OrientationEventInput = z.infer<typeof orientationEventSchema>;
export type OrientationEvent = z.infer<typeof orientationEventRowSchema>;
export type OrientationEventKind = OrientationEventInput["kind"];
export type OrientationEventMetadata = Pick<
  OrientationEventInput,
  "block" | "attempt_id" | "duration_ms"
>;

export const orientationStatsPayloadSchema = z.object({
  events: z.array(orientationEventRowSchema),
  pdfAllTime: z.number().int().nonnegative(),
  until: z.string().datetime({ offset: true }),
});
export type OrientationStatsPayload = z.infer<typeof orientationStatsPayloadSchema>;

export function orientationPlanReady(plan: { experiment: string; when: string }): boolean {
  return !!plan.experiment.trim() && !!plan.when.trim();
}

export function aggregateOrientation(events: OrientationEvent[], since: Date, until: Date) {
  // A resend has the same event ID; two genuine PDF downloads have different IDs.
  const unique = [...new Map(events.map((event) => [event.id, event])).values()].filter((event) => {
    const timestamp = new Date(event.created_at).getTime();
    return timestamp >= since.getTime() && timestamp <= until.getTime();
  });
  const journeys = (kind: OrientationEventKind) =>
    new Set(unique.filter((event) => event.kind === kind).map((event) => event.journey_id));
  const started = journeys("started");
  const completed = journeys("test_completed");
  const planned = journeys("plan_ready");
  const cohortCount = (set: Set<string>) => [...started].filter((id) => set.has(id)).length;
  const cohortCompleted = cohortCount(completed);
  const cohortPlanned = cohortCount(planned);
  const ratio = (count: number, denominator: number) => (denominator ? count / denominator : null);

  const progress = new Map<string, number>();
  for (const event of unique) {
    if (!started.has(event.journey_id)) continue;
    const block =
      event.kind === "test_completed" ? 6 : event.kind === "block_completed" ? event.block : null;
    if (block != null) {
      progress.set(event.journey_id, Math.max(progress.get(event.journey_id) ?? 0, block));
    }
  }

  const requested = new Set(
    unique.filter((event) => event.kind === "ai_requested").map((event) => event.attempt_id),
  );
  const outcomes = new Map<string, OrientationEvent>();
  for (const event of [...unique].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )) {
    if (
      (event.kind === "ai_completed" || event.kind === "ai_failed") &&
      event.attempt_id &&
      requested.has(event.attempt_id)
    ) {
      outcomes.set(event.attempt_id, event);
    }
  }
  const successes = [...outcomes.values()].filter((event) => event.kind === "ai_completed");
  const failures = [...outcomes.values()].filter((event) => event.kind === "ai_failed").length;
  const durations = successes
    .flatMap((event) => (event.duration_ms == null ? [] : [event.duration_ms]))
    .sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  const medianMs = durations.length
    ? durations.length % 2
      ? durations[middle]
      : (durations[middle - 1] + durations[middle]) / 2
    : null;

  return {
    events: unique,
    visits: unique.filter((event) => event.kind === "visit").length,
    started: started.size,
    completed: completed.size,
    cohortCompleted,
    completionRate: ratio(cohortCompleted, started.size),
    parentsOpened: journeys("parent_opened").size,
    planned: planned.size,
    cohortPlanned,
    planRate: ratio(cohortPlanned, started.size),
    blocks: Array.from({ length: 6 }, (_, index) => ({
      questions: (index + 1) * 10,
      count: [...progress.values()].filter((block) => block >= index + 1).length,
    })),
    pdfDownloads: unique.filter((event) => event.kind === "pdf_downloaded").length,
    aiCompleted: unique.filter((event) => event.kind === "ai_completed").length,
    aiRequested: requested.size,
    aiPending: requested.size - outcomes.size,
    aiFailures: failures,
    aiFailureRate: ratio(failures, outcomes.size),
    medianMs,
  };
}
