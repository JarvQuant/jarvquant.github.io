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
    "threshold.micro": "Tip: move your mouse gently. Hover the nodes.",

    "memory.kicker": "MEMORY FIELD",
    "memory.title": "Market decisions don’t disappear.",
    "memory.sub": "Stored imprints. Retrieved patterns. Quiet, repeatable learning.",
    "memory.micro": "Hover a capsule to reveal a fragment.",

    "replay.kicker": "REPLAY CHAMBER",
    "replay.title": "Revisit the moment before hindsight.",
    "replay.sub": "Time as a surface you can move through — not a chart you scroll past.",
    "replay.micro": "(Chapter stub — we’ll build the chamber next.)",

    "structure.kicker": "STRATEGY STRUCTURE",
    "structure.title": "Turn repetition into architecture.",
    "structure.sub": "Rules. Constraints. Risk. Execution — wired into a system you can trust.",
    "structure.micro": "(Chapter stub — we’ll animate logic paths here.)",

    "edge.kicker": "ACCESS POINT",
    "edge.title": "Request access.",
    "edge.sub": "Early builds + release notes. No noise.",
    "edge.cta": "Email to request access",
  },

  // Minimal DE example — shows “translateable into anything”
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
    "threshold.micro": "Tipp: Bewege die Maus langsam. Hover über die Knoten.",

    "memory.kicker": "ERINNERUNGSFELD",
    "memory.title": "Entscheidungen verschwinden nicht.",
    "memory.sub": "Gespeicherte Abdrücke. Wiedergefundene Muster. Ruhiges, wiederholbares Lernen.",
    "memory.micro": "Hover über eine Kapsel, um ein Fragment zu sehen.",

    "replay.kicker": "REPLAY-KAMMER",
    "replay.title": "Zurück in den Moment vor der Gewissheit.",
    "replay.sub": "Zeit als Fläche, durch die du dich bewegst — nicht als Chart, an dem du vorbeiscrollst.",
    "replay.micro": "(Kapitel-Stub — das bauen wir als nächstes.)",

    "structure.kicker": "STRATEGIE-STRUKTUR",
    "structure.title": "Mach Wiederholung zu Architektur.",
    "structure.sub": "Regeln. Constraints. Risiko. Execution — verdrahtet in einem System, dem du vertrauen kannst.",
    "structure.micro": "(Kapitel-Stub — hier animieren wir später Logikpfade.)",

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

  // IMPORTANT: default to EN (do not auto-pick navigator language)
  return "en";
}

export function setLang(lang) {
  const l = (lang || "").trim().toLowerCase();
  if (!I18N[l]) return resolveLang();
  localStorage.setItem("jq_lang", l);

  // keep URL clean but reflect current choice
  const url = new URL(window.location.href);
  url.searchParams.set("lang", l);
  window.history.replaceState({}, "", url.toString());

  return l;
}
