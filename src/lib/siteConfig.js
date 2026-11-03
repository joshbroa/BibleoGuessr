/**
 * Public-facing details about who runs this site.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  FILL THESE IN BEFORE LAUNCH. The legal pages quote them verbatim, and a
 *  privacy policy that cannot tell a visitor who holds their data, or how to
 *  reach them, does not do the job it exists to do.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The name the site trades under. */
export const SITE_NAME = 'BibleoGuessr';

/**
 * Canonical origin, no trailing slash — used in page metadata and in the
 * Cloud Functions CORS allowlist. Set this to your Vercel URL, or to your own
 * domain once one is pointed at the deployment.
 */
export const SITE_URL = 'https://bibleoguessr.com';

/**
 * Who is legally responsible for personal data ("the data controller").
 * An individual running this as a hobby may simply use their own name.
 */
export const CONTROLLER_NAME = 'Joshua Broadhurst';

/** Where privacy and support enquiries should go. Must be a monitored address. */
export const CONTACT_EMAIL = 'privacy@bibleoguessr.com';

/**
 * Country whose law governs the terms, and whose data-protection regulator
 * visitors may complain to. Defaults assume the United Kingdom; change both if
 * that is not where you are.
 */
export const GOVERNING_LAW = 'England and Wales';
export const SUPERVISORY_AUTHORITY = {
  name: "the Information Commissioner's Office (ICO)",
  url: 'https://ico.org.uk/make-a-complaint/',
};

/** Date the current legal text took effect. Bump it whenever you change them. */
export const POLICY_EFFECTIVE_DATE = '2 November 2026';

/** Minimum age for an account, per the terms. */
export const MINIMUM_AGE = 13;

/** True while any required detail is still a placeholder. */
export const SITE_CONFIG_INCOMPLETE = [CONTROLLER_NAME, CONTACT_EMAIL].some((value) =>
  value.startsWith('TODO')
);
