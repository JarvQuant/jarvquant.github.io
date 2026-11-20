// Partner area of jarvquant.com: programme page, sign-up, confirmation, login, password reset, dashboard,
// invitation for earlier partners and the old code-and-PIN statistics form.
//
// Rules this file keeps (tools/site_check.py checks the ones a script can check):
//  - Every value from the API goes into the page as text (textContent / createTextNode), never as HTML.
//  - The API base is the production API; only on a developer's own machine the local backend answers. No parameter
//    in the address switches it.
//  - The session token lives in memory and sessionStorage only (gone with the tab); nothing is kept beyond the tab.
//  - Tokens from mails travel in the address's #fragment, are read once, removed from the address and POSTed.
//    A code or PIN never travels in a query string.
//  - No counting, no beacon, no third-party script, no click tracking, no referral link: the only way a customer is
//    attributed is by entering the partner's code when registering in the app.
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = LOCAL ? "http://127.0.0.1:8000" : "https://jarvquant-api.onrender.com";
const TIMEOUT_MS = 90000;               // a sleeping server needs up to a minute to answer
const KEY = "jq_partner_session";
const PRODUCTS = { pro: "Operator", elite: "Architect", options_sim: "PANTHEON add-on", founder: "Founder" };
const KINDS = { initial: "first payment", renewal: "renewal", proration: "paid upgrade", one_time: "one-time purchase", other: "other invoice" };
const STATES = { payable: "payable", holding_period: "in the holding period", in_payout: "in a payout",
  paid_out: "paid out", taken_back: "taken back", waiting: "waiting" };
const WAY = { transfer_to_your_stripe_account: "transfer to your Stripe account", by_hand: "paid by us outside Stripe" };
const CLOSED = { programme_off: "The partner programme is not open for sign-up yet.",
  tier_model_not_in_force: "The commission tier model is not in force yet.",
  partner_terms_not_published: "The partner terms are not published yet." };
const BLOCKERS = { payout_running: "A payout is still running.", balance_open: "A commission balance is still open.",
  old_commissions_unpaid: "Earlier commissions are not paid yet." };

// ── helpers ────────────────────────────────────────────────────────────────

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids) if (kid) node.append(kid);
  return node;
}
const $ = (id) => document.getElementById(id);
const pct = (bp) => (bp === null || bp === undefined ? "–" : `${+(bp / 100).toFixed(2)} %`);
const day = (iso) => (iso ? String(iso).slice(0, 10) : "");
const month = (m) => (m === "unknown" || !m ? "unknown" : m);
let CURRENCY = "EUR";
function money(cents) {
  const n = Number(cents || 0) / 100;
  try { return n.toLocaleString("en-IE", { style: "currency", currency: CURRENCY }); }
  catch (e) { return n.toFixed(2) + " " + CURRENCY; }
}

let memory = null;
const session = {
  get() {
    let s = memory;
    if (!s) { try { s = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { s = null; } }
    if (s && s.expires_at && Date.parse(s.expires_at) < Date.now()) { this.clear(); return null; }
    return s;
  },
  set(s) { memory = s; try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* memory only */ } },
  clear() { memory = null; try { sessionStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } },
};

