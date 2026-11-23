// Legal pages of jarvquant.com: the documents in force, the cancellation button (§ 312k BGB), the withdrawal
// function (§ 356a BGB) and the confirmation link for the account holder.
//
// The texts are never in this repository: every document comes from the API (only versions in force are served),
// so the operator's address is not part of the website's files. The forms need no login and no account.
// Only on a developer's own machine the local backend answers; never chosen by a parameter in the address.
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = LOCAL ? "http://127.0.0.1:8000" : "https://jarvquant-api.onrender.com";
const TIMEOUT_MS = 90000;            // a sleeping server needs up to a minute to answer
// A static copy of the documents in force on another host (backend/tools/legal_copy.py), used when the API is slow or
// does not answer. Empty: none yet. Written by tools/legal_direct.py, together with the links in the pages.
const COPY = "";
const COPY_AFTER_MS = 2500;
const COPY_TIMEOUT_MS = 10000;

const T = {
  de: {
    home: "Zur Startseite",
    other: "English",
    loading: "Wird geladen … (der Server kann beim ersten Aufruf bis zu einer Minute brauchen)",
    not_published: "Dieses Dokument ist noch nicht veröffentlicht.",
    unreachable: "Der Server antwortet gerade nicht. Bitte versuchen Sie es in einer Minute erneut oder nutzen Sie die direkten Links unten auf dieser Seite.",
    copy_note: "Der Hauptserver antwortet gerade nicht; Sie sehen die zuletzt gesicherte geltende Fassung.",
    withheld: "Der Text dieser früheren Fassung wird öffentlich nicht angezeigt.",
    version: "Fassung", valid_from: "gültig seit", older: "Frühere Fassungen", superseded: "nicht mehr in Kraft",
    imprint: "Impressum", privacy: "Datenschutz", terms: "AGB", withdrawal_policy: "Widerrufsbelehrung",
    risk: "Risikohinweise", cancel: "Verträge hier kündigen", withdraw: "Vertrag widerrufen",
    cancel_title: "Verträge hier kündigen",
    cancel_lede: "Hier können Sie ein Abonnement bei JarvQuant kündigen. Sie brauchen dafür kein Login. Sie erhalten sofort eine Bestätigung per E-Mail und können Ihre Erklärung auf dieser Seite speichern.",
    withdraw_title: "Vertrag widerrufen",
    withdraw_lede: "Hier können Sie einen Vertrag mit JarvQuant widerrufen. Einen Grund müssen Sie nicht angeben, und Sie brauchen kein Login. Sie erhalten sofort eine Eingangsbestätigung per E-Mail.",
    type: "Art der Kündigung", ordinary: "Ordentliche Kündigung", extraordinary: "Außerordentliche Kündigung",
    reason: "Grund der außerordentlichen Kündigung",
    name: "Ihr Name", email: "E-Mail-Adresse für die Bestätigung",
    account_email: "E-Mail-Adresse Ihres JarvQuant-Kontos (falls abweichend)",
    contract: "Welcher Vertrag?", contract_part: "Welcher Vertrag oder Vertragsteil?",
    p_operator: "Operator", p_architect: "Architect", p_pantheon: "PANTHEON (Zusatzpaket)", p_founder: "Founder",
    p_all: "Alle meine Verträge", p_unknown: "Weiß ich nicht genau",
    contract_ref: "Vertragsnummer (steht in der Vertragsbestätigung, z. B. JQ-1A2B3C4D5E), falls zur Hand",
    end: "Zu welchem Zeitpunkt soll der Vertrag enden?", end_earliest: "Zum frühestmöglichen Zeitpunkt",
    end_date: "Zu einem bestimmten Datum", message: "Nachricht (freiwillig)",
    submit_cancel: "Jetzt kündigen", submit_withdraw: "Widerruf bestätigen",
    sending: "Wird übermittelt …",
    required: "Bitte füllen Sie dieses Feld aus.",
    invalid: "Bitte prüfen Sie dieses Feld.",
    received_cancel: "Ihre Kündigung ist eingegangen.", received_withdraw: "Ihr Widerruf ist eingegangen.",
    received_note: "Wir haben Ihnen soeben eine Bestätigung an die angegebene E-Mail-Adresse geschickt. Bitte speichern Sie diese Erklärung, zum Beispiel als Datei oder durch Drucken.",
    save: "Als Textdatei speichern", print: "Drucken",
    reference: "Referenz", received_at: "Eingegangen am",
    failed: "Ihre Erklärung konnte nicht übermittelt werden. Bitte versuchen Sie es in einer Minute erneut. Sie können sie auch per E-Mail an JarvQuant@gmail.com senden.",
    confirm_title: "Erklärung bestätigen",
    confirm_ok: "Danke. Ihre Erklärung ist bestätigt und wird jetzt ausgeführt. Sie erhalten eine E-Mail mit dem Ergebnis.",
    confirm_expired: "Dieser Link ist abgelaufen. Ihre Erklärung liegt uns trotzdem vor und wird von uns geprüft.",
    confirm_unknown: "Dieser Link ist nicht gültig.",
    confirm_button: "Ja, diese Erklärung stammt von mir",
  },
  en: {
    home: "Home",
    other: "Deutsch",
    loading: "Loading … (the server may need up to a minute on the first request)",
    not_published: "This document is not published yet.",
    unreachable: "The server is not answering right now. Please try again in a minute or use the direct links at the bottom of this page.",
    copy_note: "The main server is not answering right now; you see the last saved version in force.",
    withheld: "The text of this earlier version is not shown publicly.",
    version: "Version", valid_from: "in force since", older: "Earlier versions", superseded: "no longer in force",
    imprint: "Imprint", privacy: "Privacy", terms: "Terms", withdrawal_policy: "Withdrawal policy",
    risk: "Risk notice", cancel: "Cancel contracts here", withdraw: "Withdraw from contract",
    cancel_title: "Cancel contracts here",
    cancel_lede: "Here you can cancel a JarvQuant subscription. No sign-in is needed. You receive a confirmation by e-mail at once and can save your declaration on this page.",
    withdraw_title: "Withdraw from contract",
    withdraw_lede: "Here you can withdraw from a contract with JarvQuant. You do not need to give a reason, and no sign-in is needed. You receive an acknowledgement of receipt by e-mail at once.",
    type: "Type of cancellation", ordinary: "Ordinary cancellation", extraordinary: "Extraordinary cancellation",
    reason: "Reason for the extraordinary cancellation",
    name: "Your name", email: "E-mail address for the confirmation",
    account_email: "E-mail address of your JarvQuant account (if different)",
    contract: "Which contract?", contract_part: "Which contract or part of the contract?",
    p_operator: "Operator", p_architect: "Architect", p_pantheon: "PANTHEON (add-on)", p_founder: "Founder",
    p_all: "All my contracts", p_unknown: "Not sure",
    contract_ref: "Contract number (in the contract confirmation, e.g. JQ-1A2B3C4D5E), if at hand",
    end: "When should the contract end?", end_earliest: "At the earliest possible time",
    end_date: "On a particular date", message: "Message (optional)",
    submit_cancel: "Cancel now", submit_withdraw: "Confirm withdrawal",
    sending: "Sending …",
    required: "Please fill in this field.",
    invalid: "Please check this field.",
    received_cancel: "Your cancellation has been received.", received_withdraw: "Your withdrawal has been received.",
    received_note: "We have just sent a confirmation to the e-mail address you gave. Please save this declaration, for example as a file or by printing it.",
    save: "Save as text file", print: "Print",
    reference: "Reference", received_at: "Received",
    failed: "Your declaration could not be sent. Please try again in a minute. You can also send it by e-mail to JarvQuant@gmail.com.",
    confirm_title: "Confirm your declaration",
    confirm_ok: "Thank you. Your declaration is confirmed and is now being carried out. You will receive an e-mail with the outcome.",
    confirm_expired: "This link has expired. Your declaration is on record anyway and we will check it.",
    confirm_unknown: "This link is not valid.",
    confirm_button: "Yes, I made this declaration",
  },
};

