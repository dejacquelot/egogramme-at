/**
 * Proxy de streaming vers l'API Gemini (Server-Sent Events).
 * Renvoie une Response en flux (text/plain) qui émet le texte au fur et à
 * mesure de sa génération, afin de réduire drastiquement la latence perçue.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extrait le délai conseillé par Google (RetryInfo) depuis le corps d'erreur. */
function parseRetryDelayMs(body: string): number | null {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  if (!match) return null;
  return Math.round(parseFloat(match[1]) * 1000);
}

/** Détecte un dépassement de quota journalier (irrécupérable par un retry). */
function isDailyQuota(body: string): boolean {
  return /PerDay|per day|FreeTier/i.test(body);
}

export async function streamGeminiText(system: string, user: string): Promise<Response> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return new Response("Clé IA manquante.", { status: 500 });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  });

  // Le modèle renvoie parfois 503 (surchargé) / 429 / 500 de façon transitoire.
  // On réessaie avec un backoff exponentiel avant d'abandonner.
  const RETRIABLE = new Set([429, 500, 503]);
  const MAX_ATTEMPTS = 4;
  const MAX_TOTAL_WAIT_MS = 12_000; // garde-fou : durée max d'une fonction serverless
  let upstream: Response | null = null;
  let lastStatus = 0;
  let lastBody = "";
  let waitedMs = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    } catch (e) {
      // Erreur réseau : on retente comme pour un statut transitoire.
      lastStatus = 0;
      lastBody = String(e);
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      break;
    }

    if (upstream.ok && upstream.body) break;

    lastStatus = upstream.status;
    lastBody = await upstream.text().catch(() => "");

    // Un quota journalier ne se résout pas en réessayant : on abandonne tout de suite.
    if (lastStatus === 429 && isDailyQuota(lastBody)) break;

    if (RETRIABLE.has(upstream.status) && attempt < MAX_ATTEMPTS - 1) {
      // Respecte le délai conseillé par Google quand il est fourni.
      const suggested = parseRetryDelayMs(lastBody);
      const backoff = 500 * 2 ** attempt;
      const delay = Math.min(suggested ?? backoff, 8000);
      if (waitedMs + delay > MAX_TOTAL_WAIT_MS) break;
      console.warn(
        `gemini stream ${upstream.status} — tentative ${attempt + 1}/${MAX_ATTEMPTS}, attente ${delay}ms`,
      );
      waitedMs += delay;
      await sleep(delay);
      upstream = null;
      continue;
    }
    break;
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    console.error("gemini stream error", lastStatus, lastBody.slice(0, 500));
    if (lastStatus === 503) {
      return new Response(
        "Le service d'IA est momentanément surchargé. Merci de réessayer dans quelques instants.",
        { status: 503 },
      );
    }
    if (lastStatus === 429) {
      if (isDailyQuota(lastBody)) {
        return new Response(
          "Quota journalier de l'IA atteint. Les analyses redeviendront disponibles demain, " +
            "ou immédiatement en activant la facturation sur la clé Gemini.",
          { status: 429 },
        );
      }
      const suggested = parseRetryDelayMs(lastBody);
      const seconds = suggested ? Math.ceil(suggested / 1000) : 30;
      return new Response(
        `Limite de vitesse de l'IA atteinte (trop d'analyses coup sur coup). ` +
          `Patientez environ ${seconds} secondes puis relancez.`,
        { status: 429 },
      );
    }
    return new Response("Analyse indisponible pour le moment.", { status: 502 });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // Flush a trailing event that wasn't newline-terminated
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data:")) {
            const payload = trimmed.slice(5).trim();
            if (payload && payload !== "[DONE]") {
              try {
                const parsed = JSON.parse(payload) as {
                  candidates?: { content?: { parts?: { text?: string }[] } }[];
                };
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                /* ignoré */
              }
            }
          }
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            /* fragment JSON incomplet — ignoré */
          }
        }
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
