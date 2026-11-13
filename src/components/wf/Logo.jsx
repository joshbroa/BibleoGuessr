import { Link } from 'react-router-dom';
import { LogoMark } from './Icons';

/** The pin mark and wordmark, linking home. */
export default function Logo({ to = '/home', size = 'md', onClick }) {
  const mark = size === 'sm' ? 26 : size === 'game' ? 28 : 30;
  const text = size === 'sm' ? 'text-[19px]' : size === 'game' ? 'text-[21px]' : 'text-[19px] sm:text-[23px]';

  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-[44px] items-center gap-2 text-wf-paper no-underline sm:gap-2.5"
    >
      <LogoMark size={mark} />
      <span className={`${text} font-extrabold tracking-[-0.01em]`}>BibleoGuessr</span>
    </Link>
  );
}
