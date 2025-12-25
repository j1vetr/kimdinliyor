import logoDark from "@assets/logo-dark.png";

interface LogoProps {
  height?: number;
  className?: string;
  showAnimation?: boolean;
}

export function Logo({ height = 32, className = "", showAnimation = true }: LogoProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {showAnimation && (
        <div className="absolute inset-0 -m-1.5 rounded-xl overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-1 pb-0.5 gap-0.5">
            <div className="w-1 bg-primary/60 rounded-t-full animate-equalizer-1" style={{ height: '30%' }} />
            <div className="w-1 bg-primary/60 rounded-t-full animate-equalizer-2" style={{ height: '60%' }} />
            <div className="w-1 bg-primary/60 rounded-t-full animate-equalizer-3" style={{ height: '40%' }} />
            <div className="w-1 bg-primary/60 rounded-t-full animate-equalizer-4" style={{ height: '80%' }} />
            <div className="w-1 bg-primary/60 rounded-t-full animate-equalizer-5" style={{ height: '50%' }} />
          </div>
        </div>
      )}
      <img
        src={logoDark}
        alt="Kim Dinliyor"
        style={{ height: `${height}px`, width: "auto" }}
        className="relative z-10"
        data-testid="img-logo"
      />
    </div>
  );
}