const PAGES = { imprint: "impressum.html", privacy: "datenschutz.html", terms: "agb.html",
  withdrawal_policy: "widerrufsbelehrung.html", risk: "risikohinweise.html", cancel: "kuendigen.html",
  withdraw: "widerrufen.html" };

function language() {
  const asked = new URLSearchParams(location.search).get("lang");
  if (asked === "en" || asked === "de") return asked;
  return "de";                                   // German pages; English with ?lang=en (the switch at the top)
}
const L = language();
const t = (key) => (T[L] && T[L][key]) || T.de[key] || key;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function pageUrl(page, lang = L) {
  return "/" + PAGES[page] + (lang === "en" ? "?lang=en" : "");
}

async function call(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API + path, { ...options, signal: ctrl.signal });
    let body = null;
    try { body = await response.json(); } catch (e) { body = null; }
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function frame(titleText) {
  document.documentElement.lang = L;
  const root = document.getElementById("legal");
  root.replaceChildren();                        // what stands in the HTML while this script has not run
  const switchTo = L === "de" ? "en" : "de";
  const params = new URLSearchParams(location.search);
  params.set("lang", switchTo);
  root.append(el("nav", { class: "legal-top" },
    el("a", { href: "/", class: "legal-brand", text: "JarvQuant" }),
    el("a", { href: location.pathname + "?" + params.toString(), class: "legal-lang", text: t("other") })));
  const main = el("main", { class: "legal-main" });
  if (titleText) main.append(el("h1", { text: titleText }));
  root.append(main);
  const links = el("nav", { class: "legal-footer", "aria-label": "Legal" });
  for (const page of Object.keys(PAGES)) {
    links.append(el("a", { href: pageUrl(page), class: page === "cancel" || page === "withdraw" ? "strong" : "",
      text: t(page) }));
  }
  root.append(links);
  return main;
}

