import { createFileRoute } from "@tanstack/react-router";
import { ApelWorkshop } from "@/components/apel-workshop";
import apelCss from "@/styles/apel.css?url";

const TITLE = "Test égogramme du bureau APEL : mieux fonctionner ensemble";
const DESCRIPTION =
  "Sélectionnez les membres présents, répondez ensemble aux 60 questions et découvrez vos rapports personnels et collectif.";

export const Route = createFileRoute("/apel")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { property: "og:image", content: "https://egogramme-at.vercel.app/apel-bureau.jpg" },
      { name: "twitter:image", content: "https://egogramme-at.vercel.app/apel-bureau.jpg" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Young+Serif&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,800&display=swap",
      },
      { rel: "preload", as: "image", href: "/apel-bureau.jpg" },
      { rel: "stylesheet", href: apelCss },
    ],
  }),
  component: ApelWorkshop,
});