async function call(path, { method = "GET", body, auth = false, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const s = session.get();
    if (!s) return { status: 401, body: null, local401: true };
    headers.Authorization = "Bearer " + s.access_token;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API + path, { method, headers, signal: ctrl.signal, body: body === undefined ? undefined : JSON.stringify(body) });
    if (raw && res.ok) return { status: res.status, blob: await res.blob() };
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { status: res.status, body: data };
  } catch (e) {
    return { status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

// One calm sentence for every answer the API can give (closed programme, refused login, switched-off route ...).
function explain(res, fallback = "This did not work. Please try again.") {
  const b = res.body || {};
  if (res.status === 0) return "The server does not answer right now. It may need a minute to wake up: please try again shortly.";
  if (res.status === 429) return "Too many attempts. Please wait a little and try again.";
  if (res.status >= 500) return "The partner service is temporarily not available. Please try again later.";
  if (typeof b.detail === "string" && b.detail) return b.detail;
  if (Array.isArray(b.detail)) return "Please check your entries (e-mail address, password length, country code).";
  if ([403, 404, 405, 410].includes(res.status)) return "This function is not available at the moment.";
  return fallback;
}

function nav() {
  const s = session.get();
  const links = [["/partner/", "Programme"], s ? ["/partner/dashboard.html", "Dashboard"] : ["/partner/login.html", "Sign in"]];
  return el("div", { class: "top" }, el("a", { class: "logo", href: "/" }, el("img", { src: "/assets/favicon.png", alt: "" }), el("span", { text: "JarvQuant" })),
    el("nav", {}, ...links.map(([h, t]) => el("a", { href: h, text: t }))));
}
function strip() { return el("div", { class: "strip", id: "strip", role: "status" }); }
function say(msg, kind = "err") { const s = $("strip"); if (s) { s.className = "strip " + kind; s.textContent = msg; } }
function foot() {
  return el("p", { class: "note" }, document.createTextNode("Questions? Write to the contact on the "), el("a", { href: "/impressum.html?lang=en", text: "Imprint" }),
    document.createTextNode(" · "), el("a", { href: "/datenschutz.html?lang=en", text: "Privacy" }));
}
function mount(...cards) {
  const root = $("app");
  root.className = "shell" + (document.body.dataset.wide ? " wide" : "");
  root.replaceChildren(nav(), ...cards, foot());
}
function field(id, label, type = "text", extra = {}) {
  return el("div", { class: "field" }, el("label", { for: id, text: label }), el("input", { id, type, ...extra }));
}
function row(label, value, cls) {
  return el("div", { class: "stat" }, el("div", { class: "l", text: label }), el("div", { class: "v " + (cls || ""), text: String(value) }));
}
function table(head, rows) {
  const t = el("table", {}, el("thead", {}, el("tr", {}, ...head.map((h) => el("th", { text: h })))));
  const body = el("tbody");
  for (const r of rows) body.append(el("tr", {}, ...r.map((c) => el("td", { text: String(c ?? "") }))));
  t.append(body);
  return el("div", { class: "tablewrap" }, t);
}
function fragment(name) {            // "#verify=TOKEN": read once, then removed from the address
  const m = new RegExp("(?:^|&)" + name + "=([^&]+)").exec(location.hash.slice(1));
  if (m) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ } }
  return m ? decodeURIComponent(m[1]) : "";
}
async function submitting(button, work) {
  button.disabled = true;
  try { await work(); } finally { button.disabled = false; }
}
function termsOf(program, lang) { return (program.partner_terms || []).find((t) => t.language === lang) || null; }
function termsLink(text) { return el("a", { href: "/partner/terms.html", text, target: "_blank", rel: "noopener" }); }

// ── programme page ─────────────────────────────────────────────────────────

async function pageProgramme() {
  // Links in the mails land here with a #fragment: send them to the page that handles them (the token stays in the fragment).
  const h = location.hash.slice(1);
  const goto = { verify: "verify.html", reset: "reset.html", invite: "invitation.html" };
  for (const k of Object.keys(goto)) if (h.startsWith(k + "=")) return location.replace("/partner/" + goto[k] + "#" + h);
  if (h === "login") return location.replace("/partner/login.html");
  if (h.startsWith("connect-")) return location.replace("/partner/dashboard.html#" + h);

  const card = el("div", { class: "card" }, el("h1", { text: "Partner programme" }),
    el("p", { class: "sub", text: "Partners recommend JarvQuant with their own partner code. A new customer who enters the code when creating an account in the app is linked to that partner; a link or a click alone attributes nobody." }),
    el("ul", { class: "how" },
      el("li", { text: "Your dashboard shows how many customers registered with your code and how many of them are qualified." }),
      el("li", { text: "It shows your tier and current commission rate, the commission booked, what is payable and what was transferred to your Stripe account." }),
      el("li", { text: "Commission depends on what customers who entered your code actually pay. There is no guaranteed income." })));
  const terms = el("div", { class: "card", id: "model" }, el("h2", { text: "Commission and payouts" }), el("p", { class: "dim", text: "Loading the current terms … (the server can take up to a minute on the first call)" }));
  const entry = el("div", { class: "card", id: "entry" });
  const privacy = el("div", { class: "card" }, el("h2", { text: "Your data as a partner" }),
    el("p", { class: "dim", text: "For a partner account we keep your name, e-mail address, country, a password hash, your partner code, the commission bookings and payouts, and your acceptance of the partner terms. You never see who a customer is, and customers do not see you. In your dashboard you can download a copy of your data and ask for your account to be closed; some records are kept as the law and your agreement require. The partner pages set no cookies and count no visits." }));
  mount(card, terms, entry, privacy,
    el("div", { class: "card" }, el("h2", { text: "Already a partner?" }), el("div", { class: "links" },
      el("a", { class: "btn main", href: "/partner/login.html", text: "Sign in" }),
      el("a", { class: "btn", href: "/partner/stats.html", text: "Old code and PIN statistics" }))));
  const res = await call("/partner/program");
  if (res.status !== 200 || !res.body) { terms.replaceChildren(el("h2", { text: "Commission and payouts" }), el("p", { class: "sub", text: explain(res, "The programme details cannot be loaded right now. Please try again later.") })); return; }
  const p = res.body;
  CURRENCY = p.currency || "EUR";
  const kids = [el("h2", { text: "Commission and payouts" })];
  const r = p.rules_for_new_partners;
  if (p.tier_model_in_force && r) {
    kids.push(el("p", { class: "sub", text: "The rate depends on how many qualified customers you have brought. Rates for new partners:" }));
    kids.push(table(["Qualified customers", "Tier", "Commission rate"], r.tiers.map((t) => [`from ${t.from_customers}`, t.tier || "", pct(t.rate_bp)])));
    const prods = (r.products || []).map((x) => x.name).join(", ");
    const kinds = (r.payment_kinds || []).map((x) => x.name).join(", ");
    kids.push(el("p", { class: "dim", text: `Calculated on ${r.base_means || r.base}${r.first_payment_only ? ", on a customer's first payment only" : ""}. Products: ${prods || "–"}. Payments: ${kinds || "–"}.` }));
  } else {
    kids.push(el("p", { class: "sub", text: p.note || "The tier model is not in force yet." }));
    if (p.scheduled) kids.push(el("p", { class: "dim", text: `It is planned to start on ${day(p.scheduled.starts_at)}.` }));
  }
  kids.push(el("p", { class: "dim", text: `Commission is payable after a holding period of ${p.hold_days} days; a payout is made from ${money(p.minimum_payout_cents)}. Payouts are transferred to your own Stripe account; when Stripe pays them out to your bank is up to your Stripe account's settings.` }));
  if (!p.payouts_switched_on) kids.push(el("p", { class: "dim", text: "Payouts are not switched on yet." }));
  if ((p.partner_terms || []).length) kids.push(el("p", { class: "dim" }, document.createTextNode("Partner terms: "), termsLink("read the current terms")));
  terms.replaceChildren(...kids);
  if (p.signup_open) {
    entry.replaceChildren(el("h2", { text: "Become a partner" }), el("p", { class: "dim", text: "Sign-up takes a name, an e-mail address, the code you want and a password. We confirm the address by mail." }),
      el("div", { class: "links" }, el("a", { class: "btn main", href: "/partner/signup.html", text: "Sign up as a partner" })));
  } else {
    const why = (p.signup_closed_because || []).map((c) => CLOSED[c]).filter(Boolean);
    entry.replaceChildren(el("h2", { text: "Become a partner" }), el("p", { class: "sub", text: "Sign-up is not open yet." }),
      ...why.map((w) => el("p", { class: "dim", text: w })));
  }
}

