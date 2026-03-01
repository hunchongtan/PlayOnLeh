import { unoDefinition } from "@/lib/games/uno/schema";
import { unoFlipDefinition } from "@/lib/games/uno-flip/schema";
import { mahjongDefinition } from "@/lib/games/mahjong/schema";
import { duneImperiumDefinition } from "@/lib/games/dune-imperium/schema";
import {
  DuneImperiumHouseRules,
  GameDefinition,
  GameHouseRules,
  GameId,
  MahjongHouseRules,
  UnoFlipHouseRules,
  UnoHouseRules,
} from "@/lib/games/types";

export type HouseRuleSummary = {
  summary: string;
  bullets: string[];
};

export const GAME_REGISTRY: Record<GameId, GameDefinition> = {
  uno: unoDefinition,
  "uno-flip": unoFlipDefinition,
  mahjong: mahjongDefinition,
  "dune-imperium": duneImperiumDefinition,
};

export function getGameDefinition(gameId: string): GameDefinition | null {
  if (gameId === "uno" || gameId === "uno-flip" || gameId === "mahjong" || gameId === "dune-imperium") {
    return GAME_REGISTRY[gameId];
  }
  return null;
}

export function getDefaultUnoHouseRules(): UnoHouseRules {
  return {
    stackDrawTwo: false,
    stackWildDrawFour: false,
    ruleSevenZero: false,
    jumpIn: false,
    victoryCondition: "points_500",
    otherRules: "",
  };
}

export function getDefaultUnoFlipHouseRules(): UnoFlipHouseRules {
  return {
    stackDrawOne: false,
    stackDrawFive: false,
    flipCardForcesFlip: true,
    victoryCondition: "first_to_zero_cards",
    otherRules: "",
  };
}

export function getDefaultHouseRules(gameId: GameId): GameHouseRules {
  if (gameId === "dune-imperium") {
    return getDefaultDuneImperiumHouseRules();
  }
  if (gameId === "mahjong") {
    return getDefaultMahjongHouseRules();
  }
  if (gameId === "uno-flip") {
    return getDefaultUnoFlipHouseRules();
  }
  return getDefaultUnoHouseRules();
}

export function getDefaultDuneImperiumHouseRules(): DuneImperiumHouseRules {
  return {
    expansionVariant: "base",
    soloMode: false,
    otherRules: "",
  };
}

export function getDefaultMahjongHouseRules(): MahjongHouseRules {
  return {
    variant_label: "singapore",
    min_points_to_win: null,
    min_fan_to_win: null,
    allow_chi: true,
    chi_from: "left_only",
    flowers_used: true,
    jokers_used: false,
    winning_on_discard_allowed: true,
    special_hands_allowed: true,
    other_rules: "",
  };
}

function normalizeUnoHouseRules(houseRules: Partial<UnoHouseRules> | null | undefined): UnoHouseRules {
  const defaults = getDefaultUnoHouseRules();
  const raw = houseRules ?? {};

  const victoryCondition =
    raw.victoryCondition === "points_500" ||
    raw.victoryCondition === "first_to_zero_cards" ||
    raw.victoryCondition === "other"
      ? raw.victoryCondition
      : defaults.victoryCondition;

  return {
    stackDrawTwo: Boolean(raw.stackDrawTwo),
    stackWildDrawFour: Boolean(raw.stackWildDrawFour),
    ruleSevenZero: Boolean(raw.ruleSevenZero),
    jumpIn: Boolean(raw.jumpIn),
    victoryCondition,
    otherRules: typeof raw.otherRules === "string" ? raw.otherRules : "",
  };
}

function normalizeUnoFlipHouseRules(houseRules: Partial<UnoFlipHouseRules> | null | undefined): UnoFlipHouseRules {
  const defaults = getDefaultUnoFlipHouseRules();
  const raw = houseRules ?? {};

  const victoryCondition =
    raw.victoryCondition === "points_500" ||
    raw.victoryCondition === "first_to_zero_cards" ||
    raw.victoryCondition === "other"
      ? raw.victoryCondition
      : defaults.victoryCondition;

  return {
    stackDrawOne: Boolean(raw.stackDrawOne),
    stackDrawFive: Boolean(raw.stackDrawFive),
    flipCardForcesFlip: raw.flipCardForcesFlip === undefined ? defaults.flipCardForcesFlip : Boolean(raw.flipCardForcesFlip),
    victoryCondition,
    otherRules: typeof raw.otherRules === "string" ? raw.otherRules : "",
  };
}

