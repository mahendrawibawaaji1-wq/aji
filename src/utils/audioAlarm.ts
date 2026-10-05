import { AlarmSound } from '../types';

let audioCtx: AudioContext | null = null;
let currentAlarmInterval: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playAlarmSound(soundType: AlarmSound = 'zen-bell') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (soundType === 'zen-bell') {
      // Warm singing bowl / Tibetan bell
      const freqs = [528, 1056, 1584];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = 0.3 / (idx + 1);
        gain.gain.setValueAtTime(initialGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 3.6);
      });
    } else if (soundType === 'marimba') {
      // Warm marimba chord progression
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.3);
      });
    } else if (soundType === 'gentle-pulse') {
      // Calming binaural morning pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, now);
      osc.frequency.exponentialRampToValueAtTime(576, now + 1.5);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.1);
    } else {
      // Digital double chime
      [800, 1200].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.18;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.85);
      });
    }
  } catch (err) {
    console.warn('Web Audio error:', err);
  }
}

export function startRepeatingAlarm(soundType: AlarmSound = 'zen-bell') {
  stopRepeatingAlarm();
  playAlarmSound(soundType);
  currentAlarmInterval = window.setInterval(() => {
    playAlarmSound(soundType);
  }, 3200);
}

export function stopRepeatingAlarm() {
  if (currentAlarmInterval !== null) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }
}
