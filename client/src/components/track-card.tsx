import { Music } from "lucide-react";

interface TrackCardProps {
  trackName: string;
  artistName: string;
  albumArtUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export function TrackCard({ 
  trackName, 
  artistName, 
  albumArtUrl, 
  size = "md" 
}: TrackCardProps) {
  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-48 h-48 md:w-64 md:h-64",
    lg: "w-64 h-64 md:w-80 md:h-80",
  };

  const textSizes = {
    sm: { title: "text-sm", artist: "text-xs" },
    md: { title: "text-xl md:text-2xl", artist: "text-base md:text-lg" },
    lg: { title: "text-2xl md:text-3xl", artist: "text-lg md:text-xl" },
  };

  return (
    <div className="flex flex-col items-center gap-4 animate-scale-in">
      <div 
        className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-muted shadow-xl relative`}
      >
        {albumArtUrl ? (
          <img
            src={albumArtUrl}
            alt={`${trackName} album art`}
            className="w-full h-full object-cover"
            data-testid="img-album-art"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
            <Music className="w-1/3 h-1/3 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="text-center space-y-1">
        <h2 
          className={`${textSizes[size].title} font-bold`}
          data-testid="text-track-name"
        >
          {trackName}
        </h2>
        <p 
          className={`${textSizes[size].artist} text-muted-foreground`}
          data-testid="text-artist-name"
        >
          {artistName}
        </p>
      </div>
    </div>
  );
}
