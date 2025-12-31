import { useEffect, useState, useRef, memo } from "react";

interface DecryptedTextProps {
  text: string;
  className?: string;
  speed?: number;
  characters?: string;
  revealDirection?: "start" | "end" | "center";
  onComplete?: () => void;
}

function DecryptedTextInner({
  text,
  className = "",
  speed = 50,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*",
  revealDirection = "start",
  onComplete,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnimatedRef = useRef(false);
  const previousTextRef = useRef(text);

  useEffect(() => {
    if (hasAnimatedRef.current && previousTextRef.current === text) {
      return;
    }

    previousTextRef.current = text;
    hasAnimatedRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!text) {
      setDisplayText("");
      return;
    }

    let iteration = 0;
    const length = text.length;

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
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, characters, revealDirection, onComplete]);

  return (
    <span className={`font-mono ${className}`}>
      {displayText || text}
    </span>
  );
}

export const DecryptedText = memo(DecryptedTextInner);

export default DecryptedText;
