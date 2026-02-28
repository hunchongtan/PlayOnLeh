import { GameId } from "@/lib/games/types";
import { SessionListItem } from "@/types/db";

export type HomeGame = {
  id: GameId;
  name: string;
  category: string;
  coverImageUrl?: string;
};

export type HomeRecentGame = {
  gameId: GameId;
  gameName: string;
  coverImageUrl?: string | null;
};

export type HomeRecentChat = SessionListItem;
