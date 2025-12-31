import { useEffect, useRef } from "react";

interface HyperspeedProps {
  className?: string;
  starCount?: number;
  speed?: number;
  starColor?: string;
  trailLength?: number;
}

export function Hyperspeed({
  className = "",
  starCount = 200,
  speed = 0.5,
  starColor = "#ffffff",
  trailLength = 0.5,
}: HyperspeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    setCanvasSize();

    interface Star {
      x: number;
      y: number;
      z: number;
      pz: number;
    }

    const stars: Star[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width - centerX,
        y: Math.random() * height - centerY,
        z: Math.random() * width,
        pz: 0,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, width, height);

      for (const star of stars) {
        star.pz = star.z;
        star.z -= speed * 10;

        if (star.z < 1) {
          star.x = Math.random() * width - centerX;
          star.y = Math.random() * height - centerY;
          star.z = width;
          star.pz = star.z;
        }

        const sx = (star.x / star.z) * width + centerX;
        const sy = (star.y / star.z) * height + centerY;
        const px = (star.x / star.pz) * width + centerX;
        const py = (star.y / star.pz) * height + centerY;

        if (sx < 0 || sx > width || sy < 0 || sy > height) continue;

        const size = Math.max(0.5, (1 - star.z / width) * 3);
        const opacity = Math.min(1, (1 - star.z / width) * 2);

        ctx.beginPath();
        ctx.strokeStyle = starColor;
        ctx.globalAlpha = opacity * trailLength;
        ctx.lineWidth = size;
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = starColor;
        ctx.globalAlpha = opacity;
        ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => setCanvasSize();
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [starCount, speed, starColor, trailLength]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ background: "transparent" }}
    />
  );
}

export default Hyperspeed;
