"use client";

import { analyzeLeadAI } from "@/app/actions/aiActions";

export async function generateAIInsight(lead: any) {
  try {
    return await analyzeLeadAI(lead);
  } catch (error) {
    console.error("[generateAIInsight]", error);
    return { recommendation: "تعذر التحليل", actionText: "", priority: "medium", confidence: 0 };
  }
}



