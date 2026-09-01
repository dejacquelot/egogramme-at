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

  const handleOAuth = async (provider: "google" | "linkedin_oidc") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.href,
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
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
                onClick={() => handleOAuth("google")}
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
                onClick={() => handleOAuth("linkedin_oidc")}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0A66C2] hover:bg-[#004182] px-3 py-1.5 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="hidden sm:inline">LinkedIn</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
