import { GameDefinition } from "@/lib/games/types";

export const unoDefinition: GameDefinition = {
  id: "uno",
  name: "Uno",
  description: "Classic shedding card game with action and wild cards.",
  rulesFile: "rules/uno.md",
  rulesSourceUrl: "https://service.mattel.com/instruction_sheets/42001pr.pdf",
  metadata: {
    players: "2-10",
    duration: "30-45 min",
    age: "7+",
    coverImage: "/logo.png",
  },
  fields: [
    {
      key: "stackDrawTwo",
      label: "Stack Draw Two cards?",
      type: "checkbox",
      defaultValue: false,
      helpText: "Allow players to stack +2 on +2.",
    },
    {
      key: "stackWildDrawFour",
      label: "Stack Wild Draw Four cards?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "ruleSevenZero",
      label: "7-0 rule (swap/rotate hands)?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "jumpIn",
      label: "Jump-in (same card out of turn)?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "victoryCondition",
      label: "Victory condition",
      type: "select",
      defaultValue: "points_500",
      options: [
        { label: "Standard 500 points", value: "points_500" },
        { label: "First to zero cards", value: "first_to_zero_cards" },
        { label: "Other", value: "other" },
      ],
    },
    {
      key: "otherRules",
      label: "Other house rules",
      type: "textarea",
      defaultValue: "",
      helpText: "Optional free text.",
    },
  ],
};
