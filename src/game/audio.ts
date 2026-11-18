export type BgmTrack = 'none' | 'field' | 'battle' | 'boss';

export interface SequencerStep {
  lead?: { freq: number; durSteps?: number; pan?: number };
  arp?: { freq: number; durSteps?: number; pan?: number; chord?: number[] };
  bass?: { freq: number; durSteps?: number };
  perc?: 'kick' | 'snare' | 'hat' | 'kick+hat' | 'snare+kick' | 'shaker';
}

// Helper: MIDI note to Hz
function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Traccia Field ("Lahan Memory") - Tempo 6/8 pastorale e malinconico (24 step = 2 battute 6/8)
 * Tonalità: Re Dorico / Minore (D - C - Bb - A)
 */
export const LAHAN_MEMORY_SEQUENCE: SequencerStep[] = [
  // Bar 1: Dm9 pastoral harp arpeggio + sweet flute melody
  {
    lead: { freq: mtof(74), durSteps: 3, pan: -0.15 }, // D5
    arp: { freq: mtof(50), durSteps: 2, pan: -0.35 }, // D3
    bass: { freq: mtof(38), durSteps: 6 }, // D2
    perc: 'kick',
  },
  { arp: { freq: mtof(57), durSteps: 2, pan: -0.25 } }, // A3
  { arp: { freq: mtof(62), durSteps: 2, pan: 0.15 }, perc: 'shaker' }, // D4
  {
    lead: { freq: mtof(76), durSteps: 2, pan: -0.1 }, // E5
    arp: { freq: mtof(65), durSteps: 2, pan: 0.3 }, // F4
  },
  { arp: { freq: mtof(64), durSteps: 2, pan: 0.15 }, perc: 'shaker' }, // E4
  {
    lead: { freq: mtof(77), durSteps: 1, pan: 0.0 }, // F5
    arp: { freq: mtof(57), durSteps: 2, pan: -0.2 }, // A3
  },
  // Bar 1 Beat 2: Cmaj7
  {
    lead: { freq: mtof(72), durSteps: 4, pan: 0.1 }, // C5
    arp: { freq: mtof(48), durSteps: 2, pan: -0.35 }, // C3
    bass: { freq: mtof(36), durSteps: 6 }, // C2
    perc: 'shaker',
  },
  { arp: { freq: mtof(55), durSteps: 2, pan: -0.15 } }, // G3
  { arp: { freq: mtof(60), durSteps: 2, pan: 0.2 }, perc: 'shaker' }, // C4
  { arp: { freq: mtof(64), durSteps: 2, pan: 0.35 } }, // E4
  {
    lead: { freq: mtof(69), durSteps: 2, pan: -0.1 }, // A4
    arp: { freq: mtof(60), durSteps: 2, pan: 0.15 },
    perc: 'shaker',
  },
  { arp: { freq: mtof(55), durSteps: 2, pan: -0.2 } }, // G3

  // Bar 2: Bbmaj7 melancholic lift
  {
    lead: { freq: mtof(70), durSteps: 3, pan: -0.15 }, // Bb4
    arp: { freq: mtof(46), durSteps: 2, pan: -0.35 }, // Bb2
    bass: { freq: mtof(34), durSteps: 6 }, // Bb1
    perc: 'kick',
  },
  { arp: { freq: mtof(53), durSteps: 2, pan: -0.15 } }, // F3
  { arp: { freq: mtof(58), durSteps: 2, pan: 0.2 }, perc: 'shaker' }, // Bb3
  {
    lead: { freq: mtof(74), durSteps: 2, pan: 0.05 }, // D5
    arp: { freq: mtof(62), durSteps: 2, pan: 0.35 }, // D4
  },
  { arp: { freq: mtof(65), durSteps: 2, pan: 0.2 }, perc: 'shaker' }, // F4
  {
    lead: { freq: mtof(72), durSteps: 1, pan: 0.1 }, // C5
    arp: { freq: mtof(58), durSteps: 2, pan: -0.15 },
  },
  // Bar 2 Beat 2: Asus4 -> A7 resolution
  {
    lead: { freq: mtof(69), durSteps: 5, pan: 0.0 }, // A4
    arp: { freq: mtof(45), durSteps: 2, pan: -0.35 }, // A2
    bass: { freq: mtof(33), durSteps: 6 }, // A1
    perc: 'shaker',
  },
  { arp: { freq: mtof(52), durSteps: 2, pan: -0.15 } }, // E3
  { arp: { freq: mtof(57), durSteps: 2, pan: 0.15 }, perc: 'shaker' }, // A3
  { arp: { freq: mtof(61), durSteps: 2, pan: 0.35 } }, // C#4
  { arp: { freq: mtof(57), durSteps: 2, pan: 0.15 }, perc: 'shaker' }, // A3
  { arp: { freq: mtof(52), durSteps: 2, pan: -0.2 } }, // E3
];

