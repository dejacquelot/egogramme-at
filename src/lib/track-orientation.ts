import type {
  OrientationEventInput,
  OrientationEventKind,
  OrientationEventMetadata,
} from "./orientation-stats";

export function createOrientationEvent(
  journeyId: string,
  kind: OrientationEventKind,
  metadata: OrientationEventMetadata = {},
): OrientationEventInput {
  return { id: crypto.randomUUID(), journey_id: journeyId, kind, ...metadata };
}

export async function sendOrientationEvent(event: OrientationEventInput): Promise<void> {
  const body = JSON.stringify(event);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch("/api/public/track-orientation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body,
        keepalive: true,
      });
    } catch (failure) {
      if (attempt === 1) throw failure;
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    if (response.ok) return;
    if (response.status >= 500 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    throw new Error(`Suivi statistique indisponible (HTTP ${response.status}).`);
  }
}

export function trackOrientation(
  journeyId: string | undefined,
  kind: OrientationEventKind,
  metadata: OrientationEventMetadata = {},
) {
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
  if (!journeyId) {
    console.warn("orientation: statistical event without a journey ID", kind);
    return;
  }
  void sendOrientationEvent(createOrientationEvent(journeyId, kind, metadata)).catch(
    (failure: unknown) => {
      console.warn(
        "orientation: statistical event not recorded",
        kind,
        failure instanceof Error ? failure.message : String(failure),
      );
    },
  );
}
