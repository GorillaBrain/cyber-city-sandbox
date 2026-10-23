/**
 * Cyber City Sandbox — Lightweight Web Audio API Synthesizer
 * Zero external audio files required; muted by default to prevent intrusive autoplay.
 */

class CyberSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled && !this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.enabled) {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone({ freq = 440, type = 'sine', duration = 0.12, gain = 0.06, slideTo = null }) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      }
      gainNode.gain.setValueAtTime(gain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio errors on restricted environments
    }
  }

  selectBuilding() {
    this.playTone({ freq: 520, type: 'triangle', duration: 0.09, gain: 0.05, slideTo: 780 });
  }

  scanComplete() {
    this.playTone({ freq: 440, type: 'sine', duration: 0.14, gain: 0.06, slideTo: 880 });
  }

  installControl() {
    this.playTone({ freq: 360, type: 'triangle', duration: 0.16, gain: 0.07, slideTo: 720 });
  }

  alertWarning() {
    this.playTone({ freq: 290, type: 'sawtooth', duration: 0.22, gain: 0.06, slideTo: 180 });
  }

  containmentBlocked() {
    this.playTone({ freq: 620, type: 'sine', duration: 0.16, gain: 0.06, slideTo: 940 });
  }

  missionComplete() {
    if (!this.enabled || !this.ctx) return;
    this.playTone({ freq: 523.25, type: 'triangle', duration: 0.2, gain: 0.07 });
    setTimeout(() => {
      this.playTone({ freq: 659.25, type: 'triangle', duration: 0.2, gain: 0.07 });
    }, 110);
    setTimeout(() => {
      this.playTone({ freq: 783.99, type: 'triangle', duration: 0.35, gain: 0.08 });
    }, 220);
  }
}

export const soundFX = new CyberSoundEngine();
