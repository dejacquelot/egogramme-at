import { createFileRoute } from "@tanstack/react-router";
import { ApelWorkshop } from "@/components/apel-workshop";
import workshopCss from "@/styles/apel.css?url";

const title = "Notre maîtrise scoute : préparer le prochain camp ensemble";
const description = "Un atelier pour les chefs d'une même maîtrise et les parents : un rapport par participant et une synthèse réservée au groupe des chefs.";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [{ title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description }],
    links: [{ rel: "stylesheet", href: workshopCss }],
  }),
  component: () => <ApelWorkshop scout />,
});
