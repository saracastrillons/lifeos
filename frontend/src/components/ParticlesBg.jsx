import { useEffect, useRef } from "react";

export default function ParticlesBg() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w, h, raf, mouse = { x: -999, y: -999 };
    const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    resize();
    const N = Math.min(70, Math.floor((w * h) / 22000));
    const P = Array.from({ length: N }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 }));
    const draw = () => {
      x.clearRect(0, 0, w, h);
      for (const p of P) {
        if (!reduce) { p.x += p.vx; p.y += p.vy; }
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        x.fillStyle = "rgba(167,139,250,.7)"; x.beginPath(); x.arc(p.x, p.y, 1.4, 0, 7); x.fill();
      }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
        if (d < 130) { x.strokeStyle = `rgba(34,211,238,${0.18 * (1 - d / 130)})`; x.beginPath(); x.moveTo(P[i].x, P[i].y); x.lineTo(P[j].x, P[j].y); x.stroke(); }
      }
      for (const p of P) {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (d < 160) { x.strokeStyle = `rgba(244,114,182,${0.5 * (1 - d / 160)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(mouse.x, mouse.y); x.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const mm = (e) => { mouse = { x: e.clientX, y: e.clientY }; };
    addEventListener("mousemove", mm); addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); removeEventListener("mousemove", mm); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-[1]" />;
}
