import { z } from "zod";

export const downloadLabels = {
  solo: "Test individuel", duo: "Couple", apel: "Bureau APEL", scout: "Scouts",
  orientation: "Orientation", espace: "Mon espace", admin: "Administration",
} as const;
export const downloadSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["solo", "duo", "apel", "scout", "espace", "admin"]),
  format: z.enum(["pdf", "png"]),
}).strict();
export type DownloadCount = { source: string; format: string; total: number };

export async function trackDownload(source: z.infer<typeof downloadSchema>["source"], format: "pdf" | "png") {
  try {
    const response = await fetch("/api/public/report-download", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ id: crypto.randomUUID(), source, format }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn("Suivi du téléchargement indisponible", error);
  }
}
