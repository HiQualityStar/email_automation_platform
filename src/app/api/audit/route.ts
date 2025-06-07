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
            content: `
You are an expert in hotel marketing and hospitality platform optimization. 
Perform a detailed listing audit for Expedia or Booking.com content based on the following structure: 

PART 1 – FRONTEND (Guest View)
1. Visibility – Is the property easy to find in search? Are filters and mobile views optimized?
2. Photos & First Impressions – Are cover photos, room images, and lifestyle shots high quality?
3. Text & Descriptions – Are titles clear and value-driven? Are descriptions unique and up-to-date?
4. Offer & Availability – Are there visible offers? Are prices competitive and dates available?

PART 2 – BACKEND (Admin View)
1. Setup – Are room types mapped? Is the listing open/bookable? Any syncing issues?
2. Rates & Promotions – Are rates and promotions structured correctly? Are discounts working?
3. Photos & Content – Enough images? Proper tags and content quality?
4. Rooms & Amenities – Are amenities complete and correct? Any missing details?
5. Performance & Data – Are metrics like CTR, conversion, cancellations being monitored?

BONUS:
- Are competitors being monitored?
- Are promotions adjusted weekly?
- Is pricing optimized for events or weekends?

Format your output in bullet points under each category with specific observations and suggestions.
        `.trim(),
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
          content: `
You are a senior hotel marketing consultant. Combine the following audits into one clean, professional report.
Group feedback under the standard audit categories. Ensure it reads like a self-audit checklist with helpful insights.
Avoid generic statements. Be clear, constructive, and precise. Make sure it can be delivered directly to hotel clients.
      `.trim(),
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
