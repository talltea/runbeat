class Metronome {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.nextNoteTime = 0;
    this.timerID = null;
    this.scheduleAheadTime = 0.1;
    this.lookahead = 25;
    this.currentBeat = 0;

    // Restore last-used settings
    const savedBpm = parseInt(localStorage.getItem('runbeat.bpm'), 10);
    this.bpm = Number.isNaN(savedBpm) ? 170 : savedBpm;
    const savedBeats = parseInt(localStorage.getItem('runbeat.beats'), 10);
    this.beatsPerMeasure = Number.isNaN(savedBeats) ? 0 : savedBeats; // 0 = steady (no accent)

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
      gain.gain.setValueAtTime(0.9, time);
    } else if (this.currentBeat === 0) {
      // Accented downbeat
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(1.0, time);
    } else {
      // Off-beats
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.6, time);
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
    this.updateToggle();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    this.updateToggle();
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  updateToggle() {
    this.toggleBtn.textContent = this.isPlaying ? 'Stop' : 'Start';
    this.toggleBtn.classList.toggle('playing', this.isPlaying);
  }

  setBpm(bpm) {
    this.bpm = Math.min(220, Math.max(60, bpm));
    this.bpmDisplay.textContent = this.bpm;
    this.bpmSlider.value = this.bpm;
    localStorage.setItem('runbeat.bpm', this.bpm);
  }

  setPattern(beats) {
    this.beatsPerMeasure = beats;
    this.currentBeat = 0;
    localStorage.setItem('runbeat.beats', beats);

    // Update button styles
    document.querySelectorAll('.pattern').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.beats) === beats);
    });
  }

  initUI() {
    this.bpmDisplay = document.getElementById('bpmDisplay');
    this.bpmSlider = document.getElementById('bpmSlider');
    this.toggleBtn = document.getElementById('toggleBtn');

    this.bpmSlider.addEventListener('input', (e) => {
      this.setBpm(parseInt(e.target.value));
    });

    this.toggleBtn.addEventListener('click', () => this.toggle());

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

    // Reflect restored settings in the UI
    this.setBpm(this.bpm);
    this.setPattern(this.beatsPerMeasure);
    this.updateToggle();

    if ('wakeLock' in navigator) {
      this.toggleBtn.addEventListener('click', async () => {
        if (!this.isPlaying) return;
        try { await navigator.wakeLock.request('screen'); } catch (e) {}
      });
    }
  }
}

const metronome = new Metronome();