// ---- PISTON screen spec: viewer ----
// Walkthrough (journey rail | Leadverse screen | spec or anatomy), Blueprint (every step's depth as a table),
// Fields (every field on every screen) and What changed (the review notes applied).
// Market (UAE or Australia) and check-in way (at the desk or by link) apply to every view.
// Deep links: #booked-S1, #walkin-T2, #vtd-O2, #blueprint, #fields, #changes. Prefix au- for Australia
// (#au-booked-S1) and add -desk or -link when the check-in way differs from the market default (#booked-S1-link).

document.body.classList.add("pv");

const VS = { track: "booked", step: "P1", view: "walk", tab: "spec", market: "ae", mode: "desk" };
const $ = (sel) => document.querySelector(sel);
const icon = (n) => `<i data-lucide="${n}" class="icon"></i>`;
function drawIcons() { if (window.lucide) lucide.createIcons(); }

const DEVICE_META = {
  desktop: { icon: "monitor", label: "Leadverse web" },
  tablet: { icon: "tablet", label: "Leadverse on the DA's tablet" },
  customer: { icon: "hand", label: "DA's tablet, turned to the customer" },
  video: { icon: "video", label: "Leadverse web with a video panel" },
  pair: { icon: "smartphone", label: "Customer's phone + web" },
  none: { icon: "user-round", label: "No screen, a human moment" },
};
const BUILD_LABEL = { reuse: "Reuse", extend: "Extend", new: "New", none: "No build" };
const TRACK_COLOR = { booked: ["var(--trk-booked)", "var(--trk-booked-bg)"], walkin: ["var(--trk-walkin)", "var(--trk-walkin-bg)"], vtd: ["var(--trk-vtd)", "var(--trk-vtd-bg)"] };
const VIEWS = [["walk", "Walkthrough", "presentation"], ["blueprint", "Blueprint", "table-2"], ["fields", "Fields", "list-tree"], ["changes", "What changed", "git-pull-request-arrow"]];

