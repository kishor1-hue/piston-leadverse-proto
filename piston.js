// ---- PISTON screen spec: viewer ----
// Walkthrough (journey rail | Leadverse screen | spec or anatomy), Blueprint (every step's depth as a table),
// Fields (every field on every screen) and What changed (the review notes applied).
// Market (UAE or Australia) and check-in way (by staff, or from the seat QR) apply to every view.
// Deep links: #booked-I1, #walkin-T2, #vtd-O5, #blueprint, #fields, #changes. Prefix au- for Australia
// (#au-booked-I1) and add -staff or -qr when the check-in way differs from the market default (#booked-I1-qr).

document.body.classList.add("pv");

const VS = { track: "booked", step: "P1", view: "walk", tab: "spec", market: "ae", mode: "staff" };
const $ = (sel) => document.querySelector(sel);
const icon = (n) => `<i data-lucide="${n}" class="icon"></i>`;
function drawIcons() { if (window.lucide) lucide.createIcons(); }

const DEVICE_META = {
  desktop: { icon: "monitor", label: "Leadverse web" },
  tablet: { icon: "tablet", label: "Leadverse on the DA's tablet" },
  customer: { icon: "hand", label: "DA's tablet, turned to the customer" },
  video: { icon: "video", label: "Leadverse web with a video panel" },
  pair: { icon: "smartphone", label: "Customer's phone + web" },
  tvpair: { icon: "tv", label: "Ground TV + phone" },
  none: { icon: "user-round", label: "No screen, a human moment" },
};
const BUILD_LABEL = { reuse: "Reuse", extend: "Extend", new: "New", none: "No build" };
const TRACK_COLOR = { booked: ["var(--trk-booked)", "var(--trk-booked-bg)"], walkin: ["var(--trk-walkin)", "var(--trk-walkin-bg)"], vtd: ["var(--trk-vtd)", "var(--trk-vtd-bg)"] };
const VIEWS = [["walk", "Walkthrough", "presentation"], ["blueprint", "Blueprint", "table-2"], ["fields", "Fields", "list-tree"], ["changes", "What changed", "git-pull-request-arrow"]];

const MODE_STEPS = ["I1", "T1", "O4"];
const modeMatters = (stepId, t) => t !== "vtd" && MODE_STEPS.includes(stepId);
function modeSeg(compact) {
  return `<div class="pv-mode" role="group" aria-label="Check-in way"><span>Check-in</span>${Object.values(CHECKIN_WAYS).map(w =>
    `<button class="${VS.mode === w.key ? "on" : ""}" data-mode-set="${w.key}" aria-pressed="${VS.mode === w.key}"${MARKETS[VS.market].checkin === w.key ? ` title="Default in ${MARKETS[VS.market].label}"` : ""}>${icon(w.icon)}${w.label}${!compact && MARKETS[VS.market].checkin === w.key ? `<em class="def" aria-label="default"></em>` : ""}</button>`).join("")}</div>`;
}

function stateTone(s) {
  if (!s) return "";
  if (/TOKEN PAID|CONVERTED/.test(s)) return "good";
  if (/DROPPED/.test(s)) return "bad";
  if (/FOLLOW-UP|NEW TD|No-show/.test(s)) return "warn";
  return "";
}

