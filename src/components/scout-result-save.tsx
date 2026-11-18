import { useEffect, useState } from "react";
import { scoutResults } from "@/lib/scout-results";
import type { ApelSession } from "@/lib/apel-session";

export function ScoutResultSave({ session }: { session: ApelSession }) {
  const [payload] = useState(() => scoutResults(session));
  const [attempt, retry] = useState(0);
  const [status, setStatus] = useState<"saving" | "saved" | "error">("saving");
  useEffect(() => {
    let active = true;
    async function save() {
      try {
        const res = await fetch("/api/public/scout-save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok || !(await res.json()).ok) throw new Error("Enregistrement refusé");
        if (active) setStatus("saved");
      } catch {
        if (active) setStatus("error");
      }
    }
    void save();
    return () => { active = false; };
  }, [payload, attempt]);
  return <div className="apel-note" role="status">
    {status === "saving" ? "Enregistrement des scores pour l’administration…"
      : status === "saved" ? "Les scores sont enregistrés pour l’administration."
      : <>Les scores n’ont pas pu être enregistrés. <button type="button" className="apel-text"
          onClick={() => {setStatus("saving"); retry(n => n + 1);}}>Réessayer l’enregistrement</button></>}
  </div>;
}
