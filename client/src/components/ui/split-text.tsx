import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  onComplete?: () => void;
}

export function SplitText({
  text,
  className = "",
  delay = 0.05,
  duration = 0.8,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  onComplete,
}: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const elements = splitType === "words" ? text.split(" ") : text.split("");

  const animate = useCallback(() => {
    if (!containerRef.current || hasAnimated.current) return;
    hasAnimated.current = true;

    const chars = containerRef.current.querySelectorAll(".split-char");
    
    gsap.fromTo(
      chars,
      from,
      {
        ...to,
        duration,
        ease,
        stagger: delay,
        onComplete,
      }
    );
  }, [from, to, duration, ease, delay, onComplete]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate();
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animate, threshold]);

  return (
    <div ref={containerRef} className={`inline-flex flex-wrap ${className}`}>
      {elements.map((char, index) => (
        <span
          key={index}
          className={`split-char inline-block opacity-0 ${splitType === "words" ? "mr-[0.25em]" : ""}`}
          style={{ willChange: "transform, opacity" }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
}

export default SplitText;
