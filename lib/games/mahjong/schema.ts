import { GameDefinition } from "@/lib/games/types";

export const mahjongDefinition: GameDefinition = {
  id: "mahjong",
  name: "Mahjong",
  description: "Tile-based strategy game with regional house-rule variants.",
  rulesSourceUrl: "https://service.mattel.com/instruction_sheets/mahjong-rules.pdf",
  metadata: {
    players: "4",
    duration: "45-120 min",
    age: "12+",
    coverImage: "/logo.png",
  },
  fields: [
    {
      key: "variant_label",
      label: "Country / variant profile",
      type: "select",
      defaultValue: "singapore",
      options: [
        { label: "Singapore", value: "singapore" },
        { label: "Hong Kong", value: "hong_kong" },
        { label: "Riichi", value: "riichi" },
        { label: "Custom", value: "custom" },
      ],
    },
    {
      key: "min_points_to_win",
      label: "Minimum points to win (optional)",
      type: "number",
      helpText: "Leave blank if your table does not use a points threshold.",
    },
    {
      key: "min_fan_to_win",
      label: "Minimum fan to win (optional)",
      type: "number",
      helpText: "Leave blank if fan threshold is not used.",
    },
    {
      key: "allow_chi",
      label: "Allow Chi melds?",
      type: "checkbox",
      defaultValue: true,
    },
    {
      key: "chi_from",
      label: "Chi can be claimed from",
      type: "select",
      defaultValue: "left_only",
      options: [
        { label: "Left player only", value: "left_only" },
        { label: "Any player", value: "any_player" },
        { label: "Disabled", value: "disabled" },
      ],
    },
    {
      key: "flowers_used",
      label: "Use flower tiles?",
      type: "checkbox",
      defaultValue: true,
    },
    {
      key: "jokers_used",
      label: "Use jokers?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "winning_on_discard_allowed",
      label: "Allow winning on discard?",
      type: "checkbox",
      defaultValue: true,
    },
    {
      key: "special_hands_allowed",
      label: "Allow special hands?",
      type: "checkbox",
      defaultValue: true,
    },
    {
      key: "other_rules",
      label: "Other house rules",
      type: "textarea",
      defaultValue: "",
      helpText: "Optional free text overrides.",
    },
  ],
};
