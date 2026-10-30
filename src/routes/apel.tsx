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
    ],
    links: [{ rel: "stylesheet", href: apelCss }],
  }),
  component: ApelWorkshop,
});
