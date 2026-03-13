export const SOUND_STORAGE_KEY = 'heatstory_sound_enabled';

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage unavailable
  }
}

let audioCtx: AudioContext | null = null;

/**
 * Play a short, low-frequency filtered sweep.
 * Editorial tone — subtle documentary atmosphere.
 * Only plays if sound is enabled.
 */
export function playDiscoverSound(): void {
  if (!isSoundEnabled()) return;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    const now = audioCtx.currentTime;
    const duration = 0.25;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + duration);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(1, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Web Audio API unavailable
  }
}
