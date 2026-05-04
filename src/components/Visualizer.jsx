import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export default function Visualizer({ analyserRef, style }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const { isPlaying } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = analyserRef?.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      if (!analyser || !isPlaying) {
        // Idle ambient bars
        const barCount = 40;
        const barW = W / barCount - 1;
        for (let i = 0; i < barCount; i++) {
          const x = i * (barW + 1);
          const h = 4 + Math.sin(Date.now() / 1000 + i * 0.4) * 4;
          ctx.fillStyle = `rgba(108,99,255,0.45)`;
          ctx.beginPath();
          ctx.roundRect(x, H - h, barW, h, 2);
          ctx.fill();
        }
        return;
      }

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);

      const barCount = 60;
      const barW = W / barCount - 1;

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufLen);
        const val = data[idx] / 255;
        const h = Math.max(4, val * H * 0.92);
        const x = i * (barW + 1);

        // Gradient per bar — brighter/lighter
        const grad = ctx.createLinearGradient(x, H, x, H - h);
        grad.addColorStop(0, `rgba(140,130,255,1)`);
        grad.addColorStop(0.5, `rgba(255,120,150,0.9)`);
        grad.addColorStop(1, `rgba(80,255,150,0.8)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, H - h, barW, h, 3);
        ctx.fill();

        // Glow on tall bars
        if (val > 0.6) {
          ctx.shadowBlur = 16;
          ctx.shadowColor = 'rgba(140,130,255,0.95)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
}