function normalizeMahjongHouseRules(houseRules: Partial<MahjongHouseRules> | null | undefined): MahjongHouseRules {
  const defaults = getDefaultMahjongHouseRules();
  const raw = houseRules ?? {};

  const variantLabel =
    raw.variant_label === "singapore" ||
    raw.variant_label === "hong_kong" ||
    raw.variant_label === "riichi" ||
    raw.variant_label === "custom"
      ? raw.variant_label
      : defaults.variant_label;

  const chiFrom =
    raw.chi_from === "left_only" || raw.chi_from === "any_player" || raw.chi_from === "disabled"
      ? raw.chi_from
      : defaults.chi_from;

  const minPoints =
    typeof raw.min_points_to_win === "number" && Number.isFinite(raw.min_points_to_win)
      ? Math.max(0, Math.floor(raw.min_points_to_win))
      : null;
  const minFan =
    typeof raw.min_fan_to_win === "number" && Number.isFinite(raw.min_fan_to_win)
      ? Math.max(0, Math.floor(raw.min_fan_to_win))
      : null;

  return {
    variant_label: variantLabel,
    min_points_to_win: minPoints,
    min_fan_to_win: minFan,
    allow_chi: raw.allow_chi === undefined ? defaults.allow_chi : Boolean(raw.allow_chi),
    chi_from: chiFrom,
    flowers_used: raw.flowers_used === undefined ? defaults.flowers_used : Boolean(raw.flowers_used),
    jokers_used: raw.jokers_used === undefined ? defaults.jokers_used : Boolean(raw.jokers_used),
    winning_on_discard_allowed:
      raw.winning_on_discard_allowed === undefined ? defaults.winning_on_discard_allowed : Boolean(raw.winning_on_discard_allowed),
    special_hands_allowed: raw.special_hands_allowed === undefined ? defaults.special_hands_allowed : Boolean(raw.special_hands_allowed),
    other_rules: typeof raw.other_rules === "string" ? raw.other_rules : "",
  };
}

function normalizeDuneImperiumHouseRules(
  houseRules: Partial<DuneImperiumHouseRules> | null | undefined
): DuneImperiumHouseRules {
  const defaults = getDefaultDuneImperiumHouseRules();
  const raw = houseRules ?? {};

  const expansionVariant =
    raw.expansionVariant === "base" || raw.expansionVariant === "rise_of_ix" || raw.expansionVariant === "immortality"
      ? raw.expansionVariant
      : defaults.expansionVariant;

  return {
    expansionVariant,
    soloMode: raw.soloMode === undefined ? defaults.soloMode : Boolean(raw.soloMode),
    otherRules: typeof raw.otherRules === "string" ? raw.otherRules : "",
  };
}

function getUnoHouseRuleSummary(houseRules: Partial<UnoHouseRules> | null | undefined): HouseRuleSummary {
  const normalized = normalizeUnoHouseRules(houseRules);
  const victoryMap: Record<UnoHouseRules["victoryCondition"], string> = {
    points_500: "Victory is 500 points.",
    first_to_zero_cards: "Victory is first player to empty hand.",
    other: "Victory condition is custom.",
  };
  const bullets = [
    normalized.stackDrawTwo ? "Stacking Draw Two is allowed." : "Stacking Draw Two is not allowed.",
    normalized.stackWildDrawFour ? "Stacking Wild Draw Four is allowed." : "Stacking Wild Draw Four is not allowed.",
    normalized.ruleSevenZero ? "7-0 rule is enabled." : "7-0 rule is disabled.",
    normalized.jumpIn ? "Jump-in is allowed." : "Jump-in is disabled.",
    victoryMap[normalized.victoryCondition],
    normalized.otherRules.trim() ? `Other custom rules: ${normalized.otherRules.trim()}.` : "",
  ].filter(Boolean);

  return { summary: toBulletSummaryText(bullets), bullets };
}

function getUnoFlipHouseRuleSummary(houseRules: Partial<UnoFlipHouseRules> | null | undefined): HouseRuleSummary {
  const normalized = normalizeUnoFlipHouseRules(houseRules);
  const victoryMap: Record<UnoFlipHouseRules["victoryCondition"], string> = {
    points_500: "Victory is 500 points.",
    first_to_zero_cards: "Victory is first player to empty hand.",
    other: "Victory condition is custom.",
  };

  const bullets = [
    normalized.stackDrawOne ? "Stacking Draw One is allowed." : "Stacking Draw One is not allowed.",
    normalized.stackDrawFive ? "Stacking Draw Five is allowed." : "Stacking Draw Five is not allowed.",
    normalized.flipCardForcesFlip
      ? "Flip cards force all players to switch sides."
      : "Flip cards may be ignored by house agreement.",
    victoryMap[normalized.victoryCondition],
    normalized.otherRules.trim() ? `Other custom rules: ${normalized.otherRules.trim()}.` : "",
  ].filter(Boolean);

  return { summary: toBulletSummaryText(bullets), bullets };
}

