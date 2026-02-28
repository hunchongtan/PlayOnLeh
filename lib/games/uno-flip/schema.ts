import { GameDefinition } from "@/lib/games/types";

export const unoFlipDefinition: GameDefinition = {
  id: "uno-flip",
  name: "Uno Flip",
  description: "Dual-sided Uno with Light and Dark sides triggered by Flip cards.",
  rulesSourceUrl: "https://service.mattel.com/instruction_sheets/GDR44-Eng.pdf",
  metadata: {
    players: "2-10",
    duration: "30-45 min",
    age: "7+",
    coverImage: "/logo.png",
  },
  fields: [
    {
      key: "stackDrawOne",
      label: "Stack Draw One cards?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "stackDrawFive",
      label: "Stack Draw Five cards?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "flipCardForcesFlip",
      label: "Flip card always forces side switch?",
      type: "checkbox",
      defaultValue: true,
    },
    {
      key: "victoryCondition",
      label: "Victory condition",
      type: "select",
      defaultValue: "first_to_zero_cards",
      options: [
        { label: "First to empty hand", value: "first_to_zero_cards" },
        { label: "Standard 500 points", value: "points_500" },
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