// ── documents ──────────────────────────────────────────────────────────────

// Only what the server's own renderer makes (backend services/legal/render.py); anything else becomes plain text.
const TAGS = new Set(["H1", "H2", "H3", "P", "BR", "UL", "LI", "A", "STRONG", "HR"]);

function cleaned(markup) {
  const out = document.createDocumentFragment();
  const walk = (from, to) => {
    for (const node of from.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) { to.append(node.textContent); continue; }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (!TAGS.has(node.tagName)) { to.append(node.textContent); continue; }
      const copy = document.createElement(node.tagName);
      if (node.tagName === "A") {
        const href = node.getAttribute("href") || "";
        if (/^(https:\/\/|mailto:|\/(?!\/))/.test(href) || (LOCAL && href.startsWith("http://localhost"))) copy.setAttribute("href", href);
        copy.setAttribute("rel", "noopener");
      }
      walk(node, copy);
      to.append(copy);
    }
  };
  walk(new DOMParser().parseFromString(markup, "text/html").body, out);
  return out;
}

const usable = (answer) => Boolean(answer && answer.status === 200 && answer.body && answer.body.version
  && (answer.body.html || answer.body.details === "withheld"));

async function fromCopy(type) {
  if (!COPY) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), COPY_TIMEOUT_MS);
  try {
    const response = await fetch(`${COPY}/${type}.${L}.json`, { signal: ctrl.signal, credentials: "omit" });
    const body = await response.json();
    return response.status === 200 && body.type === type && body.language === L && body.status === "published" && body.html
      ? { status: 200, body } : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function showDocuments(types) {
  const main = frame(null);
  // One place per document, filled independently: a slow answer for one never holds up the other.
  return Promise.all(types.map((type) => {
    const place = el("section", { class: "legal-part" });
    main.append(place);
    return showDocument(type, place, types.length > 1);
  }));
}

async function showDocument(type, place, several) {
  place.append(el("p", { class: "legal-status", role: "status", text: t("loading") }));
  const wanted = new URLSearchParams(location.search).get("version");
  const path = wanted ? `/legal/documents/${type}/versions/${encodeURIComponent(wanted)}?lang=${L}`
                      : `/legal/documents/${type}?lang=${L}`;
  let shown = null;                              // null | "copy" | "api"
  const api = call(path).catch(() => null);
  const copy = wanted || !COPY ? Promise.resolve(null)
    : Promise.race([api.then((a) => usable(a) ? "enough" : "now"), new Promise((r) => setTimeout(r, COPY_AFTER_MS, "now"))])
        .then((go) => go === "now" ? fromCopy(type) : null)
        .then((c) => { if (c && shown === null) { shown = "copy"; render(type, place, c.body, several, true); } return c; });
  const answer = await api;
  if (usable(answer)) {
    const same = shown === "copy" && place.dataset.version === answer.body.version;
    shown = "api";
    if (same) place.querySelector(".legal-copy-note")?.remove();          // same text: nothing moves under the reader
    else render(type, place, answer.body, several, false);
    await older(type, place);
    return;
  }
  await copy;
  if (shown === null) {
    place.replaceChildren(el("p", { class: "legal-status", role: "status",
      text: t(answer && answer.status === 404 ? "not_published" : "unreachable") }));
  }
}

function render(type, place, doc, several, isCopy) {
  place.replaceChildren();
  place.dataset.version = doc.version;
  if (!several || type === "withdrawal_policy") document.title = `${doc.title} · JarvQuant`;
  if (type === "withdrawal_form") place.append(el("hr", { id: "formular" }));
  const meta = `${t("version")} ${doc.version}` + (doc.valid_from ? ` · ${t("valid_from")} ${doc.valid_from.slice(0, 10)}` : "")
    + (doc.status === "superseded" ? ` · ${t("superseded")}` : "");
  place.append(el("p", { class: "legal-meta", text: meta }));
  if (isCopy) place.append(el("p", { class: "legal-meta legal-copy-note", text: t("copy_note") }));
  if (doc.notice) place.append(el("p", { class: "legal-notice", text: doc.notice }));
  const body = el("article", { class: "legal-doc" });
  if (doc.details === "withheld") body.append(el("p", { text: t("withheld") }));
  else body.append(cleaned(doc.html));
  place.append(body);
}

async function older(type, place) {
  try {
    const versions = await call(`/legal/documents/${type}/versions?lang=${L}`);
    const rows = (versions.body && versions.body.versions) || [];
    if (rows.length > 1) {
      const list = el("ul", { class: "legal-versions" });
      for (const v of rows) {
        const q = new URLSearchParams({ version: v.version });
        if (L === "en") q.set("lang", "en");
        list.append(el("li", {}, el("a", { href: `${location.pathname}?${q}`, text: `${v.version}` }),
          document.createTextNode(v.valid_from ? ` (${v.valid_from.slice(0, 10)})` : "")));
      }
      place.append(el("h2", { text: t("older") }), list);
    }
  } catch (e) { /* the document itself is there */ }
}

// ── the two functions ──────────────────────────────────────────────────────

function field(label, input, hint) {
  const id = input.id;
  return el("div", { class: "legal-field" }, el("label", { for: id, text: label }), input,
    hint ? el("small", { text: hint }) : null);
}

function choice(name, options, checked) {
  const box = el("div", { class: "legal-choice", role: "radiogroup" });
  for (const [value, label] of options) {
    const id = `${name}_${value}`;
    box.append(el("label", { for: id }, el("input", { type: "radio", name, id, value, checked: value === checked }),
      document.createTextNode(" " + label)));
  }
  return box;
}

function productSelect(id) {
  const select = el("select", { id, name: "product" });
  for (const p of ["operator", "architect", "pantheon", "founder", "all", "unknown"]) {
    select.append(el("option", { value: p, text: t("p_" + p) }));
  }
  select.value = "unknown";
  return select;
}

function buildForm(kind) {
  const cancellation = kind === "cancellation";
  const main = frame(t(cancellation ? "cancel_title" : "withdraw_title"));
  main.append(el("p", { class: "legal-lede", text: t(cancellation ? "cancel_lede" : "withdraw_lede") }));
  const form = el("form", { class: "legal-form", novalidate: true });
  if (cancellation) {
    form.append(el("fieldset", {}, el("legend", { text: t("type") }),
      choice("cancellation_type", [["ordinary", t("ordinary")], ["extraordinary", t("extraordinary")]], "ordinary")));
    const reason = el("textarea", { id: "reason", name: "reason", rows: "3", maxlength: "4000" });
    const reasonField = field(t("reason"), reason);
    reasonField.hidden = true;
    form.append(reasonField);
    form.addEventListener("change", () => {
      reasonField.hidden = form.querySelector("input[name=cancellation_type]:checked").value !== "extraordinary";
    });
  }
  form.append(field(t("name"), el("input", { id: "name", name: "name", autocomplete: "name", required: true,
    maxlength: "200" })));
  form.append(field(t(cancellation ? "contract" : "contract_part"), productSelect("product")));
  form.append(field(t("contract_ref"), el("input", { id: "contract_ref", name: "contract_ref", maxlength: "200" })));
  form.append(field(t("account_email"), el("input", { id: "account_email", name: "account_email", type: "email",
    autocomplete: "email", maxlength: "320" })));
  if (cancellation) {
    const date = el("input", { id: "requested_end", name: "requested_end", type: "date" });
    const dateField = field(t("end_date"), date);
    dateField.hidden = true;
    form.append(el("fieldset", {}, el("legend", { text: t("end") }),
      choice("end", [["earliest", t("end_earliest")], ["date", t("end_date")]], "earliest")), dateField);
    form.addEventListener("change", () => {
      dateField.hidden = form.querySelector("input[name=end]:checked").value !== "date";
    });
  }
  form.append(field(t("email"), el("input", { id: "email", name: "email", type: "email", autocomplete: "email",
    required: true, maxlength: "320" })));
  form.append(field(t("message"), el("textarea", { id: "message", name: "message", rows: "3", maxlength: "4000" })));
  // Hidden from people; a robot that fills it in is still confirmed, but nothing runs by itself.
  form.append(el("div", { class: "legal-hp", "aria-hidden": "true" },
    el("input", { name: "hp_field", tabindex: "-1", autocomplete: "off" })));
  const error = el("p", { class: "legal-error", role: "alert" });
  const button = el("button", { type: "submit", class: "legal-submit",
    text: t(cancellation ? "submit_cancel" : "submit_withdraw") });
  form.append(error, button);
  main.append(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const data = new FormData(form);
    const value = (k) => (data.get(k) || "").toString().trim();
    for (const k of ["name", "email"]) {
      if (!value(k)) { error.textContent = `${t("required")} (${t(k)})`; form.elements[k].focus(); return; }
    }
    const payload = { kind, name: value("name"), email: value("email"), language: L,
      account_email: value("account_email") || null, contract_ref: value("contract_ref") || null,
      product: value("product") || "unknown", message: value("message") || null, hp_field: value("hp_field") || null };
    if (cancellation) {
      payload.cancellation_type = value("cancellation_type") || "ordinary";
      payload.reason = payload.cancellation_type === "extraordinary" ? (value("reason") || null) : null;
      payload.requested_end = value("end") === "date" && value("requested_end") ? value("requested_end") : null;
    }
    button.disabled = true;
    button.textContent = t("sending");
    let answer;
    try {
      answer = await call("/legal/declarations", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload) });
    } catch (e) { answer = null; }
    button.disabled = false;
    button.textContent = t(cancellation ? "submit_cancel" : "submit_withdraw");
    if (answer && answer.status === 201 && answer.body) { showReceipt(main, form, answer.body, cancellation); return; }
    if (answer && answer.status === 422 && answer.body && answer.body.field) {
      error.textContent = `${t("invalid")} (${t(answer.body.field) || answer.body.field})`;
      return;
    }
    error.textContent = t("failed");
  });
}

