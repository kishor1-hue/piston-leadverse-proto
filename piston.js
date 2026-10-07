// ---- PISTON screen spec: viewer ----
// Walkthrough (journey rail | Leadverse screen | spec), Blueprint (every step's depth as a table)
// and What changed (the review notes applied). Deep links: #booked-S1, #walkin-T2, #vtd-O2, #blueprint, #changes.

document.body.classList.add("pv");

const VS = { track: "booked", step: "P1", view: "walk" };
const $ = (sel) => document.querySelector(sel);
const icon = (n) => `<i data-lucide="${n}" class="icon"></i>`;
function drawIcons() { if (window.lucide) lucide.createIcons(); }

const DEVICE_META = {
  desktop: { icon: "monitor", label: "Leadverse web" },
  tablet: { icon: "tablet", label: "Leadverse on the DA's tablet" },
  customer: { icon: "hand", label: "DA's tablet, turned to the customer" },
  video: { icon: "video", label: "Leadverse web with a video panel" },
  none: { icon: "user-round", label: "No screen, a human moment" },
};
const BUILD_LABEL = { reuse: "Reuse", extend: "Extend", new: "New", none: "No build" };
const TRACK_COLOR = { booked: ["var(--trk-booked)", "var(--trk-booked-bg)"], walkin: ["var(--trk-walkin)", "var(--trk-walkin-bg)"], vtd: ["var(--trk-vtd)", "var(--trk-vtd-bg)"] };

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
  if (h === "blueprint" || h === "changes") { VS.view = h; return; }
  const m = h.match(/^(booked|walkin|vtd)-([A-Z]\d)$/);
  if (m && stepById(m[2]) && stepById(m[2]).tracks.includes(m[1])) { VS.view = "walk"; VS.track = m[1]; VS.step = m[2]; }
}
function writeHash() {
  const h = VS.view === "walk" ? `${VS.track}-${VS.step}` : VS.view;
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
function setTrack(t) {
  VS.track = t;
  if (!stepById(VS.step).tracks.includes(t)) {
    // nearest step of the same phase in the new track, else the first step
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
  $("#pv-tracks").innerHTML = Object.values(TRACKS).map(tk =>
    `<button class="${VS.track === tk.key ? "on" : ""}" data-track="${tk.key}" role="tab" aria-selected="${VS.track === tk.key}"><span class="tdot" style="background:${TRACK_COLOR[tk.key][0]}"></span>${tk.label}</button>`).join("");
  $("#pv-views").innerHTML = [["walk", "Walkthrough", "presentation"], ["blueprint", "Blueprint", "table-2"], ["changes", "What changed", "git-pull-request-arrow"]].map(([k, l, ic]) =>
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
      <div><i style="font-style:italic;">Italic</i>&nbsp;is a branch, taken on some exits</div>
      <div>${icon("monitor")}Web &nbsp;${icon("tablet")}Tablet &nbsp;${icon("hand")}Customer</div>
      <div>${icon("video")}Video panel &nbsp;${icon("user-round")}No screen</div>
    </div>`;
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
  $("#pv-stagehead").innerHTML = `<span class="pv-devchip">${icon(meta.icon)}${meta.label}</span><span class="pv-scrname">${s.id} &middot; ${pick(s.screen.name, t)}</span>
    <button class="pv-navbtn pv-focus" data-focus>${icon(focus ? "minimize-2" : "maximize-2")}${focus ? "Show steps and spec" : "Screen only"}</button>`;

  let html;
  if (dev === "none" || !SCREENS[s.id]) {
    html = `<div class="dev dev-none" data-kind="none">${noneCard(s, t)}</div>`;
  } else if (dev === "tablet" || dev === "customer") {
    html = `<div class="dev dev-tablet" data-kind="tablet"><span class="cam"></span><div class="viewport"><div class="scr">${SCREENS[s.id](t)}</div></div></div>`;
  } else {
    const route = pick(s.screen.route, t) || "";
    html = `<div class="dev dev-desktop" data-kind="desktop"><div class="urlbar">${icon("lock")}<span class="u">c24-lead-verse-ui.cars24.team${route}</span></div><div class="viewport"><div class="scr">${SCREENS[s.id](t)}</div></div></div>`;
  }
  $("#pv-stage").innerHTML = html;
  const scr = $("#pv-stage .scr");
  if (scr) mountScreen(scr);
  fitStage();

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

// in-screen behaviour: exits (data-go), chips, switches, OTP, tabs, compare, zones, signature
function mountScreen(root) {
  root.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); if (!el.disabled) go(el.dataset.go); }));
  root.querySelectorAll("[data-pick]").forEach(el => el.addEventListener("click", () => {
    const g = el.dataset.pick;
    if (g === "multi") el.classList.toggle("on");
    else el.parentElement.querySelectorAll(`[data-pick="${g}"]`).forEach(x => x.classList.toggle("on", x === el));
  }));
  root.querySelectorAll("[data-sw]").forEach(el => el.addEventListener("click", () => el.classList.toggle("on")));
  root.querySelectorAll("[data-zone]").forEach(el => el.addEventListener("click", () => el.classList.toggle("done")));
  root.querySelectorAll("[data-otp-verify]").forEach(btn => btn.addEventListener("click", () => {
    const w = btn.closest(".otp-wrap");
    w.querySelector(".otp").classList.add("ok");
    btn.hidden = true;
    w.querySelector(".okline").hidden = false;
  }));
  root.querySelectorAll("[data-tabs] [data-tab]").forEach(btn => btn.addEventListener("click", () => {
    btn.parentElement.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === btn));
    root.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== btn.dataset.tab; });
  }));
  root.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => { const o = root.querySelector("#" + b.dataset.open); if (o) o.classList.add("open"); }));
  root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { const o = root.querySelector("#" + b.dataset.close); if (o) o.classList.remove("open"); }));
  root.querySelectorAll("[data-sel]").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".pcar");
    const on = !card.classList.contains("sel");
    card.classList.toggle("sel", on);
    b.classList.toggle("primary", on);
    b.innerHTML = on ? `${icon("check")}Driving today` : "Add to today's drives";
    drawIcons();
  }));
  root.querySelectorAll(".da-row").forEach(row => row.addEventListener("click", () => {
    if (row.classList.contains("disabled")) return;
    root.querySelectorAll(".da-row").forEach(r => r.classList.toggle("selected", r === row));
  }));
  mountSignature(root);
  drawIcons();
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
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0F172A";
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

// ================================================================== walkthrough: spec panel
function exitRow(x, t) {
  const to = x.to ? stepById(x.to) : null;
  const target = to
    ? `<button class="goto" data-step="${to.id}">${icon("arrow-right")}<span class="gid">${to.id}</span>${to.name}</button>`
    : `<span class="goto end">${icon("square")}Journey ends</span>`;
  return `<div class="ex"><div class="w">${pick(x.when, t)}</div><div class="r">${target}${x.state ? `<span class="hex ${stateTone(x.state)}">${x.state}</span>` : ""}</div></div>`;
}

function renderSpec() {
  const s = stepById(VS.step), t = VS.track, ph = phaseById(s.phase);
  const [fg, bg] = TRACK_COLOR[t];
  const dev = DEVICE_META[pick(s.device, t)];
  const changed = pick(s.changed, t);
  const exits = pick(s.exits, t) || [];
  const state = pick(s.state, t);
  const build = pick(s.screen.build, t);
  const route = pick(s.screen.route, t);
  const dap = pick(s.dap, t);
  $("#pv-spec").innerHTML = `
    <div class="sp-eyebrow">${ph.id} &middot; ${ph.name}<span class="trk" style="color:${fg}; background:${bg};">${TRACKS[t].label}</span></div>
    <div class="sp-title"><span class="sid">${s.id}</span><h2>${s.name}</h2></div>
    <p class="sp-purpose">${pick(s.purpose, t)}</p>
    <div class="sp-meta"><span>${icon("user-round")}${pick(s.owner, t)}</span><span>${icon(dev.icon)}${dev.label}</span>${s.branch ? `<span>${icon("git-branch")}Branch</span>` : ""}</div>
    ${changed ? `<div class="sp-changed">${icon("pencil")}<div>${changed}</div></div>` : ""}
    <div class="sp-sec"><h4>${icon("radio-tower")}Source</h4>
      <div class="lbl">Triggered by</div><p>${pick(s.source.trigger, t)}</p>
      <div class="lbl">Data from</div><ul class="sp-list data">${(pick(s.source.data, t) || []).map(d => `<li>${icon("database")}<span>${d}</span></li>`).join("")}</ul></div>
    <div class="sp-sec"><h4>${icon("app-window")}Screen</h4>
      <p><b>${pick(s.screen.name, t)}</b> <span class="build ${build}">${BUILD_LABEL[build]}</span></p>
      <p style="color:var(--muted); margin-top:4px;">${pick(s.screen.pattern, t)}</p>
      ${route ? `<code class="sp-route">${route}</code>` : ""}</div>
    <div class="sp-sec"><h4>${icon("log-in")}Entry conditions</h4>
      <ul class="sp-list">${(pick(s.entry, t) || []).map(e => `<li>${icon("check")}<span>${pick(e, t)}</span></li>`).join("")}</ul></div>
    <div class="sp-sec"><h4>${icon("log-out")}Exit conditions</h4><div class="sp-exit">${exits.map(x => exitRow(x, t)).join("")}</div></div>
    <div class="sp-sec"><h4>${icon("hexagon")}State it records</h4>${state ? `<span class="hex ${stateTone(state)}">${state}</span>` : `<p style="color:var(--muted);">No new funnel state. Progress shows in the exits.</p>`}</div>
    ${dap ? `<div class="sp-sec"><h4>${icon("history")}DAP today</h4><div class="sp-dap">${dap}</div></div>` : ""}`;
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
            <td><div class="exi">${(pick(s.exits, t) || []).map(x => `<div><span>${pick(x.when, t)}</span> &rarr; <b>${x.to || "end"}</b></div>`).join("")}</div></td>
            <td>${st ? `<span class="hex ${stateTone(st)}">${st}</span>` : `<span style="color:var(--faint);">&mdash;</span>`}</td>
          </tr>`;
        }).join("")}</tbody></table></div></div>`;
  };
  $("#pv-blueprint").innerHTML = `<div class="wrap">
    <h1 class="doc-h">One level deeper, for every step</h1>
    <p class="doc-sub">Source, screen, entry conditions and exit conditions at three levels: the flow, the phase and the step. Click any row to open its screen. Switch the track at the top to see booked, walk-in or video.</p>
    <h3 class="doc-h3">The three flows</h3>
    <div class="flow-cards">${["booked", "walkin", "vtd"].map(flowCard).join("")}</div>
    <h3 class="doc-h3">Phase and step level &middot; ${TRACKS[t].label}</h3>
    ${PHASES.map(phaseBlock).join("")}
  </div>`;
}

// ================================================================== what changed view
function stepLink(id, label) { return `<button class="linklike" data-step="${id}">${id}${label ? " " + label : ""}</button>`; }

function renderChanges() {
  $("#pv-changes").innerHTML = `<div class="wrap">
    <h1 class="doc-h">What changed after review</h1>
    <p class="doc-sub">Three notes on the PISTON board. Here is what each one does to the journey, and to the Leadverse Test Drive Console built earlier.</p>
    <div class="chg-cards">
      <div class="chg-card"><div class="q">&ldquo;TD consent sign-off after TD start&rdquo;</div><h4>The TD consent moves to the car</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">S Check-in: OTP, DL, <em>TD declaration</em>, recording consent</span><span class="k">After</span><span class="seq">O3 Start TD &rarr; <em>O4 Consent</em> &rarr; O5 Drive</span></div>
        <p>Consent is about one drive in one car, so it needs the car, plate and start odometer that only exist once the TD starts. Not every visitor drives, so asking at the desk adds friction for nothing. It is signed once per car. A VTD needs none.</p>
        <p>DAP already unlocks the declaration only after Start Test Drive, but it checks for it at Mark Test Drive Complete, so today a customer can drive before signing. ${stepLink("O4")} makes it a gate before the car moves.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("S1", "Check-in")}${stepLink("O3", "Start TD")}${stepLink("O4", "Consent")}</div></div>
      <div class="chg-card"><div class="q">&ldquo;Handshake ke baad car finding journey&rdquo;</div><h4>One owner, from the handshake</h4>
        <div class="ba"><span class="k">Before</span><span class="seq">Front desk finds the car, the DA meets the customer at the yard. Booked customers only reconfirm.</span><span class="k">After</span><span class="seq">S2 Assign DA &rarr; <em>T1 Handshake</em> &rarr; <em>T2 Needs &rarr; T3 Cars &rarr; T4 Promise &rarr; T5 Confirm</em></span></div>
        <p>The DA meets the customer at the desk and runs car finding for everyone. A booked customer starts from their booked car, with live alternatives next to it, so a change of mind becomes a second drive instead of a lost customer.</p>
        <p>The handshake is a real state: DAP hub work orders already have MET_CUSTOMER.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">${stepLink("S2", "Assign DA")}${stepLink("T1", "Handshake")}${stepLink("T3", "Cars")}</div></div>
      <div class="chg-card"><div class="q">&ldquo;Ek level depth: source, screen, entry, exit&rdquo;</div><h4>Every step, one level deeper</h4>
        <p>${STEPS.length} steps, each with its source, its screen, its entry conditions and its exit conditions, per track. The same four are given for each flow and each phase.</p>
        <p>Every screen is a real Leadverse screen: the same sidebar, queue, journey stepper, left pane and modals as the Test Drive Console, with a proposed route for each.</p>
        <div><button class="linklike" data-view="blueprint">Open the blueprint</button></div></div>
    </div>

    <h3 class="doc-h3">What this does to the Test Drive Console</h3>
    <div class="bp-scroll"><table class="cmp-tbl">
      <thead><tr><th style="width:150px;">Who</th><th>Console today</th><th>PISTON v2 screens</th><th>Effect</th></tr></thead>
      <tbody>
        <tr><td><b>Receptionist</b>, walk-in</td><td class="seq">Customer details &rarr; Select car &rarr; Order created &rarr; Check-in &rarr; Assign DA</td><td class="seq">I1 New walk-in &rarr; S1 Check-in &rarr; S2 Assign DA</td><td>Car choice and order creation move to the DA, after the handshake. The visit exists before the order.</td></tr>
        <tr><td><b>Receptionist</b>, booked</td><td class="seq">Check-in &rarr; Assign DA</td><td class="seq">I1 Mark arrived &rarr; S1 Check-in &rarr; S2 Assign DA</td><td>Adds an arrival event and recording consent. No TD consent at the desk.</td></tr>
        <tr><td><b>DA</b></td><td class="seq">Conduct TD &rarr; Select VAS &rarr; Confirm VAS &rarr; Payment &rarr; Token paid</td><td class="seq">T1 Handshake &rarr; T2&ndash;T5 Car finding &rarr; O1&ndash;O6 Test drive &rarr; N1 Debrief &rarr; N2 Token &rarr; N3 Handoff</td><td>The DA's journey starts at the handshake and now covers car finding and the drive itself. VAS moves into the delivery journey.</td></tr>
        <tr><td><b>Manager</b></td><td class="seq">Oversight table</td><td class="seq">M1 Live funnel</td><td>Each hexagon on the board becomes a funnel row, with time between states.</td></tr>
      </tbody></table></div>

    <h3 class="doc-h3">New in the data model</h3>
    <div class="decide">
      <div><b>A visit before an order</b>A walk-in checks in with no car, so the journey keys on a visit (VS-2041) until T5 creates the order (BK-89004).</div>
      <div><b>One visit, several drives</b>Each car gets its own TD record and its own consent. A booked customer can add a second car without a new booking.</div>
      <div><b>Three new states</b>Arrival (an event), TD CONSENT SIGNED, and MET CUSTOMER, which DAP already has for hub work orders.</div>
      <div><b>Payment from the gateway</b>TOKEN PAID comes from the payment webhook. The Console's Mark as paid button is a prototype shortcut only.</div>
    </div>

    <h3 class="doc-h3">Decisions needed</h3>
    <div class="decide">
      <div><b>VAS before the token?</b>The Console sells VAS before payment, following the earlier rule. PISTON, which she approved, leaves VAS to the delivery journey so nothing sits between ready to buy and the token. Pick one.</div>
      <div><b>The DA's device</b>These screens assume a tablet for the DA on the floor. Leadverse is desktop-first today, so this is new layout work.</div>
      <div><b>Recording consent</b>The screens assume a customer can say no and still get the full visit, with AI notes off.</div>
      <div><b>No valid licence</b>The screens allow car finding and block the drive. Confirm this, and whether a home-country licence is accepted.</div>
    </div>
  </div>`;
}

// ================================================================== render + events
function render() {
  document.querySelectorAll(".pv-view").forEach(v => v.classList.toggle("on", v.id === "view-" + VS.view));
  renderTop();
  if (VS.view === "walk") { renderRail(); renderStage(); renderSpec(); }
  if (VS.view === "blueprint") renderBlueprint();
  if (VS.view === "changes") renderChanges();
  writeHash();
  drawIcons();
  if (VS.view === "walk") fitStage();
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-focus]")) { $("#view-walk").classList.toggle("focus"); renderStage(); drawIcons(); return; }
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
  if (st && !e.target.closest(".scr")) { go(st.dataset.step); }
});

document.addEventListener("keydown", (e) => {
  if (VS.view !== "walk") return;
  if (e.target.closest("input, textarea, select, [contenteditable]")) return;
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const list = stepsForTrack(VS.track);
  const i = list.findIndex(x => x.id === VS.step) + (e.key === "ArrowRight" ? 1 : -1);
  if (list[i]) { e.preventDefault(); go(list[i].id); }
});

if (window.ResizeObserver) new ResizeObserver(() => fitStage()).observe($("#pv-stage"));
window.addEventListener("resize", fitStage);
window.addEventListener("hashchange", () => { readHash(); render(); });

readHash();
render();
