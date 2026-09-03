/**
 * Proxy de streaming vers l'API Gemini (Server-Sent Events).
 * Renvoie une Response en flux (text/plain) qui émet le texte au fur et à
 * mesure de sa génération, afin de réduire drastiquement la latence perçue.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  let upstream: Response | null = null;
  let lastStatus = 0;
  let lastBody = "";

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
    if (RETRIABLE.has(upstream.status) && attempt < MAX_ATTEMPTS - 1) {
      console.warn(`gemini stream ${upstream.status} — tentative ${attempt + 1}/${MAX_ATTEMPTS}`);
      await sleep(500 * 2 ** attempt); // 0.5s, 1s, 2s
      upstream = null;
      continue;
    }
    break;
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    console.error("gemini stream error", lastStatus, lastBody.slice(0, 300));
    if (lastStatus === 503) {
      return new Response(
        "Le service d'IA est momentanément surchargé. Merci de réessayer dans quelques instants.",
        { status: 503 },
      );
    }
    if (lastStatus === 429) {
      return new Response("Trop de requêtes, réessayez dans un instant.", { status: 429 });
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
