// utils/sendEmail.ts
import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  name,
  subject,
  text,
  html,
}: {
  to: string;
  name: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // or use "host", "port", and "secure" for custom SMTP
    auth: {
      user: process.env.EMAIL_USER, // your Gmail address
      pass: process.env.EMAIL_PASS, // your Gmail App Password
    },
  });

  const mailOptions = {
    from: `${name} <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent:", info.messageId);
}
