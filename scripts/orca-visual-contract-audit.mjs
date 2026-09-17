#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const BASE_URL = (process.env.ORCA_AUDIT_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const MAX_BROWSER_PAGES = Math.max(1, Number(process.env.ORCA_AUDIT_MAX_PAGES || 80));
const FAIL_ON_VIOLATION = process.env.ORCA_AUDIT_FAIL_ON_VIOLATION === "1";
const EMAIL = process.env.ORCA_AUDIT_EMAIL || "";
const PASSWORD = process.env.ORCA_AUDIT_PASSWORD || "";
const STORAGE_STATE = process.env.ORCA_AUDIT_STORAGE_STATE || "";
const NOW = new Date();
const stamp = NOW.toISOString().replace(/[:.]/g, "-");
const ARTIFACT_ROOT = path.join(ROOT, "artifacts", "orca-visual-contract-audit", stamp);
const SCREENSHOT_DIR = path.join(ARTIFACT_ROOT, "screenshots");
const SERVER_LOG = path.join(ARTIFACT_ROOT, "dev-server.log");
const JSON_REPORT = path.join(ARTIFACT_ROOT, "report.json");
const MD_REPORT = path.join(ARTIFACT_ROOT, "report.md");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const issues = [];
const notes = [];
const coverage = {
  sourceFilesScanned: 0,
  operationPageFiles: 0,
  staticRoutesDiscovered: 0,
  dynamicRouteTemplates: 0,
  browserPagesScanned: 0,
  browserPagesSkippedAuth: 0,
};

function rel(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function addIssue({
  source = "static",
  rule,
  severity = "warning",
  file = null,
  route = null,
  line = null,
  selector = null,
  actual = null,
  expected = null,
  message,
  screenshot = null,
}) {
  issues.push({
    source,
    rule,
    severity,
    file,
    route,
    line,
    selector,
    actual,
    expected,
    message,
    screenshot,
  });
}

function lineOf(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function walk(dir, accept) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "artifacts", "playwright-report", "test-results"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, accept));
    else if (accept(full)) result.push(full);
  }
  return result;
}

function routeFromPageFile(file) {
  const base = path.join(ROOT, "app");
  const relative = path.relative(base, file).replaceAll("\\", "/");
  const segments = relative.split("/").slice(0, -1);
  const routeSegments = [];
  let dynamic = false;
  for (const segment of segments) {
    if (!segment || segment.startsWith("@")) continue;
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    if (segment.includes("[") && segment.includes("]")) dynamic = true;
    routeSegments.push(segment);
  }
  return {
    template: "/" + routeSegments.join("/"),
    dynamic,
  };
}

