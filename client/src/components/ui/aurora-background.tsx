import { useEffect, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, animate } from "framer-motion";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

export function AuroraBackground({
  children,
  className = "",
  colors = ["#dc2626", "#7c3aed", "#0ea5e9", "#dc2626"],
  speed = 8,
}: AuroraBackgroundProps) {
  const color = useMotionValue(colors[0]);

  useEffect(() => {
    const controls = animate(color, colors, {
      ease: "easeInOut",
      duration: speed,
      repeat: Infinity,
      repeatType: "mirror",
    });

    return () => controls.stop();
  }, [color, colors, speed]);

  const backgroundImage = useMotionTemplate`
    radial-gradient(ellipse 80% 50% at 50% -20%, ${color}, transparent),
    radial-gradient(ellipse 60% 40% at 80% 50%, ${color}33, transparent),
    radial-gradient(ellipse 60% 40% at 20% 50%, ${color}22, transparent)
  `;

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage }}
    >
      <div className="absolute inset-0 bg-background/80" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function Particles({ count = 50, className = "" }: { count?: number; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const particles = containerRef.current.querySelectorAll(".particle");
    
    particles.forEach((particle, i) => {
      const el = particle as HTMLElement;
      const duration = 15 + Math.random() * 20;
      const delay = Math.random() * 5;
      
      el.style.setProperty("--duration", `${duration}s`);
      el.style.setProperty("--delay", `-${delay}s`);
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.style.opacity = `${0.1 + Math.random() * 0.3}`;
      el.style.transform = `scale(${0.5 + Math.random() * 1})`;
    });
  }, [count]);

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="particle absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
          style={{
            animation: `float var(--duration, 20s) ease-in-out var(--delay, 0s) infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(var(--scale, 1));
          }
          25% {
            transform: translateY(-30px) translateX(15px) scale(var(--scale, 1));
          }
          50% {
            transform: translateY(-15px) translateX(-10px) scale(var(--scale, 1));
          }
          75% {
            transform: translateY(-40px) translateX(5px) scale(var(--scale, 1));
          }
        }
      `}</style>
    </div>
  );
}

export default AuroraBackground;
