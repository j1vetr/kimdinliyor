import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
  formatValue?: (value: number) => string;
}

export function AnimatedCounter({
  value,
  className = "",
  duration = 1.5,
  delay = 0,
  formatValue = (v) => Math.round(v).toString(),
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(0, {
    mass: 1,
    stiffness: 75,
    damping: 15,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => formatValue(current));

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => {
        spring.set(value);
        setHasAnimated(true);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, spring, delay, hasAnimated]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

interface CounterInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
  formatDisplay?: (value: number) => string;
}

export function CounterInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = "",
  label,
  formatDisplay,
}: CounterInputProps) {
  const increment = () => onChange(Math.min(max, value + step));
  const decrement = () => onChange(Math.max(min, value - step));

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={decrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          data-testid="button-counter-decrement"
        >
          -
        </motion.button>
        <motion.span
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold min-w-[3rem] text-center"
        >
          {formatDisplay ? formatDisplay(value) : value}
        </motion.span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={increment}
          disabled={value >= max}
          className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          data-testid="button-counter-increment"
        >
          +
        </motion.button>
      </div>
    </div>
  );
}

export default AnimatedCounter;