// ── sign-up ────────────────────────────────────────────────────────────────

async function pageSignup() {
  const card = el("div", { class: "card" }, el("h1", { text: "Partner sign-up" }), el("p", { class: "dim", text: "Loading …" }), strip());
  mount(card);
  const res = await call("/partner/program");
  if (res.status !== 200 || !res.body) { card.replaceChildren(el("h1", { text: "Partner sign-up" }), el("p", { class: "sub", text: explain(res) })); return; }
  const p = res.body;
  if (!p.signup_open) {
    card.replaceChildren(el("h1", { text: "Partner sign-up" }), el("p", { class: "sub", text: "Sign-up is not open yet." }),
      ...(p.signup_closed_because || []).map((c) => CLOSED[c]).filter(Boolean).map((w) => el("p", { class: "dim", text: w })),
      el("div", { class: "links" }, el("a", { class: "btn", href: "/partner/", text: "Back to the programme" })));
    return;
  }
  const langs = (p.signup_languages || []).filter((l) => termsOf(p, l));
  const select = el("select", { id: "lang" }, ...langs.map((l) => el("option", { value: l, text: l === "de" ? "Deutsch" : "English" })));
  const accept = el("input", { id: "accept", type: "checkbox" });
  const form = el("form", { novalidate: true },
    field("name", "Name", "text", { maxlength: 200, autocomplete: "name" }),
    field("email", "E-mail address", "email", { maxlength: 254, autocomplete: "email" }),
    field("code", "Your partner code (3 to 20 letters, digits, - or _)", "text", { maxlength: 20, autocomplete: "off", spellcheck: "false" }),
    field("password", "Password (at least 8 characters)", "password", { maxlength: 72, autocomplete: "new-password" }),
    field("country", "Country (two-letter code, e.g. DE)", "text", { maxlength: 2, autocomplete: "country", spellcheck: "false" }),
    el("div", { class: "field" }, el("label", { for: "lang", text: "Language of the partner terms" }), select),
    el("label", { class: "check" }, accept, el("span", {}, document.createTextNode("I have read and accept the "), termsLink("partner terms"), document.createTextNode("."))),
    el("button", { class: "primary", type: "submit", id: "go", text: "Sign up" }));
  card.replaceChildren(el("h1", { text: "Partner sign-up" }), el("p", { class: "sub", text: "We send a link to confirm your address. Your account exists once you have opened it and entered your password again." }), form, strip());
  $("code").style.textTransform = "uppercase";
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lang = select.value;
    const terms = termsOf(p, lang);
    if (!terms) return say("The partner terms are not published in this language.");
    if (!accept.checked) return say("Please accept the partner terms to sign up.");
    await submitting($("go"), async () => {
      const r = await call("/partner/signup", { method: "POST", body: {
        name: $("name").value, email: $("email").value.trim(), code: $("code").value.trim().toUpperCase(), password: $("password").value,
        country: $("country").value.trim().toUpperCase(), language: lang, terms_version: terms.version, accept_terms: true } });
      if (r.status === 202) { form.remove(); say((r.body && r.body.message) || "Please check your inbox.", "ok"); }
      else say(explain(r));
    });
  });
}

