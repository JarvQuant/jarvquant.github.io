export const I18N = {
  en: {
    "nav.memory": "Memory",
    "nav.replay": "Replay",
    "nav.structure": "Structure",
    "nav.edge": "Access",

    "ui.mute": "Muted",
    "ui.unmute": "Audio",

    "threshold.kicker": "THRESHOLD",
    "threshold.title": "Enter the archive.",
    "threshold.sub": "Every market leaves a trace. Precision begins where memory is organized.",
    "threshold.cta": "Enter",
    "threshold.peek": "Peek inside",
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
    "edge.title": "Request access.",
    "edge.sub": "Early builds + release notes. No noise.",
    "edge.cta": "Email to request access",
  },

  de: {
    "nav.memory": "Gedächtnis",
    "nav.replay": "Replay",
    "nav.structure": "Struktur",
    "nav.edge": "Zugang",

    "ui.mute": "Stumm",
    "ui.unmute": "Audio",

    "threshold.kicker": "SCHWELLE",
    "threshold.title": "Betritt das Archiv.",
    "threshold.sub": "Jeder Markt hinterlässt Spuren. Präzision beginnt dort, wo Erinnerung geordnet wird.",
    "threshold.cta": "Eintreten",
    "threshold.peek": "Ein Blick hinein",
    "threshold.micro": "Tipp: Bewege die Maus langsam. Klicke ein Record zum Fokussieren.",

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
    "edge.title": "Zugang anfragen.",
    "edge.sub": "Early Builds + Release Notes. Kein Lärm.",
    "edge.cta": "Email für Zugang",
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

  // keep dropdown in sync if present
  const sel = document.getElementById("langSelect");
  if (sel && sel.value !== lang) sel.value = lang;
}