function utc(iso) {
  const when = new Date(iso);
  if (isNaN(when)) return iso;
  return when.toLocaleString(L === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "medium",
    timeZone: "UTC" }) + " (UTC)";
}

function showReceipt(main, form, receipt, cancellation) {
  form.remove();
  main.querySelector(".legal-lede")?.remove();
  const box = el("section", { class: "legal-receipt" },
    el("h2", { text: t(cancellation ? "received_cancel" : "received_withdraw") }),
    el("p", { text: t("received_note") }),
    el("p", { class: "legal-meta", text: `${t("reference")}: ${receipt.reference} · ${t("received_at")}: ${utc(receipt.received_at)}` }),
    el("pre", { class: "legal-statement", text: receipt.statement }));
  const save = el("button", { type: "button", text: t("save") });
  save.addEventListener("click", () => {
    const blob = new Blob([receipt.statement], { type: "text/plain;charset=utf-8" });
    const link = el("a", { href: URL.createObjectURL(blob), download: `JarvQuant-${receipt.reference}.txt` });
    document.body.append(link);
    link.click();
    link.remove();
  });
  const print = el("button", { type: "button", text: t("print") });
  print.addEventListener("click", () => window.print());
  box.append(el("div", { class: "legal-actions" }, save, print));
  main.append(box);
  box.scrollIntoView({ behavior: "smooth" });
}

// ── the account holder confirms a declaration made without login ───────────

function confirmPage() {
  const main = frame(t("confirm_title"));
  const token = new URLSearchParams(location.search).get("t") || "";
  const note = el("p", { class: "legal-status" });
  const button = el("button", { type: "button", class: "legal-submit", text: t("confirm_button") });
  button.addEventListener("click", async () => {
    button.disabled = true;
    let answer;
    try {
      answer = await call("/legal/declarations/confirm", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    } catch (e) { answer = null; }
    if (answer && answer.status === 200) { note.textContent = t("confirm_ok"); button.remove(); return; }
    if (answer && answer.status === 410) { note.textContent = t("confirm_expired"); button.remove(); return; }
    if (answer && answer.status === 404) { note.textContent = t("confirm_unknown"); button.remove(); return; }
    button.disabled = false;
    note.textContent = t("unreachable");
  });
  main.append(button, note);
}

const page = document.getElementById("legal");
if (page.dataset.doc) showDocuments(page.dataset.doc.split(","));
else if (page.dataset.form) buildForm(page.dataset.form);
else if (page.dataset.confirm !== undefined) confirmPage();
