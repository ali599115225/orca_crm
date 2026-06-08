'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { loginAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link"; // استيراد مكوّن الروابط لـ Next.js

interface LoginClientProps {
  tenantName?: string;
  host?: string;
}

export default function LoginClient({ tenantName = "منصة ORCA العقارية", host = "" }: LoginClientProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { text: 'مرحباً! أنا المساعد الذكي لمنصة ORCA العقارية. كيف يمكنني خدمتك اليوم؟', sender: 'bot' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const svgRef = useRef(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // التبديل بين الوضع الفاتح والداكن
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.classList.add('light');
    }
  }, [isDarkMode]);

  // تحديث اتجاه ولغة الصفحة عند تغيير خيار اللغة
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (lang === 'AR') {
      htmlElement.setAttribute('lang', 'ar');
      htmlElement.setAttribute('dir', 'rtl');
    } else {
      htmlElement.setAttribute('lang', 'en');
      htmlElement.setAttribute('dir', 'ltr');
    }
  }, [lang]);

  // تحديث الرسالة الترحيبية الافتراضية إذا لم تبدأ المحادثة بعد
  useEffect(() => {
    if (messages.length === 1 && (messages[0].text.startsWith('مرحباً') || messages[0].text.startsWith('Hello'))) {
      setMessages([
        { 
          text: lang === 'AR' 
            ? 'مرحباً! أنا المساعد الذكي لمنصة ORCA العقارية. كيف يمكنني خدمتك اليوم؟' 
            : 'Hello! I am the smart assistant for the ORCA CRM real estate platform. How can I assist you today?', 
          sender: 'bot' 
        }
      ]);
    }
  }, [lang]);

  // التمرير التلقائي لأسفل المحادثة
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // أنيميشن GSAP
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // 1. رسم خطوط المباني مرة واحدة بعد استقرار التخطيط لمنع طول صفر
      timerId = setTimeout(() => {
        gsap.utils.toArray('.main-outline').forEach((path: any) => {
          if (path.getTotalLength) {
            const length = path.getTotalLength();
            if (length > 0) {
              gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
              tl.to(path, { strokeDashoffset: 0, duration: 2.5, ease: 'power2.inOut' }, 0.2);
            }
          }
        });
      }, 100);

      // 2. حركة مستمرة للخطوط المتقطعة بين الأبراج (Infinite Flow)
      gsap.utils.toArray('.data-line, .data-line-2').forEach((path: any) => {
         gsap.set(path, { strokeDasharray: '6 6' });
         gsap.to(path, { strokeDashoffset: -100, duration: 4, repeat: -1, ease: 'none' });
      });

      // ظهور المباني الخلفية والنوافذ
      tl.fromTo('#building-bg', { opacity: 0, y: 20 }, { opacity: 0.6, y: 0, duration: 1.5 }, 1)
        .fromTo('#building-mid', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.5 }, 1.2)
        .fromTo('.window-line', { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.1 }, 1.5);

      // ظهور النقاط (العقد)
      tl.fromTo('.tech-node', { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)' }, 2.5);

      // تأثير النبض والعائم
      gsap.to('.pulse-ring', { scale: 2.5, opacity: 0, duration: 2, repeat: -1, transformOrigin: 'center', ease: 'power1.out', stagger: 1 });
      gsap.to('#building-main', { y: '-=3', duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });

      // الرافعة
      const craneJib = document.getElementById('crane-jib');
      if (craneJib) {
        gsap.set('#crane-jib', { transformOrigin: '215px 100px' });
        gsap.to('#crane-jib', { rotation: 15, duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        
        // Cable stretching sync: scale from top anchor point (150px, 110px)
        gsap.set('#crane-cable', { transformOrigin: '150px 110px' });
        gsap.to('#crane-cable', { scaleY: 1.3, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });
        // Hook translating sync: translate matching the bottom scale
        gsap.to('#crane-hook', { y: 21, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });
      }
    }, svgRef);

    return () => {
      clearTimeout(timerId);
      ctx.revert(); // التنظيف عند الخروج
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.append("clientHost", host || window.location.host);
      formData.append("clientProto", window.location.protocol.replace(":", ""));
      const result = await loginAction(formData);
      setLoading(false);

      if (!result) {
        setError(lang === 'AR' ? "لم يتم تلقي أي استجابة من خادم النظام. يرجى تحديث الصفحة والمحاولة مجدداً." : "No response from server. Please refresh and try again.");
        return;
      }

      if (result.success) {
        if (result.redirectUrl && result.redirectUrl.startsWith("http")) {
          window.location.href = result.redirectUrl;
        } else {
          router.push(result.redirectUrl || "/operations");
        }
      } else {
        setError(result.error || (lang === 'AR' ? "فشل تسجيل الدخول. يرجى التحقق من البيانات." : "Login failed. Please verify your credentials."));
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || (lang === 'AR' ? "حدث خطأ غير متوقع أثناء تسجيل الدخول." : "An unexpected error occurred during login."));
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...messages, { text: chatInput, sender: 'user' }];
    setMessages(newMessages);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages([...newMessages, { 
        text: lang === 'AR' 
          ? 'هذه استجابة تلقائية من المساعد الذكي.' 
          : 'This is an automated response from the smart assistant.', 
        sender: 'bot' 
      }]);
    }, 1500);
  };

  const handleNodeClick = (prompt: string) => {
    if (!isChatOpen) setIsChatOpen(true);
    setChatInput(prompt);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 font-sans ${isDarkMode ? 'bg-void text-slate-100' : 'bg-lightBg text-slate-900'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      <style dangerouslySetInnerHTML={{__html: `
        :root {
            --svg-glass-start: rgba(255, 255, 255, 0.9); --svg-glass-end: rgba(241, 245, 249, 0.7);
            --svg-stroke-main: #94a3b8; --svg-stroke-window: #cbd5e1; --svg-cyan: #2563EB;
        }
        .dark {
            --svg-glass-start: rgba(3, 7, 18, 0.7); --svg-glass-end: rgba(3, 7, 18, 0.85);
            --svg-stroke-main: rgba(0, 229, 255, 0.45); --svg-stroke-window: rgba(0, 229, 255, 0.2); --svg-cyan: #00E5FF;
        }
        .custom-checkbox { appearance: none; background-color: transparent; margin: 0; width: 1.15em; height: 1.15em; border: 1.5px solid #94a3b8; border-radius: 0.25em; display: grid; place-content: center; cursor: pointer; transition: all 0.2s ease-in-out; }
        .custom-checkbox::before { content: ""; width: 0.65em; height: 0.65em; transform: scale(0); transition: 120ms transform ease-in-out; box-shadow: inset 1em 1em white; background-color: white; transform-origin: center; clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); }
        .custom-checkbox:checked { background-color: #2563EB; border-color: #2563EB; }
        .dark .custom-checkbox:checked { background-color: #00E5FF; border-color: #00E5FF; }
        .custom-checkbox:checked::before { transform: scale(1); }
      `}} />

      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest text-lg">ORCA CRM</span>
          <div className="h-4 w-px bg-[var(--nc-surface)] dark:bg-[var(--nc-surface)]"></div>
          <span className={`border text-xs px-2 py-1 rounded transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 font-medium bg-white/5' : 'border-slate-300 text-slate-500 font-medium bg-white/50'}`}>Secure Edition</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* Language Selector Button */}
          <button 
            onClick={() => setLang(prev => prev === 'AR' ? 'EN' : 'AR')}
            className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors focus:outline-none ${isDarkMode ? 'text-slate-400 font-medium hover:text-white' : 'text-slate-500 font-medium hover:text-slate-900'}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span>{lang === 'AR' ? 'English' : 'العربية'}</span>
          </button>

          <div className="h-4 w-px bg-[var(--nc-surface)] dark:bg-[var(--nc-surface)]"></div>

          <div className="flex items-center gap-2">
            <span className={isDarkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>
              {lang === 'AR' ? (isDarkMode ? 'الوضع الداكن' : 'الوضع الفاتح') : (isDarkMode ? 'Dark Mode' : 'Light Mode')}
            </span>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full relative p-1 transition-colors flex items-center shadow-inner cursor-pointer focus:outline-none ${isDarkMode ? 'bg-[var(--nc-surface)]' : 'bg-[var(--nc-surface)]'}`}>
              <div className={`w-4 h-4 rounded-full bg-corporate-blue dark:bg-cyan-glow absolute shadow-md transition-all duration-300 ease-in-out ${isDarkMode ? 'right-7' : 'right-1'}`}></div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 z-10 relative w-full">
        <div className={`w-full max-w-[950px] rounded-[1.5rem] shadow-xl overflow-hidden flex flex-col md:flex-row border transition-colors duration-500 min-h-[550px] backdrop-blur-xl ${isDarkMode ? 'bg-white/5 border-white/10 shadow-2xl' : 'bg-white/70 border-slate-200/50 shadow-2xl'}`}>
          
          {/* Left Graphic Panel */}
          <div className={`w-full md:w-[45%] relative border-l overflow-hidden flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-void/50 border-white/10' : 'bg-lightBg/50 border-slate-200/50'}`}>
            <div className={`absolute inset-0 bg-gradient-to-br to-transparent z-0 ${isDarkMode ? 'from-cyan-glow/10' : 'from-corporate-blue/5'}`}></div>
            
            <div className="relative flex-grow flex items-center justify-center" ref={svgRef}>
              <svg viewBox="0 0 500 700" preserveAspectRatio="xMidYMid slice" className="w-full h-full absolute inset-0 z-10">
                <defs>
                  <linearGradient id="grad-glass" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'var(--svg-glass-start)' }} />
                    <stop offset="100%" style={{ stopColor: 'var(--svg-glass-end)' }} />
                  </linearGradient>
                  <linearGradient id="grad-accent" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <g id="city-scene" transform="translate(0, 80)">
                  <g id="crane" transform="translate(-10, -50)" opacity="0.8">
                    <path d="M 220,300 L 220,100" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                    <path d="M 210,300 L 210,100" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                    <g id="crane-jib">
                      <path d="M 140,100 L 300,100" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                      <path d="M 140,110 L 300,110" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                      <line id="crane-cable" x1="150" y1="110" x2="150" y2="180" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="1" />
                      <path id="crane-hook" d="M 145,180 L 155,180 M 150,180 L 150,190 Q 150,195 145,195" fill="none" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                    </g>
                  </g>

                  <g id="building-bg" opacity="0.6">
                    <path d="M 80,500 L 80,250 L 180,200 L 260,250 L 260,500 Z" fill="url(#grad-glass)" className="main-outline" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="1"/>
                  </g>

                  <g id="building-mid" transform="translate(160, 50)">
                    <path d="M 50,450 L 50,150 L 150,100 L 230,150 L 230,450 Z" fill="url(#grad-glass)" className="main-outline" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="1.5"/>
                    <path d="M 150,100 L 150,500" className="main-outline" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="1.5" />
                  </g>

                  <g id="building-main" transform="translate(30, 150)">
                    <path d="M 150,450 L 150,50 L 250,0 L 250,400 Z" fill="url(#grad-glass)" className="main-outline" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                    <path d="M 250,0 L 350,50 L 350,450 L 250,400 Z" fill="transparent" className="main-outline" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                    <path d="M 250,0 L 250,400" className="main-outline" style={{ stroke: 'var(--svg-stroke-main)' }} strokeWidth="2" />
                    <path d="M 150,450 L 150,300 L 250,250 L 250,400 Z" fill="url(#grad-accent)" />
                  </g>

                  <g id="data-network">
                    <path d="M 20,350 Q 130,300 230,400 T 420,250" fill="none" style={{ stroke: 'var(--svg-cyan)' }} strokeWidth="1.5" className="data-line"/>
                    <path d="M 80,550 L 180,450 L 320,480 L 450,380" fill="none" style={{ stroke: 'var(--svg-cyan)' }} strokeWidth="1" className="data-line-2"/>
                    
                    <circle cx="130" cy="300" r="4" className="tech-node" style={{ fill: 'var(--svg-cyan)', cursor: 'pointer' }} onClick={() => handleNodeClick(lang === 'AR' ? 'ما هي أبرز المشاريع الحالية؟' : 'What are the key current projects?')} />
                    <circle cx="230" cy="400" r="6" className="tech-node" style={{ fill: 'var(--svg-cyan)', cursor: 'pointer' }} onClick={() => handleNodeClick(lang === 'AR' ? 'أحتاج مساعدة في الدخول للنظام' : 'I need help logging into the system')} />
                    <circle cx="420" cy="250" r="5" className="tech-node" style={{ fill: 'var(--svg-cyan)', cursor: 'pointer' }} onClick={() => handleNodeClick(lang === 'AR' ? 'طلب تقرير مبيعات' : 'Request sales report')} />
                    
                    <circle cx="230" cy="400" r="12" fill="none" stroke="var(--svg-cyan)" strokeWidth="1" className="pulse-ring pointer-events-none" />
                  </g>
                </g>
              </svg>

              {/* Chat Toggle Button */}
              <div className="absolute bottom-6 left-0 w-full text-center px-6 z-20">
                <button onClick={() => setIsChatOpen(!isChatOpen)} className={`inline-flex items-center gap-2 backdrop-blur-sm border px-4 py-2 rounded-full cursor-pointer transition-colors shadow-sm focus:outline-none ${isDarkMode ? 'bg-void/80 border-slate-700 hover:bg-void' : 'bg-white/80 border-slate-350 hover:bg-slate-50'}`}>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {lang === 'AR' ? 'تحدث مع المساعد الذكي العقاري' : 'Talk to the Real Estate AI Assistant'}
                  </span>
                </button>
              </div>
            </div>

            {/* AI Chat Overlay */}
            <div className={`absolute inset-0 backdrop-blur-md z-30 flex flex-col transition-all duration-300 ${isChatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDarkMode ? 'bg-void/90' : 'bg-white/90'}`}>
              <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-slate-700/50 bg-void/50' : 'border-slate-200 bg-slate-50/90'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/10 flex items-center justify-center border border-corporate-blue/30 dark:border-cyan-glow/30 text-corporate-blue dark:text-cyan-glow font-bold">A</div>
                  <div>
                    <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {lang === 'AR' ? 'مساعد ORCA الذكي' : 'ORCA Smart Assistant'}
                    </h3>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className={`p-1 font-bold focus:outline-none ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>X</button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`max-w-[85%] p-3 rounded-2xl ${msg.sender === 'bot' ? `bg-corporate-blue/10 dark:bg-cyan-glow/10 border border-corporate-blue/20 dark:border-cyan-glow/20 self-end rounded-bl-none ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}` : `self-start rounded-br-none ${isDarkMode ? 'bg-void text-white border border-gray-800' : 'bg-[var(--nc-surface)] text-slate-900 border border-slate-300'}`}`}>
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className={`bg-corporate-blue/10 dark:bg-cyan-glow/10 border border-corporate-blue/20 dark:border-cyan-glow/20 self-end rounded-bl-none max-w-[85%] p-3 rounded-2xl text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-750'}`}>
                    {lang === 'AR' ? 'يكتب...' : 'Typing...'}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700/50 bg-void/80' : 'border-slate-200 bg-slate-50'}`}>
                <form onSubmit={handleChatSubmit} className="relative flex items-center">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className={`w-full rounded-full pl-12 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-corporate-blue dark:focus:ring-cyan-glow border text-sm transition-colors ${isDarkMode ? 'bg-void text-white border-slate-700' : 'bg-white text-slate-900 border-slate-350'}`} placeholder={lang === 'AR' ? 'اسأل عن العقارات...' : 'Ask about properties...'} />
                  <button type="submit" className="absolute left-2 w-8 h-8 flex items-center justify-center bg-corporate-blue dark:bg-cyan-glow text-white dark:text-void rounded-full text-xs font-bold focus:outline-none">
                    {lang === 'AR' ? 'إرسال' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className={`w-full md:w-[55%] p-8 md:p-10 flex flex-col justify-center transition-colors duration-500 ${isDarkMode ? 'bg-void/30' : 'bg-white/40'}`}>
            <div className="mb-8 text-right">
              <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {lang === 'AR' ? 'تسجيل الدخول' : 'Sign In'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'AR' ? (
                  <>أهلاً بك في البوابة الإلكترونية لمنشأة <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{tenantName}</span>.</>
                ) : (
                  <>Welcome to the secure portal of <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{tenantName}</span>.</>
                )}
              </p>
            </div>

            <form className="space-y-5 w-full max-w-[380px] ml-auto" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl font-bold text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5 text-right">
                <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  {lang === 'AR' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                {/* تم حذف البريد الافتراضي هنا لأمان الكود */}
                <input type="email" name="email" className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue dark:focus:ring-cyan-glow border text-left transition-colors ${isDarkMode ? 'bg-void text-white border-gray-800' : 'bg-slate-50 text-slate-900 border-slate-300'}`} dir="ltr" placeholder="example@domain.com" required />
              </div>

              <div className="space-y-1.5 text-right">
                <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  {lang === 'AR' ? 'كلمة المرور' : 'Password'}
                </label>
                {/* تم حذف كلمة المرور الافتراضية هنا لأمان الكود */}
                <input type="password" name="password" className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue dark:focus:ring-cyan-glow border text-left tracking-widest transition-colors ${isDarkMode ? 'bg-void text-white border-gray-800' : 'bg-slate-50 text-slate-900 border-slate-300'}`} dir="ltr" placeholder="••••••••" required />
              </div>

              <div className="flex items-center justify-between pt-1">
                <a href="#" className={`text-sm font-semibold hover:underline ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                  {lang === 'AR' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </a>
                <div className="flex items-center gap-2">
                  <label className={`text-sm cursor-pointer ${isDarkMode ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}`}>
                    {lang === 'AR' ? 'تذكرني' : 'Remember Me'}
                  </label>
                  <input type="checkbox" defaultChecked className="custom-checkbox" />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold py-3.5 px-4 rounded-lg transition-all transform active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none">
                  {loading ? (lang === 'AR' ? "جاري التحقق والدخول..." : "Verifying Credentials...") : (lang === 'AR' ? "تسجيل الدخول" : "Log In")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer المحدّث بروابط Next.js الديناميكية */}
      <footer className="w-full p-6 text-center text-xs md:text-sm text-[var(--nc-text-dim)] font-medium flex items-center justify-center gap-4 z-10 relative">
        <Link href="/privacy-policy" className={`transition-colors ${isDarkMode ? 'hover:text-[var(--nc-text-dim)] font-medium' : 'hover:text-slate-700'}`}>
          {lang === 'AR' ? 'سياسة الخصوصية والأمان' : 'Privacy & Security Policy'}
        </Link>
        <span>|</span>
        <Link href="/disclaimer" className={`transition-colors ${isDarkMode ? 'hover:text-[var(--nc-text-dim)] font-medium' : 'hover:text-slate-700'}`}>
          {lang === 'AR' ? 'إخلاء المسؤولية' : 'Disclaimer'}
        </Link>
        <span>|</span>
        <Link href="/terms-and-conditions" className={`transition-colors ${isDarkMode ? 'hover:text-[var(--nc-text-dim)] font-medium' : 'hover:text-slate-700'}`}>
          {lang === 'AR' ? 'الأحكام والشروط' : 'Terms & Conditions'}
        </Link>
      </footer>
    </div>
  );
}