// ── e-mail confirmation, password reset, invitation (token from the fragment) ──

function tokenPage(title, intro, name, build) {
  const token = fragment(name);
  const card = el("div", { class: "card" }, el("h1", { text: title }), strip());
  if (!token) { card.insertBefore(el("p", { class: "sub", text: "This page opens from the link in your mail. The link is missing or incomplete: please open it again from the mail, or ask for a new one." }), $("strip") || card.lastChild); mount(card); return; }
  mount(card);
  build(card, token, intro);
}

function pageVerify() {
  tokenPage("Confirm your address", "", "verify", (card, token) => {
    const form = el("form", { novalidate: true }, el("p", { class: "sub", text: "Enter the password you chose at sign-up to finish your partner account." }),
      field("password", "Password", "password", { maxlength: 72, autocomplete: "current-password" }), el("button", { class: "primary", type: "submit", id: "go", text: "Confirm" }));
    card.insertBefore(form, $("strip"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitting($("go"), async () => {
        const r = await call("/partner/verify", { method: "POST", body: { token, password: $("password").value } });
        if (r.status === 200) { form.replaceChildren(el("p", { class: "sub", text: (r.body && r.body.message) || "Your partner account is ready." }),
          el("p", { class: "sub" }, document.createTextNode("Your partner code: "), el("span", { class: "code", text: (r.body && r.body.code) || "" })),
          el("div", { class: "links" }, el("a", { class: "btn main", href: "/partner/login.html", text: "Sign in" }))); say("Confirmed.", "ok"); }
        else say(explain(r));
      });
    });
  });
}

function pageReset() {
  tokenPage("Set a new password", "", "reset", (card, token) => {
    const form = el("form", { novalidate: true }, field("password", "New password (at least 8 characters)", "password", { maxlength: 72, autocomplete: "new-password" }),
      el("button", { class: "primary", type: "submit", id: "go", text: "Set password" }));
    card.insertBefore(form, $("strip"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitting($("go"), async () => {
        const r = await call("/partner/password/reset", { method: "POST", body: { token, new_password: $("password").value } });
        if (r.status === 200) { form.replaceChildren(el("p", { class: "sub", text: (r.body && r.body.message) || "Your password is set." }), el("div", { class: "links" }, el("a", { class: "btn main", href: "/partner/login.html", text: "Sign in" }))); }
        else say(explain(r));
      });
    });
  });
}

async function pageInvitation() {
  const token = fragment("invite");
  const card = el("div", { class: "card" }, el("h1", { text: "Set up your partner account" }), strip());
  mount(card);
  if (!token) { card.insertBefore(el("p", { class: "sub", text: "This page opens from the invitation link in your mail. The link is missing or incomplete." }), $("strip")); return; }
  const res = await call("/partner/program");
  if (res.status !== 200 || !res.body) { say(explain(res)); return; }
  const p = res.body;
  const langs = (p.signup_languages && p.signup_languages.length ? p.signup_languages : (p.partner_terms || []).map((t) => t.language)).filter((l) => termsOf(p, l));
  if (!langs.length) { card.insertBefore(el("p", { class: "sub", text: "The partner terms are not published yet. Your invitation link stays valid until it expires: please come back later." }), $("strip")); return; }
  const select = el("select", { id: "lang" }, ...langs.map((l) => el("option", { value: l, text: l === "de" ? "Deutsch" : "English" })));
  const accept = el("input", { id: "accept", type: "checkbox" });
  const form = el("form", { novalidate: true }, el("p", { class: "sub", text: "Choose your own password (not your old PIN) and accept the partner terms. Your existing agreement does not change here." }),
    field("password", "Password (at least 8 characters)", "password", { maxlength: 72, autocomplete: "new-password" }),
    el("div", { class: "field" }, el("label", { for: "lang", text: "Language of the partner terms" }), select),
    el("label", { class: "check" }, accept, el("span", {}, document.createTextNode("I have read and accept the "), termsLink("partner terms"), document.createTextNode("."))),
    el("button", { class: "primary", type: "submit", id: "go", text: "Create my account" }));
  card.insertBefore(form, $("strip"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const terms = termsOf(p, select.value);
    if (!accept.checked) return say("Please accept the partner terms to set up the account.");
    await submitting($("go"), async () => {
      const r = await call("/partner/invitation/accept", { method: "POST", body: { token, password: $("password").value, language: select.value, terms_version: terms.version, accept_terms: true } });
      if (r.status === 200) form.replaceChildren(el("p", { class: "sub", text: (r.body && r.body.message) || "Your partner account is ready." }),
        el("p", { class: "sub" }, document.createTextNode("Your partner code: "), el("span", { class: "code", text: (r.body && r.body.code) || "" })),
        el("div", { class: "links" }, el("a", { class: "btn main", href: "/partner/login.html", text: "Sign in" })));
      else say(explain(r));
    });
  });
}

