import { createFileRoute, Link } from "@tanstack/react-router";
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
        <p className="text-xs text-muted-foreground mb-8">Dernière mise à jour : 1er septembre 2026</p>

        <div className="prose prose-sm max-w-none text-slate-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-800">1. Responsable du traitement</h2>
            <p>
              L'application <strong>Égogramme</strong> (accessible à l'adresse{" "}
              <a href="https://egogramme-at.vercel.app" className="text-indigo-600 underline">
                egogramme-at.vercel.app
              </a>
              ) est éditée et opérée par son créateur à des fins de développement personnel et de coaching.
              Pour toute question relative à vos données, contactez-nous à l'adresse :{" "}
              <a href="mailto:dejacquelot@gmail.com" className="text-indigo-600 underline">
                dejacquelot@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">2. Données collectées</h2>
            <p>Nous collectons les données suivantes uniquement lorsque vous créez un compte :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Données d'identification</strong> : nom, prénom, adresse e-mail (fournies via Google OAuth).</li>
              <li><strong>Résultats du test d'égogramme</strong> : vos scores sur les 6 états du moi (Parent Nourricier, Parent Normatif, Adulte, Enfant Libre, Enfant Adapté Soumis, Enfant Adapté Rebelle).</li>
              <li><strong>Analyses générées</strong> : les interprétations individuelles et collectives produites par intelligence artificielle à partir de vos scores.</li>
              <li><strong>Données d'invitations</strong> : nom et e-mail des personnes que vous invitez à passer le test.</li>
            </ul>
            <p className="mt-2">
              <strong>Sans compte</strong>, vos réponses au test sont traitées localement dans votre navigateur et ne sont pas conservées sur nos serveurs au-delà de la session.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">3. Finalités du traitement</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Générer et afficher votre profil d'égogramme personnel.</li>
              <li>Permettre les analyses collectives entre vous et les personnes que vous avez invitées.</li>
              <li>Conserver vos résultats dans votre espace personnel pour consultation ultérieure.</li>
              <li>Vous envoyer des rappels concernant vos invitations (uniquement à votre demande).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">4. Base légale</h2>
            <p>
              Le traitement de vos données repose sur votre <strong>consentement explicite</strong> (article 6.1.a du RGPD),
              recueilli lors de la création de votre compte via la case à cocher obligatoire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">5. Destinataires des données</h2>
            <p>Vos données ne sont jamais vendues ni partagées avec des tiers à des fins commerciales. Les seuls sous-traitants techniques sont :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase</strong> (hébergement et base de données) — serveurs en Union Européenne.</li>
              <li><strong>Google</strong> (authentification OAuth et API Gemini pour la génération d'analyses).</li>
              <li><strong>Vercel</strong> (hébergement de l'application web).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">6. Durée de conservation</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression
              de votre compte et de toutes vos données à tout moment en nous contactant par e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">7. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles.</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes.</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données.</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré.</li>
              <li><strong>Droit de retrait du consentement</strong> : retirer votre consentement à tout moment.</li>
              <li><strong>Droit de réclamation</strong> : introduire une réclamation auprès de la CNIL.</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, adressez votre demande à{" "}
              <a href="mailto:dejacquelot@gmail.com" className="text-indigo-600 underline">
                dejacquelot@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
              chiffrement en transit (HTTPS/TLS), authentification sécurisée (OAuth 2.0),
              accès restreint aux bases de données, et hébergement chez des prestataires certifiés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">9. Cookies</h2>
            <p>
              L'application utilise uniquement des cookies techniques nécessaires au fonctionnement
              (session d'authentification). Aucun cookie publicitaire ou de traçage n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800">10. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. En cas de modification substantielle,
              vous serez informé(e) lors de votre prochaine connexion.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <Link to="/" className="text-indigo-600 underline text-sm hover:text-indigo-800">
            ← Retour au test
          </Link>
        </div>
      </main>
    </div>
  );
}
