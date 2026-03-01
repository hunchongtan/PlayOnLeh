import { GameDefinition } from "@/lib/games/types";

export const duneImperiumDefinition: GameDefinition = {
  id: "dune-imperium",
  name: "Dune: Imperium",
  description:
    "Dune: Imperium is a strategic deck-building and worker placement game set in the Dune universe. Players lead iconic factions, deploy agents to control key locations on Arrakis, manage resources like spice and solari, and build powerful decks to gain influence and victory points.",
  rulesSourceUrl: "https://www.direwolfdigital.com/dune-imperium/resources/",
  metadata: {
    players: "1-4 (6 with expansions)",
    duration: "~60-120 min",
    age: "13+",
    coverImage: "/logo.png",
  },
  fields: [
    {
      key: "expansionVariant",
      label: "Variant / expansions",
      type: "select",
      defaultValue: "base",
      options: [
        { label: "Base game", value: "base" },
        { label: "Rise of Ix", value: "rise_of_ix" },
        { label: "Immortality", value: "immortality" },
      ],
    },
    {
      key: "soloMode",
      label: "Solo mode?",
      type: "checkbox",
      defaultValue: false,
    },
    {
      key: "otherRules",
      label: "Optional house rules",
      type: "textarea",
      defaultValue: "",
      helpText: "Optional free text overrides.",
    },
  ],
};
