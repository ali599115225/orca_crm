'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Target, Wallet } from 'lucide-react';
import { analyzeLeadAI } from "@/app/actions/aiActions";

export default function LeadsContactDetails() {
  const client = {
    name: 'علي إبراهيم',
    phone: '+966 50 000 0000',
    email: 'ali.zailae@example.com',
    city: 'الرياض',
    budget: '3,500,000 ر.س',
    interests: ['فيلا', 'شمال الرياض']
  };

  const [aiResult, setAiResult] = useState<{
    recommendation: string;
    actionText: string;
    priority: string;
    confidence: number;
  } | null>(null);

  useEffect(() => {
    async function runAI() {
      // Pass the mock client details to simulate AI lead analysis
      const result = await analyzeLeadAI({
        name: client.name,
        phone: client.phone,
        email: client.email,
        city: client.city,
        budget: client.budget,
        source: 'موقع إلكتروني'
      } as any);
      setAiResult(result);
    }
    runAI();
  }, []);

  return (
    <div className="bg-[#032238]/30 border border-white/5 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm mb-3">بيانات العميل</h3>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <Phone size={16} className="text-cyan-400"/> 
          <span>{client.phone}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <Mail size={16} className="text-cyan-400"/> 
          <span>{client.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <MapPin size={16} className="text-cyan-400"/> 
          <span>{client.city}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <Wallet size={16} className="text-cyan-400"/> 
          <span>الميزانية: <span className="font-bold text-white">{client.budget}</span></span>
        </div>
      </div>

      <div className="pt-3 border-t border-white/5">
        <p className="text-xs text-white/50 mb-2">الاهتمامات:</p>
        <div className="flex gap-2">
          {client.interests.map((tag, i) => (
            <span key={i} className="px-2 py-1 bg-[#042A44] border border-white/10 rounded text-[10px] text-cyan-400">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* AI Analysis Card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4 space-y-2 text-xs">
        {aiResult ? (
          <>
            <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
              <Target size={14} />
              <span>تحليل الذكاء الاصطناعي</span>
            </h4>
            <p className="text-white/90"><strong>التوصية:</strong> {aiResult.recommendation}</p>
            <p className="text-white/90"><strong>الإجراء المقترح:</strong> {aiResult.actionText}</p>
            <p className="text-white/90"><strong>الأولوية:</strong> <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${aiResult.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>{aiResult.priority}</span></p>
            <p className="text-white/90"><strong>نسبة الثقة:</strong> {aiResult.confidence}%</p>
          </>
        ) : (
          <p className="text-white/40 text-center py-2">جاري تحليل بيانات العميل عقارياً...</p>
        )}
      </div>
    </div>
  );
}