// ================================================================== hash
function readHash() {
  let h = "";
  try { h = (location.hash || "").replace(/^#/, ""); } catch (e) { h = ""; }
  const mk = h.match(/^(ae|au)-(.+)$/);
  VS.market = mk ? mk[1] : "ae";
  if (mk) h = mk[2];
  const way = h.match(/^(.+)-(staff|qr)$/);
  VS.mode = way ? way[2] : MARKETS[VS.market].checkin;
  if (way) h = way[1];
  if (["blueprint", "fields", "changes"].includes(h)) { VS.view = h; return; }
  const m = h.match(/^(booked|walkin|vtd)-([A-Z]\d)$/);
  if (m && stepById(m[2]) && stepById(m[2]).tracks.includes(m[1])) { VS.view = "walk"; VS.track = m[1]; VS.step = m[2]; }
}
function writeHash() {
  const pre = VS.market === "ae" ? "" : VS.market + "-";
  const suf = VS.mode === MARKETS[VS.market].checkin ? "" : "-" + VS.mode;
  const h = pre + (VS.view === "walk" ? `${VS.track}-${VS.step}` : VS.view) + suf;
  try { history.replaceState(null, "", "#" + h); } catch (e) { /* sandboxed viewers may refuse; state stays in the page */ }
}

// ================================================================== navigation
function go(stepId) {
  const s = stepById(stepId);
  if (!s) return;
  if (!s.tracks.includes(VS.track)) VS.track = ["booked", "walkin", "vtd"].find(k => s.tracks.includes(k));
  VS.step = stepId;
  VS.view = "walk";
  render();
  const item = document.querySelector(`.pv-item[data-step="${stepId}"]`);
  if (item) item.scrollIntoView({ block: "nearest" });
}
function setMarket(m) {
  if (!MARKETS[m] || VS.market === m) return;
  VS.market = m;
  VS.mode = MARKETS[m].checkin;
  render();
}
function setMode(mode) {
  if (!CHECKIN_WAYS[mode]) return;
  VS.mode = mode;
  render();
}
function setTrack(t) {
  VS.track = t;
  const cur = stepById(VS.step);
  if (!cur.tracks.includes(t)) {
    const same = stepsForTrack(t).find(s => s.phase === cur.phase);
    const after = STEPS.slice(STEPS.indexOf(cur)).find(s => s.tracks.includes(t));
    VS.step = (same || after || stepsForTrack(t)[0]).id;
  }
  render();
}

// ================================================================== top bar
function renderTop() {
  const cur = stepById(VS.step).phase;
  $("#pv-letters").innerHTML = ["P", "I", "S", "T", "O", "N"].map(l => {
    const ph = phaseById(l);
    return `<button class="${VS.view === "walk" && cur === l ? "on" : ""}" data-phase="${l}" title="${ph.name}" aria-label="Jump to ${ph.name}">${l}</button>`;
  }).join("");
  $("#pv-markets").innerHTML = Object.values(MARKETS).map(mk =>
    `<button class="${VS.market === mk.key ? "on" : ""}" data-market="${mk.key}" role="tab" aria-selected="${VS.market === mk.key}" title="${mk.label}: check-in ${CHECKIN_WAYS[mk.checkin].phrase} by default">${mk.label}</button>`).join("");
  $("#pv-tracks").innerHTML = Object.values(TRACKS).map(tk =>
    `<button class="${VS.track === tk.key ? "on" : ""}" data-track="${tk.key}" role="tab" aria-selected="${VS.track === tk.key}" title="${tk.label}"><span class="tdot" style="background:${TRACK_COLOR[tk.key][0]}"></span>${tk.key === "vtd" ? "Video TD" : tk.short}</button>`).join("");
  $("#pv-views").innerHTML = VIEWS.map(([k, l, ic]) =>
    `<button class="${VS.view === k ? "on" : ""}" data-view="${k}" role="tab" aria-selected="${VS.view === k}">${icon(ic)}${l}</button>`).join("");
}

// ================================================================== walkthrough: rail
function renderRail() {
  const t = VS.track;
  const steps = stepsForTrack(t);
  const groups = PHASES.filter(ph => steps.some(s => s.phase === ph.id));
  $("#pv-rail").innerHTML = groups.map(ph => `
    <div class="pv-group">
      <div class="pv-ghead"><span class="pv-gl">${ph.id}</span><div class="pv-gt"><b>${ph.name}</b><span>${pick(ph.owner, t)}</span></div></div>
      ${steps.filter(s => s.phase === ph.id).map(s => {
        const dev = DEVICE_META[pick(s.device, t)];
        return `<button class="pv-item ${s.id === VS.step ? "on" : ""} ${s.branch ? "branch" : ""}" data-step="${s.id}" title="${s.branch ? "Branch: taken only on some exits" : ""}">
          <span class="sid">${s.id}</span><span class="snm">${pick(s.name, t)}</span>${pick(s.changed, t) ? `<span class="chg" title="Changed after review"></span>` : ""}<i data-lucide="${dev.icon}" class="icon dev"></i></button>`;
      }).join("")}
    </div>`).join("") + `
    <div class="pv-legend">
      <div><span class="chg"></span>Changed after review</div>
      <div><span class="pinl"></span>Anatomy pin: a numbered part</div>
      <div><i style="font-style:italic;">Italic</i>&nbsp;is a branch, taken on some exits</div>
      <div>${icon("monitor")}Web &nbsp;${icon("tablet")}Tablet &nbsp;${icon("hand")}Customer</div>
      <div>${icon("video")}Video panel &nbsp;${icon("user-round")}No screen</div>
      <div>${icon("smartphone")}Phone next to the panel &nbsp;${icon("tv")}Ground TV</div>
    </div>`;
  $("#pv-rail").innerHTML = localize($("#pv-rail").innerHTML);
}

// ================================================================== walkthrough: stage
function noneCard(s, t) {
  const moments = pick(s.moments, t) || [];
  const target = pick(s.target, t);
  return `<div class="none-card">
    <span class="eyebrow">${s.id} &middot; no screen, by design</span>
    <h3>${pick(s.purpose, t)}</h3>
    ${moments.length ? `<ul>${moments.map(m => `<li>${m}</li>`).join("")}</ul>` : ""}
    <p>${pick(s.screen.pattern, t)}</p>
    ${target ? `<span class="target">${icon("timer")}Target: ${target}</span>` : ""}
  </div>`;
}

// staff actions that move the ground TV and the customer's token page on I2; each fires one state event on both
const SIM = {
  I2: {
    booked: [["assigned", "DA auto-assigned"], ["yard", "Yardie picks up the car"], ["hub", "Car parked at the hub"], ["met", "DA meets the customer: the TD starts"]],
    walkin: [["assigned", "DA auto-assigned"], ["met", "DA meets the customer"], ["chosen", "Slot booked, Yardie preps the car"], ["hub", "Car parked at the hub"], ["drive", "DA comes back, starts the TD"]],
  },
};
function simBar(list) {
  return `<div class="pv-sim" data-sim-bar><span class="lbl">${icon("hand")}Play the staff actions</span>${list.map(([ev, l], i) => `<button data-sim="${ev}" ${i ? "disabled" : ""}><i>${i + 1}</i>${l}</button>`).join("")}<button class="reset" data-sim-reset>${icon("rotate-ccw")}Reset</button></div>`;
}

function renderStage() {
  const s = stepById(VS.step), t = VS.track;
  const dev = pick(s.device, t);
  const meta = DEVICE_META[dev];
  const focus = $("#view-walk").classList.contains("focus");
  const nParts = anatomyFor(s.id, t).parts.length;
  $("#pv-stagehead").innerHTML = localize(`<span class="pv-devchip">${icon(meta.icon)}${meta.label}</span><span class="pv-scrname" title="${s.id} &middot; ${pick(s.screen.name, t)}">${s.id} &middot; ${pick(s.screen.name, t)}</span>
    ${modeMatters(s.id, t) ? modeSeg() : ""}
    <button class="pv-navbtn pv-focus ${VS.tab === "anatomy" ? "on" : ""}" data-pins ${nParts ? "" : "disabled"}>${icon("map-pin")}${VS.tab === "anatomy" ? "Hide pins" : `Show ${nParts} pins`}</button>
    <button class="pv-navbtn" data-focus>${icon(focus ? "minimize-2" : "maximize-2")}${focus ? "Show steps and spec" : "Screen only"}</button>`);

  let html;
  if (dev === "none" || !SCREENS[s.id]) {
    html = `<div class="dev dev-none" data-kind="none">${noneCard(s, t)}</div>`;
  } else if ((dev === "pair" || dev === "tvpair") && PHONES[s.id]) {
    // two devices side by side: the panel or the ground TV, and a phone (the customer's or the Yardie's)
    const route = pick(s.screen.route, t) || "";
    const left = dev === "tvpair"
      ? `<div class="pair-col"><span class="pair-lbl">${icon("tv")}Ground TV &middot; everyone in the hub sees it</span>
          <div class="dev dev-tv"><div class="viewport"><div class="scr scr-tv">${SCREENS[s.id](t)}</div></div><span class="stand"></span></div></div>`
      : `<div class="pair-col"><span class="pair-lbl">${icon("monitor")}Receptionist &middot; Leadverse</span>
          <div class="dev dev-desktop"><div class="urlbar">${icon("lock")}<span class="u">c24-lead-verse-ui.cars24.team${route}</span></div><div class="viewport"><div class="scr">${SCREENS[s.id](t)}</div></div></div></div>`;
    const sim = SIM[s.id] && pick(SIM[s.id], t);
    html = `<div class="pair-wrap">${sim ? simBar(sim) : ""}<div class="dev dev-pair" data-kind="${dev}">${left}
      <div class="pair-col"><span class="pair-lbl">${icon("smartphone")}${PHONE_LABEL[s.id] || "Phone"}</span>
        <div class="dev dev-phone"><div class="viewport"><div class="scr scr-ph">${PHONES[s.id](t)}</div></div></div></div>
    </div></div>`;
  } else if (dev === "tablet" || dev === "customer") {
    html = `<div class="dev dev-tablet" data-kind="tablet"><span class="cam"></span><div class="viewport"><div class="scr">${SCREENS[s.id](t)}</div></div></div>`;
  } else {
    const route = pick(s.screen.route, t) || "";
    html = `<div class="dev dev-desktop" data-kind="desktop"><div class="urlbar">${icon("lock")}<span class="u">c24-lead-verse-ui.cars24.team${route}</span></div><div class="viewport"><div class="scr">${SCREENS[s.id](t)}</div></div></div>`;
  }
  $("#pv-stage").innerHTML = localize(html);
  document.querySelectorAll("#pv-stage .scr").forEach(mountScreen);
  mountSync($("#pv-stage"));
  fitStage();
  drawPins();

  const list = stepsForTrack(t);
  const i = list.findIndex(x => x.id === s.id);
  $("#pv-stagefoot").innerHTML = `
    <button class="pv-navbtn" data-nav="-1" ${i <= 0 ? "disabled" : ""}>${icon("chevron-left")}${i > 0 ? list[i - 1].id : "Prev"}</button>
    <span class="pos">Step ${i + 1} of ${list.length} &middot; ${TRACKS[t].short}</span>
    <button class="pv-navbtn" data-nav="1" ${i >= list.length - 1 ? "disabled" : ""}>${i < list.length - 1 ? list[i + 1].id : "Next"}${icon("chevron-right")}</button>`;
}

function fitStage() {
  const stage = $("#pv-stage");
  const dev = stage && stage.querySelector(".dev");
  if (!dev) return;
  const kind = dev.dataset.kind;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  const cw = kind === "tablet" ? 28 : kind === "desktop" ? 2 : 4;
  const ch = kind === "tablet" ? 28 : kind === "desktop" ? 32 : 4;
  const availW = stage.clientWidth - 36;
  const availH = stage.clientHeight - 12;
  let s = (availW - cw) / 1180;
  if (!narrow) s = Math.min(s, (availH - ch) / 760);
  s = Math.max(0.18, Math.min(1, s));
  if (kind === "pair" || kind === "tvpair") {
    const tv = kind === "tvpair";
    const LH = tv ? 664 : 760, LCW = tv ? 24 : 2, LCH = tv ? 24 + 18 : 32;
    const sim = stage.querySelector(".pv-sim"), simH = sim ? sim.offsetHeight + 10 : 0;
    const W = availW, H = availH - 26 - simH;
    const leftFor = (sp) => Math.min(1, (W - 24 - (360 * sp + 20) - LCW) / 1180, (H - LCH) / LH);
    let sp, sd;
    if (narrow) { sd = Math.max(0.18, Math.min(1, (W - LCW) / 1180)); sp = Math.max(0.4, Math.min(1, (W - 20) / 360)); }
    else {
      sp = Math.min(1, (H - 20) / 740);
      sd = leftFor(sp);
      if (sd < 0.42) { sp = Math.max(0.45, Math.min(sp, (W - 44 - LCW - 0.42 * 1180) / 360)); sd = leftFor(sp); }
      sd = Math.max(0.18, sd);
    }
    const size = (box, w, h, k) => { const vp = box.querySelector(".viewport"); vp.style.width = Math.round(w * k) + "px"; vp.style.height = Math.round(h * k) + "px"; box.querySelector(".scr").style.transform = `scale(${k})`; };
    size(dev.querySelector(".dev-desktop, .dev-tv"), 1180, LH, sd);
    size(dev.querySelector(".dev-phone"), 360, 740, sp);
    return;
  }
  if (kind === "none") {
    dev.style.width = narrow ? "100%" : Math.round(1180 * s) + "px";
    dev.style.height = narrow ? "auto" : Math.round(760 * s) + "px";
    return;
  }
  const vp = dev.querySelector(".viewport"), scr = dev.querySelector(".scr");
  vp.style.width = Math.round(1180 * s) + "px";
  vp.style.height = Math.round(760 * s) + "px";
  scr.style.transform = `scale(${s})`;
}

// ---- anatomy pins: drawn inside the screen, so they scale with it
function visiblePart(scr, key) {
  return [...scr.querySelectorAll(`[data-part="${key}"]`)].find(el => el.getClientRects().length && !el.closest("[hidden]"));
}
function drawPins() {
  const scrs = [...document.querySelectorAll("#pv-stage .scr")];
  if (!scrs.length) return;
  scrs.forEach(scr => { const old = scr.querySelector(".pv-pins"); if (old) old.remove(); });
  document.querySelectorAll(".an-part .an-num").forEach(n => n.classList.remove("off"));
  if (VS.tab !== "anatomy") return;
  const a = anatomyFor(VS.step, VS.track);
  const layers = new Map();
  a.parts.forEach((p, i) => {
    const n = i + 1;
    let el = null, scr = null;
    for (const sc of scrs) { el = visiblePart(sc, p.key); if (el) { scr = sc; break; } }
    const num = document.querySelector(`.an-part[data-n="${n}"] .an-num`);
    if (!el) { if (num) num.classList.add("off"); return; }
    const sr = scr.getBoundingClientRect();
    const k = sr.width / scr.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    const x = (r.left - sr.left) / k, y = (r.top - sr.top) / k, w = r.width / k, h = r.height / k;
    if (!layers.has(scr)) { const l = document.createElement("div"); l.className = "pv-pins"; layers.set(scr, l); }
    layers.get(scr).insertAdjacentHTML("beforeend", `<div class="pv-box" data-n="${n}" style="left:${x}px; top:${y}px; width:${w}px; height:${h}px;"></div><div class="pv-pin" data-n="${n}" style="left:${x + 15}px; top:${y + 15}px;" title="${p.label}">${n}</div>`);
  });
  layers.forEach((layer, scr) => {
    scr.appendChild(layer);
    layer.querySelectorAll(".pv-pin").forEach(pin => {
      pin.addEventListener("mouseenter", () => highlightPart(pin.dataset.n, true));
      pin.addEventListener("mouseleave", () => highlightPart(pin.dataset.n, false));
      pin.addEventListener("click", (e) => { e.stopPropagation(); const row = document.querySelector(`.an-part[data-n="${pin.dataset.n}"]`); if (row) row.scrollIntoView({ block: "center", behavior: "smooth" }); });
    });
  });
}
function highlightPart(n, on) {
  document.querySelectorAll(`.pv-box[data-n="${n}"], .pv-pin[data-n="${n}"], .an-part[data-n="${n}"]`).forEach(el => el.classList.toggle("on", on));
}

// in-screen behaviour: exits (data-go), chips, switches, OTP, tabs, flows, overlays, zones, signature
function mountScreen(root) {
  root.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (el.disabled) return;
    // an exit can set the check-in way: from the picked choice (data-mode-from) or fixed (data-mode)
    const picked = el.dataset.modeFrom && root.querySelector(`[data-pick="${el.dataset.modeFrom}"].on`);
    if (picked && picked.dataset.modeVal) VS.mode = picked.dataset.modeVal;
    else if (el.dataset.mode) VS.mode = el.dataset.mode;
    go(el.dataset.go);
  }));
  root.querySelectorAll("[data-mode-set]").forEach(el => el.addEventListener("click", (e) => { e.stopPropagation(); setMode(el.dataset.modeSet); }));
  root.querySelectorAll("[data-enables]").forEach(el => el.addEventListener("click", () => { const target = root.querySelector("#" + el.dataset.enables); if (target) target.disabled = false; }));
  root.querySelectorAll("[data-pick]").forEach(el => el.addEventListener("click", (e) => {
    e.stopPropagation();
    const g = el.dataset.pick;
    if (g === "multi") el.classList.toggle("on");
    else el.parentElement.querySelectorAll(`[data-pick="${g}"]`).forEach(x => x.classList.toggle("on", x === el));
  }));
  root.querySelectorAll("[data-toggle-sel]").forEach(el => el.addEventListener("click", (e) => { if (e.target.closest("a, [data-pick]")) return; el.classList.toggle("sel"); }));
  root.querySelectorAll("[data-sw]").forEach(el => el.addEventListener("click", () => el.classList.toggle("on")));
  root.querySelectorAll("[data-zone]").forEach(el => el.addEventListener("click", () => {
    el.classList.toggle("done");
    if (el.classList.contains("v2-check2")) { const i = el.querySelector("svg, i"); if (i) { i.outerHTML = icon(el.classList.contains("done") ? "square-check" : "square"); drawIcons(); } }
  }));
  root.querySelectorAll("[data-otp-verify]").forEach(btn => btn.addEventListener("click", () => {
    const w = btn.closest(".v2-otp-wrap");
    w.querySelector(".v2-otp").classList.add("ok");
    btn.hidden = true;
    w.querySelector(".v2-ok").hidden = false;
  }));
  root.querySelectorAll("[data-tabs] [data-tab]").forEach(btn => btn.addEventListener("click", () => {
    btn.parentElement.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === btn));
    root.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== btn.dataset.tab; });
  }));
  // modal flows: data-flow="group" panels, data-step-to="group:panel" moves between them
  const showFlow = (group, step) => {
    root.querySelectorAll(`[data-flow="${group}"]`).forEach(p => { p.hidden = p.dataset.flowStep !== step; });
    root.querySelectorAll("[data-flow-dim]").forEach(d => { d.hidden = !step; });
    // stepper pills follow the panel: earlier ones done, the current one on
    const pills = [...root.querySelectorAll(`[data-flow-pill^="${group}:"]`)];
    const at = pills.findIndex(p => p.dataset.flowPill === `${group}:${step}`);
    pills.forEach((p, i) => { p.classList.toggle("on", i === at); p.classList.toggle("done", at >= 0 && i < at); });
  };
  root.querySelectorAll("[data-step-to]").forEach(b => b.addEventListener("click", () => { const [g, s] = b.dataset.stepTo.split(":"); showFlow(g, s); }));
  root.querySelectorAll("[data-close-flow]").forEach(b => b.addEventListener("click", () => { const p = b.closest("[data-flow]"); if (p) showFlow(p.dataset.flow, null); }));
  root.querySelectorAll("[data-open-flow]").forEach(b => b.addEventListener("click", () => showFlow(b.dataset.openFlow, "details")));
  // single overlays (drawer, compare): data-open="id" and data-close="id"
  const dims = () => root.querySelectorAll("[data-drawer-dim]");
  root.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => { const o = root.querySelector("#" + b.dataset.open); if (o) { o.hidden = false; dims().forEach(d => { d.hidden = false; }); } }));
  root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { const o = root.querySelector("#" + b.dataset.close); if (o) o.hidden = true; dims().forEach(d => { d.hidden = true; }); }));
  // the arrow next to Next opens the other exits; any other click closes it
  root.querySelectorAll("[data-menu]").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); const m = b.nextElementSibling; m.hidden = !m.hidden; }));
  root.addEventListener("click", (e) => { if (!e.target.closest("[data-menu]")) root.querySelectorAll(".v2-menu").forEach(m => { m.hidden = true; }); });
  // filter tabs over a table: rows carry data-cat
  root.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => {
    b.parentElement.querySelectorAll("[data-filter]").forEach(x => x.classList.toggle("on", x === b));
    root.querySelectorAll("tr[data-cat]").forEach(r => { r.hidden = b.dataset.filter !== "all" && r.dataset.cat !== b.dataset.filter; });
  }));
  // pins follow the visible parts after any in-screen change
  root.addEventListener("click", () => setTimeout(drawPins, 0));
  mountSignature(root);
  drawIcons();
}