function staticScan() {
  const roots = ["app", "components", "features"].map((p) => path.join(ROOT, p));
  const files = roots.flatMap((dir) =>
    walk(dir, (file) => /\.(tsx|ts|jsx|js|css)$/.test(file)),
  );
  coverage.sourceFilesScanned = files.length;

  const pageFiles = walk(path.join(ROOT, "app", "operations"), (file) => /[\\/]page\.tsx$/.test(file));
  coverage.operationPageFiles = pageFiles.length;
  const routes = pageFiles.map(routeFromPageFile);
  coverage.staticRoutesDiscovered = routes.filter((r) => !r.dynamic).length;
  coverage.dynamicRouteTemplates = routes.filter((r) => r.dynamic).length;

  const routeInventory = {
    static: [...new Set(routes.filter((r) => !r.dynamic).map((r) => r.template))].sort(),
    dynamic: [...new Set(routes.filter((r) => r.dynamic).map((r) => r.template))].sort(),
  };

  const pageSizeContracts = new Map([
    ["components/views/ProjectsView.tsx", 5],
    ["components/real-estate/properties/PropertiesWorkspace.tsx", 5],
    ["components/settings/SettingsStaff.tsx", 5],
  ]);

  for (const file of files) {
    const fileRel = rel(file);
    const content = fs.readFileSync(file, "utf8");

    // Native select in operational UI.
    if (!fileRel.endsWith("components/settings/SettingsSelect.tsx")) {
      for (const match of content.matchAll(/<select\b/g)) {
        addIssue({
          rule: "VC-STATIC-NATIVE-SELECT",
          severity: "error",
          file: fileRel,
          line: lineOf(content, match.index),
          actual: "<select>",
          expected: "SettingsSelect/shared ORCA select",
          message: "Native <select> found in operational UI source.",
        });
      }
    }

    // Tiny typography conflicts with the unified table/status contracts.
    for (const match of content.matchAll(/text-\[(9|10)px\]/g)) {
      addIssue({
        rule: "VC-STATIC-TINY-TEXT",
        severity: "warning",
        file: fileRel,
        line: lineOf(content, match.index),
        actual: `${match[1]}px`,
        expected: "11px+ secondary / 12px table-status / 14px primary",
        message: "Very small explicit text size found.",
      });
    }

    // Known pagination anti-pattern: primary/blue Next button.
    for (const match of content.matchAll(/nc-btn-primary/g)) {
      const start = Math.max(0, match.index - 350);
      const end = Math.min(content.length, match.index + 500);
      const nearby = content.slice(start, end);
      if (/(التالي|Next|labels\.next|next\b)/i.test(nearby)) {
        addIssue({
          rule: "VC-STATIC-PAGINATION-PRIMARY",
          severity: "error",
          file: fileRel,
          line: lineOf(content, match.index),
          actual: "nc-btn-primary",
          expected: "neutral unified pagination control",
          message: "Pagination Next appears to use a primary button style.",
        });
      }
    }

    // Fixed nested vertical scrolling.
    for (const match of content.matchAll(/className\s*=\s*["'`][^"'`]*h-\[\d+px\][^"'`]*overflow-y-auto[^"'`]*["'`]/g)) {
      addIssue({
        rule: "VC-STATIC-FIXED-NESTED-SCROLL",
        severity: "error",
        file: fileRel,
        line: lineOf(content, match.index),
        actual: match[0].slice(0, 180),
        expected: "page-owned vertical scroll or bounded semantic scroll region",
        message: "Arbitrary fixed-height nested vertical scroll detected.",
      });
    }

    for (const match of content.matchAll(/overscroll-(?:y-)?contain/g)) {
      addIssue({
        rule: "VC-STATIC-OVERSCROLL-CONTAIN",
        severity: "warning",
        file: fileRel,
        line: lineOf(content, match.index),
        actual: match[0],
        expected: "overscroll-behavior-y:auto for approved bounded regions",
        message: "Overscroll containment may violate ORCA scroll chaining contract.",
      });
    }

    // Tables must have a visible header contract.
    for (const tableMatch of content.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
      if (!/<thead\b/.test(tableMatch[0])) {
        addIssue({
          rule: "VC-STATIC-TABLE-WITHOUT-HEAD",
          severity: "error",
          file: fileRel,
          line: lineOf(content, tableMatch.index),
          actual: "table without <thead>",
          expected: "table with explicit header row",
          message: "A table does not include a <thead> header row.",
        });
      }
    }

    // Route-family page-size contracts already approved by the owner.
    if (pageSizeContracts.has(fileRel)) {
      const expected = pageSizeContracts.get(fileRel);
      const sizeMatch = content.match(/const\s+(?:STAFF_)?PAGE_SIZE\s*=\s*(\d+)/);
      if (!sizeMatch) {
        addIssue({
          rule: "VC-STATIC-PAGE-SIZE-MISSING",
          severity: "warning",
          file: fileRel,
          expected: String(expected),
          message: "Expected unified PAGE_SIZE constant was not found.",
        });
      } else if (Number(sizeMatch[1]) !== expected) {
        addIssue({
          rule: "VC-STATIC-PAGE-SIZE",
          severity: "error",
          file: fileRel,
          line: lineOf(content, sizeMatch.index),
          actual: sizeMatch[1],
          expected: String(expected),
          message: "Page-size contract differs from the approved family contract.",
        });
      }
    }

    // Explicit legacy row-action size conflict.
    if (/\.orca-operations-row-action[\s\S]{0,220}font-size\s*:\s*10px/.test(content)) {
      const idx = content.search(/\.orca-operations-row-action/);
      addIssue({
        rule: "VC-STATIC-ROW-ACTION-10PX",
        severity: "error",
        file: fileRel,
        line: lineOf(content, idx),
        actual: "10px",
        expected: "12px",
        message: "Row action typography conflicts with the locked 12px contract.",
      });
    }
  }

  return routeInventory;
}

async function isReachable(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { redirect: "manual", signal: controller.signal });
    return res.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureServer() {
  if (await isReachable(`${BASE_URL}/login`)) {
    notes.push(`Using existing server at ${BASE_URL}`);
    return { child: null, started: false };
  }

  notes.push(`No server detected at ${BASE_URL}; starting npm run dev on port 3000.`);
  const logFd = fs.openSync(SERVER_LOG, "a");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npm, ["run", "dev", "--", "-p", "3000"], {
    cwd: ROOT,
    env: process.env,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    if (child.exitCode !== null) break;
    if (await isReachable(`${BASE_URL}/login`)) {
      notes.push("Development server started successfully.");
      return { child, started: true };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  addIssue({
    source: "browser",
    rule: "VC-BROWSER-SERVER-UNAVAILABLE",
    severity: "error",
    actual: BASE_URL,
    expected: "reachable ORCA server",
    message: `Could not start or reach ORCA at ${BASE_URL}. See ${rel(SERVER_LOG)}.`,
  });
  return { child, started: true, unavailable: true };
}

function stopServer(server) {
  if (!server?.started || !server.child || server.child.exitCode !== null) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(server.child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      server.child.kill("SIGTERM");
    }
  } catch {
    // Best effort only.
  }
}

function sanitizeRoute(route) {
  const cleaned = route
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "operations";
}

async function loginIfNeeded(page) {
  await page.goto(`${BASE_URL}/operations`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(300);
  const current = new URL(page.url());

  if (!current.pathname.startsWith("/login")) {
    return { authenticated: true, mode: STORAGE_STATE ? "storage-state" : "existing-session" };
  }

  if (!EMAIL || !PASSWORD) {
    return { authenticated: false, mode: "credentials-required" };
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const password = page.locator('input[type="password"], input[name="password"]').first();

  if ((await email.count()) === 0 || (await password.count()) === 0) {
    return { authenticated: false, mode: "login-controls-not-found" };
  }

  await email.fill(EMAIL);
  await password.fill(PASSWORD);
  const submit = page.locator('button[type="submit"], input[type="submit"]').first();
  if ((await submit.count()) === 0) {
    return { authenticated: false, mode: "login-submit-not-found" };
  }

  await Promise.allSettled([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 }),
    submit.click(),
  ]);

  await page.goto(`${BASE_URL}/operations`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return {
    authenticated: !new URL(page.url()).pathname.startsWith("/login"),
    mode: "credentials",
  };
}

async function inspectPage(page, route, screenshotRel) {
  const result = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
    };
    const rectData = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };
    const compact = (text) => String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);

    const body = document.body;
    const html = document.documentElement;
    const dir = html.getAttribute("dir") || body.getAttribute("dir") || getComputedStyle(body).direction;

    const nativeSelects = [...document.querySelectorAll("select")]
      .filter(visible)
      .map((el) => ({
        selector: el.id ? `#${el.id}` : "select",
        text: compact(el.textContent),
        rect: rectData(el),
      }));

    const smallControls = [...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')]
      .filter(visible)
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.height < 43.5)
      .slice(0, 80)
      .map(({ el, rect }) => ({
        text: compact(el.textContent || el.getAttribute("aria-label") || el.getAttribute("title")),
        height: Math.round(rect.height * 10) / 10,
        className: compact(el.className),
      }));

    const tables = [...document.querySelectorAll("table")]
      .filter(visible)
      .map((table, index) => ({
        index,
        hasHead: Boolean(table.querySelector("thead")),
        headerFonts: [...table.querySelectorAll("thead th")]
          .filter(visible)
          .map((th) => parseFloat(getComputedStyle(th).fontSize)),
      }));

    const kpiSelector = [
      ".orca-workspace-metric",
      ".orca-summary-card",
      '[class*="kpi-card"]',
      '[class*="KpiCard"]',
      "[data-kpi]",
    ].join(",");
    const kpiEls = [...document.querySelectorAll(kpiSelector)].filter(visible);
    const kpis = kpiEls.map((card, index) => {
      const texts = [...card.querySelectorAll("span,strong,p,h2,h3,h4,div")]
        .filter((el) => visible(el) && compact(el.textContent))
        .map((el) => {
          const cs = getComputedStyle(el);
          const clipped =
            el.scrollWidth > el.clientWidth + 2 ||
            el.scrollHeight > el.clientHeight + 2;
          return {
            text: compact(el.textContent),
            fontSize: parseFloat(cs.fontSize),
            clipped,
          };
        });
      return {
        index,
        rect: rectData(card),
        text: compact(card.textContent),
        minTextFont: texts.length ? Math.min(...texts.map((t) => t.fontSize)) : null,
        clippedTexts: texts.filter((t) => t.clipped).slice(0, 8),
      };
    });

    const internalScroll = [...document.querySelectorAll("div,section,aside,main")]
      .filter(visible)
      .map((el) => {
        const cs = getComputedStyle(el);
        const scrollable =
          ["auto", "scroll"].includes(cs.overflowY) &&
          el.scrollHeight > el.clientHeight + 4;
        if (!scrollable) return null;
        const role = el.getAttribute("role") || "";
        const allowedRole = ["log", "conversation", "menu", "dialog", "listbox"].includes(role);
        const classes = compact(el.className);
        const allowedClass =
          /orca-operations-scroll|conversation|settings-select|menu/i.test(classes);
        return {
          role,
          classes,
          rect: rectData(el),
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          allowed: allowedRole || allowedClass,
        };
      })
      .filter(Boolean)
      .filter((x) => !x.allowed)
      .slice(0, 40);

    const rawStatuses = [];
    if (dir === "rtl") {
      const raw = new Set([
        "Available", "Hold", "Reserved", "Sold", "Leased", "Maintenance",
        "Active", "Disabled", "Pending", "Open", "Closed",
      ]);
      for (const el of document.querySelectorAll("span,td,button")) {
        if (!visible(el)) continue;
        const text = compact(el.textContent);
        if (raw.has(text)) rawStatuses.push(text);
      }
    }

    const bodyText = compact(body.innerText);
    const uuidMatches = (body.innerText || "").match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi) || [];
    const nullish = [...document.querySelectorAll("span,td,p,div")]
      .filter(visible)
      .map((el) => compact(el.textContent))
      .filter((text) => /^(null|undefined)$/i.test(text))
      .slice(0, 20);

    const pagination = [...document.querySelectorAll("button,a")]
      .filter(visible)
      .map((el) => ({
        text: compact(el.textContent),
        height: Math.round(el.getBoundingClientRect().height * 10) / 10,
        className: compact(el.className),
      }))
      .filter((x) => /^(التالي|السابق|Next|Previous)$/i.test(x.text));

    return {
      title: document.title,
      dir,
      pageOverflow: {
        clientWidth: html.clientWidth,
        scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
        overflow: Math.max(html.scrollWidth, body.scrollWidth) > html.clientWidth + 2,
      },
      nativeSelects,
      smallControls,
      tables,
      kpis,
      internalScroll,
      rawStatuses: [...new Set(rawStatuses)],
      uuidMatches: [...new Set(uuidMatches)].slice(0, 20),
      nullish,
      pagination,
      bodyTextSample: bodyText.slice(0, 400),
    };
  });

  if (result.pageOverflow.overflow) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-PAGE-X-OVERFLOW",
      severity: "error",
      route,
      actual: `${result.pageOverflow.scrollWidth}px`,
      expected: `${result.pageOverflow.clientWidth}px or less`,
      message: "Page-wide horizontal overflow detected.",
      screenshot: screenshotRel,
    });
  }

  for (const item of result.nativeSelects) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-NATIVE-SELECT",
      severity: "error",
      route,
      selector: item.selector,
      actual: "visible native <select>",
      expected: "SettingsSelect/shared ORCA select",
      message: `Visible native select detected: ${item.text}`,
      screenshot: screenshotRel,
    });
  }

  for (const item of result.smallControls) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-CONTROL-HEIGHT",
      severity: "warning",
      route,
      actual: `${item.height}px`,
      expected: ">=44px",
      message: `Interactive control is below the 44px contract: ${item.text || "(icon control)"}`,
      screenshot: screenshotRel,
    });
  }

  for (const table of result.tables) {
    if (!table.hasHead) {
      addIssue({
        source: "browser",
        rule: "VC-BROWSER-TABLE-WITHOUT-HEAD",
        severity: "error",
        route,
        actual: `table #${table.index + 1}`,
        expected: "visible table header row",
        message: "Visible table has no <thead>.",
        screenshot: screenshotRel,
      });
    }
    for (const size of table.headerFonts) {
      if (Math.abs(size - 12) > 0.6) {
        addIssue({
          source: "browser",
          rule: "VC-BROWSER-TABLE-HEADER-TYPOGRAPHY",
          severity: "warning",
          route,
          actual: `${size}px`,
          expected: "12px",
          message: "Table header computed font size differs from the locked 12px contract.",
          screenshot: screenshotRel,
        });
      }
    }
  }

  for (const kpi of result.kpis) {
    if (kpi.minTextFont !== null && kpi.minTextFont < 11.5) {
      addIssue({
        source: "browser",
        rule: "VC-BROWSER-KPI-TINY-TEXT",
        severity: "error",
        route,
        actual: `${kpi.minTextFont}px`,
        expected: ">=12px for KPI labels",
        message: `KPI card contains undersized text: ${kpi.text}`,
        screenshot: screenshotRel,
      });
    }
    if (kpi.clippedTexts.length) {
      addIssue({
        source: "browser",
        rule: "VC-BROWSER-KPI-CLIPPED-TEXT",
        severity: "error",
        route,
        actual: kpi.clippedTexts.map((x) => x.text).join(" | "),
        expected: "fully visible KPI text",
        message: `KPI card contains clipped text: ${kpi.text}`,
        screenshot: screenshotRel,
      });
    }
  }

  for (const item of result.internalScroll) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-UNAPPROVED-INTERNAL-SCROLL",
      severity: "warning",
      route,
      actual: `${item.clientHeight}px viewport / ${item.scrollHeight}px content`,
      expected: "page-owned scroll or approved log/conversation/menu/dialog region",
      message: `Unapproved internal vertical scroll candidate: ${item.classes}`,
      screenshot: screenshotRel,
    });
  }

  for (const status of result.rawStatuses) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-RAW-ENGLISH-STATUS-RTL",
      severity: "error",
      route,
      actual: status,
      expected: "localized Arabic status",
      message: `Raw English status is visible in RTL UI: ${status}`,
      screenshot: screenshotRel,
    });
  }

  for (const uuid of result.uuidMatches) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-VISIBLE-UUID",
      severity: "error",
      route,
      actual: uuid,
      expected: "human-readable business identifier",
      message: "Technical UUID is visible to the user.",
      screenshot: screenshotRel,
    });
  }

  for (const value of result.nullish) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-NULLISH-TEXT",
      severity: "error",
      route,
      actual: value,
      expected: "غير محدد / localized fallback",
      message: "Raw null/undefined text is visible.",
      screenshot: screenshotRel,
    });
  }

  for (const item of result.pagination) {
    if (item.height < 43.5) {
      addIssue({
        source: "browser",
        rule: "VC-BROWSER-PAGINATION-HEIGHT",
        severity: "error",
        route,
        actual: `${item.height}px`,
        expected: ">=44px",
        message: `Pagination control ${item.text} is below the 44px contract.`,
        screenshot: screenshotRel,
      });
    }
    if (/nc-btn-primary/.test(item.className)) {
      addIssue({
        source: "browser",
        rule: "VC-BROWSER-PAGINATION-PRIMARY",
        severity: "error",
        route,
        actual: "primary pagination button",
        expected: "neutral unified pagination control",
        message: `Pagination control ${item.text} uses primary styling.`,
        screenshot: screenshotRel,
      });
    }
  }

  return result;
}

