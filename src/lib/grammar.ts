export interface GrammarMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
}

export interface GrammarResponse {
  software: any;
  language: any;
  matches: GrammarMatch[];
}

export async function checkGrammar(text: string): Promise<GrammarMatch[]> {
  if (!text || text.trim() === "") return [];

  try {
    const params = new URLSearchParams();
    params.append("text", text);
    params.append("language", "en-US");

    const response = await fetch("https://api.languagetoolplus.com/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GrammarResponse = await response.json();
    return data.matches;
  } catch (error) {
    console.error("Grammar check failed:", error);
    return [];
  }
}
