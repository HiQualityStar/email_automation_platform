// app/api/send-audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/utils/sendEmail";

export async function POST(req: NextRequest) {
  const { to, subject,text, html } = await req.json();

  try {
    await sendEmail({ to, subject,text, html });
    return NextResponse.json({ success: true}, { status: 200 } );
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
