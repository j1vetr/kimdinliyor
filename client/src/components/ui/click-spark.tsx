import { useRef, useCallback } from "react";

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  sparkSize?: number;
  duration?: number;
  className?: string;
}

export function ClickSpark({
  children,
  sparkColor = "#dc2626",
  sparkCount = 8,
  sparkSize = 10,
  duration = 400,
  className = "",
}: ClickSparkProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const createSpark = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement("div");
        const angle = (360 / sparkCount) * i;
        const velocity = 50 + Math.random() * 50;

        spark.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${sparkSize}px;
          height: ${sparkSize}px;
          background: ${sparkColor};
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
        `;

        containerRef.current.appendChild(spark);

        const radians = (angle * Math.PI) / 180;
        const endX = x + Math.cos(radians) * velocity;
        const endY = y + Math.sin(radians) * velocity;

        spark.animate(
          [
            { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
            {
              transform: `translate(${endX - x - sparkSize / 2}px, ${endY - y - sparkSize / 2}px) scale(0)`,
              opacity: 0,
            },
          ],
          {
            duration,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            fill: "forwards",
          }
        );

        setTimeout(() => spark.remove(), duration);
      }
    },
    [sparkColor, sparkCount, sparkSize, duration]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-visible ${className}`}
      onClick={createSpark}
      style={{ position: "relative" }}
    >
      {children}
    </div>
  );
}

export default ClickSpark;