async function browserScan(routeInventory) {
  let server;
  let browser;
  try {
    server = await ensureServer();
    if (server.unavailable) return { auth: { authenticated: false, mode: "server-unavailable" }, pages: [] };

    const launchOptions = { headless: process.env.ORCA_AUDIT_HEADED !== "1" };
    browser = await chromium.launch(launchOptions);

    const contextOptions = {
      viewport: { width: 1600, height: 900 },
      locale: "ar-SA",
      colorScheme: "dark",
    };
    if (STORAGE_STATE && fs.existsSync(path.resolve(ROOT, STORAGE_STATE))) {
      contextOptions.storageState = path.resolve(ROOT, STORAGE_STATE);
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    const auth = await loginIfNeeded(page);

    if (!auth.authenticated) {
      coverage.browserPagesSkippedAuth = routeInventory.static.length;
      addIssue({
        source: "browser",
        rule: "VC-BROWSER-AUTH-REQUIRED",
        severity: "warning",
        route: "/operations",
        actual: auth.mode,
        expected: "authenticated browser session",
        message:
          "Browser scan could not authenticate. Static scan completed. Set ORCA_AUDIT_EMAIL/ORCA_AUDIT_PASSWORD or ORCA_AUDIT_STORAGE_STATE for full browser coverage.",
      });
      await context.close();
      return { auth, pages: [] };
    }

    const seedRoutes = ["/operations", ...routeInventory.static]
      .filter((v, i, a) => a.indexOf(v) === i);

    const queue = [...seedRoutes];
    const visited = new Set();
    const pages = [];

    while (queue.length && visited.size < MAX_BROWSER_PAGES) {
      const requested = queue.shift();
      if (!requested || visited.has(requested)) continue;
      visited.add(requested);

      let response;
      try {
        response = await page.goto(`${BASE_URL}${requested}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(250);
      } catch (error) {
        addIssue({
          source: "browser",
          rule: "VC-BROWSER-NAVIGATION-FAILED",
          severity: "warning",
          route: requested,
          actual: error instanceof Error ? error.message : String(error),
          expected: "page loads",
          message: "Browser could not load route.",
        });
        continue;
      }

      const currentUrl = new URL(page.url());
      if (currentUrl.pathname.startsWith("/login")) {
        coverage.browserPagesSkippedAuth += 1;
        continue;
      }
      if (!currentUrl.pathname.startsWith("/operations")) continue;

      const canonical = `${currentUrl.pathname}${currentUrl.search}`;
      const screenshotName = `${String(pages.length + 1).padStart(3, "0")}-${sanitizeRoute(canonical)}.png`;
      const screenshotAbs = path.join(SCREENSHOT_DIR, screenshotName);
      const screenshotRel = rel(screenshotAbs);

      await page.screenshot({ path: screenshotAbs, fullPage: true }).catch(() => {});

      const inspection = await inspectPage(page, canonical, screenshotRel);
      coverage.browserPagesScanned += 1;
      pages.push({
        requested,
        route: canonical,
        status: response?.status?.() ?? null,
        title: inspection.title,
        screenshot: screenshotRel,
      });

      const hrefs = await page.locator('a[href^="/operations"]').evaluateAll((els) =>
        els.map((el) => el.getAttribute("href")).filter(Boolean),
      ).catch(() => []);

      for (const href of hrefs) {
        if (typeof href !== "string") continue;
        if (/logout|signout/i.test(href)) continue;
        const url = new URL(href, BASE_URL);
        if (url.origin !== new URL(BASE_URL).origin) continue;
        if (!url.pathname.startsWith("/operations")) continue;
        const next = `${url.pathname}${url.search}`;
        if (!visited.has(next) && !queue.includes(next)) queue.push(next);
      }
    }

    await context.close();
    return { auth, pages };
  } catch (error) {
    addIssue({
      source: "browser",
      rule: "VC-BROWSER-RUNNER-FAILED",
      severity: "error",
      actual: error instanceof Error ? error.stack || error.message : String(error),
      expected: "successful Playwright audit",
      message: "Browser audit runner failed.",
    });
    return { auth: { authenticated: false, mode: "runner-failed" }, pages: [] };
  } finally {
    if (browser) await browser.close().catch(() => {});
    stopServer(server);
  }
}

function summarize() {
  const bySeverity = { error: 0, warning: 0, info: 0 };
  const byRule = {};
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byRule[issue.rule] = (byRule[issue.rule] || 0) + 1;
  }
  return { total: issues.length, bySeverity, byRule };
}

function writeReports(routeInventory, browserResult) {
  const summary = summarize();
  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    baseURL: BASE_URL,
    mode: "contract-discovery",
    coverage,
    routes: routeInventory,
    browser: browserResult,
    summary,
    notes,
    issues,
  };
  fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2) + "\n");

  const lines = [];
  lines.push("# ORCA Visual Contract Audit");
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Mode: contract-discovery`);
  lines.push(`- Base URL: ${BASE_URL}`);
  lines.push(`- Source files scanned: ${coverage.sourceFilesScanned}`);
  lines.push(`- Operations page files: ${coverage.operationPageFiles}`);
  lines.push(`- Browser pages scanned: ${coverage.browserPagesScanned}`);
  lines.push(`- Dynamic route templates found: ${coverage.dynamicRouteTemplates}`);
  lines.push(`- Violations: ${summary.total} (${summary.bySeverity.error} errors, ${summary.bySeverity.warning} warnings)`);
  lines.push("");
  lines.push("## Rule summary");
  lines.push("");
  const ruleEntries = Object.entries(summary.byRule).sort((a, b) => b[1] - a[1]);
  if (!ruleEntries.length) lines.push("No violations detected.");
  for (const [rule, count] of ruleEntries) lines.push(`- ${rule}: ${count}`);
  lines.push("");
  lines.push("## Violations");
  lines.push("");
  if (!issues.length) {
    lines.push("No violations detected.");
  } else {
    issues.forEach((issue, index) => {
      lines.push(`### ${index + 1}. ${issue.rule} — ${issue.severity.toUpperCase()}`);
      if (issue.route) lines.push(`- Route: \`${issue.route}\``);
      if (issue.file) lines.push(`- File: \`${issue.file}${issue.line ? `:${issue.line}` : ""}\``);
      if (issue.actual != null) lines.push(`- Actual: \`${String(issue.actual).replace(/\n/g, " ")}\``);
      if (issue.expected != null) lines.push(`- Expected: \`${String(issue.expected).replace(/\n/g, " ")}\``);
      lines.push(`- ${issue.message}`);
      if (issue.screenshot) lines.push(`- Screenshot: \`${issue.screenshot}\``);
      lines.push("");
    });
  }
  lines.push("## Dynamic route templates");
  lines.push("");
  if (routeInventory.dynamic.length) {
    for (const route of routeInventory.dynamic) lines.push(`- \`${route}\``);
  } else {
    lines.push("None.");
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  if (!notes.length) lines.push("None.");
  for (const note of notes) lines.push(`- ${note}`);
  lines.push("");
  lines.push("> Discovery mode reports differences; it does not modify product files or establish screenshot baselines.");

  fs.writeFileSync(MD_REPORT, lines.join("\n") + "\n");
  return { report, summary };
}

async function main() {
  console.log("ORCA Visual Contract Auditor");
  console.log(`ROOT=${ROOT}`);
  console.log(`ARTIFACTS=${rel(ARTIFACT_ROOT)}`);
  console.log("");

  const routeInventory = staticScan();
  console.log(`STATIC SCAN: ${coverage.sourceFilesScanned} source files`);
  console.log(`ROUTES: ${routeInventory.static.length} static / ${routeInventory.dynamic.length} dynamic templates`);

  const browserResult = await browserScan(routeInventory);
  const { summary } = writeReports(routeInventory, browserResult);

  console.log("");
  console.log("ORCA VISUAL CONTRACT AUDIT COMPLETE");
  console.log(`BROWSER AUTH=${browserResult.auth?.authenticated ? "YES" : "NO"} (${browserResult.auth?.mode || "unknown"})`);
  console.log(`BROWSER PAGES=${coverage.browserPagesScanned}`);
  console.log(`ERRORS=${summary.bySeverity.error}`);
  console.log(`WARNINGS=${summary.bySeverity.warning}`);
  console.log(`REPORT=${rel(MD_REPORT)}`);
  console.log(`JSON=${rel(JSON_REPORT)}`);

  if (FAIL_ON_VIOLATION && summary.total > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
