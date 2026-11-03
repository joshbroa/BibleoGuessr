import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  SITE_NAME,
  POLICY_EFFECTIVE_DATE,
  SITE_CONFIG_INCOMPLETE,
} from '@/lib/siteConfig';

/** Shared chrome and typography for the policy pages. */
export default function LegalLayout({ title, children }) {
  const { isAuthenticated } = useAuth();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to={isAuthenticated ? '/home' : '/'} className="btn-secondary mb-6 px-3 py-1.5 text-xs">
        ← Back
      </Link>

      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gilt-500">
          {SITE_NAME}
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold text-parchment-50">{title}</h1>
        <p className="mt-2 text-sm text-parchment-400">
          Effective {POLICY_EFFECTIVE_DATE}
        </p>
      </header>

      {SITE_CONFIG_INCOMPLETE && (
        <p className="form-error mb-8">
          <strong>Not ready to publish.</strong> This page still contains placeholder details from{' '}
          <code>src/lib/siteConfig.js</code>. Fill in the operator name and contact address before
          the site goes live.
        </p>
      )}

      <div className="space-y-6 leading-relaxed text-parchment-200 [&_a]:text-gilt-400 [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-parchment-50 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-parchment-100 [&_li]:ml-5 [&_li]:list-disc [&_li]:marker:text-gilt-600 [&_ul]:space-y-1.5">
        {children}
      </div>

      <footer className="mt-12 border-t border-gilt-600/20 pt-6 text-sm text-parchment-400">
        <Link to="/legal/privacy">Privacy Policy</Link>
        <span className="px-2">·</span>
        <Link to="/legal/terms">Terms of Service</Link>
      </footer>
    </main>
  );
}
