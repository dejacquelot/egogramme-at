/**
 * Client de /api/test-progress : synchronise les réponses du test avec le compte.
 *
 * Toutes les erreurs sont silencieuses : la persistance locale (localStorage)
 * reste le mécanisme principal, la synchronisation serveur n'est qu'un confort
 * multi-appareils. Une panne réseau ne doit jamais bloquer le test.
 */

const ANSWER_COUNT = 60;

export type Answers = (boolean | undefined)[];

const toWire = (answers: Answers): (boolean | null)[] =>
  answers.map((v) => (v === undefined ? null : v));

const fromWire = (raw: unknown): Answers | null => {
  if (!Array.isArray(raw) || raw.length !== ANSWER_COUNT) return null;
  return raw.map((v) => (typeof v === "boolean" ? v : undefined));
};

async function call<T>(payload: unknown): Promise<T | null> {
  try {
    const res = await fetch("/api/test-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean };
    if (!res.ok || !data?.ok) return null;
    return data as T;
  } catch {
    return null;
  }
}

export const progressApi = {
  async get(userId: string): Promise<Answers | null> {
    const data = await call<{ ok: true; answers: unknown }>({ action: "get", userId });
    return data ? fromWire(data.answers) : null;
  },

  async save(userId: string, answers: Answers): Promise<void> {
    await call({ action: "save", userId, answers: toWire(answers) });
  },
};
