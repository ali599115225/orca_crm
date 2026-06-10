import DemoForm from "./DemoForm";

export const metadata = {
  title: "احجز عرضاً توضيحياً — ORCA",
  description:
    "اكتشف كيف يمكن لـ ORCA تحويل عملياتك العقارية. احجز عرضاً توضيحياً خاصاً بفريقك التنفيذي.",
  openGraph: {
    title: "احجز عرضاً توضيحياً — ORCA",
    description:
      "منصة إدارة وتشغيل الأصول والمشاريع والعلاقات العقارية",
  },
};

export default function DemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "#FFFFFF",
        fontFamily: "'Inter', 'Cairo', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <DemoForm />
    </div>
  );
}