// ── login, forgot password ─────────────────────────────────────────────────

function pageLogin() {
  if (session.get()) return location.replace("/partner/dashboard.html");
  const form = el("form", { novalidate: true }, field("email", "E-mail address", "email", { autocomplete: "email", maxlength: 254 }),
    field("password", "Password", "password", { autocomplete: "current-password", maxlength: 72 }),
    el("button", { class: "primary", type: "submit", id: "go", text: "Sign in" }), strip());
  mount(el("div", { class: "card" }, el("h1", { text: "Partner sign-in" }), el("p", { class: "dim", text: "With your e-mail address and password. Your partner code and an old PIN do not work here." }), form,
    el("div", { class: "links" }, el("a", { href: "/partner/forgot.html", text: "Forgot your password?" }), el("a", { href: "/partner/", text: "About the programme" }))));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!$("email").value.trim() || !$("password").value) return say("Please enter your e-mail address and password.");
    await submitting($("go"), async () => {
      const r = await call("/partner/login", { method: "POST", body: { email: $("email").value.trim(), password: $("password").value } });
      if (r.status === 200 && r.body && r.body.access_token) { session.set(r.body); location.assign("/partner/dashboard.html"); }
      else say(explain(r, "Sign-in did not work. Please check your e-mail address and password."));
    });
  });
}

function pageForgot() {
  const form = el("form", { novalidate: true }, field("email", "E-mail address", "email", { autocomplete: "email", maxlength: 254 }),
    el("button", { class: "primary", type: "submit", id: "go", text: "Send reset link" }), strip());
  mount(el("div", { class: "card" }, el("h1", { text: "Reset your password" }), form, el("div", { class: "links" }, el("a", { href: "/partner/login.html", text: "Back to sign-in" }))));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!$("email").value.trim()) return say("Please enter your e-mail address.");
    await submitting($("go"), async () => {
      const r = await call("/partner/password/forgot", { method: "POST", body: { email: $("email").value.trim() } });
      if (r.status === 202) say((r.body && r.body.message) || "If this address has a partner account, we sent a reset link.", "ok");
      else say(explain(r));
    });
  });
}

// ── dashboard ──────────────────────────────────────────────────────────────

function bounce() { session.clear(); location.replace("/partner/login.html"); }

