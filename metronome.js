class Metronome {
  constructor() {
    this.audioCtx = null;
    this.bpm = 170;
    this.isPlaying = false;
    this.nextNoteTime = 0;
    this.timerID = null;
    this.scheduleAheadTime = 0.1;
    this.lookahead = 25;
    this.currentBeat = 0;
    this.beatsPerMeasure = 0; // 0 = steady (no accent)

    this.initUI();
  }

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playClick(time) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (this.beatsPerMeasure === 0) {
      // Steady beat — all clicks the same
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.4, time);
    } else if (this.currentBeat === 0) {
      // Accented downbeat
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.5, time);
    } else {
      // Off-beats
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.25, time);
    }

    osc.type = 'triangle';
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);

    const delay = (time - this.audioCtx.currentTime) * 1000;
    setTimeout(() => {
      this.bpmDisplay.classList.add('flash');
      setTimeout(() => this.bpmDisplay.classList.remove('flash'), 50);
    }, Math.max(0, delay));

    if (this.beatsPerMeasure > 0) {
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.playClick(this.nextNoteTime);
      this.nextNoteTime += 60.0 / this.bpm;
    }
  }

  start() {
    if (this.isPlaying) return;
    this.initAudio();
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioCtx.currentTime;
    this.timerID = setInterval(() => this.scheduler(), this.lookahead);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  setBpm(bpm) {
    this.bpm = Math.min(220, Math.max(60, bpm));
    this.bpmDisplay.textContent = this.bpm;
    this.bpmSlider.value = this.bpm;
  }

  setPattern(beats) {
    this.beatsPerMeasure = beats;
    this.currentBeat = 0;

    // Update button styles
    document.querySelectorAll('.pattern').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.beats) === beats);
    });
  }

  initUI() {
    this.bpmDisplay = document.getElementById('bpmDisplay');
    this.bpmSlider = document.getElementById('bpmSlider');

    this.bpmSlider.addEventListener('input', (e) => {
      this.setBpm(parseInt(e.target.value));
    });

    document.getElementById('startBtn').addEventListener('click', () => this.start());
    document.getElementById('stopBtn').addEventListener('click', () => this.stop());

    document.getElementById('upOne').addEventListener('click', () => this.setBpm(this.bpm + 1));
    document.getElementById('downOne').addEventListener('click', () => this.setBpm(this.bpm - 1));
    document.getElementById('upFive').addEventListener('click', () => this.setBpm(this.bpm + 5));
    document.getElementById('downFive').addEventListener('click', () => this.setBpm(this.bpm - 5));

    document.querySelectorAll('.preset').forEach(btn => {
      btn.addEventListener('click', () => this.setBpm(parseInt(btn.dataset.bpm)));
    });

    document.querySelectorAll('.pattern').forEach(btn => {
      btn.addEventListener('click', () => this.setPattern(parseInt(btn.dataset.beats)));
    });

    // Set initial active state
    this.setPattern(0);

    if ('wakeLock' in navigator) {
      document.getElementById('startBtn').addEventListener('click', async () => {
        try { await navigator.wakeLock.request('screen'); } catch (e) {}
      });
    }
  }
}

const metronome = new Metronome();