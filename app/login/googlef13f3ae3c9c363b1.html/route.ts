import { NextResponse } from 'next/server';

export async function GET() {
  // استبدل النص أدناه بالسطر النصي الموجود داخل ملف جوجل الذي قمت بتنزيله
  const verificationText = "google-site-verification: googlef13f3ae3c9c363b1.html"; 

  return new NextResponse(verificationText, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}