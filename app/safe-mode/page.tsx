// app/safe-mode/page.tsx
// 🛡️ صفحة النفاذ الاحتياطي الآمن - Safe Mode Emergency Page
// صفحة ثابتة تُعرض عند إعادة توجيه الطوارئ أو عطل قاعدة البيانات

import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "وضع الصيانة الآمن - ORCA CRM",
  description: "النظام تحت الصيانة الطارئة حالياً. سيعود قريباً.",
};

// صفحة ثابتة بالكامل - لا تعتمد على قاعدة البيانات
export const dynamic = "force-static";

export default function SafeModePage() {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #090d16 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Calibri', 'Arial', sans-serif",
          color: "#e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            width: "100%",
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          {/* الشعار */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: "0 0 60px rgba(245, 158, 11, 0.4)",
              marginBottom: "24px",
              fontSize: "36px",
            }}
          >
            🛡️
          </div>

          {/* العنوان */}
          <div
            style={{
              display: "inline-block",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "20px",
              padding: "6px 20px",
              fontSize: "11px",
              color: "#f59e0b",
              fontWeight: "bold",
              marginBottom: "16px",
              letterSpacing: "0.1em",
            }}
          >
            ORCA CRM — SAFE MODE ACTIVE
          </div>

          <h1
            style={{
              fontSize: "28px",
              fontWeight: "900",
              color: "#ffffff",
              margin: "0 0 12px 0",
            }}
          >
            النظام في وضع الصيانة الطارئة
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#94a3b8",
              lineHeight: "1.7",
              marginBottom: "32px",
            }}
          >
            الوكيل الذكي <strong style={{ color: "#f59e0b" }}>ساهر</strong> رصد خللاً تقنياً في
            البنية التحتية السحابية وقام بتفعيل وضع النفاذ الآمن تلقائياً لحماية بياناتك.
            يعمل الوكيل <strong style={{ color: "#10b981" }}>سند</strong> حالياً على استعادة
            النظام والاتصال بقاعدة البيانات.
          </p>

          {/* كارت الحالة */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
              textAlign: "right",
            }}
          >
            <h3
              style={{
                fontSize: "13px",
                color: "#f59e0b",
                fontWeight: "bold",
                marginTop: 0,
                marginBottom: "16px",
                borderBottom: "1px solid rgba(245, 158, 11, 0.15)",
                paddingBottom: "10px",
              }}
            >
              حالة أنظمة ORCA CRM
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                {
                  label: "واجهة المستخدم (Frontend)",
                  status: "متاح",
                  color: "#10b981",
                  dot: "#10b981",
                },
                {
                  label: "بوابة الدخول الاحتياطية",
                  status: "متاح",
                  color: "#10b981",
                  dot: "#10b981",
                },
                {
                  label: "قاعدة البيانات السحابية",
                  status: "جاري استعادة الاتصال...",
                  color: "#f59e0b",
                  dot: "#f59e0b",
                },
                {
                  label: "خوادم Vercel الإنتاجية",
                  status: "مراقبة",
                  color: "#f59e0b",
                  dot: "#f59e0b",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom:
                      i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: item.color,
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: item.dot,
                        display: "inline-block",
                      }}
                    />
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* أزرار التواصل */}
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <a
              href="mailto:ali.orca@outlook.sa"
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#f59e0b",
                padding: "10px 24px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "bold",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              📧 تواصل مع الدعم الفني
            </a>

            <a
              href="/admin/login"
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                padding: "10px 24px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "bold",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              🛡️ بوابة الإدارة الطارئة
            </a>
          </div>

          <p
            style={{
              fontSize: "10px",
              color: "#475569",
              marginTop: "32px",
            }}
          >
            ORCA CRM v2.0 — Powered by Saher & Sanad AI Agents
            <br />
            نطاق الطوارئ الاحتياطي: orca-crm-one.vercel.app
          </p>
        </div>
      </body>
    </html>
  );
}