// Two devices on one stage talk through state events. A phone tap (data-sync="key" sends an answer, data-sync-event
// fires an event) or a staff action from the sim bar updates every screen: data-synced, data-on-EVENT (text),
// data-def-EVENT (a default if still unanswered), data-cls-EVENT ("a>b" swaps a class) and data-enable-EVENT.
function applySync(root, ev) {
  const flash = (row) => { row.classList.add("got"); row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); };
  root.querySelectorAll(`[data-on-${ev}]`).forEach(el => { el.innerHTML = el.getAttribute(`data-on-${ev}`); const row = el.closest("[data-sync-row]"); if (row) { row.classList.remove("skip"); flash(row); } });
  root.querySelectorAll(`[data-def-${ev}]`).forEach(el => { const row = el.closest("[data-sync-row]"); if (row && !row.classList.contains("got")) { el.innerHTML = el.getAttribute(`data-def-${ev}`); row.classList.add("skip"); flash(row); } });
  root.querySelectorAll(`[data-cls-${ev}]`).forEach(el => el.getAttribute(`data-cls-${ev}`).split(/\s+/).forEach(c => {
    const [from, to] = c.includes(">") ? c.split(">") : [null, c];
    if (from) el.classList.remove(from);
    el.classList.add(to);
  }));
  root.querySelectorAll(`[data-enable-${ev}]`).forEach(el => { el.disabled = false; });
}
function mountSync(stage) {
  const screens = [...stage.querySelectorAll(".scr")];
  const fire = (ev) => { screens.forEach(root => applySync(root, ev)); setTimeout(drawPins, 0); };
  const phone = stage.querySelector(".scr-ph");
  // capture phase: the phone's own choice handlers stop propagation, and the other screen must still hear every tap
  if (phone) phone.addEventListener("click", (e) => {
    const a = e.target.closest("[data-sync]");
    // an answer can switch what shows elsewhere: data-when="key=value" is shown only for the chosen value
    if (a && a.dataset.syncKey) { const k = a.dataset.syncKey.split("=")[0]; screens.forEach(root => root.querySelectorAll(`[data-when^="${k}="]`).forEach(el => { el.hidden = el.dataset.when !== a.dataset.syncKey; })); }
    if (a) screens.forEach(root => root.querySelectorAll(`[data-synced="${a.dataset.sync}"]`).forEach(el => {
      el.innerHTML = a.dataset.syncVal || a.textContent.trim();
      const row = el.closest("[data-sync-row]");
      if (row) { row.classList.remove("skip"); row.classList.add("got"); row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); }
    }));
    const ev = e.target.closest("[data-sync-event]");
    if (ev && !ev.disabled) fire(ev.dataset.syncEvent);
    else setTimeout(drawPins, 0);
  }, true);
  // the sim bar plays the staff actions in order
  const bar = stage.querySelector("[data-sim-bar]");
  if (bar) bar.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest("[data-sim-reset]")) { renderStage(); drawIcons(); return; }
    const b = e.target.closest("[data-sim]");
    if (!b || b.disabled) return;
    fire(b.dataset.sim);
    b.classList.add("done");
    b.disabled = true;
    const next = b.nextElementSibling;
    if (next && next.matches("[data-sim]")) next.disabled = false;
  });
}

