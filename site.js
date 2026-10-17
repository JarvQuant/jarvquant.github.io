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

    "hero.eyebrow": "Market replay · Trade review · Synthetic markets",
    "hero.title": "Trade the past like it's live.",
    "hero.lede": "JarvQuant replays real market data bar by bar with the future hidden. Practise your setups, then let Trade Autopsy show you what your trades are really doing to your account.",
    "hero.meta1": "Free plan, no card required",
    "hero.meta2": "Scanned clean on VirusTotal",
    "hero.meta3": "Your trades stay on your PC",
    "hud.mode": "Replay",
    "hud.bar": "Bar",
    "hud.trades": "Trades",
    "hud.session": "Session",
    "tape.label": "PANTHEON · simulated",

    "loop.kicker": "How it works",
    "loop.title": "Four steps. Repeat until it's boring.",
    "loop.1.k": "Replay",
    "loop.1.t": "Hide the future.",
    "loop.1.d": "Pick a market and a date, then move forward one bar at a time. You see exactly what you would have seen live, nothing more. Up to 9 years of data are included, or bring your own.",
    "loop.2.k": "Execute",
    "loop.2.t": "Trade it like it's real.",
    "loop.2.d": "Market, limit and stop orders with stop loss and take profit, plus spread, slippage and fees. Add prop firm rules when you want the pressure.",
    "loop.3.k": "Review",
    "loop.3.t": "Let the numbers talk.",
    "loop.3.d": "After every session you get the review in plain words: results in R, what you do well and what costs you. Trade Autopsy does the same for your whole history, from revenge trades to the session that quietly loses money.",
    "loop.4.k": "Adjust",
    "loop.4.t": "Turn mistakes into rules.",
    "loop.4.d": "Write what you learned into the Strategy Builder as rules: a maximum of trades per day, a pause after a loss, a daily loss limit. Then backtest whether your plan still holds with them.",

    "show.kicker": "Inside the app",
    "show.title": "Built like a trading terminal. Because it is one.",
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

    "features.kicker": "Everything in the box",
    "features.title": "One app instead of five tabs and a spreadsheet.",
    "f.replay.t": "Market Replay",
    "f.replay.d": "Step through history one bar at a time without seeing what comes next. Indicators on the chart, and a stop and target you drag right on it. Zero hindsight.",
    "f.journal.t": "Trade Journal",
    "f.journal.d": "Structured entries for context, setup, execution and review, linked to your actual results. Searchable, exportable to PDF.",
    "f.autopsy.t": "Trade Autopsy",
    "f.autopsy.d": "Algorithmic review of your history: overtrading, revenge trades, session performance and drawdown streaks.",
    "f.builder.t": "Strategy Builder",
    "f.builder.d": "Four slots, no code: when to enter, only if, how to exit, rules and risk. Your strategy reads back as one sentence, then a backtest with costs shows if it holds.",
    "f.prop.t": "Prop Firm Simulator",
    "f.prop.d": "Profit target, maximum daily loss, maximum drawdown and an optional consistency rule. Find out how you trade under the rules before you pay the evaluation fee.",
    "f.archive.t": "Grand Archive",
    "f.archive.d": "300+ strategy playbooks with checked example charts, most with a checklist and known failure patterns. One click opens a setup in Replay with its indicators.",
    "f.pantheon.t": "PANTHEON Markets",
    "f.pantheon.d": "Synthetic markets that never repeat: options with live Greeks and an IV smile, plus crypto, futures, CFD, spot and forex, each with an order book and a liquidity heatmap.",
    "f.vanta.t": "VANTA AI Coach",
    "f.vanta.d": "A coach that reads your journal and your replay trades. Press Ask VANTA on a review and it answers about exactly those trades.",
    "f.import.t": "Data Import",
    "f.import.d": "Bring your own data and history from MetaTrader 5, TradingView CSV exports or Parquet files.",

    "pr.kicker": "How it's built",
    "pr.title": "A tool, not a course.",
    "stats.1": "years of market data included",
    "stats.2": "strategy playbooks with checklists",
    "stats.3": "synthetic markets that never repeat",
    "stats.4": "languages, English and German",
    "pr.1.t": "Your data stays local",
    "pr.1.d": "Trades, journals and imports live on your machine. They are never uploaded to us.",
    "pr.2.t": "Independent",
    "pr.2.d": "No venture funding, so pricing is set by the product and not by a growth target. No upsells, no signals, no lifestyle content.",
    "pr.3.t": "Shaped by traders",
    "pr.3.d": "Feature requests and bug reports from the Discord go straight into the next release.",

    "pricing.kicker": "Pricing",
    "pricing.title": "Start free. Go deeper when you're ready.",
    "pricing.sub": "No credit card to start. Paid plans and a 7-day Elite trial are available inside the app.",
    "pricing.fine": "All sales are final. You can cancel any subscription at any time to stop future billing, and access stays active until the end of the current billing period.",
    "plan.per_month": "/ month",
    "plan.cta_inapp": "Download and upgrade in-app",
    "plan.cta_trial": "Try Elite free for 7 days",

    "faq.kicker": "FAQ",
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
    "footer.releases": "Release notes",
    "footer.partner": "Partner program",
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

    "hero.eyebrow": "Markt-Replay · Trade-Analyse · Synthetische Märkte",
    "hero.title": "Trade die Vergangenheit, als wäre sie live.",
    "hero.lede": "JarvQuant spielt echte Marktdaten Kerze für Kerze ab, die Zukunft bleibt verborgen. Übe deine Setups und lass dir von Trade Autopsy zeigen, was deine Trades wirklich mit deinem Konto machen.",
    "hero.meta1": "Gratis-Plan, keine Karte nötig",
    "hero.meta2": "Sauber laut VirusTotal",
    "hero.meta3": "Deine Trades bleiben auf deinem PC",
    "hud.mode": "Replay",
    "hud.bar": "Kerze",
    "hud.trades": "Trades",
    "hud.session": "Session",
    "tape.label": "PANTHEON · simuliert",

    "loop.kicker": "So funktioniert's",
    "loop.title": "Vier Schritte. Wiederholen, bis es langweilig wird.",
    "loop.1.k": "Replay",
    "loop.1.t": "Versteck die Zukunft.",
    "loop.1.d": "Wähle einen Markt und ein Datum und geh Kerze für Kerze vorwärts. Du siehst genau das, was du live gesehen hättest, nicht mehr. Bis zu 9 Jahre Daten sind dabei, oder du bringst deine eigenen mit.",
    "loop.2.k": "Ausführen",
    "loop.2.t": "Trade es, als wäre es echt.",
    "loop.2.d": "Market-, Limit- und Stop-Orders mit Stop Loss und Take Profit, dazu Spread, Slippage und Gebühren. Mit Prop-Firm-Regeln, wenn du den Druck willst.",
    "loop.3.k": "Auswerten",
    "loop.3.t": "Lass die Zahlen sprechen.",
    "loop.3.d": "Nach jeder Session bekommst du die Auswertung in klaren Worten: Ergebnisse in R, was du gut machst und was dich Geld kostet. Trade Autopsy macht das für deine ganze Historie, vom Revenge-Trade bis zur Session, die still Geld verliert.",
    "loop.4.k": "Anpassen",
    "loop.4.t": "Mach aus Fehlern Regeln.",
    "loop.4.d": "Schreib, was du gelernt hast, als Regeln in den Strategy Builder: maximale Trades pro Tag, eine Pause nach einem Verlust, ein Tagesverlust-Limit. Dann prüft der Backtest, ob dein Plan damit noch trägt.",

    "show.kicker": "In der App",
    "show.title": "Gebaut wie ein Trading-Terminal. Weil es eins ist.",
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

    "features.kicker": "Alles drin",
    "features.title": "Eine App statt fünf Tabs und einer Tabelle.",
    "f.replay.t": "Markt-Replay",
    "f.replay.d": "Geh Bar für Bar durch die Vergangenheit, ohne zu sehen, was kommt. Indikatoren im Chart, Stop und Ziel ziehst du direkt darin. Kein Rückschaufehler.",
    "f.journal.t": "Trading-Journal",
    "f.journal.d": "Strukturierte Einträge für Kontext, Setup, Ausführung und Review, verknüpft mit deinen echten Ergebnissen. Durchsuchbar und als PDF exportierbar.",
    "f.autopsy.t": "Trade Autopsy",
    "f.autopsy.d": "Algorithmische Auswertung deiner Historie: Overtrading, Revenge-Trades, Performance pro Session und Drawdown-Serien.",
    "f.builder.t": "Strategy Builder",
    "f.builder.d": "Vier Felder, kein Code: wann einsteigen, nur wenn, wie aussteigen, Regeln und Risiko. Deine Strategie als ein Satz, dann zeigt ein Backtest mit Kosten, ob sie trägt.",
    "f.prop.t": "Prop-Firm-Simulator",
    "f.prop.d": "Gewinnziel, maximaler Tagesverlust, maximaler Drawdown und eine optionale Konsistenzregel. Finde heraus, wie du unter diesen Regeln tradest, bevor du die Prüfungsgebühr zahlst.",
    "f.archive.t": "Grand Archive",
    "f.archive.d": "Über 300 Strategie-Playbooks mit geprüften Beispielcharts, die meisten mit Checkliste und bekannten Fehlermustern. Ein Klick öffnet das Setup in Replay mit seinen Indikatoren.",
    "f.pantheon.t": "PANTHEON-Märkte",
    "f.pantheon.d": "Synthetische Märkte, die sich nie wiederholen: Optionen mit Live-Greeks und IV-Smile, dazu Krypto, Futures, CFD, Spot und Forex, jeweils mit Orderbuch und Liquiditäts-Heatmap.",
    "f.vanta.t": "VANTA KI-Coach",
    "f.vanta.d": "Ein Coach, der dein Journal und deine Replay-Trades liest. Drück in einer Auswertung auf Ask VANTA, und er antwortet zu genau diesen Trades.",
    "f.import.t": "Datenimport",
    "f.import.d": "Bring eigene Daten und Historie mit, aus MetaTrader 5, TradingView-CSV-Exporten oder Parquet-Dateien.",

    "pr.kicker": "Wie es gebaut ist",
    "pr.title": "Ein Werkzeug, kein Kurs.",
    "stats.1": "Jahre Marktdaten inklusive",
    "stats.2": "Strategie-Playbooks mit Checklisten",
    "stats.3": "synthetische Märkte, die sich nie wiederholen",
    "stats.4": "Sprachen, Englisch und Deutsch",
    "pr.1.t": "Deine Daten bleiben lokal",
    "pr.1.d": "Trades, Journale und Importe liegen auf deinem Rechner. Sie werden nie zu uns hochgeladen.",
    "pr.2.t": "Unabhängig",
    "pr.2.d": "Kein Risikokapital, also bestimmt das Produkt den Preis und kein Wachstumsziel. Keine Upsells, keine Signale, kein Lifestyle-Content.",
    "pr.3.t": "Von Tradern geprägt",
    "pr.3.d": "Wünsche und Bug-Reports aus dem Discord fließen direkt ins nächste Release.",

    "pricing.kicker": "Preise",
    "pricing.title": "Starte kostenlos. Geh tiefer, wenn du so weit bist.",
    "pricing.sub": "Keine Kreditkarte zum Start. Bezahlpläne und eine 7-tägige Elite-Testphase gibt es direkt in der App.",
    "pricing.fine": "Alle Käufe sind endgültig. Du kannst jedes Abo jederzeit kündigen, um künftige Abbuchungen zu stoppen. Der Zugang bleibt bis zum Ende des laufenden Abrechnungszeitraums aktiv.",
    "plan.per_month": "/ Monat",
    "plan.cta_inapp": "Herunterladen und in der App upgraden",
    "plan.cta_trial": "Elite 7 Tage gratis testen",

    "faq.kicker": "FAQ",
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
    "footer.releases": "Release Notes",
    "footer.partner": "Partnerprogramm",
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
  document.dispatchEvent(new CustomEvent("jq:lang", { detail: lang }));
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
