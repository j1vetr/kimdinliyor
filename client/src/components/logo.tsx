import logoDark from "@assets/logo-dark.png";
import logoLight from "@assets/logo-light.png";
import { useTheme } from "@/lib/theme";

interface LogoProps {
  height?: number;
  className?: string;
}

export function Logo({ height = 32, className = "" }: LogoProps) {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? logoDark : logoLight;

  return (
    <img
      src={logoSrc}
      alt="Kim Dinliyor"
      style={{ height: `${height}px`, width: "auto" }}
      className={className}
      data-testid="img-logo"
    />
  );
}