/**
 * Traccia Battle ("Stage of Death") - Prog-Rock incalzante con ostinato di basso veloce,
 * accordi sincopati e rullante white-noise filtrato (16 step loop)
 */
export const STAGE_OF_DEATH_SEQUENCE: SequencerStep[] = [
  {
    lead: { freq: mtof(64), durSteps: 2, pan: -0.2 }, // E4
    arp: { freq: mtof(52), durSteps: 1, chord: [mtof(52), mtof(59), mtof(64)], pan: 0.3 }, // Em power chord
    bass: { freq: mtof(40), durSteps: 1 }, // E2
    perc: 'kick+hat',
  },
  {
    bass: { freq: mtof(40), durSteps: 1 },
    perc: 'hat',
  },
  {
    lead: { freq: mtof(67), durSteps: 1, pan: -0.15 }, // G4
    bass: { freq: mtof(47), durSteps: 1 }, // B2
    perc: 'snare',
  },
  {
    arp: { freq: mtof(55), durSteps: 1, chord: [mtof(55), mtof(62), mtof(67)], pan: 0.3 }, // G5 stab
    bass: { freq: mtof(40), durSteps: 1 },
    perc: 'kick+hat',
  },
  {
    lead: { freq: mtof(69), durSteps: 2, pan: 0.1 }, // A4
    bass: { freq: mtof(43), durSteps: 1 }, // G2
    perc: 'kick',
  },
  {
    arp: { freq: mtof(57), durSteps: 1, chord: [mtof(57), mtof(64), mtof(69)], pan: -0.3 }, // A5 syncopated
    bass: { freq: mtof(45), durSteps: 1 }, // A2
    perc: 'hat',
  },
  {
    lead: { freq: mtof(71), durSteps: 2, pan: 0.2 }, // B4
    bass: { freq: mtof(47), durSteps: 1 }, // B2
    perc: 'snare',
  },
  {
    bass: { freq: mtof(40), durSteps: 1 },
    perc: 'hat',
  },
  {
    lead: { freq: mtof(72), durSteps: 2, pan: -0.2 }, // C5
    arp: { freq: mtof(48), durSteps: 2, chord: [mtof(48), mtof(55), mtof(60)], pan: 0.25 }, // C5 chord
    bass: { freq: mtof(36), durSteps: 1 }, // C2
    perc: 'kick+hat',
  },
  {
    bass: { freq: mtof(36), durSteps: 1 },
    perc: 'kick',
  },
  {
    lead: { freq: mtof(71), durSteps: 1, pan: 0.0 }, // B4
    bass: { freq: mtof(43), durSteps: 1 }, // G2
    perc: 'snare',
  },
  {
    lead: { freq: mtof(69), durSteps: 1, pan: 0.1 }, // A4
    arp: { freq: mtof(50), durSteps: 1, chord: [mtof(50), mtof(57), mtof(62)], pan: -0.25 }, // D5 stab
    bass: { freq: mtof(38), durSteps: 1 }, // D2
    perc: 'hat',
  },
  {
    lead: { freq: mtof(67), durSteps: 2, pan: -0.1 }, // G4
    bass: { freq: mtof(38), durSteps: 1 },
    perc: 'kick+hat',
  },
  {
    arp: { freq: mtof(51), durSteps: 1, chord: [mtof(51), mtof(58), mtof(63)], pan: 0.3 }, // Eb5 tension stab
    bass: { freq: mtof(39), durSteps: 1 }, // D#2
    perc: 'snare',
  },
  {
    lead: { freq: mtof(66), durSteps: 2, pan: 0.25 }, // F#4
    bass: { freq: mtof(42), durSteps: 1 }, // F#2
    perc: 'snare+kick',
  },
  {
    bass: { freq: mtof(47), durSteps: 1 }, // B2
    perc: 'hat',
  },
];

