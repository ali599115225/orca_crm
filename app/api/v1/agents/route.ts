// app/api/v1/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ─── Mock Agent Registry ──────────────────────────────────────────────────────
// في الإنتاج: استبدل بـ prisma.agentConfig.findMany() أو قاعدة بيانات
const AGENTS = [
  {
    id: 'SAHER',
    nameAr: 'ساهر',
    nameEn: 'Saher',
    role: 'تأهيل العملاء المحتملين وتوزيعهم',
    isActive: true,
    plan: ['pro', 'diamond'],
    stats: { tasksRun: 1284, successRate: 94.2, avgResponseMs: 430 },
  },
  {
    id: 'MANSOUR',
    nameAr: 'منصور',
    nameEn: 'Mansour',
    role: 'متابعة العملاء عبر واتساب آلياً',
    isActive: true,
    plan: ['basic', 'pro', 'diamond'],
    stats: { tasksRun: 876, successRate: 88.7, avgResponseMs: 610 },
  },
  {
    id: 'BASEER',
    nameAr: 'بصير',
    nameEn: 'Baseer',
    role: 'تحليل أداء الإعلانات والـ ROI التسويقي',
    isActive: false,
    plan: ['diamond'],
    stats: { tasksRun: 204, successRate: 97.1, avgResponseMs: 1120 },
  },
  {
    id: 'SANAD',
    nameAr: 'سند',
    nameEn: 'Sanad',
    role: 'الفوترة والمهام السحابية المجدولة',
    isActive: true,
    plan: ['pro', 'diamond'],
    stats: { tasksRun: 3402, successRate: 99.3, avgResponseMs: 180 },
  },
  {
    id: 'KHABEER',
    nameAr: 'خبير',
    nameEn: 'Khabeer',
    role: 'الدعم القانوني وأتمتة العقود',
    isActive: false,
    plan: ['diamond'],
    stats: { tasksRun: 88, successRate: 91.0, avgResponseMs: 2400 },
  },
];

// In-memory toggle store (replace with DB in prod)
const agentOverrides: Record<string, boolean> = {};

export async function GET(_request: NextRequest) {
  const agents = AGENTS.map((a) => ({
    ...a,
    isActive: agentOverrides[a.id] !== undefined ? agentOverrides[a.id] : a.isActive,
    lastRunAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  }));

  return NextResponse.json({ success: true, data: agents });
}
