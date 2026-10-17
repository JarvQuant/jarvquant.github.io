export const I18N = {
  en: {









    // Pricing
    "plan.free.name": "Starter",
    "plan.pro.name": "Operator",
    "plan.elite.name": "Architect",

    // Exhibition carousel

    "plan.free.tag": "FREE",
    "plan.free.period": "Forever. No card.",
    "plan.free.f1": "Bar-by-bar market replay environment",
    "plan.free.f2": "Data import (CSV, Parquet, MT5)",
    "plan.free.f3": "Trade journal: 10 entries rolling",
    "plan.free.f4": "Live-candle replay, second by second",
    "plan.free.cta": "Download Free",

    "plan.pro.tag": "PRO",
    "plan.pro.flag": "MOST POPULAR",
    "plan.pro.period": "Billed monthly · cancel anytime",
    "plan.pro.f1": "Unlimited journal entries",
    "plan.pro.f2": "Strategy Builder with rules and constraints",
    "plan.pro.f3": "Prop firm challenge simulator with rule presets",
    "plan.pro.f4": "Backtesting engine",
    "plan.pro.f5": "Trade Autopsy: algorithmic post-trade review",
    "plan.pro.f6": "Grand Archive: 300+ strategy playbooks",

    "plan.elite.tag": "ELITE",
    "plan.elite.period": "Billed monthly · cancel anytime",
    "plan.elite.f1": "Everything in Pro",
    "plan.elite.f2": "PANTHEON included: Options Sim plus six synthetic markets",
    "plan.elite.f3": "VANTA AI Coach: dedicated trader personality, error analysis and psychology",
    "plan.elite.f4": "Ask VANTA on every session review",
    "plan.elite.f5": "Priority support",

    "addon.tag": "ADD-ON",
    "addon.name": "PANTHEON",
    "addon.body": "The full simulation suite. Options Sim with live chains, Greeks, IV modeling and DTE tracking. Syndex synthetic market engine. Five additional synthetic markets: Volatex, Tempus, Chronus, Atlas, Kairos. Add it to Pro; Architect already includes it.",

    "lifetime.tag": "FOUNDERS · LIMITED 200",
    "lifetime.name": "Lifetime Access",
    "lifetime.body": "Elite plan including PANTHEON, forever. All future tiers and add-ons included at no extra cost. One payment, never charged again. Hard cap at 200 seats. Founders rate locked for life.",
    "lifetime.note": "one-time",



    // Mobile positioning copy


  },

  de: {









    // Pricing
    "plan.free.name": "Starter",
    "plan.pro.name": "Operator",
    "plan.elite.name": "Architect",

    // Exhibition carousel

    "plan.free.tag": "FREE",
    "plan.free.period": "Für immer. Keine Karte.",
    "plan.free.f1": "Replay-first Chart-Environment",
    "plan.free.f2": "Daten-Imports",
    "plan.free.f3": "Journal Lite: 10 Einträge rolling",
    "plan.free.f4": "Live-Kerzen-Replay, Sekunde für Sekunde",
    "plan.free.cta": "Kostenlos Downloaden",

    "plan.pro.tag": "PRO",
    "plan.pro.flag": "MEISTGEWÄHLT",
    "plan.pro.period": "Monatlich abgerechnet · jederzeit kündbar",
    "plan.pro.f1": "Unbegrenzte Journal-Einträge",
    "plan.pro.f2": "Strategy Builder Sandbox",
    "plan.pro.f3": "Prop Sim mit Rule-Presets",
    "plan.pro.f4": "Backtesting",
    "plan.pro.f5": "Trade Autopsy: algorithmisches Post-Trade Review",
    "plan.pro.f6": "Grand Archive: 300+ Strategie-Playbooks",

    "plan.elite.tag": "ELITE",
    "plan.elite.period": "Monatlich abgerechnet · jederzeit kündbar",
    "plan.elite.f1": "Alles aus Pro",
    "plan.elite.f2": "PANTHEON inklusive: Options Sim plus sechs synthetische Märkte",
    "plan.elite.f3": "VANTA AI Coach: Trading-Persönlichkeit, Fehleranalyse und Psychologie",
    "plan.elite.f4": "Ask VANTA in jeder Session-Auswertung",
    "plan.elite.f5": "Priority Support",

    "addon.tag": "ADD-ON",
    "addon.name": "PANTHEON",
    "addon.body": "Die komplette Simulations-Suite. Options Sim mit Live-Chains, Greeks, IV-Modeling und DTE-Tracking. Syndex synthetische Market Engine. Fünf zusätzliche synthetische Märkte: Volatex, Tempus, Chronus, Atlas, Kairos. Zu Pro dazubuchbar, in Architect schon enthalten.",

    "lifetime.tag": "FOUNDERS · LIMITIERT 200",
    "lifetime.name": "Lifetime Access",
    "lifetime.body": "Elite inklusive PANTHEON, für immer. Alle zukünftigen Tiers und Add-Ons inklusive. Eine Zahlung, nie wieder abgerechnet. Limitiert auf 200 Plätze.",
    "lifetime.note": "einmalig",



    // Mobile positioning copy


  }
};

export function resolveLang() {
  const url = new URL(window.location.href);
  const q = (url.searchParams.get("lang") || "").trim().toLowerCase();
  if (q && I18N[q]) return q;

  const stored = (localStorage.getItem("jq_lang") || "").trim().toLowerCase();
  if (stored && I18N[stored]) return stored;

  return "en";
}

export function setLang(code) {
  if (I18N[code]) localStorage.setItem("jq_lang", code);
  return code;
}

export function applyI18n(lang) {
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (dict[key] !== undefined) el.setAttribute("data-title", dict[key]);
  });
  document.querySelectorAll("[data-i18n-cap]").forEach(el => {
    const key = el.getAttribute("data-i18n-cap");
    if (dict[key] !== undefined) el.setAttribute("data-cap", dict[key]);
  });
  document.documentElement.lang = lang;
}
