import { useEffect, useState, useRef, useCallback } from "react";

interface DecryptedTextProps {
  text: string;
  className?: string;
  speed?: number;
  characters?: string;
  revealDirection?: "start" | "end" | "center";
  onComplete?: () => void;
  trigger?: boolean;
}

export function DecryptedText({
  text,
  className = "",
  speed = 50,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*",
  revealDirection = "start",
  onComplete,
  trigger = true,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scramble = useCallback(() => {
    if (isAnimating || !trigger) return;
    setIsAnimating(true);

    let iteration = 0;
    const length = text.length;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";

            let revealIndex: number;
            if (revealDirection === "start") {
              revealIndex = index;
            } else if (revealDirection === "end") {
              revealIndex = length - 1 - index;
            } else {
              const center = Math.floor(length / 2);
              revealIndex = Math.abs(center - index);
            }

            if (revealIndex < iteration) {
              return text[index];
            }

            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("")
      );

      iteration += 1 / 3;

      if (iteration >= length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsAnimating(false);
        onComplete?.();
      }
    }, speed);
  }, [text, speed, characters, revealDirection, isAnimating, trigger, onComplete]);

  useEffect(() => {
    if (trigger) {
      scramble();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trigger, scramble]);

  return (
    <span className={`font-mono ${className}`}>
      {displayText}
    </span>
  );
}

export default DecryptedText;
