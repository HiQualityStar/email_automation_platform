import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import FireCrawlApp from "@mendable/firecrawl-js";

const MAX_CHUNK_TOKENS = 3000; // Conservative limit to avoid overflows

function splitText(text: string, maxTokens: number): string[] {
  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxTokens * 4) {
      // 1 token ≈ 4 chars
      chunks.push(currentChunk);
      currentChunk = para + "\n\n";
    } else {
      currentChunk += para + "\n\n";
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  let time = 0;
  const timer = setInterval(() => {
    time += 1;
    console.log(time);
  }, 1000);

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  const firecrawl = new FireCrawlApp({
    apiKey: process.env.NEXT_PUBLIC_Crawl_Api_Key!,
  });
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  });

  try {
    const scrapeResult = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });

    if (!("markdown" in scrapeResult)) {
      return NextResponse.json(
        { error: "Failed to scrape URL." },
        { status: 500 }
      );
    }

    const fullContent = scrapeResult.markdown as string;
    const chunks = splitText(fullContent, MAX_CHUNK_TOKENS);

    const partialSummaries: string[] = [];
    console.log("completed scraping in ", time);
    for (const chunk of chunks) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a professional marketing assistant. Summarize the following content briefly:",
          },
          {
            role: "user",
            content: chunk,
          },
        ],
      });

      const summary = completion.choices[0]?.message?.content || "";
      partialSummaries.push(summary);
    }

    // Combine all summaries into one final email
    const finalSummaryResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a professional marketing assistant. Combine the following summaries into one polished, client-ready email. Be clear, concise, and professional.",
        },
        {
          role: "user",
          content: partialSummaries.join("\n\n"),
        },
      ],
    });

    const finalSummary =
      finalSummaryResponse.choices[0]?.message?.content || "";
    console.log("completed sudiet in ", time);
    clearInterval(timer);
    return NextResponse.json({ summary: finalSummary, scraped: fullContent });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json(
      { error: "Failed to generate audit." },
      { status: 500 }
    );
  }
}
