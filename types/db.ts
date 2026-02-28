import { z } from "zod";
import { GameId, MahjongHouseRules, UnoFlipHouseRules, UnoHouseRules } from "@/lib/games/types";

export const unoHouseRulesSchema = z.object({
  stackDrawTwo: z.boolean().default(false),
  stackWildDrawFour: z.boolean().default(false),
  ruleSevenZero: z.boolean().default(false),
  jumpIn: z.boolean().default(false),
  victoryCondition: z.enum(["points_500", "first_to_zero_cards", "other"]).default("points_500"),
  otherRules: z.string().default(""),
});

export const unoFlipHouseRulesSchema = z.object({
  stackDrawOne: z.boolean().default(false),
  stackDrawFive: z.boolean().default(false),
  flipCardForcesFlip: z.boolean().default(true),
  victoryCondition: z.enum(["points_500", "first_to_zero_cards", "other"]).default("first_to_zero_cards"),
  otherRules: z.string().default(""),
});

export const mahjongHouseRulesSchema = z.object({
  variant_label: z.enum(["singapore", "hong_kong", "riichi", "custom"]).default("singapore"),
  min_points_to_win: z.number().int().min(0).nullable().optional(),
  min_fan_to_win: z.number().int().min(0).nullable().optional(),
  allow_chi: z.boolean().default(true),
  chi_from: z.enum(["left_only", "any_player", "disabled"]).default("left_only"),
  flowers_used: z.boolean().default(true),
  jokers_used: z.boolean().default(false),
  winning_on_discard_allowed: z.boolean().default(true),
  special_hands_allowed: z.boolean().default(true),
  other_rules: z.string().default(""),
});

export const houseRulesSchema = z.union([unoHouseRulesSchema, unoFlipHouseRulesSchema, mahjongHouseRulesSchema]);

export type HouseRules = UnoHouseRules | UnoFlipHouseRules | MahjongHouseRules;

export type SessionRecord = {
  id: string;
  game_id: GameId;
  house_rules_json: HouseRules;
  house_rules_summary: string;
  house_rules_mode: "standard" | "custom";
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionListItem = SessionRecord & {
  game_name?: string;
  cover_image_url?: string | null;
  first_user_message?: string | null;
};

export type MessageRecord = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image_url: string | null;
  image_mime: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
};

export type FeedbackRecord = {
  id: string;
  session_id: string;
  message_id: string;
  game_id: GameId;
  sentiment: "up" | "down";
  reason: "incorrect_ruling" | "missing_information" | "unclear_explanation" | "other" | null;
  details: string | null;
  created_at: string;
};

export type RulesChunkRecord = {
  id: string;
  game_id: GameId;
  variant_id: string | null;
  source_url: string;
  source_title: string | null;
  page_start: number | null;
  chunk_index: number;
  content: string;
  created_at: string;
};

export type RagChunk = Pick<RulesChunkRecord, "id" | "variant_id" | "content" | "page_start" | "source_url" | "source_title" | "chunk_index">;

export type GameRecord = {
  id: GameId;
  name: string;
  description: string;
  storage_bucket?: string | null;
  cover_object_path?: string | null;
  rules_pdf_object_path?: string | null;
};
