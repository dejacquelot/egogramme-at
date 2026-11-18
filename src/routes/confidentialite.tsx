import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/nav-bar";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Égogramme" },
      { name: "description", content: "Politique de confidentialité de l'application Égogramme" },
    ],
  }),
  component: Confidentialite,
});

function Confidentialite() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 text-slate-900">Politique de confidentialité</h1>
        <p className="text-xs text-muted-foreground mb-8">
          Dernière mise à jour : 14 novembre 2026
        </p>

        <div className="prose prose-sm max-w-none text-slate-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-800">1. Responsable du traitement</h2>
            <p>
              L'application <strong>Égogramme</strong> (accessible à l'adresse{" "}
              <a href="https://egogramme-at.vercel.app" className="text-indigo-600 underline">
                egogramme-at.vercel.app
              </a>
              ) est éditée et opérée par son créateur à des fins de développement personnel et de
              coaching. Pour toute question relative à vos données, contactez-nous à l'adresse :{" "}
              <a href="mailto:dejacquelot@gmail.com" className="text-indigo-600 underline">
                dejacquelot@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">2. Données collectées</h2>
            <p>Pour une séance scoute, le groupe peut autoriser séparément l’enregistrement de la date, des prénoms, des rôles et des six scores individuels. L’administrateur peut alors consulter ces résultats et la moyenne des chefs présents, hors parents. Cet enregistrement facultatif ne comprend ni les réponses détaillées ni les rapports IA. Effacer la séance du navigateur ne supprime pas les résultats déjà transmis.</p>
            <p>Nous collectons les données suivantes uniquement lorsque vous créez un compte :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Données d'identification</strong> : nom, prénom, adresse e-mail (fournies
                via Google OAuth).
              </li>
              <li>
                <strong>Résultats du test d'égogramme</strong> : vos scores sur les 6 états du moi
                (Parent Nourricier, Parent Normatif, Adulte, Enfant Libre, Enfant Adapté Soumis,
                Enfant Adapté Rebelle).
              </li>
              <li>
                <strong>Analyses générées</strong> : les interprétations individuelles et
                collectives produites par intelligence artificielle à partir de vos scores.
              </li>
              <li>
                <strong>Données d'invitations</strong> : nom et e-mail des personnes que vous
                invitez à passer le test.
              </li>
            </ul>
            <p className="mt-2">
              <strong>Sans compte</strong>, vos réponses au test sont traitées localement dans votre
              navigateur et ne sont pas conservées sur nos serveurs au-delà de la session.
            </p>
            <p className="mt-2">
              <strong>Parcours Orientation</strong> : aucun compte n'est nécessaire. Le carnet n'est
              pas enregistré dans notre base de données. Si vous demandez une analyse IA après
              accord explicite, les 60 réponses et les trois champs facultatifs (intérêts,
              expérience vécue, curiosité) sont transmis à Google Gemini via notre serveur. Les
              notes du parent et du lycéen dans le dialogue, ainsi que le plan d'action, ne sont pas
              transmis à l'IA. Ne saisissez pas de coordonnées, de nom complet, d'établissement ou
              d'information sensible.
            </p>
            <p className="mt-2">
              <strong>Statistiques Orientation</strong> : nous enregistrons les ouvertures de page,
              démarrages, blocs de 10 questions terminés, ouvertures du volet parent, présence
              d'une action avec une échéance, téléchargements PDF déclenchés et résultats des
              demandes IA (réussite ou échec, durée). Seuls des identifiants aléatoires de parcours,
              d'événement et de demande, des dates, des numéros de blocs et des durées sont conservés
              dans Supabase. Aucun nom, adresse IP, empreinte de navigateur, score, réponse,
              métier proposé ou texte du carnet n'est enregistré avec ces statistiques.
              Les détails sont accessibles uniquement à l'administrateur connecté.
              Le signal « Ne pas me suivre » du navigateur désactive ce suivi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">3. Finalités du traitement</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Générer et afficher votre profil d'égogramme personnel.</li>
              <li>
                Permettre les analyses collectives entre vous et les personnes que vous avez
                invitées.
              </li>
              <li>
                Conserver vos résultats dans votre espace personnel pour consultation ultérieure.
              </li>
              <li>
                Vous envoyer des rappels concernant vos invitations (uniquement à votre demande).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">4. Base légale</h2>
            <p>
              Le traitement de vos données repose sur votre <strong>consentement explicite</strong>{" "}
              (article 6.1.a du RGPD), recueilli lors de la création de votre compte via la case à
              cocher obligatoire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">5. Destinataires des données</h2>
            <p>
              Vos données ne sont jamais vendues ni partagées avec des tiers à des fins
              commerciales. Les seuls sous-traitants techniques sont :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Supabase</strong> (hébergement et base de données) — serveurs en Union
                Européenne.
              </li>
              <li>
                <strong>Google</strong> (authentification OAuth et API Gemini pour la génération
                d'analyses).
              </li>
              <li>
                <strong>Vercel</strong> (hébergement de l'application web).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">6. Durée de conservation</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la
              suppression de votre compte et de toutes vos données à tout moment en nous contactant
              par e-mail.
            </p>
            <p>
              Pour le parcours Orientation, le carnet reste en mémoire dans la page, sauf si vous
              choisissez de le garder sur cet appareil. Cette option le conserve dans le stockage
              local du navigateur jusqu'à son effacement. Toute personne utilisant ce navigateur
              peut alors le retrouver. Le bouton « Effacer mon carnet » supprime cette sauvegarde.
              Les PDF téléchargés restent sur votre appareil et doivent être supprimés séparément.
              L'identifiant statistique du parcours est conservé avec le carnet uniquement si
              vous choisissez cette sauvegarde. Effacer le carnet crée un nouveau parcours et
              ne supprime pas les événements statistiques déjà reçus. Pour une demande d'effacement
              de ces événements, vous pouvez nous transmettre cet identifiant du carnet sauvegardé
              par le contact indiqué ci-dessus, sans transmettre vos réponses ou vos notes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">7. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles.
              </li>
              <li>
                <strong>Droit de rectification</strong> : corriger des données inexactes.
              </li>
              <li>
                <strong>Droit à l'effacement</strong> : demander la suppression de vos données.
              </li>
              <li>
                <strong>Droit à la portabilité</strong> : recevoir vos données dans un format
                structuré.
              </li>
              <li>
                <strong>Droit de retrait du consentement</strong> : retirer votre consentement à
                tout moment.
              </li>
              <li>
                <strong>Droit de réclamation</strong> : introduire une réclamation auprès de la
                CNIL.
              </li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, adressez votre demande à{" "}
              <a href="mailto:dejacquelot@gmail.com" className="text-indigo-600 underline">
                dejacquelot@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
              protéger vos données : chiffrement en transit (HTTPS/TLS), authentification sécurisée
              (OAuth 2.0), accès restreint aux bases de données, et hébergement chez des
              prestataires certifiés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">9. Cookies</h2>
            <p>
              L'application utilise uniquement des cookies techniques nécessaires au fonctionnement
              (session d'authentification). Aucun cookie publicitaire n'est utilisé.
              Le suivi statistique Orientation n'utilise pas de cookie ni d'identifiant partagé
              avec les autres parcours ou sites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">10. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. En cas de modification substantielle, vous
              serez informé(e) lors de votre prochaine connexion.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