/**
 * Traccia Boss ("Zohar / Id Awakening") - Coro/Organo gotico + ostinato industriale (16 step)
 */
export const ZOHAR_BOSS_SEQUENCE: SequencerStep[] = [
  {
    lead: { freq: mtof(60), durSteps: 4, pan: -0.2 }, // C4
    arp: { freq: mtof(48), durSteps: 2, chord: [mtof(48), mtof(55), mtof(63)], pan: 0.25 }, // Cm
    bass: { freq: mtof(36), durSteps: 2 },
    perc: 'kick+hat',
  },
  { arp: { freq: mtof(67), durSteps: 1, pan: -0.3 }, perc: 'hat' },
  {
    bass: { freq: mtof(36), durSteps: 2 },
    perc: 'snare+kick',
  },
  { arp: { freq: mtof(63), durSteps: 1, pan: 0.3 }, perc: 'hat' },
  {
    lead: { freq: mtof(66), durSteps: 4, pan: 0.2 }, // F#4 tritone
    arp: { freq: mtof(42), durSteps: 2, chord: [mtof(42), mtof(54), mtof(61)], pan: -0.25 },
    bass: { freq: mtof(30), durSteps: 2 }, // F#1
    perc: 'kick+hat',
  },
  { arp: { freq: mtof(66), durSteps: 1, pan: 0.3 }, perc: 'hat' },
  {
    bass: { freq: mtof(30), durSteps: 2 },
    perc: 'snare',
  },
  { arp: { freq: mtof(61), durSteps: 1, pan: -0.3 }, perc: 'kick' },
  {
    lead: { freq: mtof(68), durSteps: 4, pan: -0.15 }, // Ab4
    arp: { freq: mtof(44), durSteps: 2, chord: [mtof(44), mtof(56), mtof(63)], pan: 0.2 },
    bass: { freq: mtof(32), durSteps: 2 }, // Ab1
    perc: 'kick+hat',
  },
  { arp: { freq: mtof(68), durSteps: 1, pan: -0.2 }, perc: 'hat' },
  {
    bass: { freq: mtof(32), durSteps: 2 },
    perc: 'snare+kick',
  },
  { arp: { freq: mtof(63), durSteps: 1, pan: 0.2 }, perc: 'hat' },
  {
    lead: { freq: mtof(67), durSteps: 4, pan: 0.15 }, // G4
    arp: { freq: mtof(43), durSteps: 2, chord: [mtof(43), mtof(55), mtof(59)], pan: -0.2 },
    bass: { freq: mtof(31), durSteps: 2 }, // G1
    perc: 'kick',
  },
  { arp: { freq: mtof(62), durSteps: 1, pan: 0.3 }, perc: 'snare' },
  {
    bass: { freq: mtof(31), durSteps: 2 },
    perc: 'snare+kick',
  },
  { arp: { freq: mtof(59), durSteps: 1, pan: -0.3 }, perc: 'snare' },
];

