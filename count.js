// Page counts. OFF until the operator decides.
//
// Counting here means: this script reads the page address (and, for sources, the referrer) in the visitor's browser
// and has the browser send it. § 25 TDDDG ties such access to consent unless it is strictly necessary for the page,
// and reach measurement is not clearly so. The server counts nothing either while its WEB_COUNTS setting is off.
//
// When switched on (here and on the server, together):
//   "pages"              sends the page path, without query or fragment
//   "pages_and_sources"  also the referring site's name (worked out here; the full address never leaves the
//                        browser) or a ?ref= campaign tag
// No cookie, no storage, no ID, ever. The server keeps day counts only.
const MODE = "off";             // "off" | "pages" | "pages_and_sources"
const API = "https://jarvquant-api.onrender.com/v";

function source() {
  try {
    const tag = new URLSearchParams(location.search).get("ref");
    if (tag && /^[a-z0-9_-]{1,32}$/i.test(tag)) return tag.toLowerCase();
    return document.referrer ? new URL(document.referrer).hostname : "";
  } catch (e) {
    return "";
  }
}

export function count(path) {
  if (MODE !== "pages" && MODE !== "pages_and_sources") return;
  try {
    const page = String(path || location.pathname).split("?")[0].split("#")[0];
    const body = JSON.stringify({ path: page, ref: MODE === "pages_and_sources" ? source() : "" });
    if (navigator.sendBeacon) navigator.sendBeacon(API, body);
  } catch (e) {}
}