function mountSignature(root) {
  const canvas = root.querySelector("#sig");
  if (!canvas) return;
  const agree = root.querySelector("#agree");
  const goBtn = root.querySelector("#sig-go");
  const hint = root.querySelector("#sig-hint");
  let drew = false, drawing = false, ctx;
  const size = () => {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width = w * 2; canvas.height = h * 2;
    ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--v-ink").trim() || "#101828";
  };
  size();
  // the screen is CSS-scaled; map pointer positions back into canvas space
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.offsetWidth / r.width, (e.clientY - r.top) * canvas.offsetHeight / r.height];
  };
  const update = () => {
    const ok = drew && agree.checked;
    goBtn.disabled = !ok;
    hint.textContent = ok ? "Signed. The drive is unlocked." : "Sign and tick the box to continue";
  };
  canvas.addEventListener("pointerdown", (e) => { if (!ctx) size(); drawing = true; canvas.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); });
  canvas.addEventListener("pointermove", (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); drew = true; });
  const end = () => { if (drawing) { drawing = false; update(); } };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  agree.addEventListener("change", update);
  root.querySelector("[data-sig-clear]").addEventListener("click", () => { if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); drew = false; update(); });
}

// ================================================================== walkthrough: spec panel (Spec | Anatomy)
function exitRow(x, t) {
  const to = x.to ? stepById(x.to) : null;
  const target = to
    ? `<button class="goto" data-step="${to.id}"${x.mode ? ` data-mode="${x.mode}"` : ""}>${icon("arrow-right")}<span class="gid">${to.id}</span>${pick(to.name, t)}${x.mode ? `<span class="way">${CHECKIN_WAYS[x.mode].label.toLowerCase()}</span>` : ""}</button>`
    : `<span class="goto end">${icon("square")}Journey ends</span>`;
  return `<div class="ex"><div class="w">${pick(x.when, t)}</div><div class="r">${target}${x.state ? `<span class="hex ${stateTone(x.state)}">${x.state}</span>` : ""}</div></div>`;
}

function specHead(s, t) {
  const ph = phaseById(s.phase);
  const [fg, bg] = TRACK_COLOR[t];
  const way = modeMatters(s.id, t) ? `<span class="trk way">${icon(CHECKIN_WAYS[VS.mode].icon)}${CHECKIN_WAYS[VS.mode].label}</span>` : "";
  return `<div class="sp-eyebrow">${ph.id} &middot; ${ph.name}<span class="trk" style="color:${fg}; background:${bg};">${TRACKS[t].label}</span><span class="trk mk">${MARKETS[VS.market].label}</span>${way}</div>
    <div class="sp-title"><span class="sid">${s.id}</span><h2>${pick(s.name, t)}</h2></div>`;
}

