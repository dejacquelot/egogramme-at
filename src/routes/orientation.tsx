import { createFileRoute } from "@tanstack/react-router";
import { OrientationWorkshop } from "@/components/orientation-workshop";
import orientationCss from "@/styles/orientation.css?url";

const TITLE = "Orientation : mes forces, mes pistes, mes essais";
const DESCRIPTION =
  "Un parcours pour mieux te connaître, explorer des métiers sans te mettre dans une case et en parler avec tes parents, à ton rythme.";

export const Route = createFileRoute("/orientation")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: "https://egogramme-at.vercel.app/orientation-essayer.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://egogramme-at.vercel.app/orientation-essayer.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: orientationCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&display=swap",
      },
      { rel: "preload", as: "image", href: "/orientation-connaitre.jpg" },
    ],
  }),
  component: OrientationWorkshop,
});
