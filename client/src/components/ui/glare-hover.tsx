import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface GlareHoverProps {
  children: React.ReactNode;
  className?: string;
  glareColor?: string;
  glareOpacity?: number;
  glareSize?: number;
  borderRadius?: string;
}

export function GlareHover({
  children,
  className = "",
  glareColor = "255, 255, 255",
  glareOpacity = 0.3,
  glareSize = 200,
  borderRadius = "0.75rem",
}: GlareHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setPosition({ x, y });
    setRotation({
      x: ((y - centerY) / centerY) * -8,
      y: ((x - centerX) / centerX) * 8,
    });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: rotation.x,
        rotateY: rotation.y,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        borderRadius,
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(${glareSize}px circle at ${position.x}px ${position.y}px, rgba(${glareColor}, ${glareOpacity}), transparent 40%)`,
          borderRadius,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovering ? 0.5 : 0,
          background: `linear-gradient(105deg, transparent 40%, rgba(${glareColor}, 0.1) 45%, rgba(${glareColor}, 0.2) 50%, rgba(${glareColor}, 0.1) 55%, transparent 60%)`,
          borderRadius,
        }}
      />
    </motion.div>
  );
}

export default GlareHover;