async function pageDashboard() {
  mount(el("div", { class: "card" }, el("h1", { text: "Partner dashboard" }), el("p", { class: "dim", text: "Loading … (the server can take up to a minute on the first call)" }), strip()));
  const r = await call("/partner/me", { auth: true });
  if (r.status === 401) return bounce();
  if (r.status !== 200 || !r.body) return say(explain(r, "The dashboard cannot be loaded right now."));
  const d = r.body, a = d.amounts, s = d.standing, c = d.connect;
  CURRENCY = a.currency || "EUR";
  const cards = [];
  const hint = location.hash === "#connect-return" ? "You are back from Stripe. The state below is what we last read from your Stripe account." : location.hash === "#connect-refresh" ? "The Stripe link had expired. Press the button again for a new one." : "";
  try { if (hint) history.replaceState(null, "", location.pathname); } catch (e) { /* ignore */ }

  const head = el("div", { class: "card" }, el("div", { class: "linkrow" }, el("h1", { text: d.account.name || d.account.code }),
    el("button", { class: "sec", type: "button", id: "out", text: "Sign out" })), strip(),
    el("p", { class: "dim" }, document.createTextNode("Your partner code "), el("span", { class: "code", text: d.account.code })),
    el("p", { class: "dim", text: d.referral.how }));
  cards.push(head);

  cards.push(el("div", { class: "card" }, el("h2", { text: "Your standing" }), el("div", { class: "grid" },
    row("Qualified customers", s.qualified_customers, "cyan"), s.signups == null ? null : row("Sign-ups with your code", s.signups),
    row("Tier", s.tier === "legacy" ? "Earlier programme" : (s.tier || "–")), row("Current commission rate", pct(s.rate_bp), "green")),
    el("p", { class: "dim", text: `Counted for your tier: ${s.counted_for_tier}.` + (s.next_tier ? ` Next tier "${s.next_tier.tier}" from ${s.next_tier.from_customers} qualified customers: ${pct(s.next_tier.rate_bp)}.` : "") }),
    s.agreement ? el("p", { class: "dim", text: `Individual agreement in force: ${pct(s.agreement.rate_bp)} (${s.agreement.scope || "agreed scope"}${s.agreement.valid_from ? ", from " + day(s.agreement.valid_from) : ""}${s.agreement.valid_to ? " to " + day(s.agreement.valid_to) : ""}).` }) : null));

  const waiting = a.bookings_waiting || {};
  cards.push(el("div", { class: "card" }, el("h2", { text: "Commission" }), el("div", { class: "grid" },
    row("Commission booked", money(a.booked_cents)), row("Taken back", money(a.taken_back_cents)),
    row("Payable now", money(a.payable_now_cents), "green"), row("Transferred to your Stripe account", money(a.transferred_cents), "cyan")),
    el("p", { class: "dim", text: `Booked after taking back: ${money(a.net_cents)}. Paid by us outside Stripe: ${money(a.paid_by_hand_cents)}. Still to be paid by the payout register: ${money(a.register_pending_cents)}.` + (a.legacy_unpaid_cents ? ` Earlier commissions not paid yet: ${money(a.legacy_unpaid_cents)}.` : "") }),
    el("p", { class: "dim", text: `Bookings in the holding period: ${waiting.holding_period || 0}; waiting for another reason: ${waiting.other || 0}. A payout is made from ${money(a.minimum_payout_cents)}` + (a.carried_cents ? `; ${money(a.carried_cents)} carried to a later payout${a.carried_because ? " (" + a.carried_because.replace(/_/g, " ") + ")" : ""}.` : ".") }),
    el("p", { class: "dim", text: "A transfer goes to your own Stripe account." + (a.bank_payout ? ` When it reaches your bank is ${a.bank_payout}.` : "") })));

  const detailed = d.months_detail === "sums";
  cards.push(el("div", { class: "card" }, el("h2", { text: "By month" }),
    d.months.length ? (detailed ? table(["Month", "Booked", "Taken back", "Payable", "Paid out"], d.months.map((m) => [month(m.month), money(m.booked_cents), money(m.taken_back_cents), money(m.payable_cents), money(m.paid_out_cents)]))
      : table(["Month", "Bookings"], d.months.map((m) => [month(m.month), m.bookings]))) : el("p", { class: "dim", text: "No bookings yet." }),
    detailed ? null : el("p", { class: "dim", text: `Amounts and states of single bookings, and corrections, are shown from ${d.bookings.detail_from_qualified_customers} qualified customers on, so that no booking can be traced to one person. The totals above are always complete.` })));

  const rows = d.bookings.rows.map((b) => [month(b.month), PRODUCTS[b.product] || b.product || "", b.entry === "booking" ? (KINDS[b.payment_kind] || "") : (b.entry === "correction" ? "correction" : "taken back"), b.rate_bp === undefined ? "" : pct(b.rate_bp), money(b.amount_cents), b.state ? (STATES[b.state] || b.state) : ""]);
  cards.push(el("div", { class: "card" }, el("h2", { text: "Your bookings" }), !detailed ? el("p", { class: "dim", text: `Single bookings are listed from ${d.bookings.detail_from_qualified_customers} qualified customers on. Until then you see the number of bookings per month above.` })
    : rows.length ? table(["Month", "Product", "Payment", "Rate", "Amount", "State"], rows) : el("p", { class: "dim", text: "No bookings yet." })));

  cards.push(el("div", { class: "card" }, el("h2", { text: "Payouts" }),
    d.payouts.length ? table(["Period", "Amount", "How", "Status"], d.payouts.map((p) => [p.period, money(p.amount_cents), WAY[p.way] || p.way, p.meaning || p.status])) : el("p", { class: "dim", text: "No payouts yet." })));

  const ready = c.ready_for_payouts;
  const connectBtn = el("button", { class: "primary", type: "button", id: "connect", text: c.account ? "Open your Stripe account" : "Set up your payout account at Stripe" });
  const country = !d.account.country ? field("ccountry", "Country of your payout account (two-letter code)", "text", { maxlength: 2, spellcheck: "false" }) : null;
  if (!c.onboarding_open) connectBtn.disabled = true;
  cards.push(el("div", { class: "card" }, el("h2", { text: "Payout account (Stripe)" }),
    el("p", { class: "sub" }, el("span", { class: "state " + (ready ? "ok" : "warn"), text: !c.account ? "Not set up yet" : ready ? "Ready for transfers" : "Set-up not finished" })),
    c.missing ? el("p", { class: "dim", text: "Missing at Stripe: " + String(c.missing).replace(/_/g, " ") }) : null,
    !ready && c.not_possible_because ? el("p", { class: "dim", text: "A payout cannot be made yet: " + String(Array.isArray(c.not_possible_because) ? c.not_possible_because.join(", ") : c.not_possible_because).replace(/_/g, " ") }) : null,
    !c.onboarding_open ? el("p", { class: "dim", text: "Payout accounts cannot be set up at the moment." }) : null,
    hint ? el("p", { class: "dim", text: hint }) : null, country, connectBtn));

  const t = d.terms;
  cards.push(el("div", { class: "card" }, el("h2", { text: "Partner terms" }),
    el("p", { class: "dim", text: t.accepted ? `You accepted version ${t.accepted.version} (${t.accepted.language}) on ${day(t.accepted.accepted_at)}.` + (t.accepted_is_current ? "" : " A newer version has been published.") : "You have not accepted the partner terms yet." }),
    (t.published || []).length ? el("p", { class: "dim" }, termsLink("Read the current partner terms")) : null));

  const n = d.notices || {};
  if ((n.exclusions || []).length || n.tier_model) {
    const bits = [];
    if (n.tier_model) bits.push(el("p", { class: "dim", text: `Tier model ${n.tier_model.in_force_since ? "in force since " + day(n.tier_model.in_force_since) : "planned from " + day(n.tier_model.starts_at)}` + (n.tier_model.applies_to_you_from ? `; it applies to you from ${day(n.tier_model.applies_to_you_from)}.` : "; whether and when it applies to you is not decided yet.") }));
    if ((n.exclusions || []).length) bits.push(el("p", { class: "dim", text: "Customers not counted: " + n.exclusions.map((x) => `${month(x.month)} (${x.reason})`).join(", ") }));
    cards.push(el("div", { class: "card" }, el("h2", { text: "Notices" }), ...bits));
  }

  const langSel = el("select", { id: "clang" }, el("option", { value: "en", text: "English" }), el("option", { value: "de", text: "Deutsch" }));
  cards.push(el("div", { class: "card" }, el("h2", { text: "Your data" }), el("p", { class: "dim", text: "Download a copy of the data we hold about your partner account (a ZIP file, made when you ask and not stored)." }),
    el("div", { class: "field", style: "margin-top:10px" }, langSel), el("button", { class: "sec", type: "button", id: "copy", text: "Download my data" }), el("div", { id: "copyStrip", class: "strip" })));
  cards.push(el("div", { class: "card", id: "closeCard" }, el("h2", { text: "Close your account" }), el("p", { class: "dim", text: "Loading …" })));

  mount(...cards);
  $("out").addEventListener("click", async () => { await call("/partner/logout", { method: "POST", auth: true }); session.clear(); location.assign("/partner/login.html"); });
  if (hint) say(hint, "info");
  connectBtn.addEventListener("click", () => submitting(connectBtn, async () => {
    const body = country ? { country: $("ccountry").value.trim().toUpperCase() } : undefined;
    const res = await call("/partner/connect", { method: "POST", auth: true, body: body || {} });
    if (res.status === 401) return bounce();
    let target = null;
    try { const u = new URL(res.body && res.body.url); if (u.protocol === "https:" && (u.hostname === "stripe.com" || u.hostname.endsWith(".stripe.com"))) target = u.href; } catch (e) { target = null; }
    if (res.status === 200 && target) location.assign(target);
    else say(res.status === 200 ? "Stripe did not return a usable link. Please try again." : explain(res, "The payout account cannot be set up at the moment."));
    window.scrollTo(0, 0);
  }));
  $("copy").addEventListener("click", () => submitting($("copy"), async () => {
    const box = $("copyStrip");
    const res = await call("/partner/privacy/export?lang=" + langSel.value, { auth: true, raw: true });
    if (res.status === 401) return bounce();
    if (res.blob) {
      const link = el("a", { href: URL.createObjectURL(res.blob), download: "jarvquant-partner-data.zip" });
      document.body.append(link); link.click(); link.remove();
      box.className = "strip ok"; box.textContent = "Your data copy was made and downloaded.";
    } else { box.className = "strip err"; box.textContent = explain(res, "The data copy cannot be made right now."); }
  }));
  await closeCard();
}

