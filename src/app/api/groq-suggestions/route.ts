import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { rateLimit } from "@/lib/rate-limit";

const TMDB_BASE = "https://api.themoviedb.org/3";
const DEFAULT_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const MAX_QUERY_LENGTH = 2000;

interface TMDBItem {
  id: number;
  media_type: "tv" | "movie";
  title: string;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
}

function extractJsonArray(text: string): any[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to get suggestions" }, { status: 401 });
  }
  if (!rateLimit(`groq:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : "";
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const tmdbApiKey = process.env.TMDB_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqApiUrl = process.env.GROQ_API_URL || DEFAULT_GROQ_URL;
  const groqModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  if (!tmdbApiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY is not configured" }, { status: 500 });
  }
  if (!groqApiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
  }

  try {
    // Step 1: Ask LLM for movie/show titles based on user query
    const prompt = `You are a movie and TV show recommendation expert.

User request: "${query}"

Your task:
1. Understand what the user is looking for (genre, mood, franchise, actors, etc.)
2. Provide a list of 12 specific movie or TV show titles that match their request
3. Focus on popular, well-known titles
4. Use exact, official titles

CRITICAL RULES:
1. Match the user's intent EXACTLY
2. Return ONLY a JSON array of title strings
3. No explanations, no markdown

JSON Response (array of title strings):
["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6", "Title 7", "Title 8", "Title 9", "Title 10", "Title 11", "Title 12"]
`;

    // gpt-oss models "think" first and those tokens count toward the limit, so keep reasoning short.
    const isReasoningModel = /gpt-oss|qwen3|deepseek-r1/i.test(groqModel);
    const groqResponse = await fetch(groqApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_completion_tokens: isReasoningModel ? 4000 : 1000,
        ...(isReasoningModel && { reasoning_effort: "low" }),
      }),
    });

    const groqJson = await groqResponse.json().catch(() => null);
    if (!groqResponse.ok) {
      console.error("Groq request failed", groqResponse.status, groqModel, JSON.stringify(groqJson?.error ?? groqJson).slice(0, 300));
      return NextResponse.json(
        { error: groqResponse.status === 429 ? "AI is busy, try again shortly" : "AI provider error" },
        { status: groqResponse.status === 429 ? 429 : 502 }
      );
    }

    const choice = groqJson?.choices?.[0];
    const responseText: string = choice?.message?.content || "";

    // Extract titles from LLM response
    const titles = extractJsonArray(responseText);
    if (!titles || titles.length === 0) {
      console.error("Groq returned no titles", groqModel, choice?.finish_reason, JSON.stringify(responseText).slice(0, 200));
      return NextResponse.json({ error: "AI returned no suggestions" }, { status: 502 });
    }

    // Step 2: Search TMDB for each title and get the #1 most popular result

    const searchPromises = titles
      .filter((title): title is string => typeof title === "string" && title.length > 0 && title.length < 200)
      .slice(0, 12)
      .map((title) =>
        fetch(`${TMDB_BASE}/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&include_adult=false`, {
          next: { revalidate: 86400 },
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      );

    const searchResults = await Promise.all(searchPromises);

    // Extract the #1 most popular result for each title
    const suggestions: TMDBItem[] = [];
    const seenIds = new Set<number>();

    for (const data of searchResults) {
      if (!data || !data.results || data.results.length === 0) continue;
      
      // Get the first (most popular) result
      const topResult = data.results[0];
      
      if (topResult.media_type !== "tv" && topResult.media_type !== "movie") continue;
      if (seenIds.has(topResult.id)) continue;
      
      seenIds.add(topResult.id);
      suggestions.push({
        id: topResult.id,
        media_type: topResult.media_type,
        title: topResult.title || topResult.name || "Untitled",
        backdrop_path: topResult.backdrop_path || topResult.poster_path || null,
        overview: topResult.overview || "",
        release_date: topResult.release_date || topResult.first_air_date || "",
      });
      
      if (suggestions.length >= 12) break;
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Groq suggestions error", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}