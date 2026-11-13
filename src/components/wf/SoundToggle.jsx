import { useSoundEnabled } from '@/lib/useSound';
import { play } from '@/lib/sound';
import { SpeakerIcon } from './Icons';

/**
 * Turns every sound on the site on or off. Remembered per browser.
 *
 * `labelled` shows the words beside the icon (the mobile menu); otherwise it is
 * an icon button, named for screen readers.
 */
export default function SoundToggle({ labelled = false, className = '' }) {
  const [enabled, setEnabled] = useSoundEnabled();

  function toggle() {
    const next = !enabled;
    // Played before muting and after unmuting, so both directions are heard.
    if (next) {
      setEnabled(true);
      play('toggleOn', { force: true });
    } else {
      play('toggleOff', { force: true });
      setEnabled(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={labelled ? undefined : enabled ? 'Sound on' : 'Sound off'}
      title={enabled ? 'Sound on — click to mute' : 'Sound off — click to unmute'}
      data-sound="none"
      className={
        labelled
          ? `flex h-[52px] items-center justify-between rounded border-2 border-wf-line px-3.5 text-[17px] font-bold text-wf-ondark ${className}`
          : `grid h-11 w-11 place-items-center rounded border-2 border-transparent text-white hover:border-wf-line ${className}`
      }
    >
      {labelled && <span className="pt-0.5">{enabled ? 'Sound on' : 'Sound off'}</span>}
      <SpeakerIcon on={enabled} color={enabled ? '#e3a52b' : '#b9bec6'} />
    </button>
  );
}
