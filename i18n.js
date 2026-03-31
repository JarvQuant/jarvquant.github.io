export const I18N = {
  en: {
    "nav.memory": "Memory",
    "nav.replay": "Replay",
    "nav.structure": "Structure",
    "nav.edge": "Access",

    "ui.mute": "Muted",
    "ui.unmute": "Audio",

    "hint.title": "Navigation",
    "hint.body": "Scroll to travel • Click a chapter above • Click records to open",

    "threshold.kicker": "THRESHOLD",
    "threshold.title": "Enter the archive.",
    "threshold.sub": "Every market leaves a trace. Precision begins where memory is organized.",
    "threshold.cta": "Enter",
    "threshold.micro": "Tip: move your mouse gently. Click a record to focus.",

    "memory.kicker": "MEMORY FIELD",
    "memory.title": "Market decisions don’t disappear.",
    "memory.sub": "Stored imprints. Retrieved patterns. Quiet, repeatable learning.",
    "memory.micro": "Scroll to move. Click a record to zoom.",

    "replay.kicker": "REPLAY CHAMBER",
    "replay.title": "Revisit the moment before hindsight.",
    "replay.sub": "Time as a surface you can move through — not a chart you scroll past.",
    "replay.micro": "(Next: timeline sweep + candle traces.)",

    "structure.kicker": "STRATEGY STRUCTURE",
    "structure.title": "Turn repetition into architecture.",
    "structure.sub": "Rules. Constraints. Risk. Execution — wired into a system you can trust.",
    "structure.micro": "(Next: module graph + path tracing.)",

    "edge.kicker": "ACCESS POINT",
    "edge.title": "Follow development.",
    "edge.sub": "Private builds. Public beta starts at v0.5.0 (limited invites).",
    "edge.cta": "Email to request access",
    "edge.micro": "Discord + socials above for drops and short updates.",

    // Mobile positioning copy
    "pos.model.title": "The Model",
    "pos.model.1": "No VC dependency. No external pricing pressure.",
    "pos.model.2": "No 'we monetize your data' — structurally impossible by design.",

    "pos.approach.title": "Approach",
    "pos.approach.1": "Built by a solo developer + an AI agent — no bloated team, no overhead.",
    "pos.approach.2": "Community-first beta: real feedback before public launch.",
    "pos.approach.3": "Course-sellers need you to sell. You're building what they can’t deliver.",

    "pos.angle.title": "Angle",
    "pos.angle.1": "Trading education is broken: courses, Discords, lifestyle content.",
    "pos.angle.2": "JarvQuant gives traders what institutions have had for years.",
    "pos.angle.3": "Faster. Leaner. More honest than what exists right now.",
  },

  de: {
    "nav.memory": "Gedächtnis",
    "nav.replay": "Replay",
    "nav.structure": "Struktur",
    "nav.edge": "Zugang",

    "ui.mute": "Stumm",
    "ui.unmute": "Audio",

    "hint.title": "Navigation",
    "hint.body": "Scroll zum Navigieren • Kapitel oben anklicken • Records öffnen",

    "threshold.kicker": "SCHWELLE",
    "threshold.title": "Betritt das Archiv.",
    "threshold.sub": "Jeder Markt hinterlässt Spuren. Präzision beginnt dort, wo Erinnerung geordnet wird.",
    "threshold.cta": "Eintreten",
    "threshold.micro": "Tipp: Maus langsam bewegen. Klicke ein Record zum Fokussieren.",

    "memory.kicker": "ERINNERUNGSFELD",
    "memory.title": "Entscheidungen verschwinden nicht.",
    "memory.sub": "Gespeicherte Abdrücke. Wiedergefundene Muster. Ruhiges, wiederholbares Lernen.",
    "memory.micro": "Scroll zum Bewegen. Klick auf ein Record zum Reinzoomen.",

    "replay.kicker": "REPLAY-KAMMER",
    "replay.title": "Zurück in den Moment vor der Gewissheit.",
    "replay.sub": "Zeit als Fläche, durch die du dich bewegst — nicht als Chart, an dem du vorbeiscrollst.",
    "replay.micro": "(Als nächstes: Timeline-Sweep + Candle-Traces.)",

    "structure.kicker": "STRATEGIE-STRUKTUR",
    "structure.title": "Mach Wiederholung zu Architektur.",
    "structure.sub": "Regeln. Constraints. Risiko. Execution — verdrahtet in einem System, dem du vertrauen kannst.",
    "structure.micro": "(Als nächstes: Modul-Graph + Path-Tracing.)",

    "edge.kicker": "ZUGANGSPUNKT",
    "edge.title": "Folge der Entwicklung.",
    "edge.sub": "Private Builds. Public Beta ab v0.5.0 (limitierte Invites).",
    "edge.cta": "Email für Zugang",
    "edge.micro": "Discord + Socials oben für Drops und kurze Updates.",

    // Mobile positioning copy
    "pos.model.title": "Das Modell",
    "pos.model.1": "Keine VC-Abhängigkeit. Kein Preisdruck von außen.",
    "pos.model.2": "Kein ‚wir monetarisieren eure Daten‘ — strukturell unmöglich by design.",

    "pos.approach.title": "Der Ansatz",
    "pos.approach.1": "Gebaut von einem Entwickler + AI Agent — kein aufgeblasenes Team, kein Overhead.",
    "pos.approach.2": "Community-first Beta: echtes Feedback vor Public Launch.",
    "pos.approach.3": "Kurs-Verkäufer brauchen dich, um zu verkaufen. Du baust, was sie nie liefern können.",

    "pos.angle.title": "Der Angle",
    "pos.angle.1": "Trading Education ist kaputt: Kurse, Discords, Lifestyle-Content.",
    "pos.angle.2": "JarvQuant gibt Tradern, was Institutionen seit Jahren haben.",
    "pos.angle.3": "Schneller. Schlanker. Ehrlicher als alles, was gerade existiert.",
  }
};

export function resolveLang() {
  const url = new URL(window.location.href);
  const q = (url.searchParams.get("lang") || "").trim().toLowerCase();
  if (q && I18N[q]) return q;

  const stored = (localStorage.getItem("jq_lang") || "").trim().toLowerCase();
  if (stored && I18N[stored]) return stored;

  // default EN
  return "en";
}

export function setLang(lang) {
  const l = (lang || "").trim().toLowerCase();
  if (!I18N[l]) return resolveLang();

  localStorage.setItem("jq_lang", l);

  const url = new URL(window.location.href);
  url.searchParams.set("lang", l);
  window.history.replaceState({}, "", url.toString());

  return l;
}

export function applyI18n(lang) {
  const dict = I18N[lang] || I18N.en;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = dict[key];
    if (typeof val === "string") el.textContent = val;
  });

  const sel = document.getElementById("langSelect");
  if (sel && sel.value !== lang) sel.value = lang;
}
