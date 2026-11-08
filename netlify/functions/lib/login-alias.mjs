const AUTH_ALIAS_DOMAIN = "stemacademy.edu.pk";

/**
 * Convert a permanent STEM Academy ID into its Firebase
 * Authentication email alias.
 *
 * Student: SA-2026-001 -> sa-2026-001@stemacademy.edu.pk
 * Teacher: SA-TCH-001  -> sa-tch-001@stemacademy.edu.pk
 * Admin:   SA-ADM-001  -> sa-adm-001@stemacademy.edu.pk
 *
 * This alias is an authentication identifier, not a contact email.
 */
export function academyIdToAuthEmail(academyId) {
  if (typeof academyId !== "string") {
    throw new TypeError("A valid academy ID is required.");
  }

  const normalizedId = academyId.trim().toUpperCase();

  const validStudentId = /^SA-\d{4}-\d{3,}$/;
  const validStaffId = /^SA-(TCH|ADM)-\d{3,}$/;

  if (
    !validStudentId.test(normalizedId) &&
    !validStaffId.test(normalizedId)
  ) {
    throw new TypeError("Invalid STEM Academy ID.");
  }

  return `${normalizedId.toLowerCase()}@${AUTH_ALIAS_DOMAIN}`;
}
