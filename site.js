// Landing page behaviour: language switch, header state, mobile menu.
// Plan/pricing strings come from the shared i18n.js dictionary; everything
// written for this layout lives in SITE below. Motion lives in motion.js.
import { I18N, resolveLang, setLang } from "./i18n.js?v=2";

const SITE = {
  en: {
    "nav.how": "How it works",
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "nav.compare": "Compare",
    "cta.download": "Download for Windows",
    "cta.download_short": "Download",
    "cta.how": "See how it works",
    "cta.discord": "Join the Discord",

    "hero.eyebrow": "Trading simulator for Windows",
    "hero.title": "Find the mistakes that cost you money.",
    "hero.lede": "Practise on real market data with the future hidden. After every session JarvQuant shows you where you keep losing, so you fix it before you trade live.",
    "hero.meta1": "Free plan, no card required",
    "hero.meta2": "Scanned clean on VirusTotal",
    "hero.meta3": "Your trades are stored on your PC",
    "hud.mode": "Replay",
    "hud.bar": "Bar",
    "hud.trades": "Trades",
    "hud.session": "Session",
    "tape.label": "PANTHEON · simulated",

    "loop.title": "Practise a setup until you trust it.",
    "loop.1.k": "Replay",
    "loop.1.t": "Hide the future.",
    "loop.1.d": "Pick a market and a date and move forward one bar at a time. You only see what you would have seen live. 9 years of data included, or bring your own.",
    "loop.2.k": "Execute",
    "loop.2.t": "Trade it like it's real.",
    "loop.2.d": "Market, limit and stop orders with spread, slippage and fees. Turn on prop firm rules when you want the pressure.",
    "loop.3.k": "Review",
    "loop.3.t": "See what costs you money.",
    "loop.3.d": "After every session you see your results in R and the habits behind them, from revenge trades to the session that quietly loses money.",
    "loop.4.k": "Adjust",
    "loop.4.t": "Turn mistakes into rules.",
    "loop.4.d": "Save what you learned as rules, like 3 trades a day or a pause after a loss, then backtest whether your plan still holds.",

    "show.title": "Real screenshots from the app.",
    "show.t1": "Replay",
    "show.t2": "PANTHEON",
    "show.t3": "Session review",
    "show.t4": "Strategy Builder",
    "show.t5": "Grand Archive",
    "show.c1": "Replay: real markets bar by bar or second by second, with indicators on the chart and your stop and target as handles you drag.",
    "show.c2": "PANTHEON: six live synthetic markets with an order book, a depth chart and a liquidity heatmap that keeps an hour of history.",
    "show.c3": "Session review: after every Replay session the numbers in plain words, your equity in R and the habits that make or cost you money.",
    "show.c4": "Strategy Builder: four slots, no code. Your rules read back as one sentence, then a backtest with costs included.",
    "show.c5": "Grand Archive: 300+ playbooks with checked example charts and a button that opens the setup in Replay.",

    "features.title": "One app instead of five tabs and a spreadsheet.",
    "f.replay.t": "Market Replay",
    "f.replay.d": "Step through history one bar at a time without seeing what comes next.",
    "f.journal.t": "Trade Journal",
    "f.journal.d": "Log context, setup and execution next to your real results. Searchable, exports to PDF.",
    "f.autopsy.t": "Trade Autopsy",
    "f.autopsy.d": "Finds overtrading, revenge trades and the sessions that lose you money.",
    "f.builder.t": "Strategy Builder",
    "f.builder.d": "Build a strategy from four slots without code, then backtest it with costs.",
    "f.prop.t": "Prop Firm Simulator",
    "f.prop.d": "Practise under evaluation rules before you pay for the real challenge.",
    "f.archive.t": "Grand Archive",
    "f.archive.d": "300+ playbooks with example charts and checklists. One click opens the setup in Replay.",
    "f.pantheon.t": "PANTHEON Markets",
    "f.pantheon.d": "Synthetic markets that never repeat, including options with live Greeks.",
    "f.vanta.t": "VANTA AI Coach",
    "f.vanta.d": "An AI coach that reads your journal and answers about your actual trades.",
    "f.import.t": "Data Import",
    "f.import.d": "Bring data from MetaTrader 5, TradingView CSV or Parquet files.",

    "stats.1": "years of market data included",
    "stats.2": "strategy playbooks with checklists",
    "stats.3": "synthetic markets that never repeat",
    "stats.4": "days of Elite free to try",
    "pr.1.t": "Local first",
    "pr.1.d": "Replay and your trades run on your PC and keep working offline. Only your account is checked online.",
    "pr.2.t": "Independent",
    "pr.2.d": "No investors, no signals, no lifestyle content.",
    "pr.3.t": "Shaped by traders",
    "pr.3.d": "Ideas and bug reports from the Discord are read by the person who builds the app.",

    "pricing.title": "Start free, upgrade when you need more.",
    "pricing.sub": "No card to start. Paid plans and the 7-day Elite trial are in the app.",
    "pricing.fine": "Before you pay, the app shows you an overview with price, term and cancellation. You have a 14-day right of withdrawal from the conclusion of the contract, also once you use your access. Subscriptions can be cancelled at any time with effect from the end of the billing period.",
    "plan.per_month": "/ month",
    "plan.cta_inapp": "Download and upgrade in-app",
    "plan.cta_trial": "Try Elite free for 7 days",

    "faq.title": "Questions traders ask before installing.",
    "faq.more": "Something else?",
    "faq.discord": "Ask in Discord",
    "faq.1.q": "What is JarvQuant?",
    "faq.1.a": "A desktop trading simulator and training environment for retail traders. You practise stocks, futures, forex and options against replayed historical data and synthetic markets, then review your own behaviour with the journal, Trade Autopsy and the VANTA coach.",
    "faq.2.q": "Is real money involved?",
    "faq.2.a": "No. You trade against historical data replayed bar by bar, or against synthetic markets from the JQIV engine. No orders are routed to a broker and no real money is at risk.",
    "faq.3.q": "Can I practise options trading?",
    "faq.3.a": "Yes. PANTHEON is a synthetic options market with a full chain, live Greeks (delta, gamma, theta, vega), an implied volatility surface and an order book. Practise long calls and puts, covered calls, spreads and straddles without risking capital.",
    "faq.4.q": "How is this different from paper trading with a broker?",
    "faq.4.a": "Broker paper trading runs in real time, so rehearsing a setup means waiting for it to happen again. JarvQuant replays history at any speed, so you can work through hundreds of setups in an afternoon while future bars stay hidden.",
    "faq.5.q": "Can I prepare for a prop firm challenge?",
    "faq.5.a": "Yes. The Prop Firm Simulator reproduces evaluation rules: a profit target, a maximum daily loss, a maximum drawdown and an optional consistency rule, so you learn how you behave under those rules before paying an evaluation fee.",
    "faq.6.q": "Is it free, and is there a trial?",
    "faq.6.a": "The free plan includes bar-by-bar replay, data import and a journal capped at 10 entries, with no card and no time limit. A 7-day Elite trial can be started inside the app and unlocks everything, including PANTHEON and VANTA.",
    "faq.7.q": "Does it work with MetaTrader 5?",
    "faq.7.a": "Yes. The MT5 bridge pulls price history straight from your terminal into Replay, and CSV or Parquet files work too. Your real trades go into the Live journal, where Trade Autopsy reviews them next to your simulated sessions.",
    "faq.8.q": "Which platforms are supported?",
    "faq.8.a": "JarvQuant is a native Windows desktop app with a one-click installer. Every release is published on GitHub and scanned on VirusTotal. The interface is available in English and German.",

    "final.title": "Your next hundred trades can be practice.",
    "final.sub": "Install the free plan and replay your first session in a few minutes.",

    "footer.tag": "The trading simulator and performance lab for serious retail traders.",
    "footer.product": "Product",
    "footer.company": "Company",
    "footer.community": "Community",
    "footer.compare": "Compare platforms",
    "footer.play": "Daily Chart Challenge",
    "footer.releases": "Release notes",
    "footer.partner": "Partner program",
    "footer.imprint": "Imprint",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
    "footer.withdrawal_policy": "Withdrawal policy",
    "footer.risk": "Risk notice",
    "footer.cancel": "Cancel contracts here",
    "footer.withdraw": "Withdraw from contract",
    "footer.disclaimer": "JarvQuant is a simulation and training tool. Nothing on this site or in the app is financial advice. Trading involves substantial risk of loss.",
  },

  de: {
    "nav.how": "So funktioniert's",
    "nav.features": "Funktionen",
    "nav.pricing": "Preise",
    "nav.faq": "FAQ",
    "nav.compare": "Vergleich",
    "cta.download": "Für Windows herunterladen",
    "cta.download_short": "Download",
    "cta.how": "So funktioniert's",
    "cta.discord": "Discord beitreten",

    "hero.eyebrow": "Trading-Simulator für Windows",
    "hero.title": "Finde die Fehler, die dich Geld kosten.",
    "hero.lede": "Übe auf echten Marktdaten, ohne die Zukunft zu sehen. Nach jeder Session zeigt dir JarvQuant, wo du immer wieder verlierst, damit du es abstellst, bevor du live tradest.",
    "hero.meta1": "Gratis-Plan, keine Karte nötig",
    "hero.meta2": "Sauber laut VirusTotal",
    "hero.meta3": "Deine Trades liegen auf deinem PC",
    "hud.mode": "Replay",
    "hud.bar": "Kerze",
    "hud.trades": "Trades",
    "hud.session": "Session",
    "tape.label": "PANTHEON · simuliert",

    "loop.title": "Üb ein Setup, bis du ihm vertraust.",
    "loop.1.k": "Replay",
    "loop.1.t": "Versteck die Zukunft.",
    "loop.1.d": "Wähl Markt und Datum und geh Kerze für Kerze vorwärts. Du siehst nur, was du live gesehen hättest. 9 Jahre Daten inklusive, oder bring deine eigenen mit.",
    "loop.2.k": "Ausführen",
    "loop.2.t": "Trade es, als wäre es echt.",
    "loop.2.d": "Market-, Limit- und Stop-Orders mit Spread, Slippage und Gebühren. Prop-Firm-Regeln schaltest du dazu, wenn du den Druck willst.",
    "loop.3.k": "Auswerten",
    "loop.3.t": "Sieh, was dich Geld kostet.",
    "loop.3.d": "Nach jeder Session siehst du deine Ergebnisse in R und die Gewohnheiten dahinter, vom Revenge-Trade bis zur Session, die still Geld verliert.",
    "loop.4.k": "Anpassen",
    "loop.4.t": "Mach aus Fehlern Regeln.",
    "loop.4.d": "Speicher, was du gelernt hast, als Regeln, etwa 3 Trades pro Tag oder eine Pause nach einem Verlust, und prüf per Backtest, ob dein Plan noch trägt.",

    "show.title": "Echte Screenshots aus der App.",
    "show.t1": "Replay",
    "show.t2": "PANTHEON",
    "show.t3": "Session-Auswertung",
    "show.t4": "Strategy Builder",
    "show.t5": "Grand Archive",
    "show.c1": "Replay: echte Märkte Bar für Bar oder Sekunde für Sekunde, mit Indikatoren im Chart und Stop und Ziel als Griffe, die du ziehst.",
    "show.c2": "PANTHEON: sechs synthetische Live-Märkte mit Orderbuch, Tiefen-Chart und einer Liquiditäts-Heatmap mit einer Stunde Historie.",
    "show.c3": "Session-Auswertung: nach jeder Replay-Session die Zahlen in klaren Worten, deine Equity in R und die Gewohnheiten, die dir Geld bringen oder kosten.",
    "show.c4": "Strategy Builder: vier Felder, kein Code. Deine Regeln als ein Satz, dann ein Backtest mit Kosten.",
    "show.c5": "Grand Archive: über 300 Playbooks mit geprüften Beispielcharts und einem Button, der das Setup direkt in Replay öffnet.",

    "features.title": "Eine App statt fünf Tabs und einer Tabelle.",
    "f.replay.t": "Markt-Replay",
    "f.replay.d": "Geh Kerze für Kerze durch die Vergangenheit, ohne zu sehen, was kommt.",
    "f.journal.t": "Trading-Journal",
    "f.journal.d": "Kontext, Setup und Ausführung neben deinen echten Ergebnissen. Durchsuchbar, Export als PDF.",
    "f.autopsy.t": "Trade Autopsy",
    "f.autopsy.d": "Findet Overtrading, Revenge-Trades und die Sessions, die dich Geld kosten.",
    "f.builder.t": "Strategy Builder",
    "f.builder.d": "Bau eine Strategie aus vier Feldern ohne Code und teste sie mit Kosten.",
    "f.prop.t": "Prop-Firm-Simulator",
    "f.prop.d": "Üb unter Prüfungsregeln, bevor du für die echte Challenge zahlst.",
    "f.archive.t": "Grand Archive",
    "f.archive.d": "Über 300 Playbooks mit Beispielcharts und Checklisten. Ein Klick öffnet das Setup im Replay.",
    "f.pantheon.t": "PANTHEON-Märkte",
    "f.pantheon.d": "Synthetische Märkte, die sich nie wiederholen, auch Optionen mit Live-Greeks.",
    "f.vanta.t": "VANTA KI-Coach",
    "f.vanta.d": "Ein KI-Coach, der dein Journal liest und zu deinen echten Trades antwortet.",
    "f.import.t": "Datenimport",
    "f.import.d": "Daten aus MetaTrader 5, TradingView-CSV oder Parquet-Dateien.",

    "stats.1": "Jahre Marktdaten inklusive",
    "stats.2": "Strategie-Playbooks mit Checklisten",
    "stats.3": "synthetische Märkte, die sich nie wiederholen",
    "stats.4": "Tage Elite gratis testen",
    "pr.1.t": "Lokal zuerst",
    "pr.1.d": "Replay und deine Trades laufen auf deinem PC, auch offline. Online geprüft wird nur dein Konto.",
    "pr.2.t": "Unabhängig",
    "pr.2.d": "Keine Investoren, keine Signale, kein Lifestyle-Content.",
    "pr.3.t": "Von Tradern geprägt",
    "pr.3.d": "Ideen und Bug-Reports aus dem Discord liest der, der die App baut.",

    "pricing.title": "Starte kostenlos und upgrade, wenn du mehr brauchst.",
    "pricing.sub": "Keine Karte zum Start. Bezahlpläne und die 7-tägige Elite-Testphase gibt es in der App.",
    "pricing.fine": "Vor dem Bezahlen zeigt dir die App eine Übersicht mit Preis, Laufzeit und Kündigung. Du hast ein Widerrufsrecht von 14 Tagen ab Vertragsschluss, auch wenn du den Zugang schon nutzt. Abos kannst du jederzeit zum Ende des Abrechnungszeitraums kündigen.",
    "plan.per_month": "/ Monat",
    "plan.cta_inapp": "Herunterladen und in der App upgraden",
    "plan.cta_trial": "Elite 7 Tage gratis testen",

    "faq.title": "Was Trader vor der Installation fragen.",
    "faq.more": "Noch etwas offen?",
    "faq.discord": "Frag im Discord",
    "faq.1.q": "Was ist JarvQuant?",
    "faq.1.a": "Ein Trading-Simulator und Trainingsumfeld für Privattrader auf dem Desktop. Du übst Aktien, Futures, Forex und Optionen auf wiedergegebenen historischen Daten und synthetischen Märkten und wertest dein eigenes Verhalten mit Journal, Trade Autopsy und dem VANTA-Coach aus.",
    "faq.2.q": "Ist echtes Geld im Spiel?",
    "faq.2.a": "Nein. Du tradest gegen historische Daten, die Kerze für Kerze abgespielt werden, oder gegen synthetische Märkte der JQIV-Engine. Es werden keine Orders an einen Broker geschickt und kein echtes Geld riskiert.",
    "faq.3.q": "Kann ich Optionshandel üben?",
    "faq.3.a": "Ja. PANTHEON ist ein synthetischer Optionsmarkt mit kompletter Chain, Live-Greeks (Delta, Gamma, Theta, Vega), einer Implied-Volatility-Surface und einem Orderbuch. Übe Long Calls und Puts, Covered Calls, Spreads und Straddles ohne Kapitalrisiko.",
    "faq.4.q": "Was ist der Unterschied zum Paper Trading beim Broker?",
    "faq.4.a": "Paper Trading beim Broker läuft in Echtzeit. Um ein Setup zu üben, musst du warten, bis es wieder auftritt. JarvQuant spielt die Vergangenheit in beliebigem Tempo ab, so schaffst du hunderte Setups an einem Nachmittag, während zukünftige Kerzen verborgen bleiben.",
    "faq.5.q": "Kann ich mich auf eine Prop-Firm-Challenge vorbereiten?",
    "faq.5.a": "Ja. Der Prop-Firm-Simulator bildet Prüfungsregeln nach: ein Gewinnziel, einen maximalen Tagesverlust, einen maximalen Drawdown und eine optionale Konsistenzregel. So lernst du, wie du dich unter diesen Regeln verhältst, bevor du eine Prüfungsgebühr zahlst.",
    "faq.6.q": "Ist es kostenlos, und gibt es eine Testphase?",
    "faq.6.a": "Der Gratis-Plan enthält Kerze-für-Kerze-Replay, Datenimport und ein Journal mit bis zu 10 Einträgen, ohne Karte und ohne Zeitlimit. Eine 7-tägige Elite-Testphase lässt sich in der App starten und schaltet alles frei, auch PANTHEON und VANTA.",
    "faq.7.q": "Funktioniert es mit MetaTrader 5?",
    "faq.7.a": "Ja. Die MT5-Brücke holt Kursdaten direkt aus deinem Terminal ins Replay, CSV- und Parquet-Dateien gehen auch. Deine echten Trades trägst du ins Live-Journal ein, und Trade Autopsy wertet sie neben deinen simulierten Sessions aus.",
    "faq.8.q": "Welche Plattformen werden unterstützt?",
    "faq.8.a": "JarvQuant ist eine native Windows-Desktop-App mit Ein-Klick-Installer. Jedes Release wird auf GitHub veröffentlicht und bei VirusTotal geprüft. Die Oberfläche gibt es auf Englisch und Deutsch.",

    "final.title": "Deine nächsten hundert Trades können Übung sein.",
    "final.sub": "Installiere den Gratis-Plan und spiel in wenigen Minuten deine erste Session ab.",

    "footer.tag": "Der Trading-Simulator und das Performance-Labor für ernsthafte Privattrader.",
    "footer.product": "Produkt",
    "footer.company": "Unternehmen",
    "footer.community": "Community",
    "footer.compare": "Plattformen vergleichen",
    "footer.play": "Tägliche Chart-Challenge",
    "footer.releases": "Release Notes",
    "footer.partner": "Partnerprogramm",
    "footer.imprint": "Impressum",
    "footer.privacy": "Datenschutz",
    "footer.terms": "AGB",
    "footer.withdrawal_policy": "Widerrufsbelehrung",
    "footer.risk": "Risikohinweise",
    "footer.cancel": "Verträge hier kündigen",
    "footer.withdraw": "Vertrag widerrufen",
    "footer.disclaimer": "JarvQuant ist ein Simulations- und Trainingswerkzeug. Nichts auf dieser Seite oder in der App ist eine Finanzberatung. Trading ist mit erheblichem Verlustrisiko verbunden.",
  },
};

