// app/admin/login/page.tsx
'use client';

import React, { useState } from 'react';
import { loginAction } from '@/app/actions/auth';

const SUPER_ADMIN_EMAILS = ['ali.orca@outlook.sa', 'elite.orca@outlook.sa'];

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    // التحقق المبدئي من أن البريد من الإدارة الفوقية فقط
    if (!SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      setLoading(false);
      setError('⛔ هذه البوابة مخصصة للإدارة الفوقية فقط. يُمنع الوصول.');
      return;
    }

    formData.append('clientHost', window.location.host);
    formData.append('clientProto', window.location.protocol.replace(':', ''));

    try {
      const result = await loginAction(formData);
      setLoading(false);

      if (!result) {
        setError('لم يتم تلقي استجابة من الخادم. حاول مجدداً.');
        return;
      }

      if (result.success) {
        // توجيه الأدمن مباشرة للوحة الإدارة الفوقية
        window.location.href = '/admin';
      } else {
        setError(result.error || 'فشل تسجيل الدخول.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'حدث خطأ غير متوقع.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        fontFamily: "'Calibri', sans-serif",
      }}
    >
      {/* خلفية متحركة */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              top: `${10 + i * 15}%`,
              left: `${5 + i * 15}%`,
              animation: `pulse ${3 + i}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse { from { transform: scale(1) rotate(0deg); opacity: 0.5; } to { transform: scale(1.3) rotate(10deg); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .admin-card { animation: fadeIn 0.6s ease forwards; }
        .glow-btn:hover { box-shadow: 0 0 30px rgba(139,92,246,0.6); transform: translateY(-1px); }
        .glow-btn { transition: all 0.3s ease; }
      `}</style>

      <div className="admin-card" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10 }}>
        {/* الهيدر */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 0 40px rgba(124,58,237,0.5)',
            marginBottom: '16px', fontSize: '32px',
          }}>
            🛡️
          </div>
          <div style={{
            display: 'inline-block', background: 'rgba(139,92,246,0.2)',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '20px', padding: '4px 16px',
            fontSize: '11px', color: '#a78bfa', fontWeight: 700,
            marginBottom: '12px', letterSpacing: '0.1em',
          }}>
            ORCA CRM — SUPER ADMIN
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 900, margin: 0 }}>
            بوابة الإدارة الفوقية
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
            مخصصة لفريق أوركا فقط — وصول محظور على الغير
          </p>
        </div>

        {/* البطاقة */}
        <div style={{
          background: 'rgba(15,23,42,0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '12px 16px',
              color: '#fca5a5', fontSize: '12px', fontWeight: 700,
              marginBottom: '20px', textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#a78bfa', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                بريد الإدارة الفوقية
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="ali.orca@outlook.sa"
                style={{
                  width: '100%', background: 'rgba(30,27,75,0.6)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '10px', padding: '10px 14px',
                  color: '#e2e8f0', fontSize: '13px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.3)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#a78bfa', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                كلمة المرور السرية
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                style={{
                  width: '100%', background: 'rgba(30,27,75,0.6)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '10px', padding: '10px 14px',
                  color: '#e2e8f0', fontSize: '13px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.3)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glow-btn"
              style={{
                width: '100%', marginTop: '8px',
                background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', borderRadius: '10px',
                padding: '12px', color: '#ffffff',
                fontSize: '13px', fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {loading ? '⏳ جارٍ التحقق من الهوية...' : '🔐 دخول آمن للإدارة'}
            </button>
          </form>

          <div style={{
            marginTop: '20px', paddingTop: '16px',
            borderTop: '1px solid rgba(139,92,246,0.15)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#475569', fontSize: '10px' }}>
              🔒 هذه البوابة محمية بتشفير متعدد الطبقات
            </p>
            <p style={{ color: '#334155', fontSize: '10px', marginTop: '4px' }}>
              كل محاولة دخول تُسجَّل وتُراقَب تلقائياً
            </p>
          </div>
        </div>

        {/* رابط للعودة */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/login" style={{ color: '#64748b', fontSize: '11px', textDecoration: 'none' }}>
            ← بوابة دخول الشركات العقارية
          </a>
        </div>
      </div>
    </div>
  );
}