function renderSpec() {
  const s = stepById(VS.step), t = VS.track;
  const a = anatomyFor(s.id, t);
  const tabs = `<div class="sp-tabs" role="tablist"><button class="${VS.tab === "spec" ? "on" : ""}" data-sptab="spec" role="tab">${icon("file-text")}Spec</button><button class="${VS.tab === "anatomy" ? "on" : ""}" data-sptab="anatomy" role="tab">${icon("map-pin")}Anatomy<span class="cnt">${a.parts.length}</span></button></div>`;
  if (VS.tab === "anatomy") { $("#pv-spec").innerHTML = localize(tabs + specHead(s, t) + anatomyHtml(a)); bindAnatomyRows(); return; }

  const dev = DEVICE_META[pick(s.device, t)];
  const changed = pick(s.changed, t);
  const exits = pick(s.exits, t) || [];
  const state = pick(s.state, t);
  const build = pick(s.screen.build, t);
  const route = pick(s.screen.route, t);
  const phoneRoute = pick(s.screen.phone, t);
  // "today" is DAP in the UAE; for Australia only steps with an Australia note show one
  const dap = VS.market === "ae" ? pick(s.dap, t) : (s.dap && typeof s.dap === "object" && VS.market in s.dap ? pick(s.dap[VS.market], t) : null);
  $("#pv-spec").innerHTML = localize(tabs + specHead(s, t) + `
    <p class="sp-purpose">${pick(s.purpose, t)}</p>
    <div class="sp-meta"><span>${icon("user-round")}${pick(s.owner, t)}</span><span>${icon(dev.icon)}${dev.label}</span>${s.branch ? `<span>${icon("git-branch")}Branch</span>` : ""}</div>
    ${changed ? `<div class="sp-changed">${icon("pencil")}<div>${changed}</div></div>` : ""}
    <div class="sp-sec"><h4>${icon("radio-tower")}Source</h4>
      <div class="lbl">Triggered by</div><p>${pick(s.source.trigger, t)}</p>
      <div class="lbl">Data from</div><ul class="sp-list data">${(pick(s.source.data, t) || []).map(d => `<li>${icon("database")}<span>${d}</span></li>`).join("")}</ul></div>
    <div class="sp-sec"><h4>${icon("app-window")}Screen</h4>
      <p><b>${pick(s.screen.name, t)}</b> <span class="build ${build}">${BUILD_LABEL[build]}</span></p>
      <p style="color:var(--muted); margin-top:4px;">${pick(s.screen.pattern, t)}</p>
      ${route ? `<code class="sp-route">${route}</code>` : ""}${phoneRoute ? `<div class="lbl">Customer's page, on their phone</div><code class="sp-route">${phoneRoute}</code>` : ""}</div>
    <div class="sp-sec"><h4>${icon("log-in")}Entry conditions</h4>
      <ul class="sp-list">${(pick(s.entry, t) || []).map(e => `<li>${icon("check")}<span>${pick(e, t)}</span></li>`).join("")}</ul></div>
    <div class="sp-sec"><h4>${icon("log-out")}Exit conditions</h4><div class="sp-exit">${exits.map(x => exitRow(x, t)).join("")}</div></div>
    <div class="sp-sec"><h4>${icon("hexagon")}State it records</h4>${state ? `<span class="hex ${stateTone(state)}">${state}</span>` : `<p style="color:var(--muted);">No new funnel state. Progress shows in the exits.</p>`}</div>
    ${dap ? `<div class="sp-sec"><h4>${icon("history")}${VS.market === "ae" ? "DAP today" : `${MARKETS[VS.market].label} today`}</h4><div class="sp-dap">${dap}</div></div>` : ""}`);
}

function anatomyHtml(a) {
  if (!a.parts.length && !a.fields.length) {
    return `<p class="an-intro">No screen on this step, so there is nothing to take apart.</p>${a.states.length ? `<div class="sp-sec"><h4>${icon("layers")}States</h4><ul class="an-list">${a.states.map(([s, w]) => `<li><b>${s}</b><span>${w}</span></li>`).join("")}</ul></div>` : ""}`;
  }
  const toLink = (txt) => txt.replace(/\b([PISTONM]\d)\b/g, (m) => stepById(m) ? `<button class="linklike" data-step="${m}">${m}</button>` : m);
  return `<p class="an-intro">One level below the screen. Numbers match the orange pins on the screen; a grey number is a part that shows only after an action, like the OTP step.</p>
    <div class="sp-sec"><h4>${icon("map-pin")}Parts</h4><div class="an-parts">${a.parts.map((p, i) => `<div class="an-part" data-n="${i + 1}"><span class="an-num">${i + 1}</span><div><b>${p.label}</b>${p.widget ? `<code>${p.widget}</code>` : ""}${p.note ? `<p>${p.note}</p>` : ""}</div></div>`).join("")}</div></div>
    ${a.fields.length ? `<div class="sp-sec"><h4>${icon("text-cursor-input")}Fields</h4><table class="an-tbl"><thead><tr><th>Field</th><th>Type</th><th>Source and rule</th></tr></thead><tbody>
      ${a.fields.map(([f, ty, req, src, rule]) => `<tr><td><b>${f}</b>${req === "Yes" || /^Yes/.test(req) ? ` <span class="req">REQ</span>` : ""}</td><td class="m">${ty}${req === "Read only" ? "<br>read only" : ""}</td><td class="m">${src}${rule ? `<br>${rule}` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${a.actions.length ? `<div class="sp-sec"><h4>${icon("mouse-pointer-click")}Actions</h4><ul class="an-list">${a.actions.map(([c, eff, nx]) => `<li><b>${c}</b><span>${eff}</span>${nx ? `<br><span class="to">&rarr; ${toLink(nx)}</span>` : ""}</li>`).join("")}</ul></div>` : ""}
    ${a.states.length ? `<div class="sp-sec"><h4>${icon("layers")}States</h4><ul class="an-list">${a.states.map(([s, w]) => `<li><b>${s}</b><span>${w}</span></li>`).join("")}</ul></div>` : ""}`;
}
function bindAnatomyRows() {
  document.querySelectorAll(".an-part").forEach(row => {
    row.addEventListener("mouseenter", () => highlightPart(row.dataset.n, true));
    row.addEventListener("mouseleave", () => highlightPart(row.dataset.n, false));
  });
}

// ================================================================== docs: which market and check-in way the page shows
function docCtx() {
  const mk = MARKETS[VS.market];
  return `<div class="doc-ctx"><span class="mk">${mk.key.toUpperCase()}</span><span>Showing <b>${mk.label}</b>, where customers check in <b>${CHECKIN_WAYS[mk.checkin].phrase}</b> by default.</span>${VS.track === "vtd" ? `<span class="muted">Video TD always checks in on the call.</span>` : modeSeg()}</div>`;
}

// ================================================================== blueprint view
function mainPath(t) { return stepsForTrack(t).filter(s => !s.branch && s.phase !== "M").map(s => s.id).join(" &rarr; "); }

function renderBlueprint() {
  const t = VS.track;
  const flowCard = (k) => {
    const f = FLOWS[k], [fg] = TRACK_COLOR[k];
    return `<div class="flow-card">
      <div class="fh"><span class="tdot" style="background:${fg}"></span>${TRACKS[k].label}</div>
      <div><div class="k">Source</div><ul>${f.source.map(x => `<li>${x}</li>`).join("")}</ul></div>
      <div><div class="k">Flow entry conditions</div><ul>${f.entry.map(x => `<li>${x}</li>`).join("")}</ul></div>
      <div><div class="k">Flow exit conditions</div><div class="exits">${f.exit.map(([tone, st, txt]) => `<div><span class="hex ${tone}">${st}</span>${txt}</div>`).join("")}</div></div>
      <div><div class="k">Main path</div><div class="path">${mainPath(k)}</div></div>
    </div>`;
  };
  const steps = stepsForTrack(t);
  const phaseBlock = (ph) => {
    const rows = steps.filter(s => s.phase === ph.id);
    if (!rows.length) return "";
    return `<div class="bp-phase">
      <div class="bp-phead"><span class="pv-gl">${ph.id}</span><b>${ph.name}</b><span class="po">${pick(ph.when, t)} &middot; ${pick(ph.owner, t)}</span>
        <span class="pio"><span><b>Entry</b>${pick(ph.entry, t)}</span><span><b>Exit</b>${pick(ph.exit, t)}</span></span></div>
      <div class="bp-scroll"><table class="bp">
        <thead><tr><th style="width:150px;">Step</th><th style="width:200px;">Screen</th><th>Source</th><th>Entry conditions</th><th>Exit conditions</th><th style="width:150px;">State</th></tr></thead>
        <tbody>${rows.map(s => {
          const b = pick(s.screen.build, t), st = pick(s.state, t);
          return `<tr data-step="${s.id}">
            <td><span class="sid">${s.id}</span> <span class="nm">${pick(s.name, t)}</span>${s.branch ? `<span class="branchtag">branch</span>` : ""}<div class="own">${pick(s.owner, t)}</div></td>
            <td><div class="scrn">${pick(s.screen.name, t)}</div><span class="build ${b}">${BUILD_LABEL[b]}</span></td>
            <td>${pick(s.source.trigger, t)}<ul>${(pick(s.source.data, t) || []).map(d => `<li>${d}</li>`).join("")}</ul></td>
            <td><ul>${(pick(s.entry, t) || []).map(e => `<li>${pick(e, t)}</li>`).join("")}</ul></td>
            <td><div class="exi">${(pick(s.exits, t) || []).map(x => `<div><span>${pick(x.when, t)}</span> &rarr; <b>${x.to || "end"}</b>${x.mode ? ` <span class="way">${CHECKIN_WAYS[x.mode].label.toLowerCase()}</span>` : ""}</div>`).join("")}</div></td>
            <td>${st ? `<span class="hex ${stateTone(st)}">${st}</span>` : `<span style="color:var(--faint);">&mdash;</span>`}</td>
          </tr>`;
        }).join("")}</tbody></table></div></div>`;
  };
  $("#pv-blueprint").innerHTML = localize(`<div class="wrap">
    <h1 class="doc-h">One level deeper, for every step</h1>
    <p class="doc-sub">Source, screen, entry conditions and exit conditions at three levels: the flow, the phase and the step. Click any row to open its screen. Switch the market and the track at the top; switch the check-in way here. The Fields view goes one level further, to every field on every screen.</p>
    ${docCtx()}
    <h3 class="doc-h3">The three flows</h3>
    <div class="flow-cards">${["booked", "walkin", "vtd"].map(flowCard).join("")}</div>
    <h3 class="doc-h3">Phase and step level &middot; ${TRACKS[t].label} &middot; ${MARKETS[VS.market].label}</h3>
    ${PHASES.map(phaseBlock).join("")}
  </div>`);
}

// ================================================================== fields view (data dictionary)
function renderFields() {
  const t = VS.track;
  let total = 0, screens = 0;
  const blocks = PHASES.map(ph => {
    const rows = [];
    stepsForTrack(t).filter(s => s.phase === ph.id).forEach(s => {
      const a = anatomyFor(s.id, t);
      if (a.fields.length) screens++;
      a.fields.forEach(f => rows.push([s, f]));
    });
    total += rows.length;
    if (!rows.length) return "";
    return `<div class="bp-phase"><div class="bp-phead"><span class="pv-gl">${ph.id}</span><b>${ph.name}</b><span class="po">${rows.length} fields</span></div>
      <div class="bp-scroll"><table class="bp"><thead><tr><th style="width:170px;">Step</th><th style="width:170px;">Field</th><th style="width:120px;">Type</th><th style="width:90px;">Required</th><th>Source</th><th>Rule</th></tr></thead>
      <tbody>${rows.map(([s, [f, ty, req, src, rule]]) => `<tr data-step="${s.id}" data-anatomy="1"><td><span class="sid">${s.id}</span> <span class="nm">${pick(s.name, t)}</span></td><td><b>${f}</b></td><td>${ty}</td><td>${req === "Yes" || /^Yes/.test(req) ? `<span class="req">REQUIRED</span>` : req === "Read only" ? "Read only" : "No"}</td><td>${src || "&mdash;"}</td><td>${rule || "&mdash;"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }).join("");
  $("#pv-fields").innerHTML = localize(`<div class="wrap">
    <h1 class="doc-h">Every field on every screen</h1>
    <p class="doc-sub">The data dictionary behind the screens, taken from each step's anatomy: ${total} fields across ${screens} screens on the ${TRACKS[t].label} track, ${MARKETS[VS.market].label}, check-in ${t === "vtd" ? "on the call" : CHECKIN_WAYS[VS.mode].phrase}. Click a row to open that screen with its pins.</p>
    ${docCtx()}
    ${blocks}
  </div>`);
}

// ================================================================== what changed view
// a link to a step, optionally in a market, a check-in way or a track
function stepLink(id, label, o = {}) {
  return `<button class="linklike" data-step="${id}"${o.market ? ` data-market="${o.market}"` : ""}${o.mode ? ` data-mode="${o.mode}"` : ""}${o.track ? ` data-in-track="${o.track}"` : ""}>${id}${label ? " " + label : ""}</button>`;
}

function renderChanges() {
  const links = (...l) => `<div style="display:flex; gap:12px; flex-wrap:wrap;">${l.join("")}</div>`;
  $("#pv-changes").innerHTML = `<div class="wrap">
    <h1 class="doc-h">What changed after review</h1>
    <p class="doc-sub">Notes on the PISTON board, how the calling team works, the Leadverse TD Journey design file, Australia, and the latest walk through the ground journey. Here is what each one does to the journey and to the screens.</p>
    <div class="chg-cards">
      <div class="chg-card wide"><div class="q">&ldquo;Booked: the TD agent's handshake is the TD start, then the consent in the middle grid, the DL and the walkaround. Walk-in: Needs as pills like Discovery, the quality promise in the 3-column layout, then book the current slot, create the order and request prep&rdquo;</div><h4>A booking starts at the handshake; a walk-in books the slot it is in</h4>
        <div class="ba"><span class="k">Booked, before</span><span class="seq">T1 Handshake &rarr; T2 Needs &rarr; T3 Cars &rarr; T4 Promise &rarr; T5 Confirm &rarr; O2 Start TD &rarr; O3 Consent</span><span class="k">Booked, after</span><span class="seq"><em>T1 Handshake and Start TD</em> &rarr; O3 Consent &rarr; O4 DL &rarr; O5 Walkaround</span></div>
        <div class="ba"><span class="k">Walk-in, before</span><span class="seq">T2 Needs (a form) &rarr; T3 Recommend and compare &rarr; T4 Promise (customer screen) &rarr; T5 Create order</span><span class="k">Walk-in, after</span><span class="seq"><em>T2 Needs and cars (stepper pills)</em> &rarr; <em>T4 Quality promise (middle column)</em> &rarr; <em>T5 Book now: slot, order, prep</em></span></div>
        <p><b>Booked: the handshake is the start.</b> The car was chosen on the call and the Yardie has it at the hub, so there is no car finding. The DA meets the customer at their seat and one tap creates the TD record and turns the recording on. The consent, the licence and the walkaround follow. On the TV and the token page the customer goes from Car ready to On test drive.</p>
        <p><b>Walk-in: needs as pills.</b> The same stepper as Discovery on the call: who it's for, budget, body type, fuel and gearbox, must-haves, then the matching cars with a link to each car's page and a compare. Recommend and compare are now part of this step.</p>
        <p><b>The promise and the consent sit in the middle.</b> Both are on the visit page now, not a separate customer screen: lead pane on the left, CarGPT on the right. The promise shows the car, then three columns: inspected, warranty and return, finance. The consent shows the TD details, then the terms and the signature pad side by side; the DA hands the tablet over to sign.</p>
        <p><b>Walk-in: book the current slot.</b> One tap books the slot the customer is in, creates the order for the TD and sends the Yardie the prep request. The customer waits on their token until the car is at the hub.</p>
        ${links(stepLink("T1", "Handshake and Start TD", { track: "booked" }), stepLink("O3", "Consent", { track: "booked" }), stepLink("T2", "Needs and cars", { track: "walkin" }), stepLink("T4", "Quality promise", { track: "walkin" }), stepLink("T5", "Book now", { track: "walkin" }))}</div>
      <div class="chg-card wide"><div class="q">&ldquo;Pitch in CarGPT, no Welcome step, contact edits on the left. Start the lead view from the customer's orders and cars. Discovery as stepper pills, hub and video slots by TD type, a standard footer, and finance after check-in&rdquo;</div><h4>The call starts from what the customer already wants</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">P2 Welcome &rarr; P3 Contact (order) &rarr; P4 Pitch &rarr; P5 Discovery &rarr; P6 Finalize &rarr; P7 Book slot</span><span class="k">After</span><span class="seq"><em>P2 Orders and cars of interest</em> &rarr; (<em>P3 Discovery</em>, only if unsure) &rarr; <em>P4 TD type per car</em> &rarr; <em>P5 Hub slot</em> and/or <em>P6 Video slot</em> &rarr; P7 Book</span></div>
        <p><b>Two kinds of enquiry.</b> With a mobile and an email, an order already exists: a clear intent, so the agent confirms it and moves on. Without both, the cars the customer liked sit on the contact by appointment ID; the agent asks which ones to drive, adds the missing email on the left, and that creates one order per car. Discovery is only for a customer who is still unsure.</p>
        <p><b>The script lives in CarGPT.</b> The opening line and the CARS24 pitch are the same on every call, so they sit on the right, not as steps. Name, mobile and email are edited in the left pane.</p>
        <p><b>Slots follow the TD type.</b> Each car gets hub or video. All the same: one slot step. Mixed (say 2 hub, 2 video): the hub slot, then the video slot, then one read-back that books both.</p>
        <p><b>One footer everywhere.</b> Previous and Next; every other exit, including a customer dropping off (to the disposition), is under the arrow next to Next.</p>
        <p><b>Finance after check-in.</b> The form asks: Do you need financing after the test drive? The token page then shows the next step with a QR: the 2-minute pre-approval, a check against their own lender, or take a seat and browse the cars if they don't need finance or are already pre-approved.</p>
        ${links(stepLink("P1", "Queue tabs"), stepLink("P2", "Order exists", { track: "booked" }), stepLink("P2", "Cars of interest, no order", { track: "vtd" }), stepLink("P3", "Discovery"), stepLink("P4", "TD type, mixed", { track: "vtd" }), stepLink("P6", "Video slot", { track: "vtd" }), stepLink("I1", "Finance question on the seat QR", { market: "au", mode: "qr", track: "walkin" }))}</div>
      <div class="chg-card wide"><div class="q">&ldquo;Start TD is when the DA meets the customer and starts the recording. Then the consent, then the DL. A walk-in waits on their token until the Yardie brings the car, and the DA meets them again&rdquo;</div><h4>The test drive starts when the DA and the customer meet at the car</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">O2 Walk to the car &rarr; O3 Walkaround &rarr; O4 DL verify &rarr; O5 Start TD &rarr; O6 Consent &rarr; O7 Drive &rarr; O8 End</span><span class="k">After</span><span class="seq"><em>Start TD, recording on</em> (O2; T1 for a booking) &rarr; <em>O3 Consent</em> &rarr; <em>O4 DL verify</em> &rarr; O5 Walkaround &rarr; O6 Drive &rarr; O7 End</span></div>
        <p><b>Start TD is the meeting at the car.</b> Starting the TD creates the TD record and turns the recording on. Recording consent is still asked at check-in, so it can start straight away. The customer signs the TD consent next, then the DA checks the licence, the last check before the car moves. Live notes and transcription now cover the drive, not the wait.</p>
        <p><b>A walk-in's journey.</b> Check-in, a DA assigned, car finding. Then the customer waits on their token while the Yardie preps the car; the TV and their phone show the car's ETA. When it reaches the hub, the DA is told, goes back to the customer, and starts the TD together.</p>
        ${links(stepLink("O2", "Start TD (walk-in)", { track: "walkin" }), stepLink("O3", "Consent"), stepLink("O4", "DL verify"), stepLink("I2", "Waiting on the token (walk-in)", { track: "walkin" }), stepLink("O1", "Yardie preps the car", { track: "walkin" }))}</div>
      <div class="chg-card wide"><div class="q">&ldquo;Check-in and welcome in the same gesture. A token on the ground TV, moved by the Yardie and the DA. DA assigned automatically, handshake after it. DL check just before the drive&rdquo;</div><h4>One gesture at the door, a token for everyone, and a Yardie for the cars</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">I1 Mark arrived &rarr; I2 Welcome &rarr; S1 Check-in &rarr; S2 DL verify &rarr; S3 Assign DA &rarr; T1 Handshake &rarr; &hellip; &rarr; O3 Start TD</span><span class="k">After</span><span class="seq"><em>I1 Welcome and check-in</em> &rarr; <em>I2 Token on the TV</em> &rarr; <em>S1 DA auto-assigned</em> &rarr; <em>S2 Yardie brings the car</em> &rarr; T1 Handshake &rarr; &hellip; &rarr; <em>O1 Yardie preps</em> &rarr; O2 Start TD &rarr; O3 Consent &rarr; <em>O4 DL verify</em></span></div>
        <p><b>One gesture.</b> Checking in is the arrival, so there is no Mark arrived. The customer sits down and scans the QR on their seat, or a receptionist or DA fills the same form with them. Booked and walk-in customers use the same form; a walk-in's also creates the lead.</p>
        <p><b>Hospital logic.</b> Every check-in gets a token: B for bookings, W for walk-ins, in order. The ground TV and the customer's own phone show each token's status, DA and car. Nobody types a status: each change comes from a staff action. The system assigns a DA, the Yardie moves the car, the DA meets the customer and starts the drive.</p>
        <p><b>DA, then the handshake.</b> The DA is assigned automatically, by who is free now and has room in today's slots. A person assigns one only when every DA is busy. The handshake happens after that, at the customer's seat, never at check-in.</p>
        <p><b>The Yardie.</b> Cars wait in the yard, about 500 m away. A booked car is prepped before the day and called to the hub the moment the customer checks in. A walk-in's car is prepped (a quick clean, fuel, tyres) once the DA and the customer choose it, then brought over. Each tap updates the TV's car column and tells the DA.</p>
        <p><b>DL verify, before the car moves.</b> The DA checks the licence at the car, after Start TD and the consent. Car finding doesn't need one; driving does.</p>
        ${links(stepLink("I1", "Seat QR check-in (Australia)", { market: "au", mode: "qr" }), stepLink("I1", "Check-in by staff (UAE)", { market: "ae", mode: "staff" }), stepLink("I2", "Token on the TV"), stepLink("S1", "DA auto-assigned"), stepLink("S2", "Yardie brings the car", { track: "booked" }), stepLink("O1", "Yardie preps a walk-in's car", { track: "walkin" }), stepLink("O4", "DL verify"))}</div>
      <div class="chg-card wide"><div class="q">&ldquo;Build it for Australia too: check in for the customer, or let them fill the check-in form themselves&rdquo;</div><h4>Two ways to check in, one form, any market</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">Only the receptionist checks the customer in</span><span class="k">After</span><span class="seq"><em>By staff</em>, or by the customer from the <em>seat QR</em>, with the same form. The market sets the default</span></div>
        <p><b>Seat QR.</b> The customer scans the QR on their seat and gets a form-only page on their own phone: no Leadverse, no login. The code is the same on every seat, so a mobile number and OTP say who is checking in, and today's booking is found from it. Each answer lands on the receptionist's Today list as it is given. If the customer gets stuck, staff finish it for them and keep what was filled. This first shipped as a link sent at Mark arrived; with arrival and check-in now one gesture, the seat QR replaces that link.</p>
        <p><b>By staff.</b> A receptionist or DA fills the same form with the customer. Both ways write the same check-in and issue the same token.</p>
        <p><b>The market sets the default, not the product.</b> Australia defaults to the seat QR, because customers there already check themselves in with a form. The UAE and India default to staff. Either way works for any visit, in any market.</p>
        ${links(stepLink("I1", "Booked, seat QR", { market: "au", mode: "qr", track: "booked" }), stepLink("I1", "Walk-in, seat QR", { market: "au", mode: "qr", track: "walkin" }), stepLink("I1", "Walk-in, by staff", { market: "ae", mode: "staff", track: "walkin" }))}</div>
      <div class="chg-card"><div class="q">&ldquo;Use the Leadverse TD Journey file for design and knowledge&rdquo;</div><h4>Screens follow the Leadverse TD Journey design</h4>
        <p>White by default. Every screen uses that file's layout: an icon rail, a lead pane with an AI summary, contact actions, finance and documents, a stage bar, and CarGPT with live transcription.</p>
        <p>From its flows: check-in as a form with an OTP step and a purpose-of-visit question, DL verify as its own step (now right before the drive), a LIVE badge and live transcription during the drive, the disposition form, and the Add cars drawer.</p>
        ${links(stepLink("I1", "Check-in"), stepLink("O4", "DL verify"), stepLink("O6", "TD live"), stepLink("N1", "Disposition"))}</div>
      <div class="chg-card"><div class="q">&ldquo;One more depth&rdquo;</div><h4>Every screen, taken apart</h4>
        <p>Below each screen sits its anatomy: numbered parts shown as orange pins on the screen, the fields it captures with type, source and rule, the actions it fires and what they call, and the states it can be in.</p>
        <p>The Fields view collects every field into one data dictionary for engineering.</p>
        ${links(`<button class="linklike" data-view="fields">Open the fields</button>`, stepLink("I1", "Check-in anatomy"))}</div>
      <div class="chg-card"><div class="q">&ldquo;Capture intent should be its own persona task&rdquo;</div><h4>The booking call becomes a Tasks persona</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">P1 Capture intent on the lead page &rarr; P2 Pick a slot</span><span class="k">After</span><span class="seq"><em>P1 Lead in queue &rarr; P2 Orders and interest &rarr; P4 TD type &rarr; P5/P6 Slots &rarr; P7 Book</em></span></div>
        <p>No lead, no call: every enquiry with a mobile number lands as a TD booking call task. The call starts from the customer's orders and cars of interest, and booking closes the task. (Reworked again in the card above.)</p>
        ${links(stepLink("P1", "Queue"), stepLink("P2", "Orders and interest"), stepLink("P7", "Book"))}</div>
      <div class="chg-card"><div class="q">&ldquo;TD consent sign-off after TD start&rdquo;</div><h4>The TD consent moves to the car</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">Check-in: OTP, DL, <em>TD declaration</em>, recording consent</span><span class="k">After</span><span class="seq">O2 Start TD &rarr; <em>O3 Consent</em> &rarr; O4 DL verify &rarr; O6 Drive</span></div>
        <p>Consent is about one drive in one car, so it needs the car, plate and start odometer that exist only once the TD starts. It is signed once per car; a VTD needs none. DAP already unlocks the declaration only after Start Test Drive but checks it at Mark Test Drive Complete, so today a customer can drive before signing. ${stepLink("O3")} makes it a gate before the car moves.</p>
        ${links(stepLink("I1", "Check-in"), stepLink("O2", "Start TD"), stepLink("O3", "Consent"))}</div>
      <div class="chg-card"><div class="q">&ldquo;Handshake ke baad car finding journey&rdquo;</div><h4>One owner, from the handshake</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">Front desk finds the car, the DA meets the customer at the yard. Booked customers only reconfirm.</span><span class="k">After</span><span class="seq">S1 Assign DA &rarr; <em>T1 Handshake</em> &rarr; <em>T2 Needs and cars &rarr; T4 Promise &rarr; T5 Book now</em> (walk-in)</span></div>
        <p>The DA meets the customer at their seat. For a walk-in, car finding starts there. A booked customer chose the car on the call, so for them the handshake starts the drive (reworked in the first card). The handshake is a real state: DAP hub work orders already have MET_CUSTOMER.</p>
        ${links(stepLink("S1", "Assign DA"), stepLink("T1", "Handshake", { track: "walkin" }), stepLink("T2", "Needs and cars", { track: "walkin" }))}</div>
      <div class="chg-card"><div class="q">&ldquo;Ek level depth: source, screen, entry, exit&rdquo;</div><h4>Every step, one level deeper</h4>
        <p>${STEPS.length} steps, each with its source, screen, entry conditions and exit conditions, per track. The same four are given for each flow and each phase.</p>
        <div><button class="linklike" data-view="blueprint">Open the blueprint</button></div></div>
    </div>

    <h3 class="doc-h3">Configured per market, built once</h3>
    <p class="doc-sub" style="margin-bottom:12px;">One journey, one check-in form, one set of states. A market changes defaults, documents and copy, not the build. India is listed to settle its row; the screens show the UAE and Australia. Switch the market at the top to see each one.</p>
    <div class="bp-scroll"><table class="cmp-tbl mkt">
      <thead><tr><th style="width:190px;">Setting</th><th>UAE</th><th>India</th><th>Australia</th></tr></thead>
      <tbody>${MARKET_CONFIG.map(([k, ae, ind, au]) => `<tr><td><b>${k}</b></td><td>${ae}</td><td class="${/confirm|Not shown/.test(ind) ? "muted" : ""}">${ind}</td><td>${au}</td></tr>`).join("")}</tbody></table></div>
    <div class="decide" style="margin-top:12px;">
      <div><b>Shared by every market</b>The check-in form schema, rendered twice: as the staff form and as the seat QR page. CHECKED IN, with how it happened (staff or QR). The token, the ground TV, the Yardie's tasks, the stage bar, the visit page and the funnel.</div>
      <div><b>Set per market</b>The default check-in way, documents, credit check, currency, address format, privacy wording, road rules, and the hub with its seat QR. In the build these are tenant settings (cars24-ae, cars24-au), not code.</div>
    </div>

    <h3 class="doc-h3">Taken from the Leadverse TD Journey file</h3>
    <div class="fig-strip">
      <div><b>Stage bar</b>The file has Check-in, DL verify, TD booked, TD live, Disposition. Kept, and reordered to the journey: Check-in, Car finding, Ready to drive (with DL verify), TD live, Disposition.</div>
      <div><b>Check-in form</b>Details and Send OTP, OTP, a checked-in confirmation, and the purpose of the visit for walk-ins. The same form is now also the seat QR page.</div>
      <div><b>Lead pane</b>AI summary, contact actions, finance (credit score, pre-approval) and documents, on every step of the visit, now with the token.</div>
      <div><b>TD live and disposition</b>LIVE and TD done badges, live note and transcription with a timer, then outcome, primary objection and agent notes.</div>
    </div>

    <h3 class="doc-h3">What this does to the Test Drive Console</h3>
    <div class="bp-scroll"><table class="cmp-tbl">
      <thead><tr><th style="width:150px;">Who</th><th>Console today</th><th>PISTON screens</th><th>Effect</th></tr></thead>
      <tbody>
        <tr><td><b>Calling agent</b></td><td class="seq">Not in the Console</td><td class="seq">P1 Queue (tabs) &rarr; P2 Orders and interest &rarr; P3 Discovery if unsure &rarr; P4 TD type per car &rarr; P5 Hub slot / P6 Video slot &rarr; P7 Book</td><td>A new persona in Tasks (b2c-lead-td-booking-by-cc). An order exists, or the call creates one per car; one call can book a hub TD and a video TD.</td></tr>
        <tr><td><b>Receptionist</b>, walk-in</td><td class="seq">Customer details &rarr; Select car &rarr; Order created &rarr; Check-in &rarr; Assign DA</td><td class="seq">I1 Check-in (the form creates the lead) &rarr; S1 DA assigned automatically</td><td>Car choice and the order move to the DA, after the handshake. The receptionist assigns a DA only when every DA is busy.</td></tr>
        <tr><td><b>Receptionist</b>, booked</td><td class="seq">Check-in &rarr; Assign DA</td><td class="seq">I1 Check-in, or the customer does it from the seat QR &rarr; S1 automatic</td><td>No Mark arrived: check-in is the arrival. No licence check at the desk.</td></tr>
        <tr><td><b>Customer</b></td><td class="seq">Not in the Console</td><td class="seq">Seat QR &rarr; Mobile and OTP &rarr; About today &rarr; Consent &rarr; Token page</td><td>A public page outside Leadverse, then a live token page with the same status as the TV.</td></tr>
        <tr><td><b>Yardie</b></td><td class="seq">Not in the Console</td><td class="seq">S2 Bring the booked car &rarr; O1 Prep and bring a walk-in's car</td><td>A new persona with a mobile task list. Each tap updates the TV and tells the DA.</td></tr>
        <tr><td><b>Everyone in the hub</b></td><td class="seq">Not in the Console</td><td class="seq">I2 Ground TV</td><td>Tokens with status, DA and car, moved only by staff actions.</td></tr>
        <tr><td><b>DA</b></td><td class="seq">Conduct TD &rarr; Select VAS &rarr; Confirm VAS &rarr; Payment &rarr; Token paid</td><td class="seq">Booked: T1 Handshake and Start TD &rarr; O3 Consent &rarr; O4 DL &rarr; O5&ndash;O7 &rarr; N1&ndash;N3. Walk-in: T1 Handshake &rarr; T2 Needs and cars &rarr; T4 Promise &rarr; T5 Book now &rarr; O2 Start TD &rarr; O3 Consent &rarr; O4 DL &rarr; O5&ndash;O7 &rarr; N1&ndash;N3</td><td>The DA's journey starts at the handshake; for a booking, the handshake starts the TD. For a walk-in, the DA books the current slot, then comes back when the car reaches the hub. VAS moves into the delivery journey.</td></tr>
        <tr><td><b>Manager</b></td><td class="seq">Oversight table</td><td class="seq">M1 Live funnel</td><td>Each state becomes a funnel row, with time between states: checked in, DA assigned, met, car at the hub, DL verified, and on.</td></tr>
      </tbody></table></div>

    <h3 class="doc-h3">New in the data model</h3>
    <div class="decide">
      <div><b>A visit before an order</b>A walk-in checks in with no car, so the journey keys on a visit (VS-2041) until T5 creates the order (BK-89004).</div>
      <div><b>One visit, several drives</b>Each car gets its own TD record, consent and recording, from Start TD to End TD. The licence is checked once per visit. A second car is a second order, booked the same way.</div>
      <div><b>A queue token</b>One per check-in: hub, day, B or W, and a number. Its status on the TV and the phone is derived from state events, never typed. Not to be confused with the payment token (TOKEN PAID).</div>
      <div><b>A yard task</b>Bring, or prep and bring: the car, from a yard spot, to a bay, with picked-up and at-hub times. It moves the TV's car column and pushes the DA.</div>
      <div><b>New states</b>CHECKED IN (now also the arrival), DA ASSIGNED, CAR AT HUB, DL VERIFIED and TD CONSENT SIGNED. MET CUSTOMER already exists for DAP hub work orders.</div>
      <div><b>How a check-in happened</b>Staff or seat QR. The QR page autosaves each part, so staff can take over without retyping.</div>
      <div><b>Payment from the gateway</b>TOKEN PAID comes from the payment webhook. The Console's Mark as paid button is a prototype shortcut only.</div>
    </div>

    <h3 class="doc-h3">Decisions needed</h3>
    <div class="decide">
      <div><b>A booked customer who wants another car</b>A booking has no car finding: the handshake starts the drive. If they change their mind on the day, is that a new order (N6), or can the DA add a car at the handshake?</div>
      <div><b>A walk-in into the current slot</b>The walk-in is booked into the slot they are in. When it is full, book the next one today, or let the hub go over its cap?</div>
      <div><b>Orders without an email</b>An order needs a mobile and an email, so a mobile-only enquiry stays a contact with appointment IDs until the call adds the email. Confirm OMS keeps that rule, and whether a missing email should block the TD booking.</div>
      <div><b>One call, two bookings</b>A mixed call books a hub TD and a video TD at once, with one order per car. Confirm the slot planner holds both from one task, and who owns the video one.</div>
      <div><b>Finance links after check-in</b>The pre-approval and listing pages, and the pre-approval status, come from consumer web. Confirm the URLs, and whether "own loan" customers should also see pre-approval when they are already pre-approved.</div>
      <div><b>Token order</b>B for bookings, served at their slot time, and W for walk-ins, in arrival order, on one board. Or one queue for everyone?</div>
      <div><b>Names on the TV</b>The board shows the token with a first name and initial. The TV is in a public room: is the token alone enough?</div>
      <div><b>The auto-assignment rule</b>Free now, under today's cap, a free slot for the next hour, then the booking's DA or the best language. When every DA is busy, does the receptionist or the manager pick?</div>
      <div><b>The Yardie's device</b>A Leadverse mobile view, or a separate app. The yard is about 500 m away, so it must work on mobile data.</div>
      <div><b>No licence, found late</b>With the licence checked after Start TD and the consent, a customer without one finds out at the car, and the started TD is cancelled. Ask one question at check-in (Do you have your licence with you?) and still verify at O4?</div>
      <div><b>The S phase name</b>Check-in moved into Introduce, so S now covers the DA and the car. These screens call it Set up. Keep that, or rename?</div>
      <div><b>An I'm here link</b>Booked customers could also check in from a link in the day-of reminder, skipping the OTP. Add it next to the seat QR?</div>
      <div><b>Where the customer pages live</b>Consumer web (cars24.ae, cars24.com.au) or public pages from Leadverse's form renderer. Either way the seat QR page must render the staff form's schema, so the two never drift apart.</div>
      <div><b>Token updates in Australia</b>The token and its tracker link go out on WhatsApp. If WhatsApp reaches too few customers in Australia, send them by SMS there.</div>
      <div><b>Licence on the phone</b>Optional on the seat QR page, because the DA can scan it at the car. Australia may want it required for walk-ins.</div>
      <div><b>Video TD check-in</b>Still an OTP on the call, now in the same step as the welcome. Its join link is already personal, so these questions could move to the page before the call.</div>
      <div><b>VAS before the token?</b>The Console sells VAS before payment, following the earlier rule. PISTON leaves VAS to the delivery journey so nothing sits between ready to buy and the token. Pick one.</div>
      <div><b>The DA's device</b>These screens assume a tablet for the DA on the floor. Leadverse is desktop-first today.</div>
      <div><b>Recording consent</b>Asked at check-in; the recording runs from Start TD to End TD. The screens assume a customer can say no and still get the full visit, with AI notes off.</div>
      <div><b>An order before the car is final</b>P3 creates the order with the lead's car of interest, and P6 can change the car. Confirm OMS allows that, or create the order at P6 when the lead has no car yet.</div>
      <div><b>Gender and pincode at check-in</b>The TD Journey file asks for both. The screens use emirate and area instead of a pincode and leave gender out. Add gender back only if something uses it.</div>
      <div><b>Credit score</b>The file shows a CIBIL score, which is Indian. The screens show an AECB score for the UAE. Confirm Leadverse can read it.</div>
    </div>
  </div>`;
}

// ================================================================== render + events
function render() {
  CTX.mode = VS.mode;
  if (CTX.market !== VS.market) applyMarket(VS.market);
  document.querySelectorAll(".pv-view").forEach(v => v.classList.toggle("on", v.id === "view-" + VS.view));
  renderTop();
  if (VS.view === "walk") { renderRail(); renderSpec(); renderStage(); }
  if (VS.view === "blueprint") renderBlueprint();
  if (VS.view === "fields") renderFields();
  if (VS.view === "changes") renderChanges();
  writeHash();
  drawIcons();
  if (VS.view === "walk") { fitStage(); drawPins(); }
}

function setTab(tab) {
  VS.tab = tab;
  renderSpec();
  renderStage();
  drawIcons();
  fitStage();
  drawPins();
}

document.addEventListener("click", (e) => {
  if (e.target.closest(".scr")) return;
  if (e.target.closest("[data-focus]")) { $("#view-walk").classList.toggle("focus"); renderStage(); drawIcons(); fitStage(); drawPins(); return; }
  const pins = e.target.closest("[data-pins]");
  if (pins && !pins.disabled) { setTab(VS.tab === "anatomy" ? "spec" : "anatomy"); return; }
  const sp = e.target.closest("[data-sptab]");
  if (sp) { setTab(sp.dataset.sptab); return; }
  const mk = e.target.closest("[data-market]");
  if (mk && !mk.dataset.step) { setMarket(mk.dataset.market); return; }
  const way = e.target.closest("[data-mode-set]");
  if (way) { setMode(way.dataset.modeSet); return; }
  const tr = e.target.closest("[data-track]");
  if (tr) { setTrack(tr.dataset.track); return; }
  const vw = e.target.closest("[data-view]");
  if (vw) { VS.view = vw.dataset.view; render(); const d = document.querySelector(".pv-view.on .pv-doc"); if (d) d.scrollTop = 0; return; }
  const ph = e.target.closest("[data-phase]");
  if (ph) { const first = stepsForTrack(VS.track).find(s => s.phase === ph.dataset.phase); if (first) go(first.id); return; }
  const nav = e.target.closest("[data-nav]");
  if (nav && !nav.disabled) {
    const list = stepsForTrack(VS.track);
    const i = list.findIndex(x => x.id === VS.step) + Number(nav.dataset.nav);
    if (list[i]) go(list[i].id);
    return;
  }
  const st = e.target.closest("[data-step]");
  if (st) {
    if (st.dataset.anatomy) VS.tab = "anatomy";
    if (st.dataset.market && st.dataset.market !== VS.market) { VS.market = st.dataset.market; VS.mode = MARKETS[VS.market].checkin; }
    if (st.dataset.mode) VS.mode = st.dataset.mode;
    if (st.dataset.inTrack) VS.track = st.dataset.inTrack;
    go(st.dataset.step);
  }
});

document.addEventListener("keydown", (e) => {
  if (VS.view !== "walk") return;
  if (e.target.closest("input, textarea, select, [contenteditable]")) return;
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const list = stepsForTrack(VS.track);
  const i = list.findIndex(x => x.id === VS.step) + (e.key === "ArrowRight" ? 1 : -1);
  if (list[i]) { e.preventDefault(); go(list[i].id); }
});

if (window.ResizeObserver) new ResizeObserver(() => { fitStage(); drawPins(); }).observe($("#pv-stage"));
window.addEventListener("resize", () => { fitStage(); drawPins(); });
window.addEventListener("hashchange", () => { readHash(); render(); });

readHash();
render();
