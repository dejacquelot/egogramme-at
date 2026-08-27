/** Emails autorisés à accéder à l'espace d'administration. */
export const ADMIN_EMAILS = [
  "dejacquelot@gmail.com",
  "auroredejacquelot@gmail.com",
  "pinpin",
];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export const TEAM_ANALYSIS_LABELS: Record<string, string> = {
  PN: "Parent Nourricier",
  PNo: "Parent Normatif",
  A: "Adulte",
  EL: "Enfant Libre",
  EAS: "Enfant Adapté Soumis",
  EAR: "Enfant Adapté Rebelle",
};
