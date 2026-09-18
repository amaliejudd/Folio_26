// head-spin.js — cursor-driven turntable from an image sequence. No dependencies.
//
// <canvas data-head-spin
//         data-src="frames/head-{i}.webp"   {i} = zero-padded frame number
//         data-frames="24"                  how many frames in the full turn
//         data-pad="2"                      digits in the file number (default 2)
//         data-start="0"                    first file number (default 0)
//         data-sweep="360"></canvas>        degrees covered edge-to-edge (default 360)
//
//         data-scroll-sweep="180"           touch only: degrees turned as the head
//                                           travels from top to bottom of the screen
//
// Frame 0 must face the camera; later frames turn the same direction each step.
// Mouse: horizontal position in the window picks the angle (centre = facing you).
// Touch: the head's position on screen picks the angle — facing you when it's
// level with the middle of the viewport, turning as you scroll it up or down.

class HeadSpin {
  constructor(canvas) {
    const d = canvas.dataset;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.count = Number(d.frames);
    this.sweep = Number(d.sweep ?? 360);
    this.scrollSweep = Number(d.scrollSweep ?? 180);
    this.touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    this.frames = new Array(this.count);
    this.shown = 0; // frame currently on screen
    this.target = 0; // frame we're spinning towards
    this.ticking = false;

    const pad = Number(d.pad ?? 2);
    const start = Number(d.start ?? 0);
    const urls = Array.from({ length: this.count }, (_, i) =>
      d.src.replace('{i}', String(i + start).padStart(pad, '0'))
    );

    // Front frame first so something shows immediately, then the rest.
    this.load(urls[0], 0).then(() => urls.slice(1).forEach((u, i) => this.load(u, i + 1)));

    new ResizeObserver(() => this.resize()).observe(canvas);
    if (this.touch) {
      this.bindScroll();
    } else {
      this.bindMouse();
    }
  }

  load(url, i) {
    const img = new Image();
    img.src = url;
    return img.decode().then(
      () => {
        this.frames[i] = img;
        if (i === this.shown) this.draw();
      },
      () => console.warn(`head-spin: couldn't load ${url}`)
    );
  }

  bindMouse() {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const x = e.clientX / window.innerWidth - 0.5; // -0.5 … 0.5
      this.spinTo(Math.round(((x * this.sweep) / 360) * this.count));
    });
  }

  // Touch devices: no cursor to follow, so the scroll position drives the turn.
  // Centre of the head at the centre of the viewport = frame 0 (facing you);
  // moving it towards the top or bottom edge turns it up to scrollSweep/2 each way.
  bindScroll() {
    const update = () => {
      const r = this.canvas.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      // -0.5 (top edge) … 0.5 (bottom edge); clamped so the head is never turned
      // past its edge-of-screen angle while it's still off screen.
      const y = Math.max(-0.5, Math.min(0.5, mid / window.innerHeight - 0.5));
      this.spinTo(Math.round(((y * this.scrollSweep) / 360) * this.count));
    };
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  bindTouch() {
    const c = this.canvas;
    c.style.touchAction = 'pan-y'; // keep vertical page scroll, we take horizontal
    let startX = null;
    let startFrame = 0;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      startX = e.clientX;
      startFrame = this.target;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (startX === null) return;
      const turns = (e.clientX - startX) / c.clientWidth; // one canvas-width = one full turn
      this.spinTo(startFrame + Math.round(turns * this.count));
    });
    const end = () => (startX = null);
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  spinTo(frame) {
    this.target = ((frame % this.count) + this.count) % this.count;
    if (!this.ticking) {
      this.ticking = true;
      requestAnimationFrame(() => this.tick());
    }
  }

  // Step one frame per tick towards the target (shortest way round), so a fast
  // flick still plays through the in-between angles instead of jumping.
  tick() {
    const n = this.count;
    const diff = (((this.target - this.shown) % n) + n + n / 2) % n - n / 2;
    if (diff === 0) {
      this.ticking = false;
      return;
    }
    this.shown = (this.shown + Math.sign(diff) + n) % n;
    this.draw();
    requestAnimationFrame(() => this.tick());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
    this.draw();
  }

  draw() {
    const img = this.frames[this.shown];
    if (!img) return; // not loaded yet — keep whatever is on screen
    const { width: cw, height: ch } = this.canvas;
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    // Lets the page react to the spin (e.g. a frame readout) — safe to ignore.
    this.canvas.dispatchEvent(
      new CustomEvent('headspin', { detail: { frame: this.shown, count: this.count } })
    );
  }
}

document.querySelectorAll('canvas[data-head-spin]').forEach((c) => new HeadSpin(c));
