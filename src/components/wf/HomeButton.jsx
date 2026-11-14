import { Link } from 'react-router-dom';
import { ArrowLeft } from './Icons';

const STYLES = {
  // Outlined, for charcoal bars — as the policy pages' header Back button.
  ghost:
    'box-border inline-flex h-11 shrink-0 items-center gap-2 rounded border-2 border-wf-line px-3 text-[15px] font-bold text-white no-underline hover:border-white',
  // Solid charcoal, for the stone page — as the policy pages' side Back button.
  solid:
    'inline-flex h-11 shrink-0 items-center gap-2 self-start rounded bg-wf-ink pl-3 pr-4 text-[15px] font-bold text-white no-underline hover:bg-wf-ink2',
};

/**
 * The way back to Home from the modes that allow leaving mid-way (Browsing,
 * Endless Practice). One component so it looks the same wherever it appears.
 */
export default function HomeButton({ variant = 'ghost', className = '' }) {
  return (
    <Link to="/home" className={`${STYLES[variant]} ${className}`}>
      <ArrowLeft size={variant === 'ghost' ? 15 : 16} color="#e3a52b" />
      <span className="pt-0.5">Home</span>
    </Link>
  );
}