function apply(lang) {
  const dict = { ...(I18N[lang] || I18N.en), ...(SITE[lang] || SITE.en) };
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = dict[el.getAttribute("data-i18n")];
    if (v !== undefined) el.textContent = v;
  });
  document.documentElement.lang = lang;
  legalLinks(lang);
  document.dispatchEvent(new CustomEvent("jq:lang", { detail: lang }));
}

// The legal pages are German; ?lang=en shows the English versions.
function legalLinks(lang) {
  document.querySelectorAll("a[data-legal]").forEach((a) => {
    const url = new URL(a.getAttribute("href"), location.origin);
    if (lang === "de") url.searchParams.delete("lang"); else url.searchParams.set("lang", "en");
    a.setAttribute("href", url.pathname + url.search);
  });
}

const select = document.getElementById("langSelect");
let lang = resolveLang();
if (select) {
  select.value = lang;
  select.addEventListener("change", () => {
    lang = setLang(select.value);
    apply(lang);
  });
}
if (lang !== "en") apply(lang);
else legalLinks(lang);

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const header = document.getElementById("header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const menuBtn = document.getElementById("menuBtn");
menuBtn?.addEventListener("click", () => {
  const open = header.classList.toggle("menu-open");
  menuBtn.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#nav a").forEach((a) =>
  a.addEventListener("click", () => {
    header.classList.remove("menu-open");
    menuBtn?.setAttribute("aria-expanded", "false");
  })
);
