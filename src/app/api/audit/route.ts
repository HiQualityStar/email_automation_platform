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
  const start = Date.now();

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  const firecrawl = new FireCrawlApp({
    apiKey: process.env.NEXT_PUBLIC_Crawl_Api_Key!, // ✅ Use secure backend-only var
  });

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!, // ✅ Also should be secure
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

    console.log("✅ Scraping complete in", (Date.now() - start) / 1000, "s");
    console.log(fullContent.length);
    // Parallel summarization using gpt-4o
    const summaryPromises = chunks.map((chunk) =>
      openai.chat.completions.create({
        model: "gpt-4o", // ✅ Much faster and cheaper
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
      })
    );

    const results = await Promise.all(summaryPromises);
    const partialSummaries = results.map(
      (res) => res.choices[0]?.message?.content || ""
    );

    const finalSummaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
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

    console.log("✅ All done in", (Date.now() - start) / 1000, "s");

    return NextResponse.json(
      { summary: finalSummary, scraped: fullContent },
      {
        headers: {
          "X-Processing-Time": `${(Date.now() - start) / 1000}s`,
        },
      }
    );
  } catch (err: unknown) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to generate audit." },
      { status: 500 }
    );
  }
}
