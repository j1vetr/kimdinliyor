import { SiSpotify } from "react-icons/si";

interface SpotifyIconProps {
  className?: string;
  size?: number;
}

export function SpotifyIcon({ className = "", size = 24 }: SpotifyIconProps) {
  return (
    <SiSpotify 
      className={`text-[#1DB954] ${className}`} 
      size={size}
    />
  );
}
