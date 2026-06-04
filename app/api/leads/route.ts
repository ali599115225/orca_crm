import { NextResponse } from "next/server";

const demo = [
  { id: 1, name: "أحمد السبيعي", source: "إعلان مدفوع", status: "مهتم", lastContact: "قبل 3 أيام", phone: "050-1234567" },
  { id: 2, name: "سارة العتيبي", source: "واتساب", status: "جديد", lastContact: "اليوم", phone: "055-9876543" },
  { id: 3, name: "محمد القحطاني", source: "موقع إلكتروني", status: "محتمل قوي", lastContact: "أمس", phone: "053-5555555" },
];

export async function GET() {
  return NextResponse.json(demo);
}
