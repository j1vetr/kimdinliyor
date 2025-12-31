import { motion } from "framer-motion";

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{
          x: [0, 100, 0, -100, 0],
          y: [0, -50, 100, -50, 0],
          scale: [1, 1.2, 1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -80, 0, 80, 0],
          y: [0, 80, -60, 40, 0],
          scale: [1, 1.1, 1.2, 1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -80, 80, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] left-[50%] w-[40%] h-[40%] bg-blue-500/8 rounded-full blur-[80px]"
      />
    </div>
  );
}

export function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}

export function FloatingParticles() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * 100 + "%",
            y: "100%",
            opacity: 0,
          }}
          animate={{
            y: "-10%",
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: "linear",
          }}
          className="absolute w-1 h-1 rounded-full bg-white/30"
        />
      ))}
    </div>
  );
}

interface GlowingOrbProps {
  className?: string;
  color?: string;
  size?: string;
  blur?: string;
  animate?: boolean;
}

export function GlowingOrb({ 
  className = "", 
  color = "bg-primary/20", 
  size = "w-64 h-64", 
  blur = "blur-[100px]",
  animate = true 
}: GlowingOrbProps) {
  return animate ? (
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full ${color} ${size} ${blur} ${className}`}
    />
  ) : (
    <div className={`absolute rounded-full ${color} ${size} ${blur} ${className}`} />
  );
}
