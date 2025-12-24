import logoDark from "@assets/logo-dark.png";

interface LogoProps {
  height?: number;
  className?: string;
}

export function Logo({ height = 32, className = "" }: LogoProps) {
  return (
    <img
      src={logoDark}
      alt="Kim Dinliyor"
      style={{ height: `${height}px`, width: "auto" }}
      className={className}
      data-testid="img-logo"
    />
  );
}
