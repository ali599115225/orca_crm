// scratch/verify_webhook.ts
import dotenv from "dotenv";
dotenv.config({ path: "c:/Users/ali59/Desktop/REDC/.env" });

// native fetch will be used

async function runTests() {
  const url = "http://localhost:3000/api/v1/leads/webhook";
  const token = "alinma-gold"; // النطاق الفرعي للمنشأة في قاعدة البيانات

  console.log("🚀 بدء اختبارات ويب هوك الوكيل ساهر للعملاء...");

  // 1. اختبار عميل حقيقي بجدية شراء مرتفعة (High Intent Lead)
  console.log("\n1. اختبار عميل بجدية شراء مرتفعة...");
  const lead1 = {
    fullName: "فيصل القحطاني",
    phone: "0557516322",
    email: "faisal@example.com",
    campaignSource: "Snapchat Ads",
    notes: "مستعد لشراء شقة فورا كاش والدفع المباشر لحجز برج النخبة السكني",
    city: "الرياض"
  };

  try {
    const res1 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Token": token
      },
      body: JSON.stringify(lead1)
    });
    const data1 = await res1.json();
    console.log("الاستجابة لـ العميل مرتفع الجدية:", data1);
  } catch (err: any) {
    console.error("فشل العميل مرتفع الجدية:", err.message);
  }

  // 2. اختبار تصفية السبام وأرقام الهواتف الوهمية المكررة
  console.log("\n2. اختبار تصفية السبام...");
  const spamLead = {
    fullName: "سبام بوت",
    phone: "999999999",
    email: "spam@example.com",
    campaignSource: "Google Ads",
    notes: "فضول تصفح غلط",
    city: "جدة"
  };

  try {
    const res2 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Token": token
      },
      body: JSON.stringify(spamLead)
    });
    const data2 = await res2.json();
    console.log("الاستجابة لعميل السبام:", data2);
  } catch (err: any) {
    console.error("فشل عميل السبام:", err.message);
  }

  // 3. اختبار منع العملاء المكررين (Duplicate Leads)
  console.log("\n3. اختبار إرسال نفس العميل مجدداً لمنع الازدواجية...");
  try {
    const res3 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Token": token
      },
      body: JSON.stringify(lead1)
    });
    const data3 = await res3.json();
    console.log("الاستجابة للعميل المكرر:", data3);
  } catch (err: any) {
    console.error("فشل العميل المكرر:", err.message);
  }
}

runTests();
