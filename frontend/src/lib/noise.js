// Ruido marrón generado con Web Audio (sin archivos de audio): ideal para concentrarse.
let ctx, node, gain;

export function startNoise(volume = 0.18) {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  const len = 2 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const out = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // integración = ruido marrón
    out[i] = last * 3.5;
  }
  node = ctx.createBufferSource();
  node.buffer = buf;
  node.loop = true;
  gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);
  node.connect(gain).connect(ctx.destination);
  node.start();
  ctx.resume();
}

export function stopNoise() {
  if (!node) return;
  const n = node;
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  setTimeout(() => n.stop(), 600);
  node = null;
}

// Campanilla suave al terminar una sesión
export function chime() {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.12;
    o.frequency.value = f; o.type = "sine";
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.5);
  });
}
