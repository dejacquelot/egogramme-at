/**
 * Appelle une route de streaming et invoque `onDelta` avec le texte cumulé
 * à chaque fragment reçu. Renvoie le texte complet à la fin du flux.
 */
export async function streamAnalysis(
  url: string,
  body: unknown,
  onDelta: (fullText: string) => void,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Erreur ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }
  full += decoder.decode();
  if (full) onDelta(full);
  return full;
}
