import LegalLayout from '@/components/LegalLayout';
import {
  SITE_NAME,
  CONTROLLER_NAME,
  CONTACT_EMAIL,
  SUPERVISORY_AUTHORITY,
  MINIMUM_AGE,
} from '@/lib/siteConfig';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This policy explains what {SITE_NAME} collects about you, why, and what you can do about
        it. It covers the website and the game only.
      </p>

      <h2>Who is responsible</h2>
      <p>
        {CONTROLLER_NAME} is the data controller for personal data processed by {SITE_NAME}. For
        any question about this policy, or to exercise any of the rights below, contact{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What we collect</h2>

      <h3>If you play as a guest</h3>
      <p>
        You can play without giving us anything. A guest session creates an anonymous account
        identifier so the server can keep track of your game while you play it. It is not linked to
        your name, your email, or any other account.
      </p>

      <h3>If you create an account</h3>
      <ul>
        <li>
          <strong>Email address</strong> — used to identify your account, to confirm the address is
          real, and to let you reset your password.
        </li>
        <li>
          <strong>Password</strong> — handled entirely by Google Firebase Authentication. It is
          stored by them in hashed form. We never receive, see, or store your password.
        </li>
        <li>
          <strong>Username</strong> — shown to you in the app, and reserved so no two accounts share
          one.
        </li>
        <li>
          <strong>Game history</strong> — for each completed game: the settings you chose, the verse
          you guessed and the verse it actually was, the distance and score for each round, how long
          each round took, and when the game finished.
        </li>
        <li>
          <strong>Account activity</strong> — when your account was created, when you last played,
          your games-played count, your best score, and when you last changed your username.
        </li>
      </ul>

      <h3>Collected automatically</h3>
      <p>
        Our hosting and backend providers record technical information needed to serve and secure
        the site, including your IP address, browser and device type, and the time of requests.
        This is standard server logging used for delivery, security and abuse prevention. We do not
        use advertising or analytics trackers, and we do not build profiles of you.
      </p>

      <h2>Why we are allowed to process it</h2>
      <ul>
        <li>
          <strong>To perform our agreement with you</strong> — creating your account, running games,
          and keeping your history.
        </li>
        <li>
          <strong>Our legitimate interests</strong> — keeping the service secure, preventing abuse
          and cheating, and keeping it working.
        </li>
        <li>
          <strong>Legal obligation</strong> — where we must keep or disclose information by law.
        </li>
      </ul>

      <h2>Storage in your browser</h2>
      <p>
        We do not use cookies for advertising or analytics. The site stores a small amount of data
        in your browser so it can function:
      </p>
      <ul>
        <li>Your sign-in session, kept by Firebase Authentication, so you stay logged in.</li>
        <li>The last game settings you chose, so the setup screen reopens the way you left it.</li>
        <li>
          Your place in the Bible during a game, so reloading mid-round does not lose it. This is
          cleared when you close the tab.
        </li>
      </ul>
      <p>
        You can clear this at any time through your browser settings. Doing so signs you out; it
        does not delete your account.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We do not sell your data and we do not share it for marketing. We use the following
        processors to run the service:
      </p>
      <ul>
        <li>
          <strong>Google (Firebase Authentication, Cloud Firestore, Cloud Functions)</strong> —
          accounts, database and backend logic.
        </li>
        <li>
          <strong>Vercel</strong> — serves the website itself.
        </li>
      </ul>
      <p>
        These providers may process data outside the United Kingdom and the European Economic Area.
        Where they do, the transfer relies on the safeguards those providers offer, such as standard
        contractual clauses. We may also disclose information where we are legally required to.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Your account and game history</strong> — until you delete your account.
        </li>
        <li>
          <strong>In-progress and recently finished games</strong> — automatically removed after
          about 30 days. Completed games you played while signed in are copied to your history
          before then.
        </li>
        <li>
          <strong>Guest games</strong> — never attached to a permanent account unless you sign up,
          and removed on the same schedule.
        </li>
        <li>
          <strong>Server logs</strong> — kept by our providers according to their own retention
          periods.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Under UK and EU data protection law you have the right to access your data, to have it
        corrected, to have it erased, to restrict or object to how we use it, and to receive a copy
        in a portable form.
      </p>
      <p>
        You can exercise the most important of these yourself: <strong>Account Settings</strong>{' '}
        lets you change your username and password, and lets you permanently delete your account.
        Deleting removes your profile, your username reservation and every game in your history. It
        is immediate and cannot be undone.
      </p>
      <p>
        For anything else — including a copy of your data — email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If you think we have handled your
        data badly, you can complain to{' '}
        <a href={SUPERVISORY_AUTHORITY.url} target="_blank" rel="noreferrer noopener">
          {SUPERVISORY_AUTHORITY.name}
        </a>
        .
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is not intended for children under {MINIMUM_AGE}. We do not knowingly collect
        data from them. If you believe a child under {MINIMUM_AGE} has created an account, contact
        us and we will remove it.
      </p>

      <h2>Security</h2>
      <p>
        Accounts are handled by Firebase Authentication over encrypted connections. Database access
        is restricted by server-side rules: your profile and history are readable only by you, and
        unfinished games are not readable by any browser at all. No system is perfectly secure, but
        we do not store passwords or payment details ourselves.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially we will update the effective date at the top of this page
        and, where the change matters to you, tell you in the app.
      </p>
    </LegalLayout>
  );
}
