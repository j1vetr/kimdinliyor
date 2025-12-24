interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({ isPlaying, className = "" }: AudioVisualizerProps) {
  const bars = [0, 0.2, 0.1, 0.3, 0.15, 0.25, 0.05, 0.2];
  
  return (
    <div className={`flex items-end justify-center gap-0.5 h-8 ${className}`}>
      {bars.map((delay, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            isPlaying 
              ? "bg-[#1DB954] animate-equalizer" 
              : "bg-muted-foreground/30 h-1"
          }`}
          style={{
            animationDelay: isPlaying ? `${delay}s` : undefined,
            height: isPlaying ? undefined : "4px",
          }}
        />
      ))}
    </div>
  );
}
