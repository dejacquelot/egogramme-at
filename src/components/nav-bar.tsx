import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";

type NavBarProps = {
  isAdmin?: boolean; // override optionnel (pages admin)
};

const BASE_LINKS = [
  { to: "/", label: "🧠 Test" },
  { to: "/mon-espace", label: "👥 Mon Espace" },
] as const;

const ADMIN_EXTRA = [
  { to: "/stats", label: "📊 Statistiques" },
  { to: "/utilisateurs", label: "👥 Utilisateurs" },
  { to: "/admin", label: "⚙️ Administration" },
] as const;

type UserInfo = { email: string; name: string } | null;

export function NavBar({ isAdmin: isAdminOverride }: NavBarProps = {}) {
  const { location } = useRouterState();
  const current = location.pathname;

  const [user, setUser] = useState<UserInfo>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        setUser({
          email: data.user.email ?? "",
          name: (meta.full_name as string) ?? (meta.given_name as string) ?? data.user.email ?? "",
        });
      }
      setAuthLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser({
          email: session.user.email ?? "",
          name: (meta.full_name as string) ?? (meta.given_name as string) ?? session.user.email ?? "",
        });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const admin = isAdminOverride ?? (user ? isAdminEmail(user.email) : false);
  const links = admin
    ? [...BASE_LINKS, ...ADMIN_EXTRA]
    : user
      ? BASE_LINKS
      : [];

  const handleSignInGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setMagicLoading(false);
    if (!error) setMagicSent(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Ne pas afficher la navbar si pas connecté et pas de liens
  if (!authLoaded) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2">
        <span className="mr-4 text-sm font-bold text-gray-700 tracking-tight">Égogramme</span>

        <div className="flex flex-1 items-center gap-1">
          {links.map((link) => {
            const active = current === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Auth zone — right side */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-gray-500 sm:inline">{user.name}</span>
              <button
                onClick={handleSignOut}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <div className="relative flex items-center gap-1.5">
              <button
                onClick={handleSignInGoogle}
                className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors cursor-pointer"
              >
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.5l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.15-3.2-.45-4.7H24v9h12.6c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.3z" />
                  <path fill="#FBBC05" d="M10.5 19.6a14.6 14.6 0 000 8.8l-7.9 6.1A23.5 23.5 0 01.5 24c0-3.8.9-7.4 2.1-10.5l7.9 6.1z" />
                  <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.2 14.6 47.5 24 47.5z" />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                onClick={() => setShowEmailForm(!showEmailForm)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                ✉️ <span className="hidden sm:inline">Email</span>
              </button>
              {showEmailForm && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg z-50">
                  {magicSent ? (
                    <p className="text-sm text-green-700 text-center">
                      ✅ Lien envoyé à <strong>{magicEmail}</strong> !<br />
                      <span className="text-xs text-muted-foreground">Vérifiez votre boîte mail (et les spams).</span>
                    </p>
                  ) : (
                    <form onSubmit={handleMagicLink} className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Recevez un lien de connexion par email :</p>
                      <input
                        type="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="votre@email.com"
                        required
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={magicLoading}
                        className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {magicLoading ? "Envoi…" : "Envoyer le lien"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