export class Ps1SpuAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted = false;
  private currentTrack: BgmTrack = 'none';
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentStepIndex = 0;

  /**
   * 1. ARCHITETTURA SPU CON MASTER BUS, DYNAMICS COMPRESSOR E RIVERBERO HALL PS1
   */
  private ensureContext(): AudioContext | null {
    if (this.isMuted || typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Master DynamicsCompressorNode
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-16, ctx.currentTime);
      comp.knee.setValueAtTime(12, ctx.currentTime);
      comp.ratio.setValueAtTime(4, ctx.currentTime);
      comp.attack.setValueAtTime(0.005, ctx.currentTime);
      comp.release.setValueAtTime(0.18, ctx.currentTime);
      this.compressor = comp;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.85, ctx.currentTime);
      this.masterGain = master;

      master.connect(comp);
      comp.connect(ctx.destination);

      // PS1 SPU Hardware Hall Reverb Simulation (Dual-Tap Delay + Lowpass Damping in Feedback)
      const revSend = ctx.createGain();
      revSend.gain.setValueAtTime(0.28, ctx.currentTime);
      this.reverbSend = revSend;

      const delayA = ctx.createDelay(1.0);
      delayA.delayTime.setValueAtTime(0.079, ctx.currentTime);

      const delayB = ctx.createDelay(1.0);
      delayB.delayTime.setValueAtTime(0.137, ctx.currentTime);

      const dampFilter = ctx.createBiquadFilter();
      dampFilter.type = 'lowpass';
      dampFilter.frequency.setValueAtTime(2600, ctx.currentTime);

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.setValueAtTime(0.44, ctx.currentTime);

      const wetOut = ctx.createGain();
      wetOut.gain.setValueAtTime(0.32, ctx.currentTime);

      revSend.connect(delayA);
      delayA.connect(delayB);
      delayB.connect(dampFilter);
      dampFilter.connect(feedbackGain);
      feedbackGain.connect(delayA); // Feedback loop

      delayA.connect(wetOut);
      dampFilter.connect(wetOut);
      wetOut.connect(master);

      // Pre-compute 1.5s White Noise Buffer for Percussion & Martial Arts Impacts
      const sampleRate = ctx.sampleRate;
      const buf = ctx.createBuffer(1, Math.floor(sampleRate * 1.5), sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      const active = this.currentTrack;
      this.stopBgm();
      this.currentTrack = active;
    } else if (this.currentTrack !== 'none') {
      const tr = this.currentTrack;
      this.currentTrack = 'none';
      this.playBgm(tr);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Funzione Core SPU `playVoice`:
   * Ogni voce passa per oscillatore -> filtro passa-basso dinamico -> inviluppo ADSR -> StereoPanner -> Master & Hall Reverb
   */
  public playVoice(
    freq: number,
    type: OscillatorType,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    duration: number,
    pan = 0,
    peakGain = 0.08,
    filterCutoff = 3200,
    startTime?: number,
    endFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t0 = startTime !== undefined ? Math.max(ctx.currentTime, startTime) : ctx.currentTime;
    const atk = Math.max(0.002, attack);
    const dec = Math.max(0.005, decay);
    const susLevel = Math.max(0.0001, Math.min(1, sustain)) * peakGain;
    const rel = Math.max(0.01, release);
    const noteHold = Math.max(atk + dec, duration);
    const tReleaseStart = t0 + noteHold;
    const tStop = tReleaseStart + rel + 0.02;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (endFreq !== undefined && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), tReleaseStart);
    }

    // Dynamic Low-Pass Filter with Envelope Modulation
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.8, t0);
    filter.frequency.setValueAtTime(Math.min(12000, filterCutoff * 1.6), t0);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(120, filterCutoff * 0.55),
      tReleaseStart
    );

    // ADSR Amplitude Envelope
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(peakGain, t0 + atk);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, susLevel), t0 + atk + dec);
    env.gain.setValueAtTime(Math.max(0.0002, susLevel), tReleaseStart);
    env.gain.exponentialRampToValueAtTime(0.0001, tReleaseStart + rel);

    osc.connect(filter);
    filter.connect(env);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t0);
      env.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbSend) {
        panner.connect(this.reverbSend);
      }
    } else {
      env.connect(this.masterGain);
      if (this.reverbSend) {
        env.connect(this.reverbSend);
      }
    }

    osc.start(t0);
    osc.stop(tStop);
  }

  /**
   * Generatore Percussioni / Burst White-Noise Filtrato con Inviluppo ADSR
   */
  private playNoiseBurst(
    duration: number,
    filterType: BiquadFilterType,
    cutoffHz: number,
    qFactor: number,
    peakGain: number,
    pan = 0,
    startTime?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const t0 = startTime !== undefined ? Math.max(ctx.currentTime, startTime) : ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(cutoffHz, t0);
    filter.Q.setValueAtTime(qFactor, t0);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(peakGain, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(filter);
    filter.connect(env);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, t0);
      env.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbSend) panner.connect(this.reverbSend);
    } else {
      env.connect(this.masterGain);
      if (this.reverbSend) env.connect(this.reverbSend);
    }

    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  /**
   * 2. STEP SEQUENCER POLIFONICO A 4 CANALI BASATO SU `AudioContext.currentTime`
   */
  private scheduleStep(step: SequencerStep, stepTime: number, stepDuration: number, track: BgmTrack) {
    const isField = track === 'field';
    const isBoss = track === 'boss';

    // CANALE 1: LEAD (Melodia Pastorale o Synth Prog-Rock)
    if (step.lead) {
      const dur = (step.lead.durSteps || 1) * stepDuration;
      this.playVoice(
        step.lead.freq,
        isField ? 'triangle' : 'sawtooth',
        isField ? 0.035 : 0.012,
        0.12,
        isField ? 0.65 : 0.55,
        isField ? 0.22 : 0.12,
        dur,
        step.lead.pan ?? 0,
        isField ? 0.055 : 0.048,
        isField ? 2400 : 3400,
        stepTime
      );
    }

    // CANALE 2: ARPEGGIO ACUSTICO / ARPA O ACCORDI SINCOPATI PROG-ROCK
    if (step.arp) {
      const dur = (step.arp.durSteps || 1) * stepDuration;
      const notes = step.arp.chord || [step.arp.freq];
      notes.forEach((nFreq, idx) => {
        this.playVoice(
          nFreq,
          isField ? 'triangle' : isBoss ? 'sawtooth' : 'square',
          0.006,
          0.09,
          0.25,
          0.16,
          dur,
          (step.arp?.pan ?? 0.2) + (idx - 1) * 0.08,
          isField ? 0.042 : 0.026,
          isField ? 2800 : 2200,
          stepTime + idx * 0.008
        );
      });
    }

    // CANALE 3: FRETLESS BASS
    if (step.bass) {
      const dur = (step.bass.durSteps || 1) * stepDuration;
      this.playVoice(
        step.bass.freq,
        isField ? 'sine' : 'sawtooth',
        0.01,
        0.1,
        0.6,
        0.12,
        dur * 0.9,
        0,
        0.075,
        isField ? 950 : 1350,
        stepTime
      );
    }

    // CANALE 4: PERCUSSIONI NOISE / KICK
    if (step.perc) {
      if (step.perc === 'kick' || step.perc === 'kick+hat' || step.perc === 'snare+kick') {
        this.playVoice(
          135,
          'sine',
          0.003,
          0.06,
          0.1,
          0.08,
          0.09,
          0,
          0.095,
          600,
          stepTime,
          38
        );
      }
      if (step.perc === 'snare' || step.perc === 'snare+kick') {
        // Tone body + filtered white-noise snare wires
        this.playVoice(195, 'triangle', 0.003, 0.05, 0.1, 0.06, 0.07, 0.08, 0.055, 1400, stepTime, 110);
        this.playNoiseBurst(0.13, 'bandpass', 1850, 1.2, 0.065, 0.1, stepTime);
      }
      if (step.perc === 'hat' || step.perc === 'kick+hat') {
        this.playNoiseBurst(0.045, 'highpass', 5800, 1.5, 0.032, -0.18, stepTime);
      }
      if (step.perc === 'shaker') {
        this.playNoiseBurst(0.055, 'bandpass', 4200, 2.2, 0.022, 0.22, stepTime);
      }
    }
  }

  public stopBgm() {
    if (this.schedulerTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.currentTrack = 'none';
  }

  public playBgm(track: BgmTrack) {
    if (this.currentTrack === track) return;
    this.stopBgm();
    this.currentTrack = track;
    if (track === 'none' || this.isMuted || typeof window === 'undefined') return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const sequence =
      track === 'field'
        ? LAHAN_MEMORY_SEQUENCE
        : track === 'battle'
        ? STAGE_OF_DEATH_SEQUENCE
        : ZOHAR_BOSS_SEQUENCE;

    const stepDuration = track === 'field' ? 0.23 : track === 'battle' ? 0.135 : 0.16;
    this.currentStepIndex = 0;
    this.nextStepTime = ctx.currentTime + 0.04;

    // Lookahead scheduler using AudioContext.currentTime
    this.schedulerTimer = window.setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      const lookaheadWindow = 0.18;
      while (this.nextStepTime < this.ctx.currentTime + lookaheadWindow) {
        const step = sequence[this.currentStepIndex % sequence.length];
        this.scheduleStep(step, this.nextStepTime, stepDuration, track);
        this.nextStepTime += stepDuration;
        this.currentStepIndex++;
      }
    }, 50);
  }

  /**
   * 3. LIBRERIA SFX FISICA SQUARESOFT PS1
   */

  // Cursore menu cristallino (1200Hz -> 1600Hz)
  public playCursor() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playVoice(1200, 'sine', 0.004, 0.04, 0.3, 0.06, 0.045, -0.1, 0.065, 4800, now, 1600);
    this.playVoice(1600, 'triangle', 0.004, 0.05, 0.25, 0.08, 0.065, 0.1, 0.05, 5200, now + 0.022);
  }

  // Conferma metallica a doppio tono
  public playConfirm() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playVoice(880, 'triangle', 0.004, 0.06, 0.4, 0.1, 0.07, -0.15, 0.075, 4200, now);
    this.playVoice(1318.5, 'sine', 0.004, 0.09, 0.5, 0.18, 0.14, 0.15, 0.08, 5600, now + 0.055);
    this.playVoice(2637, 'sine', 0.003, 0.06, 0.2, 0.14, 0.1, 0, 0.035, 6500, now + 0.058);
  }

  // Annullamento / Indietro
  public playCancel() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playVoice(480, 'sawtooth', 0.005, 0.05, 0.3, 0.07, 0.06, 0, 0.055, 1800, now, 320);
  }

  // Bleep dialogo typewriter
  public playDialogueBleep(pitchBoost = 1.0) {
    const variance = 0.96 + Math.random() * 0.08;
    this.playVoice(
      680 * pitchBoost * variance,
      'triangle',
      0.003,
      0.025,
      0.2,
      0.03,
      0.03,
      0,
      0.038,
      2800
    );
  }

  // Salto sul campo
  public playJump() {
    this.playVoice(210, 'sine', 0.008, 0.08, 0.4, 0.09, 0.14, 0, 0.075, 2200, undefined, 560);
  }

  // Impatto fisico arti marziali: Sweep bassa frequenza (180Hz -> 35Hz) + burst di rumore bianco filtrato
  public playMartialStrike(tier: 'T' | 'S' | 'X') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const startHz = tier === 'T' ? 210 : tier === 'S' ? 180 : 165;
    const endHz = tier === 'T' ? 48 : 35;
    const dur = tier === 'T' ? 0.11 : tier === 'S' ? 0.15 : 0.22;
    const gain = tier === 'T' ? 0.09 : tier === 'S' ? 0.11 : 0.14;

    this.playVoice(startHz, 'sawtooth', 0.003, 0.06, 0.35, 0.09, dur, 0, gain, 1400, now, endHz);
    this.playVoice(startHz, 'sine', 0.002, 0.08, 0.5, 0.1, dur, 0, gain * 1.1, 800, now, endHz);
    this.playNoiseBurst(
      dur * 0.85,
      'bandpass',
      tier === 'T' ? 2200 : tier === 'S' ? 1500 : 950,
      1.4,
      gain * 0.75,
      0,
      now
    );
  }

  // Finisher Deathblow (Hissatsu): Doppio impatto sub-bass 180Hz->35Hz + risonanza Zohar + burst white-noise
  public playDeathblowFinisher() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playVoice(180, 'sawtooth', 0.003, 0.14, 0.5, 0.22, 0.28, -0.2, 0.14, 1600, now, 35);
    this.playVoice(180, 'square', 0.004, 0.12, 0.4, 0.2, 0.24, 0.2, 0.1, 2200, now + 0.04, 35);
    this.playNoiseBurst(0.28, 'bandpass', 1200, 1.1, 0.11, 0, now);
    this.playVoice(587.33, 'triangle', 0.01, 0.15, 0.5, 0.25, 0.32, 0, 0.085, 4200, now + 0.08, 880);
  }

  // Risonanza Chi / Etere
  public playEtherCast() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playVoice(
        n,
        'sine',
        0.015,
        0.1,
        0.5,
        0.22,
        0.24,
        (idx - 2) * 0.2,
        0.055,
        4800,
        now + idx * 0.05
      );
    });
  }

  // Accensione idraulica / Jet per i Gear
  public playGearBooster() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Actuator hydraulic servo sweep
    this.playVoice(95, 'sawtooth', 0.01, 0.12, 0.6, 0.18, 0.26, -0.15, 0.1, 1200, now, 280);
    this.playVoice(190, 'square', 0.015, 0.14, 0.5, 0.2, 0.28, 0.15, 0.07, 2400, now + 0.04, 520);
    // Jet afterburner white-noise roar
    this.playNoiseBurst(0.36, 'bandpass', 1650, 0.9, 0.095, 0, now + 0.03);
  }

  // Transizione Vortice Battaglia PS1
  public playBattleSwirl() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
    freqs.forEach((f, idx) => {
      this.playVoice(
        f,
        'sawtooth',
        0.005,
        0.08,
        0.4,
        0.12,
        0.14,
        (idx % 2 === 0 ? -1 : 1) * 0.3,
        0.06,
        3200,
        now + idx * 0.038
      );
    });
    this.playNoiseBurst(0.32, 'bandpass', 1400, 1.2, 0.07, 0, now);
  }

  // Fanfara di Vittoria
  public playVictoryFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const fanfare = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 523.25, d: 0.12, t: 0.14 },
      { f: 523.25, d: 0.12, t: 0.28 },
      { f: 523.25, d: 0.38, t: 0.42 },
      { f: 415.3, d: 0.32, t: 0.84 },
      { f: 466.16, d: 0.32, t: 1.18 },
      { f: 523.25, d: 0.2, t: 1.52 },
      { f: 466.16, d: 0.14, t: 1.76 },
      { f: 523.25, d: 0.55, t: 1.92 },
    ];
    fanfare.forEach((n) => {
      this.playVoice(n.f, 'triangle', 0.008, 0.08, 0.65, 0.18, n.d, -0.15, 0.08, 3800, now + n.t);
      this.playVoice(n.f * 0.5, 'sawtooth', 0.01, 0.1, 0.5, 0.18, n.d, 0.15, 0.05, 1800, now + n.t);
    });
  }
}

export const spuAudio = new Ps1SpuAudioEngine();