const MODE_STEPS = ["I1", "I2", "S1", "S2", "T1"];
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
  const way = h.match(/^(.+)-(desk|link)$/);
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
  if (!stepById(VS.step).tracks.includes(t)) {
    const same = stepsForTrack(t).find(s => s.phase === stepById(VS.step).phase);
    VS.step = (same || stepsForTrack(t)[0]).id;
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
    `<button class="${VS.market === mk.key ? "on" : ""}" data-market="${mk.key}" role="tab" aria-selected="${VS.market === mk.key}" title="${mk.label}: check-in ${CHECKIN_WAYS[mk.checkin].label.toLowerCase()} by default">${mk.label}</button>`).join("");
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
          <span class="sid">${s.id}</span><span class="snm">${s.name}</span>${pick(s.changed, t) ? `<span class="chg" title="Changed after review"></span>` : ""}<i data-lucide="${dev.icon}" class="icon dev"></i></button>`;
      }).join("")}
    </div>`).join("") + `
    <div class="pv-legend">
      <div><span class="chg"></span>Changed after review</div>
      <div><span class="pinl"></span>Anatomy pin: a numbered part</div>
      <div><i style="font-style:italic;">Italic</i>&nbsp;is a branch, taken on some exits</div>
      <div>${icon("monitor")}Web &nbsp;${icon("tablet")}Tablet &nbsp;${icon("hand")}Customer</div>
      <div>${icon("video")}Video panel &nbsp;${icon("user-round")}No screen</div>
      <div>${icon("smartphone")}Customer's phone next to the panel</div>
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
  } else if (dev === "pair" && PHONES[s.id]) {
    const route = pick(s.screen.route, t) || "";
    html = `<div class="dev dev-pair" data-kind="pair">
      <div class="pair-col"><span class="pair-lbl">${icon("monitor")}Receptionist &middot; Leadverse</span>
        <div class="dev dev-desktop"><div class="urlbar">${icon("lock")}<span class="u">c24-lead-verse-ui.cars24.team${route}</span></div><div class="viewport"><div class="scr">${SCREENS[s.id](t)}</div></div></div></div>
      <div class="pair-col"><span class="pair-lbl">${icon("smartphone")}Customer's phone &middot; the form only</span>
        <div class="dev dev-phone"><div class="viewport"><div class="scr scr-ph">${PHONES[s.id](t)}</div></div></div></div>
    </div>`;
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
  if (kind === "pair") {
    const W = availW, H = availH - 26;
    const deskFor = (sp) => Math.min(1, (W - 24 - (360 * sp + 20) - 2) / 1180, (H - 32) / 760);
    let sp, sd;
    if (narrow) { sd = Math.max(0.18, Math.min(1, (W - 2) / 1180)); sp = Math.max(0.4, Math.min(1, (W - 20) / 360)); }
    else {
      sp = Math.min(1, (H - 20) / 740);
      sd = deskFor(sp);
      if (sd < 0.42) { sp = Math.max(0.45, Math.min(sp, (W - 46 - 0.42 * 1180) / 360)); sd = deskFor(sp); }
      sd = Math.max(0.18, sd);
    }
    const size = (box, w, h, k) => { const vp = box.querySelector(".viewport"); vp.style.width = Math.round(w * k) + "px"; vp.style.height = Math.round(h * k) + "px"; box.querySelector(".scr").style.transform = `scale(${k})`; };
    size(dev.querySelector(".dev-desktop"), 1180, 760, sd);
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
  };
  root.querySelectorAll("[data-step-to]").forEach(b => b.addEventListener("click", () => { const [g, s] = b.dataset.stepTo.split(":"); showFlow(g, s); }));
  root.querySelectorAll("[data-close-flow]").forEach(b => b.addEventListener("click", () => { const p = b.closest("[data-flow]"); if (p) showFlow(p.dataset.flow, null); }));
  root.querySelectorAll("[data-open-flow]").forEach(b => b.addEventListener("click", () => showFlow(b.dataset.openFlow, "details")));
  // single overlays (drawer, compare): data-open="id" and data-close="id"
  const dims = () => root.querySelectorAll("[data-drawer-dim]");
  root.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => { const o = root.querySelector("#" + b.dataset.open); if (o) { o.hidden = false; dims().forEach(d => { d.hidden = false; }); } }));
  root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { const o = root.querySelector("#" + b.dataset.close); if (o) o.hidden = true; dims().forEach(d => { d.hidden = true; }); }));
  // pins follow the visible parts after any in-screen change
  root.addEventListener("click", () => setTimeout(drawPins, 0));
  mountSignature(root);
  drawIcons();
}

// the customer's phone drives the receptionist's panel beside it: answers (data-sync) and status events
// (data-sync-event: opened, p1, p2, submitted) update the panel's data-synced, data-on-*, data-def-*, data-cls-* and data-enable-*
function mountSync(stage) {
  const phone = stage.querySelector(".scr-ph"), panel = stage.querySelector(".dev-desktop .scr");
  if (!phone || !panel) return;
  const flash = (row) => { row.classList.add("got"); row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); };
  const fire = (ev) => {
    panel.querySelectorAll(`[data-on-${ev}]`).forEach(el => { el.innerHTML = el.getAttribute(`data-on-${ev}`); const row = el.closest("[data-sync-row]"); if (row) { row.classList.remove("skip"); flash(row); } });
    panel.querySelectorAll(`[data-def-${ev}]`).forEach(el => { const row = el.closest("[data-sync-row]"); if (row && !row.classList.contains("got")) { el.innerHTML = el.getAttribute(`data-def-${ev}`); row.classList.add("skip"); flash(row); } });
    panel.querySelectorAll(`[data-cls-${ev}]`).forEach(el => el.getAttribute(`data-cls-${ev}`).split(/\s+/).forEach(c => {
      const [from, to] = c.includes(">") ? c.split(">") : [null, c];
      if (from) el.classList.remove(from);
      el.classList.add(to);
    }));
    panel.querySelectorAll(`[data-enable-${ev}]`).forEach(el => { el.disabled = false; });
  };
  // capture phase: the phone's own choice handlers stop propagation, and the panel must still hear every tap
  phone.addEventListener("click", (e) => {
    const a = e.target.closest("[data-sync]");
    if (a) panel.querySelectorAll(`[data-synced="${a.dataset.sync}"]`).forEach(el => {
      el.innerHTML = a.dataset.syncVal || a.textContent.trim();
      const row = el.closest("[data-sync-row]");
      if (row) { row.classList.remove("skip"); flash(row); }
    });
    const ev = e.target.closest("[data-sync-event]");
    if (ev && !ev.disabled) fire(ev.dataset.syncEvent);
    setTimeout(drawPins, 0);
  }, true);
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
    ? `<button class="goto" data-step="${to.id}"${x.mode ? ` data-mode="${x.mode}"` : ""}>${icon("arrow-right")}<span class="gid">${to.id}</span>${to.name}${x.mode ? `<span class="way">${CHECKIN_WAYS[x.mode].label.toLowerCase()}</span>` : ""}</button>`
    : `<span class="goto end">${icon("square")}Journey ends</span>`;
  return `<div class="ex"><div class="w">${pick(x.when, t)}</div><div class="r">${target}${x.state ? `<span class="hex ${stateTone(x.state)}">${x.state}</span>` : ""}</div></div>`;
}

function specHead(s, t) {
  const ph = phaseById(s.phase);
  const [fg, bg] = TRACK_COLOR[t];
  const way = modeMatters(s.id, t) ? `<span class="trk way">${icon(CHECKIN_WAYS[VS.mode].icon)}${CHECKIN_WAYS[VS.mode].label}</span>` : "";
  return `<div class="sp-eyebrow">${ph.id} &middot; ${ph.name}<span class="trk" style="color:${fg}; background:${bg};">${TRACKS[t].label}</span><span class="trk mk">${MARKETS[VS.market].label}</span>${way}</div>
    <div class="sp-title"><span class="sid">${s.id}</span><h2>${s.name}</h2></div>`;
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
  return `<div class="doc-ctx"><span class="mk">${mk.key.toUpperCase()}</span><span>Showing <b>${mk.label}</b>, where check-in is <b>${CHECKIN_WAYS[mk.checkin].label.toLowerCase()}</b> by default.</span>${VS.track === "vtd" ? `<span class="muted">Video TD always checks in on the call.</span>` : modeSeg()}</div>`;
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
            <td><span class="sid">${s.id}</span> <span class="nm">${s.name}</span>${s.branch ? `<span class="branchtag">branch</span>` : ""}<div class="own">${pick(s.owner, t)}</div></td>
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
      <tbody>${rows.map(([s, [f, ty, req, src, rule]]) => `<tr data-step="${s.id}" data-anatomy="1"><td><span class="sid">${s.id}</span> <span class="nm">${s.name}</span></td><td><b>${f}</b></td><td>${ty}</td><td>${req === "Yes" || /^Yes/.test(req) ? `<span class="req">REQUIRED</span>` : req === "Read only" ? "Read only" : "No"}</td><td>${src || "&mdash;"}</td><td>${rule || "&mdash;"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }).join("");
  $("#pv-fields").innerHTML = localize(`<div class="wrap">
    <h1 class="doc-h">Every field on every screen</h1>
    <p class="doc-sub">The data dictionary behind the screens, taken from each step's anatomy: ${total} fields across ${screens} screens on the ${TRACKS[t].label} track, ${MARKETS[VS.market].label}, check-in ${CHECKIN_WAYS[t === "vtd" ? "desk" : VS.mode].label.toLowerCase()}. Click a row to open that screen with its pins.</p>
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
  $("#pv-changes").innerHTML = `<div class="wrap">
    <h1 class="doc-h">What changed after review</h1>
    <p class="doc-sub">Three notes on the PISTON board, one on how the calling team works, the Leadverse TD Journey design file, and Australia. Here is what each one does to the journey and to the screens.</p>
    <div class="chg-cards">
      <div class="chg-card wide"><div class="q">&ldquo;Build it for Australia too. After arrival: check in for the customer, or send them a check-in form link on WhatsApp or email&rdquo;</div><h4>Two ways to check in, one form, any market</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">I1 Mark arrived &rarr; S1 the receptionist checks the customer in</span><span class="k">After</span><span class="seq">I1 Mark arrived: <em>Send check-in link</em> or <em>Check in at the desk</em> &rarr; S1 on the customer's phone, or at the desk</span></div>
        <p><b>By link.</b> Mark arrived sends a one-time link on WhatsApp and email. It opens a form-only page on the customer's own phone: no Leadverse, no login, only the form. Each answer syncs to the visit as it is given, and submitting checks the customer in. The receptionist watches it on the visit page and steps in only if something is stuck: checking in at the desk keeps what was already filled.</p>
        <p><b>At the desk.</b> The receptionist fills the same form with the customer, as before. Both ways write the same check-in, so DL verify, the DA and the rest of the journey do not change.</p>
        <p><b>The market sets the default, not the product.</b> Australia defaults to the link, because customers there already check themselves in with a form. The UAE and India default to the desk. Either way can be picked for any visit, in any market. The link also proves the customer has the mobile or email it went to, so it replaces the OTP.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("I1", "Mark arrived (Australia)", { market: "au" })}${stepLink("S1", "Self check-in (Australia)", { market: "au", mode: "link" })}${stepLink("S1", "Walk-in by link", { market: "au", mode: "link", track: "walkin" })}${stepLink("S1", "Desk check-in (UAE)", { market: "ae", mode: "desk" })}${stepLink("S2", "DL verify", { market: "au", mode: "link" })}</div></div>
      <div class="chg-card"><div class="q">&ldquo;Use the Leadverse TD Journey file for design and knowledge&rdquo;</div><h4>Screens follow the Leadverse TD Journey design</h4>
        <p>White theme only. Every screen now uses that file's layout: an icon rail, a lead pane with an AI summary, contact actions, finance and documents, a stage bar (Check-in, DL verify, Car finding, TD live, Disposition), and CarGPT with live transcription.</p>
        <p>From its flows: check-in as modals with an OTP step, a checked-in screen with a QR to browse cars while waiting, and a purpose-of-visit question; DL verify as its own step; a LIVE badge and live transcription during the drive; the disposition form with outcome, primary objection and agent notes; the Add lead and Add cars drawers.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("S1", "Check-in")}${stepLink("S2", "DL verify")}${stepLink("O5", "TD live")}${stepLink("N1", "Disposition")}</div></div>
      <div class="chg-card"><div class="q">&ldquo;One more depth&rdquo;</div><h4>Every screen, taken apart</h4>
        <p>Below each screen sits its anatomy: numbered parts shown as orange pins on the screen, the fields it captures with type, source and rule, the actions it fires and what they call, and the states it can be in, like empty, error or done.</p>
        <p>The Fields view collects every field into one data dictionary for engineering.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;"><button class="linklike" data-view="fields">Open the fields</button>${stepLink("S1", "Check-in anatomy")}</div></div>
      <div class="chg-card"><div class="q">&ldquo;Capture intent should be its own persona task&rdquo;</div><h4>The booking call becomes a Tasks persona</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">P1 Capture intent on the lead page &rarr; P2 Pick a slot</span><span class="k">After</span><span class="seq"><em>P1 Lead in queue &rarr; P2 Welcome &rarr; P3 Contact &rarr; P4 Pitch &rarr; P5 Discovery &rarr; P6 Finalize &rarr; P7 Book</em></span></div>
        <p>No lead, no call: every lead with a mobile number lands as a TD booking call task. The agent captures the name, then email and mobile, and that creates the order (BOOKING INITIATED). Then the pitch, car discovery with likes and dislikes, the final car and TD or VTD, then the slot. Booking closes the task.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("P1", "Queue")}${stepLink("P3", "Contact")}${stepLink("P5", "Discovery")}${stepLink("P7", "Book")}</div></div>
      <div class="chg-card"><div class="q">&ldquo;TD consent sign-off after TD start&rdquo;</div><h4>The TD consent moves to the car</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">S Check-in: OTP, DL, <em>TD declaration</em>, recording consent</span><span class="k">After</span><span class="seq">O3 Start TD &rarr; <em>O4 Consent</em> &rarr; O5 Drive</span></div>
        <p>Consent is about one drive in one car, so it needs the car, plate and start odometer that exist only once the TD starts. It is signed once per car; a VTD needs none. DAP already unlocks the declaration only after Start Test Drive but checks it at Mark Test Drive Complete, so today a customer can drive before signing. ${stepLink("O4")} makes it a gate before the car moves.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("S1", "Check-in")}${stepLink("O3", "Start TD")}${stepLink("O4", "Consent")}</div></div>
      <div class="chg-card"><div class="q">&ldquo;Handshake ke baad car finding journey&rdquo;</div><h4>One owner, from the handshake</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">Front desk finds the car, the DA meets the customer at the yard. Booked customers only reconfirm.</span><span class="k">After</span><span class="seq">S3 Assign DA &rarr; <em>T1 Handshake</em> &rarr; <em>T2 Needs &rarr; T3 Cars &rarr; T4 Promise &rarr; T5 Confirm</em></span></div>
        <p>The DA meets the customer at the desk and runs car finding for everyone. A booked customer starts from the booked car with live alternatives beside it, plus anything liked from the waiting-area QR. The handshake is a real state: DAP hub work orders already have MET_CUSTOMER.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("S3", "Assign DA")}${stepLink("T1", "Handshake")}${stepLink("T3", "Cars")}</div></div>
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
      <div><b>Shared by every market</b>The check-in form schema, rendered twice: as the desk modal and as the customer's page. The CHECKED IN state, with how it happened (desk or link). The stage bar, the visit page and the funnel.</div>
      <div><b>Set per market</b>The default check-in way, the link channels, documents, credit check, currency, address format, privacy wording, road rules, and the hub. In the build these are tenant settings (cars24-ae, cars24-au), not code.</div>
    </div>

    <h3 class="doc-h3">Taken from the Leadverse TD Journey file</h3>
    <div class="fig-strip">
      <div><b>Stage bar</b>Check-in, DL verify, TD booked, TD live, Disposition. Kept, with Car finding in place of TD booked to match the review.</div>
      <div><b>Check-in modals</b>Details and Send OTP, OTP, a checked-in screen with a browse QR, then onboarding questions starting with the purpose of the visit.</div>
      <div><b>Lead pane</b>AI summary, contact actions, finance (credit score, pre-approval) and documents, on every step of the visit.</div>
      <div><b>TD live and disposition</b>LIVE and TD done badges, live note and transcription with a timer, then outcome, primary objection and agent notes.</div>
    </div>

    <h3 class="doc-h3">What this does to the Test Drive Console</h3>
    <div class="bp-scroll"><table class="cmp-tbl">
      <thead><tr><th style="width:150px;">Who</th><th>Console today</th><th>PISTON screens</th><th>Effect</th></tr></thead>
      <tbody>
        <tr><td><b>Calling agent</b></td><td class="seq">Not in the Console</td><td class="seq">P1 Queue &rarr; P2 Welcome &rarr; P3 Contact &rarr; P4 Pitch &rarr; P5 Discovery &rarr; P6 Finalize &rarr; P7 Book</td><td>A new persona in Tasks (b2c-lead-td-booking-by-cc). The order is created on the call and booked at its last step.</td></tr>
        <tr><td><b>Receptionist</b>, walk-in</td><td class="seq">Customer details &rarr; Select car &rarr; Order created &rarr; Check-in &rarr; Assign DA</td><td class="seq">I1 Add lead &rarr; S1 Check-in &rarr; S2 DL verify &rarr; S3 Assign DA</td><td>Car choice and order creation move to the DA, after the handshake. The visit exists before the order.</td></tr>
        <tr><td><b>Receptionist</b>, booked</td><td class="seq">Check-in &rarr; Assign DA</td><td class="seq">I1 Mark arrived &rarr; S1 Check-in &rarr; S2 DL verify &rarr; S3 Assign DA</td><td>Adds an arrival event, recording consent and a DL check. No TD consent at the desk.</td></tr>
        <tr><td><b>Customer</b>, by link</td><td class="seq">Not in the Console</td><td class="seq">Message with the link &rarr; About today &rarr; Licence &rarr; Consent &rarr; Checked in</td><td>A new public page, outside Leadverse. The receptionist's S1 becomes a live view of the answers, with the desk as the fallback.</td></tr>
        <tr><td><b>DA</b></td><td class="seq">Conduct TD &rarr; Select VAS &rarr; Confirm VAS &rarr; Payment &rarr; Token paid</td><td class="seq">T1 Handshake &rarr; T2&ndash;T5 Car finding &rarr; O1&ndash;O6 Test drive &rarr; N1 Disposition &rarr; N2 Token &rarr; N3 Handoff</td><td>The DA's journey starts at the handshake and covers car finding and the drive itself. VAS moves into the delivery journey.</td></tr>
        <tr><td><b>Manager</b></td><td class="seq">Oversight table</td><td class="seq">M1 Live funnel</td><td>Each hexagon on the board becomes a funnel row, with time between states.</td></tr>
      </tbody></table></div>

    <h3 class="doc-h3">New in the data model</h3>
    <div class="decide">
      <div><b>A visit before an order</b>A walk-in checks in with no car, so the journey keys on a visit (VS-2041) until T5 creates the order (BK-89004).</div>
      <div><b>One visit, several drives</b>Each car gets its own TD record and its own consent. A booked customer can add a second car without a new booking.</div>
      <div><b>New states</b>Arrival (an event), DL VERIFIED, TD CONSENT SIGNED, and MET CUSTOMER, which DAP already has for hub work orders.</div>
      <div><b>Payment from the gateway</b>TOKEN PAID comes from the payment webhook. The Console's Mark as paid button is a prototype shortcut only.</div>
      <div><b>How a check-in happened</b>Every check-in records its way, desk or link. The link adds its own events: sent, opened, each part saved, submitted. Answers autosave, so the desk can take over without retyping.</div>
      <div><b>A check-in link</b>One per visit, tied to the visit and to the mobile or email it went to. It carries a random token and no personal data, works until the visit ends, and a resend cancels the old one.</div>
    </div>

    <h3 class="doc-h3">Decisions needed</h3>
    <div class="decide">
      <div><b>VAS before the token?</b>The Console sells VAS before payment, following the earlier rule. PISTON, which she approved, leaves VAS to the delivery journey so nothing sits between ready to buy and the token. Pick one.</div>
      <div><b>The DA's device</b>These screens assume a tablet for the DA on the floor. Leadverse is desktop-first today.</div>
      <div><b>Recording consent</b>The screens assume a customer can say no and still get the full visit, with AI notes off.</div>
      <div><b>No valid licence</b>The screens allow car finding and block the drive. Confirm this, and whether a home-country licence is accepted.</div>
      <div><b>An order before the car is final</b>P3 creates the order with the lead's car of interest, and P6 can change the car. Confirm OMS allows that, or create the order at P6 when the lead has no car yet.</div>
      <div><b>Gender and pincode at check-in</b>The TD Journey file asks for both. The screens use emirate and area instead of a pincode and leave gender out. Add gender back only if something uses it.</div>
      <div><b>Who fills check-in</b>Settled: both, by design. By link, the customer fills it on their own phone; at the desk, the receptionist fills it with them. The market picks the default.</div>
      <div><b>WhatsApp in Australia</b>The link goes out on WhatsApp and email, as asked. If WhatsApp reaches too few customers in Australia, add SMS there as a third channel.</div>
      <div><b>How long a link lives</b>The screens assume one link per visit, valid until the visit ends, with a resend cancelling the old one. Confirm, and confirm the 5-minute nudge before the desk steps in.</div>
      <div><b>Where the customer's page lives</b>Consumer web (cars24.ae, cars24.com.au) or a public page from Leadverse's form renderer. Either way it must render the desk modal's form schema, so the two never drift apart.</div>
      <div><b>Licence on the phone</b>Optional on the form, because DL verify can scan it at the desk. Australia may want it required for walk-ins by link.</div>
      <div><b>Video TD check-in</b>Still an OTP on the call. Its join link is already personal, so these questions could move to the page before the call later.</div>
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
