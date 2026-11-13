import { useSyncExternalStore } from 'react';
import { isSoundEnabled, setSoundEnabled, subscribe } from '@/lib/sound';

/** The sound on/off setting, kept in step across every component showing it. */
export function useSoundEnabled() {
  const enabled = useSyncExternalStore(subscribe, isSoundEnabled, () => true);
  return [enabled, setSoundEnabled];
}
