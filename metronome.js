class Metronome {
  constructor() {
    this.audioCtx = null;
    this.bpm = 170;
    this.isPlaying = false;
    this.nextNoteTime = 0;
    this.timerID = null;
    this.scheduleAheadTime = 0.1; // seconds
    this.lookahead = 25; // ms

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

  // Use the "scheduling ahead" pattern for rock-solid timing
  // (Web Audio API schedules in the audio thread, not JS main thread)
  playClick(time) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.frequency.value = 1000;
    osc.type = 'triangle';

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);

    // Visual flash (approximate, UI thread)
    const delay = (time - this.audioCtx.currentTime) * 1000;
    setTimeout(() => {
      this.bpmDisplay.classList.add('flash');
      setTimeout(() => this.bpmDisplay.classList.remove('flash'), 50);
    }, Math.max(0, delay));
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

    // Keep audio alive when screen is locked
    if ('wakeLock' in navigator) {
      document.getElementById('startBtn').addEventListener('click', async () => {
        try { await navigator.wakeLock.request('screen'); } catch (e) {}
      });
    }
  }
}

const metronome = new Metronome();