async function closeCard() {
  const card = $("closeCard");
  const r = await call("/partner/privacy/close", { auth: true });
  if (r.status === 401) return bounce();
  if (r.status !== 200 || !r.body) { card.replaceChildren(el("h2", { text: "Close your account" }), el("p", { class: "dim", text: explain(r) })); return; }
  const c = r.body;
  const kids = [el("h2", { text: "Close your account" })];
  if (c.already_closed) { kids.push(el("p", { class: "dim", text: "Your account is closed." })); card.replaceChildren(...kids); return; }
  kids.push(el("p", { class: "dim", text: "Closing erases your name, e-mail address, password and PIN. Your partner code is deactivated and never given out again." }));
  kids.push(el("p", { class: "dim", text: "We keep, as the law and your agreement require: " + (c.kept || []).join(", ").replace(/_/g, " ") + "." }));
  for (const w of c.warnings || []) if (w.code === "connect_account_stays_at_stripe") kids.push(el("p", { class: "dim", text: "Your Stripe account stays with Stripe; close it there yourself if you want." }));
  if (!c.can_request) {
    kids.push(el("p", { class: "dim", text: "Closing is not possible yet: " + ((c.blockers || []).map((b) => (BLOCKERS[b.code] || b.code) + (b.cents ? ` (${money(b.cents)})` : "")).join(" ") || "please try again later.") }));
    card.replaceChildren(...kids); return;
  }
  const confirm = el("input", { id: "confirm", type: "text", placeholder: "CLOSE", autocomplete: "off" });
  const form = el("form", { novalidate: true }, field("cpass", "Your password", "password", { autocomplete: "current-password", maxlength: 72 }),
    el("div", { class: "field" }, el("label", { for: "confirm", text: 'Type "CLOSE" to confirm' }), confirm),
    el("div", { class: "field" }, el("label", { for: "note", text: "Note (optional)" }), el("textarea", { id: "note", maxlength: 2000 })),
    el("button", { class: "sec", type: "submit", id: "closeGo", text: "Request closing" }), el("div", { id: "closeStrip", class: "strip" }));
  card.replaceChildren(...kids, form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("closeStrip");
    await submitting($("closeGo"), async () => {
      const res = await call("/partner/privacy/close", { method: "POST", auth: true, body: { password: $("cpass").value, confirm: confirm.value, note: $("note").value || null } });
      if (res.status === 401 && res.body && res.body.detail === "Not signed in.") return bounce();
      if (res.status === 201 && res.body) { form.remove(); box.className = "strip ok"; box.textContent = `Your request is recorded (reference ${res.body.reference}). We carry it out by ${day(res.body.due_at)}.`; card.append(box); }
      else if (res.status === 409 && res.body && res.body.code === "closing_blocked") { box.className = "strip err"; box.textContent = "Closing is not possible yet: " + (res.body.blockers || []).map((b) => BLOCKERS[b.code] || b.code).join(" "); }
      else { box.className = "strip err"; box.textContent = explain(res); }
    });
  });
}

