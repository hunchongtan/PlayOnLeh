export type GameId = "uno" | "uno-flip" | "mahjong";

export type HouseRuleFieldType = "checkbox" | "select" | "textarea" | "number";

export type HouseRuleFieldOption = {
  label: string;
  value: string;
};

export type HouseRuleField = {
  key: string;
  label: string;
  type: HouseRuleFieldType;
  helpText?: string;
  options?: HouseRuleFieldOption[];
  defaultValue?: boolean | string;
};

export type GameDefinition = {
  id: GameId;
  name: string;
  description: string;
  fields: HouseRuleField[];
  rulesFile?: string;
  rulesSourceUrl: string;
  metadata: {
    players: string;
    duration: string;
    age: string;
    coverImage?: string;
  };
};

export type UnoHouseRules = {
  stackDrawTwo: boolean;
  stackWildDrawFour: boolean;
  ruleSevenZero: boolean;
  jumpIn: boolean;
  victoryCondition: "points_500" | "first_to_zero_cards" | "other";
  otherRules: string;
};

export type UnoFlipHouseRules = {
  stackDrawOne: boolean;
  stackDrawFive: boolean;
  flipCardForcesFlip: boolean;
  victoryCondition: "first_to_zero_cards" | "points_500" | "other";
  otherRules: string;
};

export type MahjongHouseRules = {
  variant_label: "singapore" | "hong_kong" | "riichi" | "custom";
  min_points_to_win?: number | null;
  min_fan_to_win?: number | null;
  allow_chi: boolean;
  chi_from: "left_only" | "any_player" | "disabled";
  flowers_used: boolean;
  jokers_used: boolean;
  winning_on_discard_allowed: boolean;
  special_hands_allowed: boolean;
  other_rules: string;
};

export type GameHouseRules = UnoHouseRules | UnoFlipHouseRules | MahjongHouseRules;
