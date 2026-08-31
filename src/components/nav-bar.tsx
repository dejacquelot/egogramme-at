import { Link, useRouterState } from "@tanstack/react-router";

type NavBarProps = {
  isAdmin: boolean;
};

const USER_LINKS = [
  { to: "/", label: "🧠 Test" },
  { to: "/mon-espace", label: "👥 Mon Espace" },
] as const;

const ADMIN_LINKS = [
  { to: "/", label: "🧠 Test" },
  { to: "/mon-espace", label: "👥 Mon Espace" },
  { to: "/stats", label: "📊 Statistiques" },
  { to: "/admin", label: "⚙️ Administration" },
] as const;

export function NavBar({ isAdmin }: NavBarProps) {
  const links = isAdmin ? ADMIN_LINKS : USER_LINKS;
  const { location } = useRouterState();
  const current = location.pathname;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2">
        <span className="mr-4 text-sm font-bold text-gray-700 tracking-tight">Égogramme</span>
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
    </nav>
  );
}
