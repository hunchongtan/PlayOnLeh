export function buildDefaultSessionTitle(gameName: string): string {
  return `New ${gameName} Session`;
}

export function buildSessionTitleFromFirstPrompt(text: string, max = 64): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "New Session";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trimEnd()}...`;
}

export function resolveSessionTitle(input: { title?: string | null; gameName: string }): string {
  const persisted = input.title?.trim();
  if (persisted) return persisted;
  return buildDefaultSessionTitle(input.gameName);
}