function getMahjongHouseRuleSummary(houseRules: Partial<MahjongHouseRules> | null | undefined): HouseRuleSummary {
  const normalized = normalizeMahjongHouseRules(houseRules);
  const variantLabelMap: Record<MahjongHouseRules["variant_label"], string> = {
    singapore: "Singapore",
    hong_kong: "Hong Kong",
    riichi: "Riichi",
    custom: "Custom",
  };

  const bullets = [
    `Variant profile: ${variantLabelMap[normalized.variant_label]}.`,
    normalized.min_points_to_win !== null ? `Minimum points to win: ${normalized.min_points_to_win}.` : "",
    normalized.min_fan_to_win !== null ? `Minimum fan to win: ${normalized.min_fan_to_win}.` : "",
    normalized.allow_chi ? "Chi melds are allowed." : "Chi melds are not allowed.",
    normalized.chi_from === "left_only"
      ? "Chi can be claimed from the left player only."
      : normalized.chi_from === "any_player"
        ? "Chi can be claimed from any player."
        : "Chi claims are disabled.",
    normalized.flowers_used ? "Flowers are used." : "Flowers are not used.",
    normalized.jokers_used ? "Jokers are used." : "Jokers are not used.",
    normalized.winning_on_discard_allowed ? "Winning on discard is allowed." : "Winning on discard is not allowed.",
    normalized.special_hands_allowed ? "Special hands are allowed." : "Special hands are not allowed.",
    normalized.other_rules.trim() ? `Other custom rules: ${normalized.other_rules.trim()}.` : "",
  ].filter(Boolean);

  return { summary: toBulletSummaryText(bullets), bullets };
}

function getDuneImperiumHouseRuleSummary(
  houseRules: Partial<DuneImperiumHouseRules> | null | undefined
): HouseRuleSummary {
  const normalized = normalizeDuneImperiumHouseRules(houseRules);
  const expansionLabel: Record<DuneImperiumHouseRules["expansionVariant"], string> = {
    base: "Base game",
    rise_of_ix: "Rise of Ix",
    immortality: "Immortality",
  };

  const bullets = [
    `Variant profile: ${expansionLabel[normalized.expansionVariant]}.`,
    normalized.soloMode ? "Solo mode is enabled." : "Solo mode is disabled.",
    normalized.otherRules.trim() ? `Other custom rules: ${normalized.otherRules.trim()}.` : "",
  ].filter(Boolean);

  return { summary: toBulletSummaryText(bullets), bullets };
}

export function getHouseRuleSummary(
  gameId: GameId,
  houseRules: Partial<UnoHouseRules | UnoFlipHouseRules | MahjongHouseRules | DuneImperiumHouseRules> | null | undefined
): HouseRuleSummary {
  if (gameId === "dune-imperium") {
    return getDuneImperiumHouseRuleSummary(houseRules as Partial<DuneImperiumHouseRules> | null | undefined);
  }
  if (gameId === "mahjong") {
    return getMahjongHouseRuleSummary(houseRules as Partial<MahjongHouseRules> | null | undefined);
  }
  if (gameId === "uno-flip") {
    return getUnoFlipHouseRuleSummary(houseRules as Partial<UnoFlipHouseRules> | null | undefined);
  }
  return getUnoHouseRuleSummary(houseRules as Partial<UnoHouseRules> | null | undefined);
}

export function getStandardRulesSummary(gameId: GameId): HouseRuleSummary {
  if (gameId === "dune-imperium") {
    const bullets = [
      "Use official Dune: Imperium base rulebook flow with no custom overrides.",
      "Expansion-specific and solo adjustments are off unless configured.",
      "Table follows official resource, conflict, and victory point rules.",
    ];
    return { summary: toBulletSummaryText(bullets), bullets };
  }

  if (gameId === "mahjong") {
    const bullets = [
      "Use international base rules with no table-specific overrides.",
      "Standard claiming and winning conditions apply per the official rulebook.",
      "No custom point/fan thresholds are applied unless configured later.",
    ];
    return { summary: toBulletSummaryText(bullets), bullets };
  }

  const bullets =
    gameId === "uno-flip"
      ? [
          "No stacking overrides are enabled.",
          "Flip cards follow official side-switch behavior.",
          "Official Uno Flip victory condition applies.",
        ]
      : [
          "No stacking overrides are enabled.",
          "7-0 and Jump-in are disabled.",
          "Official Uno victory condition (500 points) applies.",
        ];

  return { summary: toBulletSummaryText(bullets), bullets };
}

function toBulletSummaryText(bullets: string[]) {
  return bullets.map((bullet) => `- ${bullet}`).join("\n");
}
