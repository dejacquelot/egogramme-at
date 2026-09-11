import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { buildDuoTeaser, DUO_SECTIONS, type TeaserRole } from "@/lib/karpman-teaser";

type UserInfo = { id?: string; email: string } | null;

/** Case du triangle : soit la personne, soit une inconnue assumée. */
function TriangleSlot({
  role,
  icon,
  filled,
  label,
}: {
  role: string;
  icon: string;
  filled: boolean;
  label: string;
}) {
  return (
    <div
      className={`min-w-[140px] rounded-lg border px-3 py-2 text-center ${
        filled
          ? "border-amber-400 bg-amber-100"
          : "border-dashed border-amber-300 bg-white/60"
      }`}
    >
      <div className="text-xs font-semibold text-amber-800">
        {icon} {role}
      </div>
      <div
        className={
          filled
            ? "text-xs font-medium text-amber-900"
            : "text-lg font-bold text-amber-400"
        }
      >
        {label}
      </div>
    </div>
  );
}

/** B3 — amorce réelle, inconnues désignées comme telles. */
function DuoTeaser({ scores }: { scores: Record<string, number> }) {
  const t = buildDuoTeaser(scores);
  const slot = (role: TeaserRole, icon: string) =>
    t.role === role ? (
      <TriangleSlot
        role={role}
        icon={icon}
        filled
        label={`Vous · ${t.driverLabel} ${t.driverScore}/10`}
      />
    ) : (
      <TriangleSlot role={role} icon={icon} filled={false} label="?" />
    );

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <p className="text-sm font-semibold text-amber-900">
        🔺 Ce que votre égogramme dit déjà de vos relations
      </p>

      <div className="mt-4 flex flex-col items-center gap-2">
        {slot("Persécuteur", "⚔️")}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
          {slot("Victime", "😢")}
          {slot("Sauveur", "🤲")}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm leading-relaxed text-amber-950">
        <p>{t.headline}</p>
        <p>{t.mechanism}</p>
        {t.nuance && <p>{t.nuance}</p>}
        <p className="text-amber-800">{t.adult}</p>
      </div>

      <p className="mt-4 rounded-lg border border-amber-300 bg-white/70 p-3 text-sm font-medium text-amber-900">
        🔒 {t.unknown} Il manque le second égogramme pour compléter les deux
        autres sommets.
      </p>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-amber-800">
        L'analyse à deux ajoute
      </p>
      <div className="mt-2 space-y-1.5">
        {DUO_SECTIONS.map((s) => (
          <div
            key={s.title}
            className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-white/50 px-3 py-2"
          >
            <span aria-hidden="true" className="text-sm">
              {s.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-900">{s.title}</p>
              <p
                aria-hidden="true"
                className="select-none text-xs text-amber-950/70 blur-[3px]"
              >
                {s.teaser}
              </p>
            </div>
            <span aria-hidden="true" className="text-xs text-amber-500">
              🔒
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** C — création du lien d'invitation, sans compte. */
function InviteGateway({
  resultId,
  onInvited,
}: {
  resultId: string | null;
  onInvited: () => void;
}) {
  const [inviteeName, setInviteeName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!resultId || !inviteeName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/public/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterResultId: resultId,
          inviteeFirstName: inviteeName.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Création impossible.");
      const url = `${window.location.origin}/?inv=${json.token}`;
      setLink(url);
      onInvited();
      try {
        const raw = localStorage.getItem("egogramme_invitations");
        const list = raw ? JSON.parse(raw) : [];
        list.push({ token: json.token, name: inviteeName.trim(), resultId });
        localStorage.setItem("egogramme_invitations", JSON.stringify(list));
      } catch {
        /* stockage local indisponible : non bloquant */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setCreating(false);
    }
  };

  const shareText = link
    ? `J'ai fait mon égogramme et l'analyse à deux m'intéresse. Fais le tien (5 min), on aura une lecture de notre relation : ${link}`
    : "";

  if (link) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-emerald-900">
          ✅ Le lien pour {inviteeName.trim()} est prêt
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          Envoyez-le lui. Dès qu'{inviteeName.trim()} aura répondu, votre analyse
          à deux pourra être générée.
        </p>
        <div className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2">
          <p className="break-all text-xs text-gray-700">{link}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "✅ Copié" : "📋 Copier le lien"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 WhatsApp
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`mailto:?subject=${encodeURIComponent(
                "Ton égogramme, pour une analyse à deux",
              )}&body=${encodeURIComponent(shareText)}`}
            >
              ✉️ Email
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-semibold text-indigo-900">
        Débloquez votre analyse à deux
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Aucun compte nécessaire : indiquez un prénom, récupérez un lien, et
        envoyez-le à la personne concernée.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="invitee-first-name" className="text-xs">
            Prénom de la personne
          </Label>
          <Input
            id="invitee-first-name"
            value={inviteeName}
            onChange={(e) => setInviteeName(e.target.value)}
            placeholder="Camille"
            maxLength={120}
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating || !inviteeName.trim() || !resultId}
          className="w-full sm:w-auto"
        >
          {creating ? "Création…" : "Obtenir le lien"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** A — le compte, demandé après la valeur et pour la bonne raison. */
function AccountGateway({
  resultId,
  invited,
}: {
  resultId: string | null;
  invited: boolean;
}) {
  const [registering, setRegistering] = useState(false);

  const handleOAuth = async (provider: "google" | "linkedin_oidc") => {
    setRegistering(true);
    if (resultId && typeof window !== "undefined") {
      localStorage.setItem("egogramme_pending_result", resultId);
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/mon-espace`,
        ...(provider === "google"
          ? { queryParams: { prompt: "select_account" } }
          : {}),
      },
    });
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-semibold text-indigo-900">
        {invited
          ? "Soyez prévenu dès que la réponse arrive"
          : "Retrouvez votre analyse plus tard"}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {invited
          ? "Votre compte vous permet de suivre les réponses, de générer l'analyse à deux et de la retrouver depuis n'importe quel appareil."
          : "Votre espace personnel conserve vos réponses, vos invitations et vos analyses, sur tous vos appareils."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => handleOAuth("google")}
          disabled={registering}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-black shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.5l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.15-3.2-.45-4.7H24v9h12.6c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.3z" />
            <path fill="#FBBC05" d="M10.5 19.6a14.6 14.6 0 000 8.8l-7.9 6.1A23.5 23.5 0 01.5 24c0-3.8.9-7.4 2.1-10.5l7.9 6.1z" />
            <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.2 14.6 47.5 24 47.5z" />
          </svg>
          Google
        </button>
        <button
          onClick={() => handleOAuth("linkedin_oidc")}
          disabled={registering}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0A66C2] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#004182] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        En créant votre compte, vous acceptez que vos réponses et votre profil
        soient conservés dans votre espace personnel.{" "}
        <a
          href="/confidentialite"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline hover:text-indigo-800"
        >
          Politique de confidentialité
        </a>
        .
      </p>
    </div>
  );
}

/**
 * Retour de l'inviteur sans compte : ses invitations sont conservées en local,
 * on vérifie si quelqu'un a répondu. C'est le moment où le compte cesse d'être
 * un péage pour devenir la clé d'un coffre déjà rempli.
 */
export function InviteReturnBanner({ user }: { user: UserInfo }) {
  const [answered, setAnswered] = useState<string[]>([]);
  const [originResultId, setOriginResultId] = useState<string | null>(null);

  useEffect(() => {
    if (user || typeof window === "undefined") return;
    let stored: Array<{ token: string; name: string; resultId: string }> = [];
    try {
      const raw = localStorage.getItem("egogramme_invitations");
      stored = raw ? JSON.parse(raw) : [];
    } catch {
      return;
    }
    const resultId = stored[0]?.resultId;
    if (!resultId) return;
    setOriginResultId(resultId);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/invite?resultId=${encodeURIComponent(resultId)}`,
        );
        const json = await res.json();
        if (cancelled || !json?.ok) return;
        const done = (json.invitations ?? [])
          .filter((i: { status: string }) => i.status === "completed")
          .map(
            (i: { invitee_first_name: string | null; invitee_name: string | null }) =>
              i.invitee_first_name || i.invitee_name || "Votre invité",
          );
        setAnswered(done);
      } catch {
        /* hors ligne : non bloquant */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user || answered.length === 0) return null;

  const names =
    answered.length === 1
      ? answered[0]
      : `${answered.slice(0, -1).join(", ")} et ${answered[answered.length - 1]}`;

  return (
    <div className="mb-4 space-y-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 sm:p-5">
      <p className="text-sm font-semibold text-emerald-900">
        🔔 {names} {answered.length === 1 ? "a répondu" : "ont répondu"} — votre
        analyse à {answered.length === 1 ? "deux" : "plusieurs"} est prête à être
        générée.
      </p>
      <p className="text-xs text-emerald-800">
        Créez votre compte pour l'ouvrir : elle vous attend dans votre espace
        personnel.
      </p>
      <AccountGateway resultId={originResultId} invited />
    </div>
  );
}

/**
 * Passerelle affichée sous l'analyse individuelle terminée : le seul moment
 * où la personne a la valeur en main et se demande « et avec l'autre ? ».
 */
export function DuoNextStep({
  scores,
  resultId,
  user,
}: {
  scores: Record<string, number>;
  resultId: string | null;
  user: UserInfo;
}) {
  const [invited, setInvited] = useState(false);

  return (
    <div className="mt-8 space-y-4 border-t border-border pt-6">
      <DuoTeaser scores={scores} />
      {user ? (
        <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold text-indigo-900">
            Invitez quelqu'un depuis votre espace
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Vos invitations et vos analyses à plusieurs s'y retrouvent au même
            endroit.
          </p>
          <Link to="/mon-espace" className="mt-3 inline-block">
            <Button size="sm">👥 Aller dans Mon Espace</Button>
          </Link>
        </div>
      ) : (
        <>
          <InviteGateway resultId={resultId} onInvited={() => setInvited(true)} />
          <AccountGateway resultId={resultId} invited={invited} />
        </>
      )}
    </div>
  );
}
