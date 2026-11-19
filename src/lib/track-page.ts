export const TRACKED_PAGES = ["duo", "apel", "scout"] as const;
export type TrackedPage = (typeof TRACKED_PAGES)[number];
export type TrackedKind = "visit" | "start" | "report";

/** Envoi anonyme et silencieux : un échec de suivi ne doit jamais gêner le parcours. */
export function trackPage(page: TrackedPage, kind: TrackedKind): void {
  if (typeof window === "undefined") return;
  void fetch("/api/public/track-page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, kind }),
    keepalive: true,
  }).catch(() => {});
}
