/* Phone visitors: JarvQuant is a Windows app, so a "Download" tap on a phone
 * offers to e-mail the download link instead. The e-mail carries the partner
 * from a jarvquant.com/r/<code> link (404.html forwards it as ?ref=partner-<code>)
 * to the PC: registering in the app with the same address attributes the
 * account (backend: services/affiliate.py). Desktop downloads are left alone.
 * Nothing is stored on the device (no consent banner needed).
 */
(function () {
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:8765" : "https://jarvquant-api.onrender.com";

  var isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (matchMedia("(pointer: coarse)").matches && innerWidth < 900);
  if (!isPhone) return;

  var T = {
    en: {
      title: "JarvQuant runs on Windows",
      body: "Get the download link by e-mail and open it on your PC.",
      email: "Your e-mail",
      privacy: "Privacy policy",
      send: "Send me the link",
      sent: "Done! Open the e-mail on your PC and use this same address when you create your account in the app.",
      err: "That didn't work. Please check the address and try again.",
      close: "Close"
    },
    de: {
      title: "JarvQuant läuft auf Windows",
      body: "Hol dir den Download-Link per E-Mail und öffne ihn an deinem PC.",
      email: "Deine E-Mail",
      privacy: "Datenschutz",
      send: "Link schicken",
      sent: "Fertig! Öffne die Mail an deinem PC und nutze genau diese Adresse, wenn du in der App dein Konto anlegst.",
      err: "Das hat nicht geklappt. Bitte prüf die Adresse und versuch es nochmal.",
      close: "Schließen"
    }
  };
  function t(k) {
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    return (T[lang] || T.en)[k];
  }
  function partner() {
    var m = (new URLSearchParams(location.search).get("ref") || "").match(/^partner-([a-z0-9_-]{3,20})$/i);
    return m ? m[1] : null;
  }

  var css = document.createElement("style");
  css.textContent =
    ".jqm{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;" +
    "background:rgba(4,6,10,.72);backdrop-filter:blur(6px)}" +
    ".jqm-card{width:100%;max-width:440px;margin:12px;background:#0f1217;border:1px solid #262c36;" +
    "border-radius:16px;padding:22px 20px 18px;color:#e8ebf0;font-family:var(--font,system-ui,sans-serif);" +
    "box-shadow:0 30px 80px rgba(0,0,0,.6)}" +
    ".jqm h3{margin:0 0 6px;font-size:19px}.jqm p{margin:0 0 14px;color:#b3b9c5;font-size:14px;line-height:1.45}" +
    ".jqm input[type=email]{width:100%;box-sizing:border-box;height:46px;border-radius:10px;border:1px solid #262c36;" +
    "background:#08090c;color:#e8ebf0;font-size:16px;padding:0 14px;outline:none}" +
    ".jqm input[type=email]:focus{border-color:#33c6e3}" +
    ".jqm .pp{display:block;margin-top:10px;color:#858e9e;font-size:12px;text-align:center}" +
    ".jqm button{width:100%;height:46px;margin-top:12px;border:0;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer}" +
    ".jqm .go{background:#33c6e3;color:#04141a}.jqm .x{background:transparent;color:#858e9e;margin-top:6px}" +
    ".jqm .msg{margin-top:12px;font-size:14px;line-height:1.45}.jqm .ok{color:#22c39a}.jqm .bad{color:#f0616d}";
  document.head.appendChild(css);

  function open() {
    var wrap = document.createElement("div");
    wrap.className = "jqm";
    wrap.innerHTML =
      '<form class="jqm-card" novalidate>' +
      "<h3></h3><p></p>" +
      '<input type="email" required autocomplete="email" inputmode="email">' +
      '<button class="go" type="submit"></button>' +
      '<div class="msg" hidden></div>' +
      '<button class="x" type="button"></button>' +
      '<a class="pp" href="/datenschutz/" target="_blank"></a>' +
      "</form>";
    var f = wrap.querySelector("form");
    f.querySelector("h3").textContent = t("title");
    f.querySelector("p").textContent = t("body");
    var email = f.querySelector("input[type=email]");
    email.placeholder = t("email");
    f.querySelector(".pp").textContent = t("privacy");
    var go = f.querySelector(".go");
    go.textContent = t("send");
    f.querySelector(".x").textContent = t("close");
    var msg = f.querySelector(".msg");

    function close() { wrap.remove(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    f.querySelector(".x").addEventListener("click", close);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var addr = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { show(t("err"), "bad"); return; }
      go.disabled = true;
      fetch(API + "/partner/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, code: partner() })
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        show(t("sent"), "ok");
        go.hidden = true; email.disabled = true;
      }).catch(function () { show(t("err"), "bad"); go.disabled = false; });
    });
    function show(text, cls) { msg.hidden = false; msg.className = "msg " + cls; msg.textContent = text; }

    document.body.appendChild(wrap);
    setTimeout(function () { email.focus(); }, 50);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="JarvQuant-Setup.exe"]');
    if (!a) return;
    e.preventDefault();
    open();
  }, true);
})();
