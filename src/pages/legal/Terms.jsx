import LegalLayout from '@/components/LegalLayout';
import { SITE_NAME, CONTACT_EMAIL, GOVERNING_LAW, MINIMUM_AGE } from '@/lib/siteConfig';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These terms govern your use of {SITE_NAME}. By playing, or by creating an account, you
        agree to them. If you do not, please do not use the site.
      </p>

      <h2>Who may use it</h2>
      <p>
        You must be at least {MINIMUM_AGE} years old to create an account. You may play as a guest
        without one, but guest games are not saved unless you sign up.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password to yourself. You are responsible for what happens under your account.</li>
        <li>
          Give a real email address. It is how you recover access if you forget your password; we
          cannot restore an account with an unreachable address.
        </li>
        <li>
          Usernames must not impersonate anyone, must not be offensive, and may be reclaimed if they
          do. You may change yours once every two weeks.
        </li>
        <li>Tell us promptly if you believe someone else is using your account.</li>
      </ul>

      <h2>Fair play</h2>
      <p>
        The game only works if the answer stays hidden until you have guessed. You agree not to:
      </p>
      <ul>
        <li>
          attempt to obtain the target verse before submitting — by inspecting network traffic,
          calling the backend directly, or any other means;
        </li>
        <li>automate play, or use scripts, bots or extensions that guess on your behalf;</li>
        <li>
          interfere with the service or its infrastructure, including attempting to overload it,
          probe it for vulnerabilities, or bypass access controls;
        </li>
        <li>create accounts in bulk, or use one to evade a suspension.</li>
      </ul>
      <p>
        Scores obtained in breach of this section may be removed, and we may suspend or close
        accounts that breach it.
      </p>

      <h2>The scripture text</h2>
      <p>
        The Bible text used is the King James Version, which is in the public domain. Verse
        popularity is derived from topical voting data published by OpenBible.info; that dataset is
        credited to its authors and used subject to the terms under which they publish it. No
        modern translation is included, and none may be added without the rights to do so.
      </p>

      <h2>Availability</h2>
      <p>
        {SITE_NAME} is provided free and as-is. We do not promise that it will always be available,
        uninterrupted or error-free, and we may change, suspend or discontinue any part of it. We
        may also remove features or reset data where we need to.
      </p>

      <h2>Limits on our liability</h2>
      <p>
        To the fullest extent the law allows, {SITE_NAME} and its operator are not liable for any
        indirect or consequential loss, or for lost data, arising from your use of the site. Nothing
        in these terms limits liability for death or personal injury caused by negligence, for
        fraud, or for anything else that cannot lawfully be limited.
      </p>

      <h2>Ending it</h2>
      <p>
        You can delete your account at any time from Account Settings; this is permanent. We may
        suspend or close an account that breaches these terms. Sections that by their nature should
        survive — fair play, liability, and governing law — continue to apply afterwards.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The effective date at the top of this page will change, and
        continuing to use the site after that means you accept the new version.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the law of {GOVERNING_LAW}, and its courts have exclusive
        jurisdiction over any dispute arising from them.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
