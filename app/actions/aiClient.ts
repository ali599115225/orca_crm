"use client";

import { analyzeLeadAI } from "@/app/actions/aiActions";

export async function generateAIInsight(lead: any) {
  return await analyzeLeadAI(lead);
}



