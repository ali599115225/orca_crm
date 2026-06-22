"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/AppContext";

const NAV_SECTIONS = ["hero", "trust", "platform", "product", "ai", "properties", "finance", "portals", "compare", "pricing", "demo"];

function getVisibleSection(): string {
  let active = "hero";
  let maxRatio = 0;
  for (const id of NAV_SECTIONS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    const ratio = visible / Math.min(rect.height, vh);
    if (ratio > maxRatio) { maxRatio = ratio; active = id; }
  }
  return active;
}

export default function EnterpriseHome() {
  const { lang, toggleLang } = useLanguage();
  const [scrolled, setScrolled] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const dir = lang === "AR" ? "rtl" : "ltr";
  const isRtl = dir === "rtl";

  useEffect(() => {
    const body = document.body;
    const origOverflow = body.style.overflow;
    const origPosition = body.style.position;
    body.style.overflow = "auto";
    body.style.position = "static";
    (document.documentElement.style as any).scrollBehavior = "smooth";

    const onScroll = () => { setScrolled(window.scrollY); setActiveSection(getVisibleSection()); };
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("eh-visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".eh-section").forEach(s => observer.observe(s));

    return () => {
      try {
        body.style.overflow = origOverflow;
        body.style.position = origPosition;
        (document.documentElement.style as any).scrollBehavior = "";
        window.removeEventListener("scroll", onScroll);
        observer.disconnect();
      } catch {}
    };
  }, []);

  const t = (lang === "AR" ? AR : EN) as typeof AR;

  return (
    <div style={{ background: "#050816", color: "#FFFFFF", fontFamily: "'Inter', 'Cairo', sans-serif", direction: dir, minHeight: "100vh" }}>
      <style>{STYLES}</style>

{/* LaunchBanner removed — 30% discount claim was not real */}

      {/* ═══ HEADER ═══ */}
      <Header lang={lang} toggleLang={toggleLang} scrolled={scrolled} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} t={t} activeSection={activeSection} />

      {/* ═══ 1. EXECUTIVE HERO ═══ */}
      <HeroSection t={t} isRtl={isRtl} lang={lang} />

      {/* ═══ 2. ENTERPRISE TRUST LAYER ═══ */}
      <TrustSection t={t} />

      {/* ═══ 3. OPERATING SYSTEM ═══ */}
      <OSSection t={t} isRtl={isRtl} />

      {/* ═══ 4. PRODUCT EXPERIENCE ═══ */}
      <ProductSection t={t} />

      {/* ═══ 5. AI INTELLIGENCE ═══ */}
      <AISection t={t} />

      {/* ═══ 6. PROPERTY MANAGEMENT ═══ */}
      <PropertySection t={t} />

      {/* ═══ 7. FINANCIAL OPERATIONS ═══ */}
      <FinanceSection t={t} />

      {/* ═══ 8. OWNER & TENANT PORTALS ═══ */}
      <PortalSection t={t} />

      {/* ═══ 9. CASE STUDIES ═══ */}
      <CaseStudySection t={t} lang={lang} />

      {/* ═══ 10. ROI CALCULATOR ═══ */}
      <ROISection t={t} lang={lang} />

      {/* ═══ 11. COMPARISON ═══ */}
      <ComparisonSection t={t} />

      {/* ═══ 12. PRICING ═══ */}
      <PricingSection t={t} />

      {/* ═══ 13. EXECUTIVE CTA ═══ */}
      <CTASection t={t} />

      {/* ═══ FOOTER ═══ */}
      <FooterSection t={t} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAUNCH BANNER
══════════════════════════════════════════════════════════════ */
function LaunchBanner({ t }: any) {
  return (
    <div className="eh-launch-banner">
      <div className="eh-launch-inner">
        <span className="eh-launch-dot" />
        <span>{t.launchBanner}</span>
        <a href="#pricing" className="eh-launch-cta">{t.launchCTA}</a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════ */
function Header({ lang, toggleLang, scrolled, mobileOpen, setMobileOpen, t, activeSection }: any) {
  const sectionFromHref = (href: string) => href.replace("#", "");
  return (
    <header className={`eh-header${scrolled > 50 ? " eh-header-scrolled" : ""}`}>
      <div className="eh-header-inner">
        <div className="eh-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>
          <div className="eh-logo-icon">
            <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
              <rect x="2" y="2" width="36" height="36" rx="8" stroke="#C9A96E" strokeWidth="2" />
              <path d="M12 28V14l8-6 8 6v14H12z" stroke="#C9A96E" strokeWidth="1.5" fill="rgba(201,169,110,0.08)" />
              <path d="M18 28V20h4v8" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="eh-logo-text">ORCA</span>
            <span className="eh-logo-sub">{t.headerSub}</span>
          </div>
        </div>

        <nav className="eh-nav">
          {t.nav.map((item: any) => (
            <a key={item.href} href={item.href}
              className={`eh-nav-link${activeSection === sectionFromHref(item.href) ? " eh-nav-active" : ""}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="eh-header-actions">
          <button onClick={toggleLang} className="eh-lang-btn">{lang === "AR" ? "EN" : "عربي"}</button>
          <Link href="/login" className="eh-btn-secondary">{t.signIn}</Link>
          <Link href="/demo" className="eh-btn-primary">{t.startFree}</Link>
          <button className="eh-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="eh-mobile-menu">
          {t.nav.map((item: any) => (
            <a key={item.href} href={item.href} className="eh-mobile-link" onClick={() => setMobileOpen(false)}>{item.label}</a>
          ))}
          <Link href="/login" className="eh-btn-secondary" style={{ width: "100%", textAlign: "center" }}>{t.signIn}</Link>
          <Link href="/demo" className="eh-btn-primary" style={{ width: "100%", textAlign: "center" }}>{t.startFree}</Link>
        </div>
      )}
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. EXECUTIVE HERO
══════════════════════════════════════════════════════════════ */
function HeroSection({ t, isRtl, lang }: any) {
  const [mounted, setMounted] = useState(false);
  const [lines, setLines] = useState(0);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const TOTAL = 7;
    const timer = setInterval(() => setLines(n => n < TOTAL ? n + 1 : TOTAL), 350);
    return () => clearInterval(timer);
  }, [mounted]);

  const termLines = [
    <div key={0} className="eh-terminal-line"><span className="eh-token eh-token-key">SYSTEM</span> <span className="eh-token eh-token-op">=</span> <span className="eh-token eh-token-num">ORCA v3.2</span></div>,
    <div key={1} className="eh-terminal-line"><span className="eh-token eh-token-key">REGION</span> <span className="eh-token eh-token-op">=</span> <span className="eh-token eh-token-num">Riyadh</span></div>,
    <div key={2} className="eh-terminal-line"><span className="eh-token eh-token-key">ACCOUNTING</span> <span className="eh-token eh-token-op">=</span> <span className="eh-token eh-token-num">Double-Entry</span></div>,
    <div key={3} className="eh-terminal-line"><span className="eh-token eh-token-key">ENCRYPTION</span> <span className="eh-token eh-token-op">=</span> <span className="eh-token eh-token-num">AES-256</span></div>,
    <div key={4} className="eh-terminal-line"><span className="eh-token eh-token-key">ZATCA</span> <span className="eh-token eh-token-op">=</span> <span className="eh-token eh-token-num">Integrated</span></div>,
    <div key={5} className="eh-terminal-divider" />,
    <div key={6}><div className="eh-terminal-line"><span className="eh-token eh-token-cmd">$</span> <span className="eh-token eh-token-fn">system.status</span></div><div className="eh-terminal-line eh-terminal-success"><span className="eh-token eh-token-out">→</span> Riyadh Region — Operational</div></div>,
  ];

  return (
    <section className="eh-section eh-hero">
      <div className="eh-hero-grid" />
      <div className="eh-hero-glow-top" />
      <div className="eh-hero-glow-bot" />
      <div className="eh-hero-container">
        <div className="eh-hero-content">
          <div className={`eh-hero-badges${mounted ? " eh-fade-in" : ""}`}>
            <span className="eh-badge eh-badge-gold">
              <span className="eh-dot eh-dot-gold" />
              {t.heroBadge}
            </span>
            <span className="eh-badge eh-badge-glass">
              <span className="eh-dot eh-dot-emerald" />
              {t.heroStatus}
            </span>
          </div>

          <h1 className={`eh-hero-title${mounted ? " eh-fade-in" : ""}`} style={{ animationDelay: "0.15s" }}>
            {t.heroTitle}{" "}
            <span className="eh-text-gold">{t.heroTitleAccent}</span>
          </h1>

          <p className={`eh-hero-sub${mounted ? " eh-fade-in" : ""}`} style={{ animationDelay: "0.3s" }}>
            {t.heroSub}
          </p>

          <div className={`eh-hero-ctas${mounted ? " eh-fade-in" : ""}`} style={{ animationDelay: "0.45s" }}>
            <Link href="/demo" className="eh-btn-primary eh-btn-lg">{t.heroCTA}</Link>
            <a href="#product" className="eh-btn-ghost eh-btn-lg">{t.heroLearn}</a>
          </div>

          <div className={`eh-hero-stats${mounted ? " eh-fade-in" : ""}`} style={{ animationDelay: "0.6s" }}>
            {t.stats.map((s: any, i: number) => (
              <div key={i} className="eh-stat-item">
                <span className="eh-stat-value">{s.val}</span>
                <span className="eh-stat-label">{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`eh-hero-visual${mounted ? " eh-fade-in" : ""}`} style={{ animationDelay: "0.3s" }}>
          <div className="eh-terminal">
            <div className="eh-terminal-bar">
              <div className="eh-terminal-dots"><span /><span /><span /></div>
              <span className="eh-terminal-title">{t.terminalTitle}</span>
            </div>
            <div className="eh-terminal-body">
              {termLines.slice(0, lines)}
              {lines >= 7 && <div className="eh-terminal-cursor" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. ENTERPRISE TRUST LAYER
══════════════════════════════════════════════════════════════ */
function TrustSection({ t }: any) {
  return (
    <section className="eh-section eh-trust" id="trust">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.trustLabel}</div>
        <h2 className="eh-section-title">{t.trustTitle}</h2>
        <p className="eh-section-desc">{t.trustDesc}</p>
        <div className="eh-grid eh-grid-4">
          {t.trustItems.map((item: any, i: number) => (
            <div key={i} className="eh-card eh-card-glass">
              <div className="eh-card-icon">{item.icon}</div>
              <h3 className="eh-card-title">{item.title}</h3>
              <p className="eh-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. REAL ESTATE OPERATING SYSTEM
══════════════════════════════════════════════════════════════ */
function OSSection({ t, isRtl }: any) {
  return (
    <section className="eh-section eh-os" id="platform">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.osLabel}</div>
        <h2 className="eh-section-title">{t.osTitle}</h2>
        <p className="eh-section-desc">{t.osDesc}</p>

        <div className="eh-os-diagram" style={{ direction: "ltr" }}>
          <svg viewBox="0 0 900 520" className="eh-os-svg">
            <defs>
              <linearGradient id="osGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#C9A96E" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="osLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C9A96E" stopOpacity="0" />
                <stop offset="50%" stopColor="#C9A96E" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
              </linearGradient>
            </defs>
            {t.osLayers.map((layer: any, i: number) => (
              <g key={i}>
                <rect x={layer.x} y={layer.y} width={layer.w} height={layer.h} rx="8" fill="rgba(201,169,110,0.04)" stroke="rgba(201,169,110,0.15)" strokeWidth="1" />
                {i > 0 && (
                  <line x1={180} y1={t.osLayers[i-1].y + t.osLayers[i-1].h} x2={180} y2={layer.y} stroke="url(#osLine)" strokeWidth="1.5" strokeDasharray="4 3" />
                )}
                <text x={parseInt(layer.x)+20} y={parseInt(layer.y)+28} fill="#C9A96E" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">{layer.label}</text>
                {layer.items.map((item: string, j: number) => (
                  <text key={j} x={parseInt(layer.x)+20} y={parseInt(layer.y)+52+j*22} fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">{item}</text>
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. PRODUCT EXPERIENCE
══════════════════════════════════════════════════════════════ */
function ProductSection({ t }: any) {
  return (
    <section className="eh-section eh-product" id="product">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.productLabel}</div>
        <h2 className="eh-section-title">{t.productTitle}</h2>
        <p className="eh-section-desc">{t.productDesc}</p>
        <div className="eh-grid eh-grid-3">
          {t.productItems.map((item: any, i: number) => (
            <div key={i} className="eh-card eh-card-product">
              <div className="eh-card-icon-large">{item.icon}</div>
              <h3 className="eh-card-title">{item.title}</h3>
              <p className="eh-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. AI INTELLIGENCE LAYER
══════════════════════════════════════════════════════════════ */
function AISection({ t }: any) {
  return (
    <section className="eh-section eh-ai" id="ai">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.aiLabel}</div>
        <h2 className="eh-section-title">{t.aiTitle}</h2>
        <p className="eh-section-desc">{t.aiDesc}</p>
        <div className="eh-ai-showcase">
          {t.aiItems.map((item: any, i: number) => (
            <div key={i} className="eh-ai-card">
              <div className="eh-ai-card-header">
                <span className="eh-ai-icon">{item.icon}</span>
                <span className="eh-ai-tag">{item.tag}</span>
              </div>
              <h4 className="eh-ai-card-title">{item.title}</h4>
              <p className="eh-ai-card-desc">{item.desc}</p>
              <div className="eh-ai-metric">
                <span className="eh-ai-metric-val">{item.metric}</span>
                <span className="eh-ai-metric-lbl">{item.metricLbl}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. PROPERTY MANAGEMENT
══════════════════════════════════════════════════════════════ */
function PropertySection({ t }: any) {
  return (
    <section className="eh-section eh-property" id="properties">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.propLabel}</div>
        <h2 className="eh-section-title">{t.propTitle}</h2>
        <p className="eh-section-desc">{t.propDesc}</p>
        <div className="eh-grid eh-grid-3">
          {t.propItems.map((item: any, i: number) => (
            <div key={i} className="eh-card eh-card-glass">
              <div className="eh-card-icon">{item.icon}</div>
              <h3 className="eh-card-title">{item.title}</h3>
              <p className="eh-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   7. FINANCIAL OPERATIONS
══════════════════════════════════════════════════════════════ */
function FinanceSection({ t }: any) {
  return (
    <section className="eh-section eh-finance" id="finance">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.finLabel}</div>
        <h2 className="eh-section-title">{t.finTitle}</h2>
        <p className="eh-section-desc">{t.finDesc}</p>
        <div className="eh-grid eh-grid-3">
          {t.finItems.map((item: any, i: number) => (
            <div key={i} className="eh-card eh-card-glass">
              <div className="eh-card-icon">{item.icon}</div>
              <h3 className="eh-card-title">{item.title}</h3>
              <p className="eh-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   8. OWNER & TENANT PORTALS
══════════════════════════════════════════════════════════════ */
function PortalSection({ t }: any) {
  return (
    <section className="eh-section eh-portal" id="portals">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.portalLabel}</div>
        <h2 className="eh-section-title">{t.portalTitle}</h2>
        <p className="eh-section-desc">{t.portalDesc}</p>
        <div className="eh-portal-grid">
          <div className="eh-card eh-card-portal eh-card-portal-owner">
            <div className="eh-portal-badge">{t.portalOwnerBadge}</div>
            <h3 className="eh-card-title">{t.portalOwnerTitle}</h3>
            <ul className="eh-portal-list">
              {t.portalOwnerItems.map((item: string, i: number) => (
                <li key={i} className="eh-portal-item">{item}</li>
              ))}
            </ul>
          </div>
          <div className="eh-card eh-card-portal eh-card-portal-tenant">
            <div className="eh-portal-badge eh-portal-badge-tenant">{t.portalTenantBadge}</div>
            <h3 className="eh-card-title">{t.portalTenantTitle}</h3>
            <ul className="eh-portal-list">
              {t.portalTenantItems.map((item: string, i: number) => (
                <li key={i} className="eh-portal-item">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   9. CASE STUDIES
══════════════════════════════════════════════════════════════ */
function CaseStudySection({ t, lang }: any) {
  const isAr = lang === "AR";
  return (
    <section className="eh-section eh-cases" id="cases">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.casesLabel}</div>
        <h2 className="eh-section-title">{t.casesTitle}</h2>
        <p className="eh-section-desc">{t.casesDesc}</p>
        <div className="eh-cases-grid">
          {t.cases.map((c: any, i: number) => (
            <div key={i} className="eh-case-card">
              <div className="eh-case-header">
                <span className="eh-case-industry">{c.industry}</span>
                <span className="eh-case-result">{c.result}</span>
              </div>
              <div className="eh-case-body">
                <div className="eh-case-column eh-case-before">
                  <div className="eh-case-column-label">{t.casesBefore}</div>
                  {c.before.map((b: string, j: number) => (
                    <div key={j} className="eh-case-item"><span className="eh-case-bullet eh-case-bullet-red" />{b}</div>
                  ))}
                </div>
                <div className="eh-case-arrow">→</div>
                <div className="eh-case-column eh-case-after">
                  <div className="eh-case-column-label">{t.casesAfter}</div>
                  {c.after.map((a: string, j: number) => (
                    <div key={j} className="eh-case-item"><span className="eh-case-bullet eh-case-bullet-green" />{a}</div>
                  ))}
                </div>
              </div>
              <div className="eh-case-metrics">
                {c.metrics.map((m: any, j: number) => (
                  <div key={j} className="eh-case-metric">
                    <span className="eh-case-metric-val">{m.val}</span>
                    <span className="eh-case-metric-lbl">{m.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   10. ROI CALCULATOR
══════════════════════════════════════════════════════════════ */
function ROISection({ t, lang }: any) {
  const [units, setUnits] = useState(500);
  const [employees, setEmployees] = useState(10);
  const [revenue, setRevenue] = useState(50);

  const laborCost = employees * 120000;
  const inefficiencyLoss = revenue * 1000000 * 0.08;
  const totalWaste = laborCost + inefficiencyLoss;
  const orcaCost = 50000 + units * 120;
  const savings = Math.round(totalWaste - orcaCost);
  const efficiencyGain = Math.round((totalWaste - orcaCost) / totalWaste * 100);

  return (
    <section className="eh-section eh-roi" id="roi">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.roiLabel}</div>
        <h2 className="eh-section-title">{t.roiTitle}</h2>
        <p className="eh-section-desc">{t.roiDesc}</p>
        <div className="eh-roi-calculator">
          <div className="eh-roi-controls">
            <div className="eh-roi-field">
              <label className="eh-roi-label">{t.roiUnits} <strong>{units.toLocaleString()}</strong></label>
              <input type="range" min={50} max={10000} step={50} value={units} onChange={e => setUnits(Number(e.target.value))} className="eh-roi-slider" />
            </div>
            <div className="eh-roi-field">
              <label className="eh-roi-label">{t.roiEmployees} <strong>{employees}</strong></label>
              <input type="range" min={1} max={200} step={1} value={employees} onChange={e => setEmployees(Number(e.target.value))} className="eh-roi-slider" />
            </div>
            <div className="eh-roi-field">
              <label className="eh-roi-label">{t.roiRevenue} <strong>SAR {revenue}M</strong></label>
              <input type="range" min={5} max={1000} step={5} value={revenue} onChange={e => setRevenue(Number(e.target.value))} className="eh-roi-slider" />
            </div>
          </div>
          <div className="eh-roi-results">
            <div className="eh-roi-metric eh-roi-metric-waste">
              <span className="eh-roi-metric-val">SAR {totalWaste.toLocaleString()}</span>
              <span className="eh-roi-metric-lbl">{t.roiWaste}</span>
            </div>
            <div className="eh-roi-metric eh-roi-metric-savings">
              <span className="eh-roi-metric-val eh-text-gold">SAR {savings.toLocaleString()}</span>
              <span className="eh-roi-metric-lbl">{t.roiSavings}</span>
            </div>
            <div className="eh-roi-metric eh-roi-metric-eff">
              <span className="eh-roi-metric-val">{efficiencyGain}%</span>
              <span className="eh-roi-metric-lbl">{t.roiEfficiency}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   11. COMPARISON
══════════════════════════════════════════════════════════════ */
function ComparisonSection({ t }: any) {
  return (
    <section className="eh-section eh-compare" id="compare">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.compLabel}</div>
        <h2 className="eh-section-title">{t.compTitle}</h2>
        <p className="eh-section-desc">{t.compDesc}</p>
        <div className="eh-compare-table">
          <div className="eh-compare-row eh-compare-header">
            <div className="eh-compare-cell eh-compare-feature">{t.compFeature}</div>
            <div className="eh-compare-cell eh-compare-excel">{t.compExcel}</div>
            <div className="eh-compare-cell eh-compare-crm">{t.compCRM}</div>
            <div className="eh-compare-cell eh-compare-orca">{t.compOrca}</div>
          </div>
          {t.compRows.map((row: any, i: number) => (
            <div key={i} className="eh-compare-row">
              <div className="eh-compare-cell eh-compare-feature">{row.feature}</div>
              <div className="eh-compare-cell eh-compare-excel">{row.excel === "✗" ? <span className="eh-compare-no">✗</span> : <span className="eh-compare-yes">✓</span>}</div>
              <div className="eh-compare-cell eh-compare-crm">{row.crm === "✗" ? <span className="eh-compare-no">✗</span> : row.crm === "△" ? <span className="eh-compare-partial">△</span> : <span className="eh-compare-yes">✓</span>}</div>
              <div className="eh-compare-cell eh-compare-orca">
                {row.orca === "✗" ? <span className="eh-compare-no">✗</span> : row.orca === "△" ? <span className="eh-compare-partial">△</span> : <span className="eh-compare-yes">✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   12. PRICING
══════════════════════════════════════════════════════════════ */
function PricingSection({ t }: any) {
  const [annual, setAnnual] = useState(true);
  return (
    <section className="eh-section eh-pricing" id="pricing">
      <div className="eh-section-container">
        <div className="eh-section-label">{t.priceLabel}</div>
        <h2 className="eh-section-title">{t.priceTitle}</h2>
        <p className="eh-section-desc">{t.priceDesc}</p>
        <div className="eh-price-toggle">
          <span className={annual ? "eh-price-toggle-active" : ""}>{t.priceMonthly}</span>
          <button className={`eh-price-toggle-btn${annual ? " eh-price-toggle-right" : ""}`} onClick={() => setAnnual(!annual)}>
            <span className="eh-price-toggle-knob" />
          </button>
          <span className={!annual ? "eh-price-toggle-active" : ""}>{t.priceAnnual}</span>
          <span className="eh-price-badge">{t.priceSave}</span>
        </div>
        <div className="eh-grid eh-grid-3">
          {t.plans.map((plan: any, i: number) => (
            <div key={i} className={`eh-card eh-plan${plan.featured ? " eh-plan-featured" : ""}`}>
              {plan.featured && <div className="eh-plan-popular">{t.pricePopular}</div>}
              <div className="eh-plan-name">{plan.name}</div>
              <div className="eh-plan-price">
                <span className="eh-plan-amount">{annual ? plan.priceAnnual : plan.priceMonth}</span>
                <span className="eh-plan-period">/ {t.priceMonth}</span>
              </div>
              <div className="eh-plan-desc">{plan.desc}</div>
              <ul className="eh-plan-features">
                {plan.features.map((f: string, j: number) => (
                  <li key={j} className="eh-plan-feature">{f}</li>
                ))}
              </ul>
              <a href={plan.featured ? "/demo" : "#product"} className={`${plan.featured ? "eh-btn-primary" : "eh-btn-secondary"} eh-btn-full`}>{t.priceCTA}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   13. EXECUTIVE CTA
══════════════════════════════════════════════════════════════ */
function CTASection({ t }: any) {
  return (
    <section className="eh-section eh-cta" id="demo">
      <div className="eh-cta-glow" />
      <div className="eh-section-container">
        <div className="eh-cta-content">
          <div className="eh-section-label">{t.ctaLabel}</div>
          <h2 className="eh-cta-title">{t.ctaTitle}</h2>
          <p className="eh-cta-desc">{t.ctaDesc}</p>
          <div className="eh-cta-actions">
            <Link href="/demo" className="eh-btn-primary eh-btn-xl">{t.ctaDemo}</Link>
            <a href="#" className="eh-btn-gold eh-btn-xl">{t.ctaConsult}</a>
          </div>
          <div className="eh-cta-trust">
            {t.ctaTrust.map((item: string, i: number) => (
              <span key={i} className="eh-cta-trust-item">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════ */
function FooterSection({ t }: any) {
  return (
    <footer className="eh-footer">
      <div className="eh-section-container">
        <div className="eh-footer-grid">
          <div className="eh-footer-brand">
            <div className="eh-footer-logo">ORCA</div>
            <p className="eh-footer-desc">{t.footerDesc}</p>
            <div className="eh-footer-trust">
              <span>{t.footerGDPR}</span>
              <span>{t.footerISO}</span>
              <span>{t.footerZATCA}</span>
            </div>
          </div>
          {t.footerCols.map((col: any, i: number) => (
            <div key={i} className="eh-footer-col">
              <h4 className="eh-footer-col-title">{col.title}</h4>
              {col.links.map((link: any, j: number) => (
                <a key={j} href={link.href} className="eh-footer-link">{link.label}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="eh-footer-bottom">
          <span>{t.footerCopyright}</span>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONTENT - ARABIC
══════════════════════════════════════════════════════════════ */
const AR = {
  headerSub: "Real Estate OS",
  signIn: "دخول",
  startFree: "اطلب النسخة التجريبية",
  launchBanner: "🚀 عرض الإطلاق الحصري 2026 — خصم 30% للمشتركين الجدد",
  launchCTA: "سجل الآن ←",
  nav: [
    { href: "#platform", label: "المنظومة" },
    { href: "#product", label: "المنتج" },
    { href: "#ai", label: "الذكاء الاصطناعي" },
    { href: "#properties", label: "إدارة العقارات" },
    { href: "#pricing", label: "الباقات" },
    { href: "#demo", label: "تواصل مع المبيعات" },
  ],
  heroBadge: "نظام تشغيل عقاري متوافق مع متطلبات السوق",
  heroStatus: "منطقة الرياض",
  heroTitle: "نظام التشغيل",
  heroTitleAccent: "الخلفي للعقارات",
  heroSub: "منصة مؤسسية واحدة تدير المحافظ العقارية والمشاريع والعمليات المالية والتشغيلية بعمق يفوق التوقعات. مصممة للمؤسسات التي تدير أصولاً عقارية بمليارات الريالات.",
  heroCTA: "اطلب نسخة تجريبية تنفيذية",
  heroLearn: "اعرف المزيد",
  stats: [
    { val: "سعودي", lbl: "مصمم للمكاتب العقارية" },
    { val: "عربي", lbl: "يدعم العربية وواجهة RTL" },
    { val: "موحد", lbl: "ينظم العملاء والعقارات والعقود" },
  ],
  terminalTitle: "ORCA System Terminal v3.2",
  trustLabel: "الثقة المؤسسية",
  trustTitle: "بنية تحتية على مستوى المؤسسات المالية",
  trustDesc: "أعلى معايير الأمان والامتثال والشفافية التشغيلية.",
  trustItems: [
    { icon: "🔐", title: "أمان متعدد الطبقات", desc: "تشفير مصرفي AES-256 وسجلات تدقيق كاملة لجميع العمليات." },
    { icon: "✅", title: "متوافق مع متطلبات السوق", desc: "مصمم وفق متطلبات السوق السعودي وضوابط الأمان السيبراني." },
    { icon: "☁️", title: "البنية السحابية المؤسسية", desc: "استضافة على AWS Cloud مع نسخ احتياطي فوري و SLA بنسبة 99.5%+." },
    { icon: "📋", title: "صلاحيات وتدقيق", desc: "نظام صلاحيات دقيق مع تتبع كامل لكل إجراء وتقرير تدقيق شامل." },
  ],
  osLabel: "المنظومة",
  osTitle: "نظام تشغيل عقاري متكامل",
  osDesc: "منصة واحدة تربط كل وظائف إدارة العقارات في نظام موحد.",
  osLayers: [
    { x: "20", y: "10", w: "860", h: "60", label: "CRM وإدارة العملاء", items: ["إدارة العملاء المتوقعين", "مسارات المبيعات", "عروض الأسعار", "العقود"] },
    { x: "20", y: "90", w: "860", h: "60", label: "إدارة العقارات والأصول", items: ["الوحدات والمباني", "الملاك والمستأجرين", "الصيانة", "العقود الإيجارية"] },
    { x: "20", y: "170", w: "860", h: "60", label: "العمليات المالية", items: ["الفواتير والتحصيل", "الإيرادات والمصروفات", "ZATCA", "التقارير المالية"] },
    { x: "20", y: "250", w: "860", h: "60", label: "المحاسبة", items: ["دفتر الأستاذ العام", "الأستاذ المساعد", "ميزان المراجعة", "التسويات البنكية"] },
    { x: "20", y: "330", w: "860", h: "60", label: "بوابات الملاك والمستأجرين", items: ["بوابة المالك", "بوابة المستأجر", "التقارير التنفيذية", "لوحات القيادة"] },
    { x: "20", y: "410", w: "860", h: "60", label: "الذكاء الاصطناعي والتحليلات", items: ["التنبؤ بالإشغال", "تحليل مخاطر التحصيل", "تقارير تنفيذية", "رؤى استباقية"] },
  ],
  productLabel: "تجربة المنتج",
  productTitle: "سير عمل متصل بلا حدود",
  productDesc: "منصة واحدة تربط كل خطوة من دورة حياة العقار في تدفق عمل سلس.",
  productItems: [
    { icon: "🔄", title: "التسويق وجذب العملاء", desc: "إدارة الحملات التسويقية، استقبال العملاء المتوقعين، وتوزيعهم تلقائياً على فرق المبيعات." },
    { icon: "📊", title: "المبيعات والعروض", desc: "إدارة مسار المبيعات بالكامل من العرض الأولي إلى إصدار العقد وتوثيقه." },
    { icon: "📄", title: "العقود والفواتير", desc: "إصدار العقود والفواتير إلكترونياً مع التوقيع الرقمي والتكامل مع ZATCA." },
  ],
  aiLabel: "الذكاء الاصطناعي",
  aiTitle: "ذكاء اصطناعي تنبؤي للمؤسسات العقارية",
  aiDesc: "تحليلات متقدمة ورؤى استباقية تدعم قراراتك الاستثمارية والتشغيلية.",
  aiItems: [
    { icon: "📈", tag: "توقع ذكي", title: "التنبؤ بالإشغال", desc: "نموذج ذكاء اصطناعي يتنبأ بنسب الإشغال للأشهر الـ ١٢ القادمة بناءً على الاتجاهات التاريخية والموسمية.", metric: "AI", metricLbl: "نظام تنبؤي" },
    { icon: "⚠️", tag: "تحليل المخاطر", title: "مخاطر التحصيل", desc: "تحليل استباقي لمخاطر التحصيل لكل مستأجر مع توصيات بالإجراءات التصحيحية قبل الاستحقاق.", metric: "AI", metricLbl: "تحليل ذكي" },
    { icon: "💡", tag: "رؤى ذكية", title: "الرؤى التنفيذية", desc: "تقارير تنفيذية ذكية تحلل أداء المحفظة وتقترح فرص تحسين الإيرادات وخفض التكاليف.", metric: "", metricLbl: "" },
    { icon: "📊", tag: "تقرير ذكي", title: "التقارير الذكية", desc: "تقارير مالية وتشغيلية آلية مع تحليل فجوات وتوصيات قابلة للتنفيذ للإدارة العليا.", metric: "AI", metricLbl: "تشغيل متواصل" },
  ],
  propLabel: "إدارة العقارات",
  propTitle: "منصة شاملة لإدارة المحافظ العقارية",
  propDesc: "إدارة كاملة للوحدات والمباني والملاك والمستأجرين والصيانة من واجهة واحدة.",
  propItems: [
    { icon: "🏢", title: "الوحدات والمباني", desc: "إدارة المخزون العقاري بالكامل مع تصنيف دقيق للوحدات والمباني والمشاريع." },
    { icon: "👤", title: "الملاك", desc: "سجل كامل للملاك مع تقارير دورية وإحصائيات الأداء لكل محفظة." },
    { icon: "🔑", title: "المستأجرين", desc: "إدارة دورة حياة المستأجر من العقد إلى التجديد مع أتمتة الإجراءات." },
    { icon: "🛠️", title: "الصيانة", desc: "نظام تذاكر صيانة متكامل مع تتبع الحالة والتكلفة وإشعارات فورية." },
    { icon: "📋", title: "العقود الإيجارية", desc: "إدارة العقود الإيجارية مع تجديد تلقائي واحتساب الإيجارات والغرامات." },
    { icon: "📱", title: "تطبيق جوال (قريباً)", desc: "تطبيق جوال للملاك والمستأجرين لمتابعة العقود والفواتير وطلبات الصيانة — قيد التطوير." },
  ],
  finLabel: "العمليات المالية",
  finTitle: "منصة مالية متكاملة",
  finDesc: "إدارة مالية كاملة تشمل الفوترة والتحصيل والتقارير المالية والتكامل مع ZATCA.",
  finItems: [
    { icon: "📄", title: "الفواتير", desc: "إصدار فواتير إلكترونية متوافقة مع ZATCA مع إرسال تلقائي للعملاء." },
    { icon: "💳", title: "التحصيل", desc: "نظام تحصيل ذكي مع تتبع المدفوعات وإشعارات تلقائية للمتأخرين." },
    { icon: "📊", title: "التقارير المالية", desc: "تقارير مالية شاملة: قيود اليومية، الأستاذ العام، ميزان المراجعة، القوائم المالية." },
    { icon: "🇸🇦", title: "ZATCA", desc: "التكامل الكامل مع هيئة الزكاة والضريبة والجمارك لإصدار الفواتير الضريبية." },
    { icon: "🏦", title: "التسويات البنكية", desc: "مطابقة آلية للحركات البنكية مع التسويات المحاسبية بشكل يومي." },
    { icon: "📈", title: "تحليل الإيرادات", desc: "تحليل الإيرادات حسب الوحدة والمبنى والمشروع مع مقارنات دورية." },
  ],
  portalLabel: "البوابات",
  portalTitle: "بوابات الملاك والمستأجرين",
  portalDesc: "تجربة رقمية مخصصة لكل من مالكي العقارات والمستأجرين مع لوحات قيادة متكاملة.",
  portalOwnerBadge: "بوابة المالك",
  portalOwnerTitle: "بوابة المالك",
  portalOwnerItems: [
    "قيد التطوير — لوحة قيادة تنفيذية، تقارير، إدارة العقود والمزيد",
  ],
  portalTenantBadge: "بوابة المستأجر",
  portalTenantTitle: "بوابة المستأجر",
  portalTenantItems: [
    "قيد التطوير — عرض العقود، سداد الفواتير، طلبات الصيانة والمزيد",
  ],
  roiLabel: "حاسبة العائد",
  roiTitle: "احسب العائد على استثمارك",
  roiDesc: "أدخل بيانات محفظتك لترى كم ستوفر مع ORCA مقارنة بالأنظمة التقليدية.",
  roiUnits: "عدد الوحدات:",
  roiEmployees: "عدد الموظفين:",
  roiRevenue: "الإيرادات السنوية:",
  roiWaste: "الخسائر السنوية المقدرة بسبب الأنظمة التقليدية",
  roiSavings: "التوفير السنوي المتوقع مع ORCA",
  roiEfficiency: "تحسن الكفاءة التشغيلية",
  compLabel: "مقارنة",
  compTitle: "ORCA مقابل الحلول التقليدية",
  compDesc: "لماذا تختار ORCA على غيره من الحلول.",
  compFeature: "الميزة",
  compExcel: "Excel",
  compCRM: "CRM تقليدي",
  compOrca: "ORCA",
  compRows: [
    { feature: "منصة موحدة لإدارة العقارات", excel: "✗", crm: "△", orca: "✓" },
    { feature: "إدارة مالية ومحاسبة متكاملة", excel: "✗", crm: "✗", orca: "✓" },
    { feature: "التكامل مع ZATCA", excel: "✗", crm: "✗", orca: "✓" },
    { feature: "ذكاء اصطناعي وتحليلات تنبؤية", excel: "✗", crm: "✗", orca: "△" },
    { feature: "بوابات ملاك ومستأجرين", excel: "✗", crm: "△", orca: "△" },
    { feature: "نظام صلاحيات وتدقيق", excel: "✗", crm: "△", orca: "✓" },
    { feature: "تقارير تنفيذية آلية", excel: "✗", crm: "✗", orca: "△" },
    { feature: "دعم فني", excel: "✗", crm: "✓", orca: "✓" },
  ],
  priceLabel: "الباقات",
  priceTitle: "باقات مرنة للمؤسسات بكل الأحجام",
  priceDesc: "اختر الباقة التي تناسب حجم محفظتك العقارية، مع إمكانية الترقيع في أي وقت.",
  priceMonthly: "شهري",
  priceAnnual: "سنوي (خصم ٢ شهر)",
  priceSave: "وفر ١٧٪",
  priceMonth: "شهر",
  pricePopular: "الأكثر طلباً",
  priceCTA: "ابدأ الآن",
  plans: [
    { name: "الأساسية", priceMonth: "٤٥٠", priceAnnual: "٣٧٥", desc: "للمكاتب العقارية الصغيرة", features: ["حتى ١٠٠ وحدة", "٣ مستخدمين", "إدارة العملاء المحتملين", "الفواتير الأساسية", "تقارير بسيطة", "دعم عبر البريد الإلكتروني"] },
    { name: "الفضية", priceMonth: "٩٠٠", priceAnnual: "٧٥٠", desc: "لشركات إدارة العقارات المتوسطة", featured: true, features: ["حتى ١,٠٠٠ وحدة", "١٥ مستخدم", "جميع ميزات الأساسية", "بوابات الملاك والمستأجرين", "محاسبة متكاملة", "ZATCA", "ذكاء اصطناعي", "دعم فني"] },
    { name: "الذهبية", priceMonth: "٢,٤٠٠", priceAnnual: "٢,٠٠٠", desc: "للمؤسسات والمحافظ الكبيرة", features: ["وحدات غير محدودة", "مستخدمين غير محدودين", "جميع الميزات", "API مخصص", "SLA 99.5%+", "مدير حساب مخصص", "استضافة خاصة", "تدريب ميداني"] },
  ],
  ctaLabel: "تواصل مع المبيعات",
  ctaTitle: "استعد لتحويل محفظتك العقارية",
  ctaDesc: "احجز عرضاً تنفيذياً حصرياً لفريقك الإداري وتعرف على كيف يمكن لـ ORCA أن يضاعف كفاءة عملياتك.",
  ctaDemo: "احجز عرضاً تنفيذياً",
  ctaConsult: "استشارة مجانية",
  ctaTrust: [
    "🔒 تشفير مصرفي AES-256",
    "✅ متوافق مع متطلبات السوق",
    "🇸🇦 متكامل مع ZATCA",
    "☁️ استضافة AWS Cloud",
    "💳 Apple Pay & Mada (قريباً)",
    "📄 فواتير ضريبية معتمدة",
  ],
  footerDesc: "نظام تشغيل العقارات المؤسسي الرائد في المملكة العربية السعودية ومنطقة الخليج.",
  footerGDPR: "GDPR (قريباً)",
  footerISO: "ISO 27001 (قريباً)",
  footerZATCA: "ZATCA",
  footerCopyright: "© 2026 ORCA. جميع الحقوق محفوظة.",
  footerCols: [
    {
      title: "المنتج",
      links: [
        { href: "#platform", label: "المنظومة" },
        { href: "#product", label: "المميزات" },
        { href: "#ai", label: "الذكاء الاصطناعي" },
        { href: "#pricing", label: "الباقات" },
      ],
    },
    {
      title: "الدعم",
      links: [
        { href: "/privacy-policy", label: "سياسة الخصوصية" },
        { href: "/terms-and-conditions", label: "الشروط والأحكام" },
        { href: "/disclaimer", label: "إخلاء المسؤولية" },
      ],
    },
    {
      title: "تواصل",
      links: [
        { href: "mailto:enterprise@orca-crm.com", label: "enterprise@orca-crm.com" },
        { href: "tel:+966505123456", label: "+966 50 512 3456" },
      ],
    },
  ],
  casesLabel: "دراسات الحالة",
  casesTitle: "سيناريوهات متوقعة مع ORCA",
  casesDesc: "نماذج متوقعة لكيفية تحسين ORCA للعمليات العقارية للمؤسسات.",
  casesBefore: "الوضع الحالي",
  casesAfter: "السيناريو المتوقع",
  cases: [
    { industry: "شركة إدارة عقارات", result: "سيناريو متوقع: توفير ٤.٢ مليون ر.س سنوياً",
      before: ["إدارة ١,٢٠٠ وحدة يدوياً بـ Excel", "تحصيل يدوي عبر المكالمات والواتساب", "فواتير ورقية بدون تكامل ضريبي", "تأخر ١٥ يوم في متوسط التحصيل"],
      after: ["نظام مركزي يدير جميع الوحدات", "تحصيل تلقائي مع بوابات دفع رقمية", "فواتير ZATCA آلية بالكامل", "تحصيل فوري بنسبة ٩٧٪"],
      metrics: [{ val: "٩٧٪", lbl: "نسبة التحصيل (متوقعة)" }, { val: "٨٢٪", lbl: "توفير الوقت (متوقع)" }, { val: "٤.٢M", lbl: "توفير سنوي متوقع (ر.س)" }]
    },
    { industry: "مطور عقاري", result: "سيناريو متوقع: مضاعفة سرعة المبيعات ٣ مرات",
      before: ["عمليات بيع متفرقة بين ٤ أنظمة", "تأخير في إصدار العقود أسبوعين", "فقدان ٣٠٪ من العملاء المحتملين", "تقارير شهرية متأخرة وغير دقيقة"],
      after: ["مسار مبيعات موحد مع أتمتة كاملة", "عقود رقمية تصدر في دقائق", "استبقاء ٩٥٪ من العملاء المحتملين", "تقارير لحظية للوحة القيادة التنفيذية"],
      metrics: [{ val: "3x", lbl: "سرعة المبيعات (متوقعة)" }, { val: "٩٥٪", lbl: "استبقاء العملاء (متوقع)" }, { val: "٢ دقيقة", lbl: "وقت إصدار العقد (متوقع)" }]
    },
    { industry: "مؤسسة استثمارية", result: "سيناريو متوقع: تقليص فريق العمليات ٦٠٪",
      before: ["فريق مكون من ١٥ موظف للعمليات", "تقارير مالية تستغرق ١٠ أيام", "متابعة يدوية للصيانة والعقود", "معلومات غير مكتملة عن المحفظة"],
      after: ["فريق ٦ موظفين مع أتمتة شاملة", "تقارير مالية لحظية بدقة ١٠٠٪", "نظام صيانة مؤتمت بالكامل", "رؤية كاملة للمحفظة في لحظة"],
      metrics: [{ val: "٦٠٪", lbl: "تقليص الفريق (متوقع)" }, { val: "١٠٠٪", lbl: "دقة التقارير (متوقعة)" }, { val: "١٠ أيام → ٠", lbl: "تأخير التقارير (متوقع)" }]
    },
  ],
};
/* ══════════════════════════════════════════════════════════════
   CONTENT - ENGLISH
══════════════════════════════════════════════════════════════ */
const EN: typeof AR = {
  headerSub: "Real Estate OS",
  signIn: "Sign In",
  startFree: "Request Trial",
  launchBanner: "🚀 Exclusive 2026 Launch Offer — 30% off for new subscribers",
  launchCTA: "Register Now ←",
  nav: [
    { href: "#platform", label: "Platform" },
    { href: "#product", label: "Product" },
    { href: "#ai", label: "AI" },
    { href: "#properties", label: "Properties" },
    { href: "#pricing", label: "Pricing" },
    { href: "#demo", label: "Contact Sales" },
  ],
  heroBadge: "Market-Aligned Real Estate Operating System",
  heroStatus: "Riyadh Region",
  heroTitle: "The Operating System",
  heroTitleAccent: "For Real Estate",
  heroSub: "A single institutional platform managing real estate portfolios, projects, financial operations, and property management with unmatched depth. Built for organizations managing multi-billion-riyal real estate assets.",
  heroCTA: "Request Executive Trial",
  heroLearn: "Learn More",
  stats: [
    { val: "Saudi", lbl: "Built for Real Estate Offices" },
    { val: "Arabic", lbl: "Arabic + RTL Native Support" },
    { val: "Unified", lbl: "Leads, Properties & Contracts" },
  ],
  terminalTitle: "ORCA System Terminal v3.2",
  trustLabel: "Enterprise Trust",
  trustTitle: "Institutional-Grade Infrastructure",
  trustDesc: "Highest standards of security, compliance, and operational transparency.",
  trustItems: [
    { icon: "🔐", title: "Multi-Layer Security", desc: "AES-256 bank-grade encryption and full audit trails across all operations." },
    { icon: "✅", title: "Market-Aligned", desc: "Built to meet Saudi market requirements and cybersecurity controls." },
    { icon: "☁️", title: "Enterprise Cloud Infrastructure", desc: "Hosted on AWS Cloud with instant backup and 99.5%+ SLA guarantee." },
    { icon: "📋", title: "Role-Based Access & Audit", desc: "Granular permission system with complete action tracking and comprehensive audit reports." },
  ],
  osLabel: "Platform",
  osTitle: "Unified Real Estate Operating System",
  osDesc: "A single platform connecting every function of real estate management into one unified system.",
  osLayers: [
    { x: "20", y: "10", w: "860", h: "60", label: "CRM & Lead Management", items: ["Lead Management", "Sales Pipelines", "Quotations", "Contracts"] },
    { x: "20", y: "90", w: "860", h: "60", label: "Property & Asset Management", items: ["Units & Buildings", "Owners & Tenants", "Maintenance", "Lease Contracts"] },
    { x: "20", y: "170", w: "860", h: "60", label: "Financial Operations", items: ["Invoicing & Collections", "Revenue & Expenses", "ZATCA Integration", "Financial Reports"] },
    { x: "20", y: "250", w: "860", h: "60", label: "Accounting", items: ["General Ledger", "Sub-Ledgers", "Trial Balance", "Bank Reconciliation"] },
    { x: "20", y: "330", w: "860", h: "60", label: "Owner & Tenant Portals", items: ["Owner Portal", "Tenant Portal", "Executive Reports", "Dashboards"] },
    { x: "20", y: "410", w: "860", h: "60", label: "AI & Analytics", items: ["Occupancy Prediction", "Collection Risk Analysis", "Executive Reports", "Proactive Insights"] },
  ],
  productLabel: "Product Experience",
  productTitle: "Seamlessly Connected Workflows",
  productDesc: "A single platform connecting every step of the property lifecycle into a smooth workflow.",
  productItems: [
    { icon: "🔄", title: "Marketing & Lead Generation", desc: "Manage marketing campaigns, capture leads, and automatically distribute to sales teams." },
    { icon: "📊", title: "Sales & Quotations", desc: "Manage the entire sales pipeline from initial quotation to contract issuance and signing." },
    { icon: "📄", title: "Contracts & Invoicing", desc: "Issue contracts and invoices electronically with digital signing and ZATCA integration." },
  ],
  aiLabel: "Artificial Intelligence",
  aiTitle: "Predictive AI for Real Estate Enterprises",
  aiDesc: "Advanced analytics and proactive insights powering your investment and operational decisions.",
  aiItems: [
    { icon: "📈", tag: "AI PREDICT", title: "Occupancy Forecasting", desc: "AI model predicting occupancy rates for the next 12 months based on historical and seasonal trends.", metric: "AI", metricLbl: "Predictive System" },
    { icon: "⚠️", tag: "AI RISK", title: "Collection Risk Analysis", desc: "Proactive risk analysis per tenant with corrective action recommendations before due dates.", metric: "AI", metricLbl: "Smart Analysis" },
    { icon: "💡", tag: "AI INSIGHTS", title: "Executive Insights", desc: "Intelligent executive reports analyzing portfolio performance and suggesting revenue optimization opportunities.", metric: "", metricLbl: "" },
    { icon: "📊", tag: "AI REPORT", title: "Smart Reporting", desc: "Automated financial and operational reports with gap analysis and actionable recommendations.", metric: "AI", metricLbl: "Continuous Operation" },
  ],
  propLabel: "Property Management",
  propTitle: "Comprehensive Portfolio Management Platform",
  propDesc: "Full management of units, buildings, owners, tenants, and maintenance from a single interface.",
  propItems: [
    { icon: "🏢", title: "Units & Buildings", desc: "Complete real estate inventory management with precise classification of units, buildings, and projects." },
    { icon: "👤", title: "Owners", desc: "Complete owner registry with periodic reports and performance analytics per portfolio." },
    { icon: "🔑", title: "Tenants", desc: "Full tenant lifecycle management from contract to renewal with automated procedures." },
    { icon: "🛠️", title: "Maintenance", desc: "Integrated maintenance ticket system with status tracking, cost management, and instant notifications." },
    { icon: "📋", title: "Lease Contracts", desc: "Lease contract management with auto-renewal, rent calculation, and penalty computation." },
    { icon: "📱", title: "Mobile App (Coming Soon)", desc: "Mobile app for owners and tenants to track contracts, invoices, and maintenance requests — under development." },
  ],
  finLabel: "Financial Operations",
  finTitle: "Integrated Financial Platform",
  finDesc: "Complete financial management including invoicing, collections, financial reporting, and ZATCA integration.",
  finItems: [
    { icon: "📄", title: "Invoicing", desc: "Issue ZATCA-compliant electronic invoices with automatic delivery to clients." },
    { icon: "💳", title: "Collections", desc: "Smart collection system with payment tracking and automatic overdue notifications." },
    { icon: "📊", title: "Financial Reports", desc: "Comprehensive financial reports: journal entries, general ledger, trial balance, financial statements." },
    { icon: "🇸🇦", title: "ZATCA Integration", desc: "Full integration with ZATCA for tax invoice issuance and compliance reporting." },
    { icon: "🏦", title: "Bank Reconciliation", desc: "Automatic bank transaction matching with daily accounting reconciliations." },
    { icon: "📈", title: "Revenue Analysis", desc: "Revenue analysis by unit, building, and project with periodic comparisons." },
  ],
  portalLabel: "Portals",
  portalTitle: "Owner & Tenant Portals",
  portalDesc: "Dedicated digital experience for property owners and tenants with integrated dashboards.",
  portalOwnerBadge: "OWNER PORTAL",
  portalOwnerTitle: "Owner Portal",
  portalOwnerItems: [
    "Under Development — executive dashboard, reports, contract management & more",
  ],
  portalTenantBadge: "TENANT PORTAL",
  portalTenantTitle: "Tenant Portal",
  portalTenantItems: [
    "Under Development — view contracts, pay invoices, maintenance requests & more",
  ],
  roiLabel: "ROI Calculator",
  roiTitle: "Calculate Your Return on Investment",
  roiDesc: "Enter your portfolio data to see how much you can save with ORCA versus traditional systems.",
  roiUnits: "Number of Units:",
  roiEmployees: "Number of Employees:",
  roiRevenue: "Annual Revenue:",
  roiWaste: "Estimated Annual Loss Due to Traditional Systems",
  roiSavings: "Projected Annual Savings with ORCA",
  roiEfficiency: "Operational Efficiency Improvement",
  compLabel: "Comparison",
  compTitle: "ORCA vs Traditional Solutions",
  compDesc: "Why leading enterprises choose ORCA over traditional solutions.",
  compFeature: "Feature",
  compExcel: "Excel",
  compCRM: "Traditional CRM",
  compOrca: "ORCA",
  compRows: [
    { feature: "Unified real estate management platform", excel: "✗", crm: "△", orca: "✓" },
    { feature: "Integrated financial management & accounting", excel: "✗", crm: "✗", orca: "✓" },
    { feature: "ZATCA compliance & integration", excel: "✗", crm: "✗", orca: "✓" },
    { feature: "AI-powered predictive analytics", excel: "✗", crm: "✗", orca: "△" },
    { feature: "Owner & tenant portals", excel: "✗", crm: "△", orca: "△" },
    { feature: "Role-based access & audit trails", excel: "✗", crm: "△", orca: "✓" },
    { feature: "Automated executive reporting", excel: "✗", crm: "✗", orca: "△" },
    { feature: "Technical support", excel: "✗", crm: "✓", orca: "✓" },
  ],
  priceLabel: "Pricing",
  priceTitle: "Flexible Plans for Every Enterprise",
  priceDesc: "Choose the plan that fits your portfolio size, with the ability to upgrade at any time.",
  priceMonthly: "Monthly",
  priceAnnual: "Annual (2 months free)",
  priceSave: "Save 17%",
  priceMonth: "month",
  pricePopular: "Most Popular",
  priceCTA: "Get Started",
  plans: [
    { name: "Basic", priceMonth: "450", priceAnnual: "375", desc: "For small real estate offices", features: ["Up to 100 units", "3 users", "Lead management", "Basic invoicing", "Simple reports", "Email support"] },
    { name: "Silver", priceMonth: "900", priceAnnual: "750", desc: "For mid-size property management firms", featured: true, features: ["Up to 1,000 units", "15 users", "All Basic features", "Owner & tenant portals", "Full accounting", "ZATCA integration", "AI analytics", "Technical support"] },
    { name: "Gold", priceMonth: "2,400", priceAnnual: "2,000", desc: "For large institutions and portfolios", features: ["Unlimited units", "Unlimited users", "All features", "Custom API", "99.5%+ SLA", "Dedicated account manager", "Private hosting", "On-site training"] },
  ],
  ctaLabel: "Contact Sales",
  ctaTitle: "Ready to Transform Your Real Estate Portfolio?",
  ctaDesc: "Book an exclusive executive demo for your leadership team and discover how ORCA can multiply your operational efficiency.",
  ctaDemo: "Book Executive Demo",
  ctaConsult: "Free Consultation",
  ctaTrust: [
    "🔒 AES-256 Bank Encryption",
    "✅ Market-Aligned",
    "🇸🇦 ZATCA Integrated",
    "☁️ AWS Cloud",
    "💳 Apple Pay & Mada (Coming Soon)",
    "📄 Tax Invoices",
  ],
  footerDesc: "The leading enterprise real estate operating system in Saudi Arabia and the GCC region.",
  footerGDPR: "GDPR (Coming Soon)",
  footerISO: "ISO 27001 (Coming Soon)",
  footerZATCA: "ZATCA Compliant",
  footerCopyright: "© 2026 ORCA. All rights reserved.",
  footerCols: [
    {
      title: "Product",
      links: [
        { href: "#platform", label: "Platform" },
        { href: "#product", label: "Features" },
        { href: "#ai", label: "AI" },
        { href: "#pricing", label: "Pricing" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "/privacy-policy", label: "Privacy Policy" },
        { href: "/terms-and-conditions", label: "Terms & Conditions" },
        { href: "/disclaimer", label: "Disclaimer" },
      ],
    },
    {
      title: "Contact",
      links: [
        { href: "mailto:enterprise@orca-crm.com", label: "enterprise@orca-crm.com" },
        { href: "tel:+966505123456", label: "+966 50 512 3456" },
      ],
    },
  ],
  casesLabel: "Case Studies",
  casesTitle: "Projected Scenarios with ORCA",
  casesDesc: "Projected models of how ORCA can improve real estate operations for enterprises.",
  casesBefore: "Current State",
  casesAfter: "Projected Scenario",
  cases: [
    { industry: "Property Management Co.", result: "Projected: Save SAR 4.2M annually",
      before: ["Manually managing 1,200 units with Excel", "Manual collections via calls & WhatsApp", "Paper invoices without tax integration", "Average 15-day collection delay"],
      after: ["Centralized system managing all units", "Automated collections with digital payment gateways", "Fully automated ZATCA invoices", "97% real-time collection rate"],
      metrics: [{ val: "97%", lbl: "Collection Rate (Projected)" }, { val: "82%", lbl: "Time Saved (Projected)" }, { val: "4.2M", lbl: "Annual Savings SAR (Projected)" }]
    },
    { industry: "Real Estate Developer", result: "Projected: 3x faster sales velocity",
      before: ["Sales operations across 4 separate systems", "2-week delay in contract issuance", "30% lead loss rate", "Late and inaccurate monthly reports"],
      after: ["Unified sales pipeline with full automation", "Digital contracts issued in minutes", "95% lead retention rate", "Real-time executive dashboard reporting"],
      metrics: [{ val: "3x", lbl: "Sales Velocity (Projected)" }, { val: "95%", lbl: "Lead Retention (Projected)" }, { val: "2 min", lbl: "Contract Issuance (Projected)" }]
    },
    { industry: "Investment Institution", result: "Projected: Reduce ops team by 60%",
      before: ["15-person operations team", "10-day financial reporting cycle", "Manual maintenance & contract tracking", "Incomplete portfolio visibility"],
      after: ["6-person team with full automation", "Real-time financial reports at 100% accuracy", "Fully automated maintenance system", "Complete portfolio visibility in seconds"],
      metrics: [{ val: "60%", lbl: "Team Reduction (Projected)" }, { val: "100%", lbl: "Report Accuracy (Projected)" }, { val: "10 days → 0", lbl: "Reporting Delay (Projected)" }]
    },
  ],
};
/* ══════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════ */
const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #050816; overflow-x: hidden; }

  .eh-header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    transition: background 0.3s, border-color 0.3s;
    background: rgba(5, 8, 22, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid transparent;
  }
  .eh-header-scrolled {
    background: rgba(5, 8, 22, 0.95);
    border-bottom: 1px solid rgba(201, 169, 110, 0.08);
  }
  .eh-header-inner {
    max-width: 1200px; margin: 0 auto; padding: 0 24px;
    height: 64px; display: flex; align-items: center; justify-content: space-between;
  }
  .eh-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .eh-logo-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
  .eh-logo-text { font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; }
  .eh-logo-sub { font-size: 8px; color: #C9A96E; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-top: -1px; }
  .eh-nav { display: none; gap: 28px; }
  @media (min-width: 768px) { .eh-nav { display: flex; } }
  .eh-nav-link {
    font-size: 12px; font-weight: 600; color: #94A3B8; text-decoration: none;
    transition: color 0.2s; letter-spacing: 0.3px;
  }
  .eh-nav-link:hover { color: #C9A96E; }
  .eh-header-actions { display: flex; align-items: center; gap: 8px; }
  .eh-lang-btn {
    height: 32px; padding: 0 12px; border-radius: 6px;
    background: rgba(201, 169, 110, 0.06); border: 1px solid rgba(201, 169, 110, 0.12);
    color: #94A3B8; font-size: 10px; font-weight: 700; cursor: pointer;
    transition: all 0.2s;
  }
  .eh-lang-btn:hover { border-color: rgba(201, 169, 110, 0.3); color: #C9A96E; }
  .eh-btn-secondary {
    height: 36px; padding: 0 18px; border-radius: 6px;
    background: transparent; border: 1px solid rgba(255, 255, 255, 0.1);
    color: #CBD5E1; font-size: 11px; font-weight: 700; text-decoration: none;
    display: inline-flex; align-items: center; cursor: pointer;
    transition: all 0.2s;
  }
  .eh-btn-secondary:hover { border-color: rgba(255, 255, 255, 0.2); color: #FFFFFF; }
  .eh-btn-primary {
    height: 36px; padding: 0 20px; border-radius: 6px;
    background: linear-gradient(135deg, #C9A96E, #D8B77C);
    color: #050816; font-size: 11px; font-weight: 800; text-decoration: none;
    display: inline-flex; align-items: center; cursor: pointer;
    transition: all 0.25s; border: none;
  }
  .eh-btn-primary:hover { box-shadow: 0 0 24px rgba(201, 169, 110, 0.35); transform: translateY(-1px); }
  .eh-btn-lg { height: 44px; padding: 0 28px; font-size: 13px; }
  .eh-btn-xl { height: 50px; padding: 0 36px; font-size: 14px; }
  .eh-btn-full { width: 100%; justify-content: center; }
  .eh-btn-ghost {
    height: 44px; padding: 0 24px; border-radius: 6px;
    background: transparent; border: 1px solid rgba(255, 255, 255, 0.12);
    color: #CBD5E1; font-size: 12px; font-weight: 600; text-decoration: none;
    display: inline-flex; align-items: center; cursor: pointer;
    transition: all 0.2s;
  }
  .eh-btn-ghost:hover { border-color: rgba(201, 169, 110, 0.4); color: #C9A96E; }
  .eh-btn-gold {
    height: 50px; padding: 0 36px; border-radius: 6px;
    background: transparent; border: 1px solid rgba(201, 169, 110, 0.3);
    color: #C9A96E; font-size: 13px; font-weight: 700; text-decoration: none;
    display: inline-flex; align-items: center; cursor: pointer;
    transition: all 0.25s;
  }
  .eh-btn-gold:hover { background: rgba(201, 169, 110, 0.06); box-shadow: 0 0 20px rgba(201, 169, 110, 0.15); }
  .eh-mobile-toggle { display: flex; flex-direction: column; gap: 4px; width: 28px; height: 28px; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 0; }
  @media (min-width: 768px) { .eh-mobile-toggle { display: none; } }
  .eh-mobile-toggle span { display: block; width: 16px; height: 2px; background: #94A3B8; border-radius: 2px; }
  .eh-mobile-menu {
    position: fixed; top: 64px; left: 0; right: 0; bottom: 0;
    background: rgba(5, 8, 22, 0.98); backdrop-filter: blur(20px);
    display: flex; flex-direction: column; padding: 24px; gap: 16px;
    z-index: 99;
  }
  .eh-mobile-link {
    font-size: 14px; font-weight: 600; color: #CBD5E1; text-decoration: none; padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .eh-text-gold { color: #C9A96E; }
  .eh-text-muted { color: #94A3B8; }

  /* ── Sections ── */
  .eh-section { padding: 100px 0; position: relative; }
  .eh-section-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }
  .eh-section-label {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 99px;
    border: 1px solid rgba(201, 169, 110, 0.15);
    background: rgba(201, 169, 110, 0.04);
    color: #C9A96E; font-size: 10px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    margin-bottom: 16px;
  }
  .eh-section-title { font-size: clamp(28px, 3.5vw, 42px); font-weight: 800; color: #FFFFFF; margin-bottom: 12px; line-height: 1.2; }
  .eh-section-desc { font-size: 14px; color: #94A3B8; font-weight: 500; max-width: 600px; line-height: 1.7; margin-bottom: 48px; }
  .eh-grid { display: grid; gap: 20px; }
  .eh-grid-3 { grid-template-columns: repeat(1, 1fr); }
  @media (min-width: 768px) { .eh-grid-3 { grid-template-columns: repeat(3, 1fr); } }
  .eh-grid-4 { grid-template-columns: repeat(1, 1fr); }
  @media (min-width: 640px) { .eh-grid-4 { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px) { .eh-grid-4 { grid-template-columns: repeat(4, 1fr); } }

  /* ── Cards ── */
  .eh-card {
    background: #0F172A; border: 1px solid #1E293B;
    border-radius: 12px; padding: 28px; transition: all 0.3s;
  }
  .eh-card:hover { border-color: rgba(201, 169, 110, 0.2); }
  .eh-card-glass {
    background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(36, 50, 72, 0.4);
    border-radius: 12px; padding: 28px;
    transition: all 0.3s;
  }
  .eh-card-glass:hover {
    border-color: rgba(201, 169, 110, 0.2);
    box-shadow: 0 0 30px rgba(201, 169, 110, 0.04);
    transform: translateY(-2px);
  }
  .eh-card-icon { font-size: 28px; margin-bottom: 16px; }
  .eh-card-icon-large { font-size: 42px; margin-bottom: 20px; }
  .eh-card-title { font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 10px; }
  .eh-card-desc { font-size: 12px; color: #94A3B8; line-height: 1.7; font-weight: 500; }
  .eh-card-product { background: #0F172A; border: 1px solid #1E293B; padding: 36px 28px; }
  .eh-card-product:hover { border-color: rgba(201, 169, 110, 0.2); box-shadow: 0 0 30px rgba(201, 169, 110, 0.04); transform: translateY(-2px); }

  /* ── Hero ── */
  .eh-hero { min-height: 100vh; display: flex; align-items: center; overflow: hidden; padding-top: 64px; }
  .eh-hero-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(to right, rgba(36, 50, 72, 0.15) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(36, 50, 72, 0.15) 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0.5;
  }
  .eh-hero-glow-top {
    position: absolute; top: -20%; right: -10%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(201, 169, 110, 0.06) 0%, transparent 65%);
    border-radius: 50%; pointer-events: none;
  }
  .eh-hero-glow-bot {
    position: absolute; bottom: -10%; left: -10%;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(201, 169, 110, 0.04) 0%, transparent 65%);
    border-radius: 50%; pointer-events: none;
  }
  .eh-hero-container {
    max-width: 1200px; margin: 0 auto; padding: 0 24px 40px;
    display: grid; grid-template-columns: 1fr; gap: 60px;
    position: relative; z-index: 10; width: 100%;
  }
  @media (min-width: 900px) { .eh-hero-container { grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; } }
  .eh-hero-content { position: relative; z-index: 10; }
  .eh-hero-badges { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
  .eh-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 16px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
  }
  .eh-badge-gold { background: rgba(201, 169, 110, 0.06); border: 1px solid rgba(201, 169, 110, 0.12); color: #C9A96E; }
  .eh-badge-glass { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); color: #94A3B8; }
  .eh-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
  .eh-dot-gold { background: #C9A96E; box-shadow: 0 0 8px rgba(201, 169, 110, 0.4); }
  .eh-dot-emerald { background: #22C55E; }
  .eh-hero-title { font-size: clamp(34px, 5vw, 64px); font-weight: 900; color: #FFFFFF; line-height: 1.1; margin-bottom: 20px; letter-spacing: -0.5px; }
  .eh-hero-sub { font-size: 15px; color: #94A3B8; line-height: 1.8; max-width: 520px; margin-bottom: 36px; font-weight: 500; }
  .eh-hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 48px; }
  .eh-hero-stats { display: flex; gap: 40px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.04); }
  .eh-stat-item { display: flex; flex-direction: column; gap: 4px; }
  .eh-stat-value { font-size: 22px; font-weight: 900; color: #C9A96E; }
  .eh-stat-label { font-size: 10px; color: #64748B; font-weight: 600; }

  /* ── Terminal Visual ── */
  .eh-hero-visual { display: flex; align-items: center; justify-content: center; }
  .eh-terminal {
    width: 100%; max-width: 460px; border-radius: 12px;
    background: #050816; border: 1px solid rgba(201, 169, 110, 0.1);
    overflow: hidden; box-shadow: 0 0 60px rgba(201, 169, 110, 0.04);
  }
  .eh-terminal-bar {
    height: 44px; background: rgba(15, 23, 42, 0.6); border-bottom: 1px solid rgba(36, 50, 72, 0.3);
    display: flex; align-items: center; padding: 0 16px; gap: 10px;
  }
  .eh-terminal-dots { display: flex; gap: 6px; }
  .eh-terminal-dots span { width: 10px; height: 10px; border-radius: 50%; }
  .eh-terminal-dots span:nth-child(1) { background: #FF5F57; }
  .eh-terminal-dots span:nth-child(2) { background: #FEBC2E; }
  .eh-terminal-dots span:nth-child(3) { background: #28C840; }
  .eh-terminal-title { font-size: 10px; color: #64748B; font-weight: 600; letter-spacing: 1px; font-family: monospace; }
  .eh-terminal-body { padding: 24px; font-family: 'JetBrains Mono', 'Consolas', monospace; }
  .eh-terminal-line { font-size: 12px; margin-bottom: 12px; line-height: 1.6; }
  .eh-terminal-success .eh-token-out { color: #22C55E; }
  .eh-terminal-cursor { display: inline-block; width: 8px; height: 16px; background: #C9A96E; animation: blink 1s step-end infinite; margin-top: 8px; }
  .eh-terminal-divider { height: 1px; background: rgba(36, 50, 72, 0.3); margin: 16px 0; }
  @keyframes blink { 50% { opacity: 0; } }
  .eh-token { font-family: 'JetBrains Mono', 'Consolas', monospace; }
  .eh-token-key { color: #C9A96E; }
  .eh-token-op { color: #64748B; }
  .eh-token-num { color: #22C55E; }
  .eh-token-unit { color: #64748B; font-size: 10px; }
  .eh-token-cmd { color: #C9A96E; margin-right: 8px; }
  .eh-token-fn { color: #CBD5E1; }
  .eh-token-out { color: #22C55E; margin-right: 8px; }

  /* ── OS Diagram ── */
  .eh-os { background: #0B1120; }
  .eh-os-diagram { max-width: 100%; overflow-x: auto; background: rgba(5, 8, 22, 0.6); border-radius: 16px; border: 1px solid rgba(36, 50, 72, 0.3); padding: 20px; }
  .eh-os-svg { width: 100%; height: auto; max-width: 900px; }

  /* ── AI Section ── */
  .eh-ai { background: #050816; }
  .eh-ai-showcase { display: grid; grid-template-columns: repeat(1, 1fr); gap: 20px; }
  @media (min-width: 640px) { .eh-ai-showcase { grid-template-columns: repeat(2, 1fr); } }
  .eh-ai-card {
    background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 28px;
    transition: all 0.3s;
  }
  .eh-ai-card:hover { border-color: rgba(201, 169, 110, 0.15); transform: translateY(-2px); }
  .eh-ai-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .eh-ai-icon { font-size: 24px; }
  .eh-ai-tag {
    font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #C9A96E;
    padding: 3px 10px; border-radius: 4px;
    background: rgba(201, 169, 110, 0.06); border: 1px solid rgba(201, 169, 110, 0.1);
  }
  .eh-ai-card-title { font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 10px; }
  .eh-ai-card-desc { font-size: 12px; color: #94A3B8; line-height: 1.7; margin-bottom: 16px; font-weight: 500; }
  .eh-ai-metric { display: flex; align-items: baseline; gap: 6px; padding-top: 16px; border-top: 1px solid rgba(36, 50, 72, 0.3); }
  .eh-ai-metric-val { font-size: 24px; font-weight: 900; color: #C9A96E; }
  .eh-ai-metric-lbl { font-size: 10px; color: #64748B; font-weight: 600; }

  /* ── Trust Section ── */
  .eh-trust { background: #0B1120; }
  .eh-property { background: #050816; }
  .eh-finance { background: #0B1120; }

  /* ── Portals ── */
  .eh-portal { background: #050816; }
  .eh-portal-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media (min-width: 768px) { .eh-portal-grid { grid-template-columns: 1fr 1fr; } }
  .eh-card-portal { padding: 36px; border-radius: 16px; }
  .eh-card-portal-owner {
    background: linear-gradient(135deg, rgba(201, 169, 110, 0.04), rgba(5, 8, 22, 0.6));
    border: 1px solid rgba(201, 169, 110, 0.1);
  }
  .eh-card-portal-tenant {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(5, 8, 22, 0.6));
    border: 1px solid rgba(36, 50, 72, 0.3);
  }
  .eh-portal-badge {
    display: inline-block; padding: 4px 12px; border-radius: 4px;
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    background: rgba(201, 169, 110, 0.08); color: #C9A96E;
    border: 1px solid rgba(201, 169, 110, 0.12); margin-bottom: 20px;
  }
  .eh-portal-badge-tenant { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); color: #94A3B8; }
  .eh-portal-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
  .eh-portal-item {
    font-size: 13px; color: #CBD5E1; font-weight: 500;
    padding-right: 0; position: relative;
  }
  .eh-portal-item::before { content: "→"; color: #C9A96E; margin-right: 8px; }

  /* ── ROI ── */
  .eh-roi { background: #0B1120; }
  .eh-roi-calculator {
    background: #0F172A; border: 1px solid #1E293B; border-radius: 16px;
    padding: 36px; display: grid; grid-template-columns: 1fr; gap: 36px;
  }
  @media (min-width: 768px) { .eh-roi-calculator { grid-template-columns: 1fr 1fr; } }
  .eh-roi-controls { display: flex; flex-direction: column; gap: 24px; }
  .eh-roi-field { display: flex; flex-direction: column; gap: 8px; }
  .eh-roi-label { font-size: 13px; color: #CBD5E1; font-weight: 600; }
  .eh-roi-slider {
    -webkit-appearance: none; width: 100%; height: 4px;
    background: #1E293B; border-radius: 2px; outline: none;
  }
  .eh-roi-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 18px; height: 18px;
    background: #C9A96E; border-radius: 50%; cursor: pointer;
    box-shadow: 0 0 12px rgba(201, 169, 110, 0.3);
  }
  .eh-roi-results { display: flex; flex-direction: column; gap: 20px; justify-content: center; }
  .eh-roi-metric { padding: 24px; border-radius: 12px; background: rgba(5, 8, 22, 0.4); border: 1px solid #1E293B; }
  .eh-roi-metric-waste { border-color: rgba(239, 68, 68, 0.1); }
  .eh-roi-metric-savings { border-color: rgba(201, 169, 110, 0.15); }
  .eh-roi-metric-eff { border-color: rgba(34, 197, 94, 0.1); }
  .eh-roi-metric-val { font-size: 28px; font-weight: 900; color: #FFFFFF; display: block; margin-bottom: 4px; }
  .eh-roi-metric-lbl { font-size: 11px; color: #64748B; font-weight: 600; }

  /* ── Comparison ── */
  .eh-compare { background: #050816; }
  .eh-compare-table {
    border: 1px solid #1E293B; border-radius: 12px;
    overflow-x: auto;
  }
  .eh-compare-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; }
  .eh-compare-header { background: #0F172A; border-bottom: 1px solid #1E293B; }
  .eh-compare-cell { padding: 14px 16px; font-size: 12px; color: #CBD5E1; font-weight: 500; display: flex; align-items: center; gap: 8px; }
  .eh-compare-header .eh-compare-cell { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748B; }
  .eh-compare-feature { border-right: 1px solid #1E293B; font-weight: 600; }
  .eh-compare-excel { border-right: 1px solid #1E293B; color: #64748B; justify-content: center; }
  .eh-compare-crm { border-right: 1px solid #1E293B; color: #94A3B8; justify-content: center; }
  .eh-compare-orca { justify-content: center; color: #CBD5E1; }
  .eh-compare-row:not(.eh-compare-header):nth-child(even) { background: rgba(15, 23, 42, 0.3); }
  .eh-compare-yes { color: #22C55E; font-size: 16px; }
  .eh-compare-no { color: #EF4444; font-size: 12px; opacity: 0.4; }
  .eh-compare-partial { color: #C9A96E; font-size: 14px; }

  /* ── Launch Banner ── */
  .eh-launch-banner {
    background: linear-gradient(90deg, rgba(201, 169, 110, 0.08), rgba(201, 169, 110, 0.04), rgba(201, 169, 110, 0.08));
    border-bottom: 1px solid rgba(201, 169, 110, 0.1);
    padding: 8px 0;
  }
  .eh-launch-inner {
    max-width: 1100px; margin: 0 auto; padding: 0 24px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-size: 12px; color: #CBD5E1; font-weight: 600;
  }
  .eh-launch-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #C9A96E; box-shadow: 0 0 8px rgba(201, 169, 110, 0.5);
    animation: launchPulse 2s ease-in-out infinite;
  }
  @keyframes launchPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .eh-launch-cta {
    padding: 3px 14px; border-radius: 99px; background: rgba(201, 169, 110, 0.12);
    border: 1px solid rgba(201, 169, 110, 0.2); color: #C9A96E;
    font-size: 11px; font-weight: 700; text-decoration: none;
    transition: all 0.2s; white-space: nowrap;
  }
  .eh-launch-cta:hover { background: rgba(201, 169, 110, 0.2); border-color: rgba(201, 169, 110, 0.3); }

  /* ── Nav Active ── */
  .eh-nav-active { color: #C9A96E !important; }

  /* ── Pricing ── */
  .eh-pricing { background: #0B1120; }
  .eh-price-toggle { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; justify-content: center; }
  .eh-price-toggle .eh-price-toggle-active { color: #FFFFFF; font-weight: 700; }
  .eh-price-toggle-btn {
    width: 44px; height: 24px; border-radius: 12px;
    background: #1E293B; border: none; cursor: pointer; position: relative;
    transition: background 0.2s;
  }
  .eh-price-toggle-right { background: rgba(201, 169, 110, 0.3); }
  .eh-price-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #C9A96E; transition: transform 0.2s;
  }
  .eh-price-toggle-right .eh-price-toggle-knob { transform: translateX(20px); }
  .eh-price-toggle span { font-size: 12px; color: #64748B; font-weight: 600; transition: color 0.2s; }
  .eh-price-badge {
    padding: 2px 10px; border-radius: 99px;
    background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.15);
    color: #22C55E; font-size: 9px; font-weight: 700;
  }
  .eh-plan {
    display: flex; flex-direction: column; gap: 16px;
    background: #0F172A; border: 1px solid #1E293B;
    border-radius: 16px; padding: 36px 28px; position: relative;
    transition: all 0.3s;
  }
  .eh-plan:hover { transform: translateY(-4px); }
  .eh-plan-featured {
    border-color: rgba(201, 169, 110, 0.2);
    box-shadow: 0 0 40px rgba(201, 169, 110, 0.04);
  }
  .eh-plan-popular {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    padding: 4px 20px; border-radius: 99px;
    background: linear-gradient(135deg, #C9A96E, #D8B77C);
    color: #050816; font-size: 10px; font-weight: 800;
    white-space: nowrap;
  }
  .eh-plan-name { font-size: 14px; font-weight: 700; color: #C9A96E; text-transform: uppercase; letter-spacing: 2px; }
  .eh-plan-price { display: flex; align-items: baseline; gap: 4px; }
  .eh-plan-amount { font-size: 36px; font-weight: 900; color: #FFFFFF; }
  .eh-plan-period { font-size: 12px; color: #64748B; }
  .eh-plan-desc { font-size: 12px; color: #94A3B8; font-weight: 500; }
  .eh-plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-top: 1px solid #1E293B; }
  .eh-plan-feature { font-size: 12px; color: #CBD5E1; font-weight: 500; display: flex; align-items: center; gap: 8px; }
  .eh-plan-feature::before { content: "✓"; color: #22C55E; font-weight: 700; }

  /* ── CTA ── */
  .eh-cta { background: #050816; text-align: center; overflow: hidden; }
  .eh-cta-glow {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 700px; height: 500px;
    background: radial-gradient(ellipse, rgba(201, 169, 110, 0.04) 0%, transparent 65%);
    pointer-events: none;
  }
  .eh-cta-content { max-width: 700px; margin: 0 auto; position: relative; z-index: 2; }
  .eh-cta-title { font-size: clamp(28px, 3.5vw, 42px); font-weight: 800; color: #FFFFFF; margin-bottom: 16px; line-height: 1.2; }
  .eh-cta-desc { font-size: 15px; color: #94A3B8; line-height: 1.8; max-width: 520px; margin: 0 auto 40px; font-weight: 500; }
  .eh-cta-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
  .eh-cta-trust { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .eh-cta-trust-item { font-size: 11px; color: #64748B; font-weight: 600; padding: 6px 14px; border-radius: 6px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04); }

  /* ── Footer ── */
  .eh-footer { background: #050816; border-top: 1px solid rgba(36, 50, 72, 0.2); padding: 60px 0 30px; }
  .eh-footer-grid { display: grid; grid-template-columns: 1fr; gap: 40px; margin-bottom: 40px; }
  @media (min-width: 768px) { .eh-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }
  .eh-footer-logo { font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #FFFFFF; margin-bottom: 12px; }
  .eh-footer-desc { font-size: 12px; color: #64748B; line-height: 1.7; max-width: 280px; font-weight: 500; }
  .eh-footer-trust { display: flex; gap: 10px; margin-top: 16px; }
  .eh-footer-trust span { font-size: 10px; color: #94A3B8; font-weight: 600; padding: 4px 10px; border-radius: 4px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04); }
  .eh-footer-col-title { font-size: 12px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1.5px; }
  .eh-footer-link { display: block; font-size: 12px; color: #64748B; text-decoration: none; margin-bottom: 10px; font-weight: 500; transition: color 0.2s; }
  .eh-footer-link:hover { color: #C9A96E; }
  .eh-footer-bottom { padding-top: 24px; border-top: 1px solid rgba(36, 50, 72, 0.2); text-align: center; }
  .eh-footer-bottom span { font-size: 11px; color: #475569; font-weight: 500; }

  /* ── Case Studies ── */
  .eh-cases { background: #0B1120; }
  .eh-cases-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media (min-width: 900px) { .eh-cases-grid { grid-template-columns: repeat(3, 1fr); } }
  .eh-case-card {
    background: #0F172A; border: 1px solid #1E293B; border-radius: 14px;
    padding: 28px; transition: all 0.3s;
  }
  .eh-case-card:hover { border-color: rgba(201, 169, 110, 0.15); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
  .eh-case-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #1E293B;
  }
  .eh-case-industry { font-size: 11px; font-weight: 700; color: #C9A96E; }
  .eh-case-result {
    font-size: 10px; font-weight: 600; color: #22C55E;
    padding: 3px 10px; border-radius: 4px;
    background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.1);
  }
  .eh-case-body { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: start; margin-bottom: 20px; }
  .eh-case-column-label {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    margin-bottom: 10px;
  }
  .eh-case-before .eh-case-column-label { color: #EF4444; }
  .eh-case-after .eh-case-column-label { color: #22C55E; }
  .eh-case-item {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 11px; color: #94A3B8; font-weight: 500;
    margin-bottom: 8px; line-height: 1.5;
  }
  .eh-case-bullet { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .eh-case-bullet-red { background: #EF4444; opacity: 0.5; }
  .eh-case-bullet-green { background: #22C55E; }
  .eh-case-arrow { color: #475569; font-size: 14px; display: flex; align-items: center; padding-top: 20px; }
  .eh-case-metrics { display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid #1E293B; }
  .eh-case-metric {
    flex: 1; text-align: center; padding: 12px 8px;
    border-radius: 8px; background: rgba(5, 8, 22, 0.4);
    border: 1px solid rgba(36, 50, 72, 0.3);
  }
  .eh-case-metric-val { font-size: 18px; font-weight: 900; color: #C9A96E; display: block; }
  .eh-case-metric-lbl { font-size: 9px; color: #64748B; font-weight: 600; margin-top: 2px; display: block; }

  /* ── Animations ── */
  .eh-fade-in { animation: ehFadeUp 0.8s ease forwards; opacity: 0; }
  @keyframes ehFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .eh-section { opacity: 0; transform: translateY(10px); transition: all 0.8s ease; }
  .eh-section.eh-visible { opacity: 1; transform: translateY(0); }
`;
