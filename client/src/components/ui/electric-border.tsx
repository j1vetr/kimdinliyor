import { motion } from "framer-motion";

interface ElectricBorderProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
  glowColor?: string;
  active?: boolean;
  borderWidth?: number;
  animationDuration?: number;
}

export function ElectricBorder({
  children,
  className = "",
  borderColor = "#22c55e",
  glowColor,
  active = true,
  borderWidth = 2,
  animationDuration = 2,
}: ElectricBorderProps) {
  const glow = glowColor || borderColor;

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: `linear-gradient(90deg, ${borderColor}, ${glow}, ${borderColor})`,
          backgroundSize: "200% 100%",
          animation: `electric-flow ${animationDuration}s linear infinite`,
          padding: borderWidth,
          borderRadius: "inherit",
        }}
      >
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: `0 0 20px ${glow}40, 0 0 40px ${glow}20, inset 0 0 20px ${glow}10`,
            animation: `electric-pulse ${animationDuration / 2}s ease-in-out infinite alternate`,
          }}
        />
      </div>
      <div className="relative bg-background rounded-xl" style={{ margin: borderWidth }}>
        {children}
      </div>
      <style>{`
        @keyframes electric-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes electric-pulse {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

interface PulsingBorderProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  active?: boolean;
}

export function PulsingBorder({
  children,
  className = "",
  color = "#22c55e",
  active = true,
}: PulsingBorderProps) {
  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        boxShadow: [
          `0 0 0 0 ${color}00`,
          `0 0 0 4px ${color}40`,
          `0 0 0 0 ${color}00`,
        ],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        border: `2px solid ${color}`,
        borderRadius: "0.75rem",
      }}
    >
      {children}
    </motion.div>
  );
}

export default ElectricBorder;
