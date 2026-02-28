import { readFile } from "node:fs/promises";

type RuleSnippet = {
  title: string;
  content: string;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreSnippet(snippet: RuleSnippet, queryTokens: string[]): number {
  const text = `${snippet.title} ${snippet.content}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function parseMarkdownIntoSnippets(markdown: string): RuleSnippet[] {
  const lines = markdown.split(/\r?\n/);
  const snippets: RuleSnippet[] = [];

  let currentTitle = "General";
  let currentContent: string[] = [];

  const flush = () => {
    const content = currentContent.join(" ").trim();
    if (content) {
      snippets.push({ title: currentTitle, content });
    }
    currentContent = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[1].trim();
      continue;
    }

    if (line.trim()) {
      currentContent.push(line.trim());
    }
  }

  flush();
  return snippets;
}

export async function retrieveRuleSnippets({
  rulesPath,
  question,
  maxSnippets = 3,
}: {
  rulesPath: string;
  question: string;
  maxSnippets?: number;
}) {
  const markdown = await readFile(rulesPath, "utf-8");
  const snippets = parseMarkdownIntoSnippets(markdown);
  const queryTokens = tokenize(question);

  const ranked = snippets
    .map((snippet) => ({
      snippet,
      score: scoreSnippet(snippet, queryTokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(maxSnippets, 3)));

  if (ranked.length === 0) {
    return snippets.slice(0, 1);
  }

  return ranked.map((item) => item.snippet);
}
