"use strict";

const CelebrationFX = {
  // لحن الفانفار الاحتفالي للمركز الأول
  playWinnerFanfare() {
    try {
      const ctx = AudioEngine.getContext();
      const now = ctx.currentTime;
      const notes = [
        { f: 440.00, d: 0.14 },
        { f: 440.00, d: 0.14 },
        { f: 440.00, d: 0.14 },
        { f: 554.37, d: 0.40 },
        { f: 659.25, d: 0.55 }
      ];

      let delay = 0;
      notes.forEach((item) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(item.f, now + delay);

        gain.gain.setValueAtTime(0.22, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + item.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + item.d);

        delay += item.d * 0.85;
      });
    } catch (e) {}
  },

  // إطلاق قصاصات الورق الملونة المتساقطة
  fireConfetti(durationMs = 4000) {
    if (typeof confetti !== "function") return;

    const end = Date.now() + durationMs;
    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.7 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }
};