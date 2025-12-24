import { Crown, Check, X, Music } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SpotifyIcon } from "./spotify-icon";
import type { User } from "@shared/schema";

interface PlayerCardProps {
  player: {
    id: string;
    displayName: string;
    uniqueName: string;
    spotifyConnected?: boolean;
    totalScore?: number;
    avatarUrl?: string | null;
  };
  isHost?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  showScore?: boolean;
  resultType?: "correct" | "incorrect" | "partial" | null;
  scoreGained?: number;
  isSelf?: boolean;
}

export function PlayerCard({
  player,
  isHost = false,
  isSelectable = false,
  isSelected = false,
  onSelect,
  showScore = false,
  resultType = null,
  scoreGained,
  isSelf = false,
}: PlayerCardProps) {
  const initials = player.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleClick = () => {
    if (isSelectable && onSelect) {
      onSelect(!isSelected);
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all duration-200
        ${isSelectable ? "cursor-pointer hover-elevate" : ""}
        ${isSelected ? "bg-primary/20 border border-primary/50" : "bg-card border border-card-border"}
        ${resultType === "correct" ? "border-primary bg-primary/10" : ""}
        ${resultType === "incorrect" ? "border-destructive bg-destructive/10" : ""}
        ${resultType === "partial" ? "border-yellow-500 bg-yellow-500/10" : ""}
      `}
      onClick={handleClick}
      data-testid={`card-player-${player.id}`}
    >
      {isSelectable && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          data-testid={`checkbox-player-${player.id}`}
        />
      )}

      <Avatar className="h-10 w-10 border-2 border-muted">
        {player.avatarUrl && (
          <AvatarImage src={player.avatarUrl} alt={player.displayName} />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" data-testid={`text-player-name-${player.id}`}>
            {player.displayName}
            {isSelf && <span className="text-muted-foreground ml-1">(Sen)</span>}
          </span>
          {isHost && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Crown className="h-3 w-3" />
              Host
            </Badge>
          )}
        </div>
        {player.spotifyConnected && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <SpotifyIcon size={12} />
            <span>Bağlı</span>
          </div>
        )}
      </div>

      {showScore && player.totalScore !== undefined && (
        <div className="text-right">
          <div className="font-bold text-lg" data-testid={`text-player-score-${player.id}`}>
            {player.totalScore}
          </div>
          {scoreGained !== undefined && scoreGained > 0 && (
            <div className="text-xs text-primary font-medium">+{scoreGained}</div>
          )}
        </div>
      )}

      {resultType && (
        <div className="flex items-center">
          {resultType === "correct" && (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-primary" />
            </div>
          )}
          {resultType === "incorrect" && (
            <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
              <X className="h-5 w-5 text-destructive" />
            </div>
          )}
          {resultType === "partial" && (
            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Music className="h-5 w-5 text-yellow-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