// ── the old statistics form (code and PIN, in the body) ────────────────────

function pageStats() {
  const form = el("form", { novalidate: true }, el("div", { class: "field" }, el("label", { for: "codeInput", text: "Partner code" }), el("input", { id: "codeInput", type: "text", maxlength: 32, autocomplete: "off", spellcheck: "false", style: "text-transform:uppercase" })),
    field("pinInput", "PIN", "password", { maxlength: 64, autocomplete: "current-password" }),
    el("button", { class: "primary", type: "submit", id: "go", text: "View stats" }), strip());
  const out = el("div", { class: "card", id: "statsCard", hidden: true });
  mount(el("div", { class: "card" }, el("h1", { text: "Statistics with code and PIN" }), el("p", { class: "dim", text: "For partners who have a PIN. This way stays available for a transition period only: please ask for an invitation to a partner account with its own password." }), form,
    el("div", { class: "links" }, el("a", { href: "/partner/login.html", text: "Sign in to a partner account" }))), out);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("codeInput").value.trim().toUpperCase(), pin = $("pinInput").value.trim();
    if (!code || !pin) return say("Please enter your partner code and your PIN.");
    out.hidden = true;
    await submitting($("go"), async () => {
      const r = await call("/partner/stats", { method: "POST", body: { code, pin } });   // code and PIN in the body, never in the address
      if (r.status === 200 && r.body) { $("strip").className = "strip"; showStats(out, r.body); }
      else if (r.status === 401) say("Invalid code or PIN. Please check and try again.");
      else if (r.status === 410 || r.status === 404 || r.status === 405) say("The statistics with code and PIN are no longer available. Please sign in to your partner account.");
      else say(explain(r));
    });
  });
}

function showStats(out, d) {
  const eurc = (c) => (Number(c || 0) / 100).toLocaleString("en-IE", { style: "currency", currency: "EUR" });
  out.replaceChildren(el("h2", { text: d.name || d.code }), el("p", { class: "dim" }, document.createTextNode("Partner code "), el("span", { class: "code", text: d.code })),
    el("div", { class: "grid" }, row("Sign-ups", d.signups ?? 0, "cyan"), row("Qualified customers", d.qualified_customers ?? d.paid_conversions ?? 0, "green"),
      row("Commission booked (all time)", eurc(d.total_commission_cents), "green"), row("Current commission rate", d.commission_rate_bp === undefined ? "–" : pct(d.commission_rate_bp)),
      row("Booked, not yet transferred", eurc(d.register_pending_cents)), row("Transferred to your Stripe account", eurc(d.transferred_cents), "cyan")),
    el("p", { class: "dim", text: `Paid by us outside Stripe: ${eurc(d.paid_by_hand_cents)}.` + (d.legacy_unpaid_cents ? ` Earlier commissions not paid yet: ${eurc(d.legacy_unpaid_cents)}.` : "") }));
  out.hidden = false;
}

// ── start ──────────────────────────────────────────────────────────────────

const PAGES = { programme: pageProgramme, signup: pageSignup, verify: pageVerify, reset: pageReset, invitation: pageInvitation,
  login: pageLogin, forgot: pageForgot, dashboard: pageDashboard, stats: pageStats };
const run = PAGES[document.body.dataset.page];
if (run) run();
