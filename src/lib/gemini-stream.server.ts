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

/** Résultat d'une tentative d'appel Gemini avec retry. */
type GeminiAttemptResult =
  | { ok: true; upstream: Response }
  | { ok: false; errorResponse: Response };

/**
 * Envoie une requête à Gemini (system + user) avec la logique de retry
 * habituelle (503/429/500, repli sans thinkingConfig sur 400). Utilisée à la
 * fois pour la génération initiale et pour les appels de continuation.
 */
async function fetchGeminiWithRetry(
  apiKey: string,
  system: string,
  user: string,
): Promise<GeminiAttemptResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Le mode « réflexion » du modèle retarde le premier mot de 20 à 30 secondes
  // sans émettre le moindre octet. On le désactive pour que le texte commence
  // à s'afficher quasi immédiatement.
  const basePayload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  };
  const payload = JSON.stringify({
    ...basePayload,
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });
  // Repli si une future version du modèle rejette ce réglage (HTTP 400).
  const fallbackPayload = JSON.stringify(basePayload);
  let usedFallback = false;

  // Le modèle renvoie parfois 503 (surchargé) / 429 / 500 de façon transitoire.
  // On réessaie avec un backoff exponentiel avant d'abandonner.
  const RETRIABLE = new Set([429, 500, 503]);
  const MAX_ATTEMPTS = 4;
  const MAX_TOTAL_WAIT_MS = 12_000; // garde-fou : durée max d'une tentative de connexion
  let upstream: Response | null = null;
  let lastStatus = 0;
  let lastBody = "";
  let waitedMs = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: usedFallback ? fallbackPayload : payload,
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

    // Le seul ajout à la requête étant le réglage de réflexion, un HTTP 400
    // ne peut venir que de lui : on rejoue sans ce réglage (sans consommer
    // de tentative).
    if (lastStatus === 400 && !usedFallback) {
      console.warn("gemini: thinkingConfig refusé, repli sans ce réglage —", lastBody.slice(0, 200));
      usedFallback = true;
      upstream = null;
      attempt--;
      continue;
    }

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
      return {
        ok: false,
        errorResponse: new Response(
          "Le service d'IA est momentanément surchargé. Merci de réessayer dans quelques instants.",
          { status: 503 },
        ),
      };
    }
    if (lastStatus === 429) {
      if (isDailyQuota(lastBody)) {
        return {
          ok: false,
          errorResponse: new Response(
            "Quota journalier de l'IA atteint. Les analyses redeviendront disponibles demain, " +
              "ou immédiatement en activant la facturation sur la clé Gemini.",
            { status: 429 },
          ),
        };
      }
      const suggested = parseRetryDelayMs(lastBody);
      const seconds = suggested ? Math.ceil(suggested / 1000) : 30;
      return {
        ok: false,
        errorResponse: new Response(
          `Limite de vitesse de l'IA atteinte (trop d'analyses coup sur coup). ` +
            `Patientez environ ${seconds} secondes puis relancez.`,
          { status: 429 },
        ),
      };
    }
    return { ok: false, errorResponse: new Response("Analyse indisponible pour le moment.", { status: 502 }) };
  }

  return { ok: true, upstream };
}

/**
 * Consomme le corps SSE d'une réponse Gemini et retourne les fragments de
 * texte au fur et à mesure (générateur async), afin d'être ré-utilisable
 * aussi bien pour la génération initiale que pour une continuation.
 */
async function* sseTextChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parseLine = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("data:")) return null;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return null;
    try {
      const parsed = JSON.parse(payload) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
      return null; // fragment JSON incomplet — ignoré
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        const text = parseLine(buffer.trim());
        if (text) yield text;
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const text = parseLine(raw);
        if (text) yield text;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export async function streamGeminiText(
  system: string,
  user: string,
  opts?: { completionMarker?: string },
): Promise<Response> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return new Response("Clé IA manquante.", { status: 500 });

  const first = await fetchGeminiWithRetry(apiKey, system, user);
  if (first.ok === false) return first.errorResponse;

  const encoder = new TextEncoder();
  // Le flux Gemini se fait parfois couper (probablement par la passerelle
  // Google elle-même, autour de ~60s) avant la fin de la génération, ce qui
  // tronquait les analyses les plus longues (dernières sections manquantes).
  // Si un marqueur de fin attendu n'est pas trouvé, on relance automatiquement
  // un appel de continuation qui reprend exactement où le texte s'est arrêté.
  const MAX_CONTINUATIONS = 3;
  const completionMarker = opts?.completionMarker;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        let upstream = first.upstream;
        for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
          for await (const chunk of sseTextChunks(upstream.body!)) {
            fullText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          const isComplete = !completionMarker || fullText.includes(completionMarker);
          if (isComplete || round === MAX_CONTINUATIONS) break;

          console.warn(
            `gemini stream: texte tronqué (marqueur de fin absent), continuation ${round + 1}/${MAX_CONTINUATIONS}`,
          );
          const continuationUser =
            `${user}\n\n---\n` +
            `Voici le texte que tu as déjà rédigé pour cette même demande, interrompu en plein milieu :\n\n` +
            `${fullText}\n\n` +
            `---\nContinue directement la rédaction à partir de là où le texte ci-dessus s'arrête, ` +
            `sans rien répéter de ce qui précède, sans réintroduire de titre déjà traité, et sans commentaire ` +
            `sur la coupure. Termine toutes les sections restantes demandées initialement.`;
          const next = await fetchGeminiWithRetry(apiKey, system, continuationUser);
          if (next.ok === false) break; // on garde ce qui a déjà été généré plutôt que d'échouer
          upstream = next.upstream;
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
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
