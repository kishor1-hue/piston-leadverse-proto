// ---- PISTON v2: one Leadverse screen per step ----
// SCREENS[stepId](track) returns one 1180 x 760 screen, built from the same Leadverse shell,
// tokens and components as the Test Drive Console (../style.css).
// data-go="ID" on a control is that step's exit: clicking it moves the walkthrough to step ID.

const ic = (n) => `<i data-lucide="${n}" class="icon"></i>`;
const isHub = (t) => t !== "vtd";

// ================================================================== shell
function sideFull(active, manager) {
  const items = [["tasks", "package", "Tasks"], ["leads", "grid-2x2", "Leads"], ["testdrives", "car-front", "Test Drives", true]];
  if (manager) items.push(["oversight", "layout-grid", "Manager Oversight"]);
  return `<aside class="lv-sidebar">
    <div class="lv-brand"><span class="mark">${ic("refresh-cw")}</span><b>Leadverse</b></div>
    <nav class="lv-nav">${items.map(([k, icon, label, isNew]) => `<a class="${k === active ? "active" : ""}">${ic(icon)}${label}${isNew ? `<span class="new-badge">NEW</span>` : ""}</a>`).join("")}</nav>
    <div class="lv-sidebar-foot"><a>${ic("settings")}Settings</a></div>
  </aside>`;
}
function sideCompact(active) {
  const items = [["tasks", "package"], ["leads", "grid-2x2"], ["testdrives", "car-front"]];
  return `<aside class="lv-sidebar compact">
    <div class="lv-brand"><span class="mark">${ic("refresh-cw")}</span></div>
    <nav class="lv-nav">${items.map(([k, icon]) => `<a class="${k === active ? "active" : ""}">${ic(icon)}${k === "testdrives" ? `<span class="pip"></span>` : ""}</a>`).join("")}</nav>
    <div class="lv-sidebar-foot"><a>${ic("settings")}</a></div>
  </aside>`;
}
function lvHeader(crumb, who) {
  const s = PSTAFF[who];
  return `<div class="lv-header"><div class="crumb">${crumb}</div>
    <div class="lv-user"><div class="who"><b>${s.name}</b><span>${s.role} &middot; Al Quoz hub</span></div><div class="avatar">${s.init}<span class="dot"></span></div></div></div>`;
}
function deskShell({ active, who, crumb, body, manager }) {
  return `<div class="scr-shell">${sideFull(active, manager)}<div class="lv-main">${lvHeader(`Leadverse / ${crumb}`, who)}${body}</div></div>`;
}
function tabShell({ who, crumb, body }) {
  return `<div class="scr-shell">${sideCompact("testdrives")}<div class="lv-main">${lvHeader(crumb, who)}${body}</div></div>`;
}

// ================================================================== shared parts
function trackChip(t) {
  if (t === "walkin") return `<span class="chip walkin">${ic("footprints")}Walk-in</span>`;
  if (t === "vtd") return `<span class="chip vtd">${ic("video")}Video TD</span>`;
  return `<span class="chip lv">${ic("calendar-check")}Booked</span>`;
}
function lpf(label, val) { return `<div class="lp-field"><span class="lbl">${label}</span><span class="val">${val}</span></div>`; }

const STAGE_DEF = {
  hub: [["sign-in", "Sign-in", "log-in"], ["car-finding", "Car finding", "search"], ["test-drive", "Test drive", "car-front"], ["next-step", "Next step", "flag"]],
  vtd: [["sign-in", "Sign-in", "log-in"], ["car-finding", "Car finding", "search"], ["test-drive", "Video TD", "video"], ["next-step", "Next step", "flag"]],
};
const SUBSTEPS = {
  "sign-in": { hub: ["Check-in", "Assign DA"], vtd: ["Check-in"] },
  "car-finding": { all: ["Needs", "Cars", "Promise", "Confirm"] },
  "test-drive": { hub: ["Walk", "Walkaround", "Start", "Consent", "Drive", "End"], vtd: ["Walkaround", "End"] },
  "next-step": { all: ["Debrief", "Token", "Handoff"] },
};
// two levels, like Leadverse's workflow engine: journey stages (enrollments) and their steps (sub-stage enrollments)
function jbar(t, stageKey, idx, subs) {
  const stages = STAGE_DEF[isHub(t) ? "hub" : "vtd"];
  const si = stages.findIndex(s => s[0] === stageKey);
  const tabs = stages.map(([, label, icon], i) => `<span class="${i < si ? "done" : i === si ? "on" : ""}">${ic(i < si ? "check" : icon)}${label}</span>`).join("");
  const list = subs || pick(SUBSTEPS[stageKey], t);
  const steps = list.map((label, i) => {
    const cls = i < idx ? "done" : i === idx ? "active" : "";
    const dot = i < idx ? `<i data-lucide="check" class="icon" style="width:13px;height:13px;"></i>` : (i + 1);
    return `<div class="step ${cls}"><div class="step-btn"><span class="dot">${dot}</span><span class="lbl">${label}</span></div></div>`;
  }).join("");
  return `<div class="jbar"><div class="stage-tabs">${tabs}</div><div class="stepper">${steps}</div></div>`;
}
function bar(hint, buttons) {
  return `<span class="left-hint">${hint}</span><div style="display:flex; gap:8px;">${buttons.map(([label, go, kind, icon]) =>
    `<button class="btn ${kind || ""}" ${go ? `data-go="${go}"` : ""}>${icon ? ic(icon) : ""}${label}</button>`).join("")}</div>`;
}
function custStrip(t, chips, id) {
  const p = PEOPLE[t];
  return `<div class="cust-strip"><div class="lp-av">${inits(p.name)}</div>
    <div><div class="nm">${p.name}</div><div class="sub">${id || (t === "walkin" ? p.visit : p.id)} &middot; ${p.phone} &middot; ${p.language}</div></div>
    <div class="chips">${trackChip(t)}${chips || ""}<span class="chip neutral">${ic("circle-dot")}Recording on</span></div></div>`;
}
function copilot(cards) {
  return `<aside class="copilot">
    <div class="cp-head"><span class="badge">${ic("sparkles")}</span><div><b>CarGPT co-pilot</b><span>The CarGPT panel, filled in</span></div></div>
    <div class="cp-rec"><i class="dotrec"></i>Listening since check-in</div>
    ${cards.map(([k, icon, html]) => `<div class="cp-card"><div class="k">${ic(icon)}${k}</div>${html}</div>`).join("")}
  </aside>`;
}
function daDetail({ t, stage, idx, subs, body, bottom, cp, chips, id }) {
  return `<div class="da-wrap"><div class="da-col">${custStrip(t, chips, id)}${jbar(t, stage, idx, subs)}<div class="journey-body">${body}</div><div class="bottombar">${bottom}</div></div>${cp ? copilot(cp) : ""}</div>`;
}
function videoPanel({ main, pip, share }) {
  return `<div class="video">
    <div class="top"><span>${PEOPLE.vtd.name} &middot; BK-88190</span><span class="rec"><i></i>Recording</span></div>
    ${share ? `<div class="share">${ic("screen-share")}${share}</div>` : ""}
    <div class="main">${main}</div>
    ${pip ? `<div class="pip">${pip}</div>` : ""}
    <div class="ctrls"><span>${ic("mic")}</span><span>${ic("video")}</span><span>${ic("screen-share")}</span><span class="end">${ic("phone-off")}</span></div>
  </div>`;
}
const khalidTile = `<div class="who"><span class="big">KA</span>Khalid &middot; camera on</div>`;
const carTile = (cid) => `<div class="who">${ic("car")}Yard camera &middot; ${PCARS[cid].title}</div>`;
function vtdConsole({ stage, idx, subs, body, bottom, video }) {
  const t = "vtd";
  const content = `<div class="scr-body"><div class="vt-video">${video || videoPanel({ main: khalidTile, pip: "You &middot; Sara" })}</div>
    <div class="vt-col">${jbar(t, stage, idx, subs)}<div class="journey-body">${body}</div><div class="bottombar">${bottom}</div></div></div>`;
  return deskShell({ active: "testdrives", who: "operator", crumb: `<a>Test Drives</a> / <b>${PEOPLE.vtd.name}</b> <span style="color:var(--faint); font-weight:400;">&middot; Video TD</span>`, body: content });
}
// one wrapper for every DA step: the DA's tablet for hub tracks, the operator's video console for VTD
function daScreen(t, o) {
  if (!isHub(t)) return vtdConsole(o);
  const p = PEOPLE[t];
  return tabShell({ who: "da", crumb: `<a>Test Drives</a> / <b>${p.name}</b>`, body: daDetail({ t, ...o }) });
}
function customerView({ title, lead, left, right, foot }) {
  return `<div class="cv">
    <div class="cv-top"><div class="brand"><span class="mk">${ic("car-front")}</span>CARS24</div><div class="handback">${ic("hand")}Customer view &middot; hand the tablet back to Omar when done</div></div>
    <div class="cv-body"><div style="flex:1.1; min-width:0; display:flex; flex-direction:column;"><h2>${title}</h2><p class="lead">${lead}</p>${left}</div>
    <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:14px;">${right}</div></div>
    ${foot ? `<div class="bottombar">${foot}</div>` : ""}
  </div>`;
}
function otpBlock(phone, digits) {
  return `<div class="otp-wrap" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
    <div class="otp">${digits.split("").map(d => `<span class="b">${d}</span>`).join("")}</div>
    <button class="btn" data-otp-verify>${ic("shield-check")}Verify OTP</button>
    <span class="okline" hidden>${ic("circle-check")}Verified &middot; ${phone}</span></div>`;
}
function sw(on, title, text) {
  return `<div class="toggle"><button class="sw ${on ? "on" : ""}" data-sw aria-label="${title}"></button><div><b>${title}</b><span>${text}</span></div></div>`;
}
function chips(group, opts, onList) {
  return `<div class="chips-row">${opts.map(o => `<button class="pick ${onList.includes(o) ? "on" : ""}" data-pick="${group}">${o}</button>`).join("")}</div>`;
}
function leftPane(t) {
  const p = PEOPLE[t];
  const walk = t === "walkin";
  return `<div class="leftpane">
    <div class="lp-head"><div><div class="lp-av">${inits(p.name)}</div><div class="lp-name">${p.name}</div>${trackChip(t)}</div><button class="kebab">${ic("more-vertical")}</button></div>
    <div class="lp-tabs"><span class="active">Contact</span><span>Visit</span><span>Docs</span><span>Activity</span></div>
    <div class="lp-section"><div class="stitle">DETAILS &amp; CONTACT</div>
      ${lpf(walk ? "Visit ID" : "Order ID", walk ? p.visit : p.id)}${lpf("Phone", p.phone)}${lpf("Language", p.language)}${lpf("Source", p.source)}</div>
    <div class="lp-section"><div class="stitle">${walk ? "VISIT" : "BOOKING"}</div>
      ${lpf("Car", walk ? "Chosen with the DA" : PCARS[p.car].title)}${lpf("Slot", walk ? "Walk-in, now" : p.slot)}${lpf("Arrived", walk ? "2:41 PM" : "2:24 PM")}</div>
  </div>`;
}
function fdDetail({ t, idx, body, bottom, modal }) {
  return `<div class="scr-body">${leftPane(t)}<div class="journey-main">${jbar(t, "sign-in", idx)}<div class="journey-body">${body}</div><div class="bottombar">${bottom}</div></div>${modal || ""}</div>`;
}
function pcar(t, [cid, match, why], sel, cmp) {
  const c = PCARS[cid];
  const booked = t !== "walkin" && cid === PEOPLE[t].car;
  const on = sel.includes(cid);
  return `<div class="pcar ${on ? "sel" : ""}" data-car="${cid}">
    <div class="th" style="background:${c.color}">${ic("car")}${booked ? `<span class="tag chip lv">Booked</span>` : ""}<span class="match">${match}% match</span></div>
    <div class="bd"><div class="t">${c.title}</div><div class="p">${aed(c.price)}</div><div class="m">${c.km} &middot; ${c.body} &middot; ${c.drive}</div><div class="why">${why}</div></div>
    <div class="ft"><label><input type="checkbox" data-cmp ${cmp.includes(cid) ? "checked" : ""}> Compare</label><a href="${c.url}" target="_blank" rel="noopener">Full listing ${ic("external-link")}</a></div>
    <button class="btn ${on ? "primary" : ""} pickbtn" data-sel>${on ? `${ic("check")}Driving today` : "Add to today's drives"}</button>
  </div>`;
}
function qrSvg() {
  let cells = "";
  const n = 21, s = 6;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
    let on;
    if (finder) { const fx = x < 7 ? x : x - (n - 7), fy = y < 7 ? y : y - (n - 7); on = fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5); }
    else on = ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (on) cells += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}"/>`;
  }
  return `<svg width="${n * s + 16}" height="${n * s + 16}" viewBox="-8 -8 ${n * s + 16} ${n * s + 16}" style="background:#fff; border-radius:10px; border:1px solid var(--border);"><g fill="#0F172A">${cells}</g></svg>`;
}

// ================================================================== screens
const SCREENS = {
  // ------------------------------------------------------------ P · Plan
  P1: (t) => leadScreen(t, 1),
  P2: (t) => leadScreen(t, 2),

  P3: (t) => {
    const rows = [
      ["booked", "Fatima Al Suwaidi", "BK-88213", "Today, 2:30 PM", "Nissan Altima SV", "Hub", [1, 0, 1, 1], ["Raise prep", "wrench"]],
      ["vtd", "Khalid Al Jaberi", "BK-88190", "Today, 3:00 PM", "Toyota Camry GLE", "Virtual", [2, 1, 1, 1], ["Open video room", "video"]],
      ["", "Maryam Rashidi", "BK-88177", "Today, 4:15 PM", "Hyundai Tucson", "Hub", [0, 1, 1, 1], ["Resend DL link", "send"]],
      ["", "Noora Al Shamsi", "BK-88102", "Tomorrow, 2:00 PM", "Hyundai Tucson", "Hub", [0, 0, 0, 0], ["Assign DA", "user-check"]],
    ];
    const cell = (v, icon) => v === 2 ? `<span class="y" title="Not needed">${ic("minus")}</span>` : `<span class="${v ? "y" : "n"}">${ic(v ? "check" : icon)}</span>`;
    const body = `<div class="lv-body">
      <div class="proto-note">${ic("sparkles")}<div><b>Readiness is the exit check for Plan.</b> Each amber square is a task for someone: the customer (DL), the yard (car prep), the receptionist (DA) or the system (reminder).</div></div>
      <div class="list-head"><div><h2>Test Drives</h2><div class="sub">Upcoming visits at Al Quoz</div></div><button class="btn primary" data-go="I1">${ic("door-open")}Open today's arrivals</button></div>
      <div class="viewtabs"><span class="vt">Today &middot; 6</span><span class="vt active">Upcoming &middot; 14</span><span class="vt">Hub &middot; 11</span><span class="vt">Virtual &middot; 3</span></div>
      <div class="dtable"><table><thead><tr><th>Customer</th><th>Slot</th><th>Car</th><th>Type</th><th>DL &middot; Car &middot; DA &middot; Reminder</th><th></th></tr></thead><tbody>
      ${rows.map(([trk, nm, id, slot, car, type, r, [act, aic]]) => `<tr class="${trk === t ? "hl" : ""}">
        <td><div class="cust"><div class="av">${inits(nm)}</div><div><div class="nm">${nm}</div><div class="ph">${id}</div></div></div></td>
        <td>${slot}</td><td>${car}</td><td><span class="chip neutral">${type}</span></td>
        <td><div class="ready">${cell(r[0], "file-text")}${cell(r[1], "wrench")}${cell(r[2], "user-x")}${cell(r[3], "bell")}</div></td>
        <td><button class="rowbtn">${ic(aic)}${act}</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
    return deskShell({ active: "testdrives", who: "receptionist", crumb: `<b>Test Drives</b>`, body });
  },

  P4: (t) => {
    const p = PEOPLE[t];
    const rows = [
      [p.name, t === "vtd" ? "VTD booking started 26 h ago, no slot picked" : "Booking started 26 h ago, no slot picked", "Attempt 1 of 3", "warn", true],
      ["Hamad Al Ketbi", "No-show, hub TD today 11:00 AM", "Attempt 2 of 3", "bad"],
      ["Sana Malik", "Asked to be called after payday", "Due tomorrow", "neutral"],
    ];
    const body = `<div class="lv-body">
      <div class="list-head"><div><h2>Tasks</h2><div class="sub">Lead &middot; TD follow-up</div></div></div>
      <div class="toolbar"><div class="search">${ic("search")}<input placeholder="Search tasks" aria-label="Search tasks"></div><div class="select" style="border-color:var(--lv); color:var(--lv);">TD follow-up ${ic("chevron-down")}</div></div>
      <div class="viewtabs"><span class="vt">Order</span><span class="vt active">Lead</span><span class="vt">Contact</span></div>
      <div class="dtable"><table><thead><tr><th>Customer</th><th>Why</th><th>Attempts</th><th></th></tr></thead><tbody>
      ${rows.map(([nm, why, att, tone, hl]) => `<tr class="${hl ? "hl" : ""}"><td><div class="cust"><div class="av">${inits(nm)}</div><div class="nm">${nm}</div></div></td><td>${why}</td><td><span class="chip ${tone}">${att}</span></td><td><button class="kebab">${ic("more-vertical")}</button></td></tr>`).join("")}
      </tbody></table></div>
      <div class="jcard" style="margin-top:16px;"><h3>Call ${p.name.split(" ")[0]}</h3><div class="desc">Last note: ${t === "vtd" ? "asked the chatbot for a video viewing of the Camry" : "viewed the Altima 3 times, asked about finance"}. Outcome moves the task.</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn primary" data-go="P2">${ic("calendar-check")}Rebooked: pick a slot</button>
          <button class="btn">${ic("phone-missed")}No answer: try again</button>
          <button class="btn" data-go="N7">${ic("circle-x")}Not interested</button>
        </div></div>
    </div>`;
    return deskShell({ active: "tasks", who: "cc", crumb: `<b>Tasks</b> <span style="color:var(--faint); font-weight:400;">&middot; TD follow-up</span>`, body });
  },

  // ------------------------------------------------------------ I · Introduce
  I1: (t) => {
    if (!isHub(t)) {
      return vtdConsole({ stage: "sign-in", idx: -1,
        body: `<div class="jcard"><h3>Khalid is in the waiting room</h3><div class="desc">Joined 1 min before the 3:00 PM slot. Camera and mic are on.</div>
          <div class="grid2">${kv("Car", "2022 Toyota Camry GLE")}${kv("Booked via", "Chatbot")}${kv("Language", "English")}${kv("Car on camera", "Studio 1, helper ready")}</div></div>`,
        bottom: bar("Exit: customer in the call", [["Admit and start the call", "I2", "primary", "video"]]),
        video: videoPanel({ main: khalidTile, pip: "You &middot; Sara" }) });
    }
    const walk = t === "walkin";
    const rows = [
      ["booked", "Fatima Al Suwaidi", "050 123 4567", "2:30 PM", "Nissan Altima SV", "Omar Hassan", `<span class="chip warn">Expected</span>`, `<button class="rowbtn ${walk ? "" : "primary"}" ${walk ? "" : `data-go="I2"`}>${ic("door-open")}Mark arrived</button>`],
      ["", "Khalid Al Jaberi", "055 987 1230", "3:00 PM", "Toyota Camry GLE", "Sara Ibrahim", `<span class="chip vtd">Video</span>`, `<button class="rowbtn">${ic("video")}Open video room</button>`],
      ["", "Maryam Rashidi", "052 445 9981", "4:15 PM", "Hyundai Tucson", "Layla Ahmed", `<span class="chip warn">Expected</span>`, `<button class="rowbtn">${ic("door-open")}Mark arrived</button>`],
      ["", "Hamdan Saeed", "Walk-in", "1:10 PM", "Kia Sportage", "Faisal Noor", `<span class="chip ok">TD conducted</span>`, ""],
      ["", "Aisha Al Mazrouei", "050 774 2210", "11:00 AM", "Nissan Altima SV", "Layla Ahmed", `<span class="chip ok">Token paid</span>`, ""],
    ];
    const body = `<div class="lv-body">
      <div class="proto-note">${ic("sparkles")}<div><b>Arrival is its own event.</b> Mark arrived starts the arrival-to-handshake clock and gives the pre-assigned DA a heads-up. A walk-in starts a visit here, before any order exists.</div></div>
      <div class="list-head"><div><h2>Test Drives</h2><div class="sub">Today's bookings and walk-ins at Al Quoz</div></div>
        <button class="btn primary" ${walk ? `data-go="I2" style="box-shadow:0 0 0 4px var(--trk-walkin-bg); background:var(--trk-walkin); border-color:var(--trk-walkin);"` : ""}>${ic("user-plus")}New walk-in</button></div>
      <div class="viewtabs"><span class="vt active">Today &middot; 6</span><span class="vt">Hub &middot; 5</span><span class="vt">Virtual &middot; 1</span><span class="vt">Upcoming &middot; 14</span></div>
      <div class="dtable"><table><thead><tr><th>Customer</th><th>Slot</th><th>Car</th><th>DA</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(([trk, nm, ph, slot, car, da, st, act]) => `<tr class="${trk === t ? "hl" : ""}"><td><div class="cust"><div class="av">${inits(nm)}</div><div><div class="nm">${nm}</div><div class="ph">${ph}</div></div></div></td><td>${slot}</td><td>${car}</td><td>${da}</td><td>${st}</td><td>${act}</td></tr>`).join("")}
      </tbody></table></div></div>`;
    return deskShell({ active: "testdrives", who: "receptionist", crumb: `<b>Test Drives</b>`, body });
  },

  // I2 has no screen by design; the viewer draws the "no screen" card from the step spec.
  I2: null,

  // ------------------------------------------------------------ S · Sign-in
  S1: (t) => {
    const p = PEOPLE[t];
    if (!isHub(t)) {
      return vtdConsole({ stage: "sign-in", idx: 0,
        body: `<div class="jcard"><h3>Check-in on the call</h3><div class="desc">Ask Khalid to read out the code sent to the booked mobile. No DL needed for a video TD.</div>
          <div class="fld-row"><label>Mobile OTP</label>${otpBlock(p.phone, "2846")}</div>
          <div style="margin-top:12px;">${sw(true, "Recording consent", "Khalid agrees to record this call for AI notes and service quality. Saying no doesn't stop the call.")}</div></div>`,
        bottom: bar("Exit: OTP verified, recording answered", [["Check in and start car finding", "T2", "primary", "log-in"]]) });
    }
    const walk = t === "walkin";
    const body = walk ? `<div class="jcard"><h3>Check in a walk-in</h3><div class="desc">Who they are, and how they found us. The TD consent is signed later, at the car.</div>
        <div class="formgrid">
          <div class="fld"><label for="w-name">Full name</label><input class="box" id="w-name" value="${p.name}"></div>
          <div class="fld"><label for="w-mob">Mobile</label><input class="box" id="w-mob" value="${p.phone}"></div>
          <div class="fld"><label for="w-mail">Email</label><input class="box" id="w-mail" value="${p.email}"></div>
          <div class="fld"><label for="w-dl">UAE driving licence</label><input class="box" id="w-dl" value="${p.dl}"></div>
        </div>
        <div class="fld-row" style="margin-top:6px;"><label>How did they hear of us?</label>${chips("src", ["Drive-by", "Referral", "Social ad", "Search", "Radio or outdoor", "Other"], ["Drive-by"])}</div>
        <div class="fld-row"><label>DL scan</label><span class="okline">${ic("scan-line")}Scanned &middot; valid until Mar 2027</span></div>
        <div class="fld-row"><label>Home-country DL</label><span style="font-size:13px; font-weight:600;">${p.homeDl}</span></div>
        <div class="fld-row"><label>Mobile OTP</label>${otpBlock(p.phone, "5190")}</div>
        <div style="margin-top:10px;">${sw(true, "Recording consent", "Ahmed agrees to record today's conversation for AI notes and service quality. Saying no doesn't change the visit.")}</div>
      </div>`
      : `<div class="jcard"><h3>Check in ${p.name.split(" ")[0]}</h3><div class="desc">Confirm identity and ask about recording. The TD consent is signed later, at the car.</div>
        <div class="fld-row"><label>Mobile OTP</label>${otpBlock(p.phone, "4819")}</div>
        <div class="fld-row"><label>Driving licence</label><div style="display:flex; align-items:center; gap:10px;"><span class="okline">${ic("circle-check")}${p.dl} &middot; valid until 2028</span><span class="prefill">${ic("sparkles")}Uploaded before the visit</span></div></div>
        <div class="fld-row"><label>Booking</label><span style="font-size:13px; font-weight:600;">${PCARS[p.car].title} &middot; ${p.slot}</span></div>
        <div style="margin-top:12px;">${sw(true, "Recording consent", "Fatima agrees to record today's conversation for AI notes and service quality. Saying no doesn't change the visit.")}</div>
        <div class="notebar" style="margin-top:12px;">${ic("move-right")}TD consent moved: the customer signs it at the car, right after TD start (O4).</div>
      </div>`;
    return deskShell({ active: "testdrives", who: "receptionist", crumb: `<a>Test Drives</a> / <b>${walk ? "New walk-in" : p.name}</b>`,
      body: fdDetail({ t, idx: 0, body, bottom: bar("Exit: OTP verified, valid DL, recording answered", [["No valid DL: browse only", "S2", "", "eye"], ["Confirm check-in", "S2", "primary", "log-in"]]) }) });
  },

  S2: (t) => {
    const p = PEOPLE[t];
    const walk = t === "walkin";
    const dot = (s) => s === "AVAILABLE" ? "#22C55E" : s === "ON_BREAK" ? "#F59E0B" : "#94A3B8";
    const modal = `<div class="modal-overlay open" style="border-radius:0;"><div class="modal" style="width:470px;">
      <div class="modal-head"><h4>${walk ? "Assign a DA" : "Confirm the DA"}</h4><button aria-label="Close">${ic("x")}</button></div>
      <div class="modal-sub">Ranked by status, today's load and language. A DA at their daily cap cannot be picked. Reuses <code style="font-size:11px;">ManualAssignmentModal</code>.</div>
      <div class="da-list">${PDAS.map(d => {
        const cap = d.today >= d.max, brk = d.status === "ON_BREAK", off = cap || brk;
        return `<div class="da-row ${d.pre ? "selected" : ""} ${off ? "disabled" : ""}" data-da>
          <div class="av">${inits(d.name)}<span class="stat" style="background:${dot(d.status)}"></span></div>
          <div class="info"><div class="n">${d.name}${d.pre && !walk ? ` <span class="prefill" style="margin-left:4px;">${ic("calendar-check")}Pre-assigned</span>` : ""}</div><div class="m">${d.role} &middot; ${d.lang} &middot; ${d.today}/${d.max} today</div>${cap ? `<div class="cap">At daily cap</div>` : brk ? `<div class="cap" style="color:var(--warn-ink);">On break</div>` : ""}</div>
          <div class="score"><div class="n">${d.score}</div><div class="m">score</div></div></div>`;
      }).join("")}</div>
      <div class="modal-foot"><span style="margin-right:auto; font-size:11.5px; color:var(--faint); align-self:center;">No DA free in 10 min: manager alerted</span><button class="btn">Cancel</button><button class="btn primary" data-go="T1">${ic("send")}Assign and notify</button></div>
    </div></div>`;
    const body = `<div class="jcard"><h3>Hand over to a DA</h3><div class="desc">One DA owns ${p.name.split(" ")[0]} from the handshake to the close.</div>
      <div class="upload-row"><div class="l">${ic("user-check")}${walk ? "Best match" : "Pre-assigned at booking"}</div><div class="status" style="color:var(--ok-ink);">Omar Hassan &middot; 6/10 today</div></div></div>`;
    return deskShell({ active: "testdrives", who: "receptionist", crumb: `<a>Test Drives</a> / <b>${walk ? "Ahmed Saleh" : p.name}</b>`,
      body: fdDetail({ t, idx: 1, body, bottom: bar("Exit: DA confirmed and notified", [["Assign DA", "T1", "primary", "users"]]), modal }) });
  },

  // ------------------------------------------------------------ T · Tailor
  T1: (t) => {
    const p = PEOPLE[t];
    const walk = t === "walkin";
    const ctx = walk
      ? `${trackChip(t)}<span class="chip ok">${ic("circle-check")}DL valid</span><span class="chip neutral">${p.language}</span><span class="chip neutral">${ic("circle-dot")}Recording on</span><span class="chip neutral">Came in as a drive-by</span>`
      : `${trackChip(t)}<span class="chip neutral">${ic("car")}${PCARS[p.car].title}</span><span class="chip ok">${ic("circle-check")}DL on file</span><span class="chip neutral">${p.language}</span><span class="chip neutral">${ic("circle-dot")}Recording on</span>`;
    const body = `<div class="lv-body">
      <div class="list-head"><div><h2>My queue</h2><div class="sub">Omar Hassan &middot; 6 of 10 test drives today</div></div><span class="chip ok">${ic("circle-dot")}Available</span></div>
      <div class="wait-card">
        <div class="lp-av">${inits(p.name)}</div>
        <div class="mid"><b>${p.name}</b> <span style="color:var(--muted); font-size:13px;">is checked in at the front desk</span>
          <div class="ctx">${ctx}</div>
          <div style="font-size:12.5px; color:var(--muted); margin-top:8px;">${ic("sparkles")} ${walk ? "Walked in at 2:41 PM. No booking, so car finding starts from scratch." : "Viewed the Altima 3 times in the app. Asked the call centre about finance."}</div>
        </div>
        <div class="wait"><b>1:48</b><span>waiting</span></div>
        <button class="btn primary" data-go="T2" style="padding:12px 18px; font-size:14px;">${ic("handshake")}I've met ${p.name.split(" ")[0]}</button>
      </div>
      <div class="sectlabel" style="margin-top:22px;">Later today</div>
      <div class="dtable" style="border-radius:var(--radius);"><table><tbody>
        <tr><td><div class="cust"><div class="av">MR</div><div><div class="nm">Maryam Rashidi</div><div class="ph">4:15 PM &middot; Hyundai Tucson</div></div></div></td><td><span class="chip warn">DL missing</span></td><td><span class="chip neutral">Booked</span></td></tr>
        <tr><td><div class="cust"><div class="av">RA</div><div><div class="nm">Rashid Al Falasi</div><div class="ph">Follow-up call &middot; 5:30 PM</div></div></div></td><td><span class="chip neutral">Follow-up</span></td><td></td></tr>
      </tbody></table></div>
      <div class="notebar" style="margin-top:14px;">${ic("timer")}Not met within 5 min: the receptionist and the manager are alerted.</div>
    </div>`;
    return tabShell({ who: "da", crumb: `<b>My queue</b>`, body });
  },

  T2: (t) => {
    const p = PEOPLE[t], n = p.needs;
    const pre = t !== "walkin";
    const body = `<div class="jcard">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;"><h3>What are you looking for?</h3>${pre ? `<span class="prefill">${ic("sparkles")}Prefilled from the booking and app browsing</span>` : `<span class="chip walkin">Captured in conversation</span>`}</div>
      <div class="desc">${pre ? "Confirm or change. The booked car stays pinned in the next step." : "Nothing to prefill for a walk-in. Two answers are enough to start: budget and body type."}</div>
      <div class="fld-row"><label>Budget</label>${chips("budget", ["Under AED 55k", "AED 55k&ndash;65k", "AED 55k&ndash;70k", "AED 65k&ndash;75k", "AED 75k+"], [n.budget])}</div>
      <div class="fld-row"><label>Body type</label>${chips("multi", ["Sedan", "SUV", "Hatchback", "Pickup"], n.body)}</div>
      <div class="fld-row"><label>Transmission</label>${chips("trans", ["Automatic", "Manual"], [n.trans])}</div>
      <div class="fld-row"><label>Drive</label>${chips("drive", ["2WD", "4WD"], [n.drive])}</div>
      <div class="fld-row"><label>Mostly for</label>${chips("multi", ["City", "Family", "Family weekends", "Long drives", "Commute to Dubai", "Off-road"], n.usage)}</div>
      <div class="fld-row"><label>Must-haves</label>${chips("multi", ["Apple CarPlay", "Rear camera", "7 airbags", "Adaptive cruise", "Sunroof", "7 seats"], n.must)}</div>
      <div class="fld-row"><label>Paying by</label>${chips("pay", ["Cash", "Finance", "Not sure yet"], [t === "walkin" ? "Not sure yet" : "Finance"])}</div>
    </div>`;
    const buttons = t === "booked" ? [["Set on the booked car: skip", "T4", "", "skip-forward"], ["Show matching cars", "T3", "primary", "search"]] : [["Show matching cars", "T3", "primary", "search"]];
    return daScreen(t, { stage: "car-finding", idx: 0, body, bottom: bar("Exit: budget and body type captured", buttons),
      cp: [["Ask next", "message-square", `<p>${t === "walkin" ? "&ldquo;How many people usually ride with you?&rdquo;" : "&ldquo;Is the Altima still the one, or should we look at an SUV too?&rdquo;"}</p>`],
        ["From before the visit", "history", `<ul>${t === "walkin" ? "<li>First visit, no app account</li><li>Came in as a drive-by</li>" : "<li>Viewed the Altima 3 times</li><li>Asked about finance on the call</li>"}</ul>`]] });
  },

  T3: (t) => {
    const p = PEOPLE[t];
    const sel = t === "booked" ? ["c1", "c3"] : t === "walkin" ? ["c4"] : ["c2"];
    const cmp = t === "booked" ? ["c1", "c3"] : t === "walkin" ? ["c4", "c3"] : ["c2", "c1"];
    const body = `<div class="jcard">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;"><h3>Cars that fit</h3><span style="font-size:12px; color:var(--muted);">Live stock at Al Quoz &middot; not reserved</span></div>
      <div class="desc">${t === "booked" ? "The booked car is pinned. Alternatives sit next to it, so a change of mind is a tap, not a lost customer." : t === "walkin" ? "Matched to what Ahmed just told you." : "Shown to Khalid over screen share."}</div>
      <div class="pcar-grid" style="${p.picks.length === 2 ? "grid-template-columns:repeat(2,minmax(0,1fr));" : ""}">${p.picks.map(pk => pcar(t, pk, sel, cmp)).join("")}</div>
      <div class="compare-bar"><span>${cmp.length} cars ticked to compare</span><button class="btn" data-open="cmpx">${ic("git-compare")}Compare side by side</button></div>
    </div>
    <div class="cmp-overlay" id="cmpx" style="border-radius:0;"><div class="cmp-modal" style="width:600px;">
      <div class="modal-head"><h4>Compare cars</h4><button data-close="cmpx" aria-label="Close">${ic("x")}</button></div>
      <div style="overflow-y:auto;"><table>
        <thead><tr><th></th>${cmp.map(id => `<th>${PCARS[id].title}</th>`).join("")}</tr></thead>
        <tbody>${[["Price", c => aed(c.price)], ["Odometer", c => c.km], ["Body", c => c.body], ["Drive", c => c.drive], ["Seats", c => c.seats], ["Bay", c => c.bay]]
          .map(([k, fn]) => `<tr><td>${k}</td>${cmp.map(id => `<td>${fn(PCARS[id])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
      <div class="modal-foot"><button class="btn" data-close="cmpx">Close</button></div></div></div>`;
    return daScreen(t, { stage: "car-finding", idx: 1, body,
      bottom: bar("Exit: one or more cars chosen", [["Nothing fits: share shortlist", "N4", "", "share-2"], ["Next: why this car", "T4", "primary", "arrow-right"]]),
      video: isHub(t) ? null : videoPanel({ main: khalidTile, pip: "You &middot; Sara", share: "Sharing your screen" }),
      cp: [["Why these", "list-checks", `<ul>${t === "walkin" ? "<li>Sportage: in budget, rear camera</li><li>Tucson: 4WD for long drives</li>" : "<li>Tucson: more boot space for family weekends</li><li>Camry: AED 1,500 over budget</li>"}</ul>`],
        ["Stock check", "warehouse", `<p>${t === "walkin" ? "Sportage at Bay 1, free now." : "Altima at Bay 2, Tucson at Bay 4. Both free for the next hour."}</p>`]] });
  },

  T4: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const left = `<div class="insp">
        <div><span>Engine and gearbox</span><b>${ic("circle-check")}Passed</b></div>
        <div><span>Brakes and suspension</span><b>${ic("circle-check")}Passed</b></div>
        <div><span>Body and paint</span><b>${ic("circle-check")}2 small marks noted</b></div>
        <div><span>Electrics and AC</span><b>${ic("circle-check")}Passed</b></div>
        <div><span>Accident history</span><b>${ic("circle-check")}None reported</b></div>
      </div><p style="font-size:11.5px; color:var(--faint); margin:10px 0 0;">Example inspection values for the prototype.</p>`;
    const right = `<div class="promise">
        <div>${ic("clipboard-check")}<b>Inspected</b><span>Full inspection report for this car, shared with you.</span></div>
        <div>${ic("shield-check")}<b>Warranty</b><span>Included with the car. Terms apply.</span></div>
        <div>${ic("rotate-ccw")}<b>Return window</b><span>Change your mind within the return window.</span></div>
        <div>${ic("landmark")}<b>Finance</b><span>From about ${aed(Math.round(c.price / 52))} a month. Example only.</span></div>
      </div>`;
    if (!isHub(t)) {
      return vtdConsole({ stage: "car-finding", idx: 2,
        body: `<div class="jcard"><h3>${c.title}: why you can trust it</h3><div class="desc">Shared on screen with Khalid. Inspection: passed, 2 small marks noted (example values).</div>${right}</div>`,
        bottom: bar("Exit: customer wants to see the car", [["Wants to think", "N4", "", "clock"], ["Show the car on camera", "T5", "primary", "video"]]),
        video: videoPanel({ main: khalidTile, pip: "You &middot; Sara", share: "Sharing your screen" }) });
    }
    return customerView({ title: `Why this ${c.title.replace(/^\d{4} /, "")}`, lead: `${c.title} &middot; ${aed(c.price)} &middot; ${c.km}`, left, right,
      foot: `<span class="left-hint">Exit: customer wants to drive today</span><div style="display:flex; gap:8px;"><button class="btn" data-go="N4">${ic("clock")}I need to think</button><button class="btn primary bigbtn" data-go="T5">${ic("car-front")}Let's drive it</button></div>` });
  },

  T5: (t) => {
    const p = PEOPLE[t];
    if (!isHub(t)) {
      return vtdConsole({ stage: "car-finding", idx: 3,
        body: `<div class="jcard"><h3>Car on camera</h3><div class="desc">Bilal has the Camry at Studio 1 with the yard camera on.</div>
          <div class="grid2">${kv("Car", "2022 Toyota Camry GLE")}${kv("Where", "Studio 1")}${kv("Yard helper", "Bilal Raza, camera on")}${kv("Order", "BK-88190 (unchanged)")}</div></div>`,
        bottom: bar("Exit: car confirmed and on camera", [["Start the walkaround", "O2", "primary", "video"]]) });
    }
    const walk = t === "walkin";
    const drives = walk ? [["c4", "Drive 1", "Bay 1", "Prep requested"]] : [["c1", "Drive 1 &middot; booked", "Bay 2", "Prep requested"], ["c3", "Drive 2 &middot; added", "Bay 4", "Prep requested"]];
    const body = `<div class="jcard"><h3>${walk ? "Create the order and get the car ready" : "Lock today's drives"}</h3>
      <div class="desc">${walk ? "This creates order BK-89004 in OMS (booking initiated, then confirmed) and asks the yard to bring the car round." : "The Tucson joins today's visit. No new booking needed. The yard brings both cars round."}</div>
      ${drives.map(([cid, label, bay, st]) => `<div class="upload-row"><div class="l">${ic("car")}<span><b style="color:var(--ink);">${PCARS[cid].title}</b> &middot; ${label}</span></div><div class="status" style="color:var(--warn-ink);">${bay} &middot; ${st}</div></div>`).join("")}
      <div class="grid3" style="margin-top:14px;">${kv("Customer", walk ? "Ahmed Saleh, verified" : "Fatima, verified")}${kv("Driving licence", walk ? "Valid until Mar 2027" : "Valid until 2028")}${kv(walk ? "Order" : "Order", walk ? "BK-89004, new" : "BK-88213, updated")}</div>
    </div>`;
    const buttons = walk ? [["No valid DL: book later", "N6", "", "calendar"], ["Create order and request prep", "O1", "primary", "check"]] : [["Car is taken: pick again", "T3", "", "rotate-ccw"], ["Confirm and request prep", "O1", "primary", "check"]];
    return daScreen(t, { stage: "car-finding", idx: 3, body, bottom: bar("Exit: order ready, prep raised", buttons),
      cp: [["Yard", "warehouse", `<p>Bilal Raza (prep) gets the request now. Usual time to bay: 6 min.</p>`], ["While you wait", "message-square", `<p>Walk ${walk ? "Ahmed" : "Fatima"} to the lounge exit and ask about their usual drive.</p>`]] });
  },

  // ------------------------------------------------------------ O · On the road
  O1: (t) => {
    const walk = t === "walkin";
    const body = `<div class="jcard"><h3>${walk ? "Kia Sportage is ready at Bay 1" : "Altima is ready at Bay 2"}</h3><div class="desc">Marked ready by Bilal Raza at 2:49 PM. Keys at the bay, fuel 3/4, cleaned.</div>
      <div class="grid3">${["Bay 1", "Bay 2", "Bay 3", "Bay 4"].map(b => {
        const here = walk ? b === "Bay 1" : b === "Bay 2";
        const next = !walk && b === "Bay 4";
        return `<div class="kv" style="${here ? "border-color:var(--ok-ink); background:var(--ok-bg);" : ""}"><span class="k">${b}</span><span class="v">${here ? (walk ? "Kia Sportage &middot; ready" : "Nissan Altima &middot; ready") : next ? "Hyundai Tucson &middot; 4 min" : "Free"}</span></div>`;
      }).join("")}</div>
      ${walk ? "" : `<div class="upload-row" style="margin-top:14px;"><div class="l">${ic("car")}Drive 2 &middot; Hyundai Tucson</div><div class="status" style="color:var(--warn-ink);">Bay 4 &middot; getting ready</div></div>`}
    </div>`;
    return daScreen(t, { stage: "test-drive", idx: 0, id: walk ? "BK-89004" : null, body,
      bottom: bar("Exit: DA and customer at the car", [["Car not ready: swap", "T3", "", "rotate-ccw"], ["We're at the car", "O2", "primary", "map-pin"]]),
      cp: [["On the walk", "message-square", `<ul><li>Ask about the daily commute</li><li>Mention the return window if not covered yet</li></ul>`]] });
  },

  O2: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const zones = [
      ["Exterior", "scan", ["Paint and panels", "Tyres and wheels", "Lights"], true],
      ["Interior", "armchair", ["Seats and space", "Screen and CarPlay", "Rear seats"], true],
      ["Under the bonnet", "wrench", ["Engine bay", "Service history"], false],
      ["Boot", "luggage", ["Boot space", "Spare wheel"], false],
    ];
    const body = `<div class="jcard"><h3>Walk round the ${c.title.replace(/^\d{4} /, "")}</h3><div class="desc">Tap a zone once it's covered. Talking points come from this car's inspection and features.</div>
      <div class="zones">${zones.map(([nm, icon, pts, done]) => `<button class="zone ${done ? "done" : ""}" data-zone>${ic(icon)}<b>${nm}</b><ul>${pts.map(x => `<li>${x}</li>`).join("")}</ul></button>`).join("")}</div></div>`;
    if (!isHub(t)) {
      return vtdConsole({ stage: "test-drive", idx: 0, body,
        bottom: bar("Exit: walkaround and drive clip done", [["Play drive clip and wrap up", "O6", "primary", "play"]]),
        video: videoPanel({ main: carTile("c2"), pip: "Khalid" }) });
    }
    return daScreen(t, { stage: "test-drive", idx: 1, id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: zones covered", [["Try another car", "T3", "", "rotate-ccw"], ["Start test drive", "O3", "primary", "play"]]),
      cp: [["Say at the bonnet", "message-square", `<p>Point to the service stamps. Inspection found no leaks.</p>`], ["Customer asked", "message-circle", `<p>&ldquo;Does it have CarPlay?&rdquo; Yes, wired.</p>`]] });
  },

  O3: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const body = `<div class="jcard"><h3>Start the test drive</h3><div class="desc">Starting creates the TD record: car, plate, time and odometer. The consent references it.</div>
      <div class="grid2">${kv("Car", `${c.title} &middot; ${c.plate}`)}${kv("Driver", `${p.name} &middot; DL ${p.dl}`)}</div>
      <div class="formgrid" style="margin-top:14px;">
        <div class="fld"><label for="o-odo">Odometer at start</label><input class="box" id="o-odo" value="${t === "walkin" ? "31,214" : "18,412"} km"></div>
        <div class="fld"><label>Fuel</label>${chips("fuel", ["1/4", "1/2", "3/4", "Full"], ["3/4"])}</div>
      </div>
      <div class="fld-row" style="margin-top:6px;"><label>Route</label>${chips("route", ["City loop &middot; 15 min", "Highway loop &middot; 20 min"], [t === "walkin" ? "Highway loop &middot; 20 min" : "City loop &middot; 15 min"])}</div>
      <div class="notebar" style="margin-top:12px;">${ic("pen-line")}Next the customer signs the TD consent for this car, before it moves.</div>
    </div>`;
    return daScreen(t, { stage: "test-drive", idx: 2, id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: TD record created", [["Start test drive", "O4", "primary", "play"]]),
      cp: [["Checks", "list-checks", `<ul><li>DL valid</li><li>Car not in another TD</li><li>Walkaround done</li></ul>`]] });
  },

  O4: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const left = `<div class="grid2" style="margin-bottom:14px;">${kv("Driver", `${p.name}<br><span style="font-weight:500; color:var(--muted);">DL ${p.dl}</span>`)}${kv("Car", `${c.title}<br><span style="font-weight:500; color:var(--muted);">${c.plate}</span>`)}${kv("Started", `2:52 PM &middot; ${t === "walkin" ? "31,214" : "18,412"} km`)}${kv("With", "Omar Hassan, CARS24")}</div>
      <ul class="terms"><li>I hold a valid driving licence and I am fit to drive.</li><li>I will follow UAE traffic laws and speed limits.</li><li>I am responsible for traffic fines during this drive.</li><li>A CARS24 associate rides with me for the whole drive.</li></ul>
      <p style="font-size:11.5px; color:var(--faint); margin:8px 0 0;">Example terms for the prototype. One consent per car.</p>`;
    const right = `<div style="font-size:13px; font-weight:700;">Sign here</div>
      <div class="sig-wrap"><canvas id="sig" aria-label="Signature pad"></canvas><div class="line"></div><div class="ph">Sign with your finger</div></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><label class="agree"><input type="checkbox" id="agree"> I have read and agree to these terms.</label><button class="btn" data-sig-clear>${ic("eraser")}Clear</button></div>`;
    return customerView({ title: "Test drive consent", lead: "Please check the details and sign. The car moves once this is signed.", left, right,
      foot: `<span class="left-hint" id="sig-hint">Sign and tick the box to continue</span><div style="display:flex; gap:8px;"><button class="btn" data-go="N1">${ic("circle-x")}Customer declines</button><button class="btn primary bigbtn" id="sig-go" data-go="O5" disabled>${ic("pen-line")}Sign and start driving</button></div>` });
  },

  O5: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const tags = [["Price", "vs other cars"], ["Mileage", "km on the clock"], ["Condition", "marks, wear"], ["Features", "missing something"], ["Finance", "EMI, down payment"], ["Other", "anything else"]];
    const body = `<div class="drive-hero"><div class="clock">12:40</div><div class="meta">${c.title} &middot; ${c.plate}<br>${t === "walkin" ? "Highway loop" : "City loop"} &middot; consent signed 2:53 PM</div><div class="live"><i></i>Notes on</div></div>
      <div class="sectlabel" style="margin-top:16px;">Tap when an objection comes up</div>
      <div class="tagbtns">${tags.map(([k, s], i) => `<button class="tagbtn ${i === 0 ? "on" : ""}" data-pick="multi">${k}<span>${s}</span></button>`).join("")}</div>`;
    return daScreen(t, { stage: "test-drive", idx: 4, id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: back at the hub", [["Report an incident", null, "", "triangle-alert"], ["Back at the hub: end drive", "O6", "primary", "flag"]]),
      cp: [["Try now", "zap", `<ul><li>Highway stretch: cruise control and lane assist</li><li>Parking: rear camera</li></ul>`], ["Heard so far", "message-circle", `<p>&ldquo;Smooth. How does it compare with the ${t === "walkin" ? "Tucson" : "Camry"} on price?&rdquo;</p>`]] });
  },

  O6: (t) => {
    if (!isHub(t)) {
      return vtdConsole({ stage: "test-drive", idx: 1,
        body: `<div class="jcard"><h3>Wrap up the video viewing</h3><div class="desc">Walkaround done, drive clip played. 24 min on the call.</div>
          <div class="fld-row"><label>Khalid's reaction</label>${chips("react", ["Loved it", "It's okay", "Not for me"], ["Loved it"])}</div>
          <div class="fld-row"><label>Wants a real drive?</label>${chips("rd", ["Yes, at a hub", "No need"], ["Yes, at a hub"])}</div></div>`,
        bottom: bar("Exit: call wrapped up", [["End video TD", "N1", "primary", "flag"]]) });
    }
    const walk = t === "walkin";
    const body = `<div class="jcard"><h3>End the drive</h3><div class="desc">Recorded as TD CONDUCTED for this car.</div>
      <div class="formgrid"><div class="fld"><label for="o-odo2">Odometer at end</label><input class="box" id="o-odo2" value="${walk ? "31,236" : "18,431"} km"></div><div class="fld"><label>Duration</label><div class="box readonly">19 min</div></div></div>
      <div class="fld-row" style="margin-top:6px;"><label>Customer's reaction</label>${chips("react", ["Loved it", "It's okay", "Not for me"], ["Loved it"])}</div>
      ${walk ? "" : `<div class="upload-row" style="margin-top:10px;"><div class="l">${ic("car")}Drive 2 queued &middot; Hyundai Tucson</div><div class="status" style="color:var(--ok-ink);">Bay 4 &middot; ready</div></div>`}
    </div>`;
    const buttons = walk ? [["Another car", "O1", "", "rotate-ccw"], ["Done driving: debrief", "N1", "primary", "message-square"]] : [["Start drive 2: Tucson", "O1", "", "car"], ["Done driving: debrief", "N1", "primary", "message-square"]];
    return daScreen(t, { stage: "test-drive", idx: 5, id: walk ? "BK-89004" : null, body, bottom: bar("Exit: TD conducted", buttons),
      cp: [["Next car", "car", `<p>${walk ? "No second car queued." : "Drive 2 needs its own walkaround, start and consent."}</p>`]] });
  },

  // ------------------------------------------------------------ N · Next step
  N1: (t) => {
    const p = PEOPLE[t];
    const sum = t === "walkin"
      ? ["Space, rear camera, smooth on the highway", "Price vs the Tucson, wants the service history", "Cash, wants to reserve today"]
      : t === "vtd" ? ["Clean interior, adaptive cruise", "Wants to feel it on the road", "Finance, wants a hub drive this week"]
      : ["Smooth ride, CarPlay, boot space", "Price vs the Camry, wants the service history", "Finance, ready to reserve today"];
    const decs = [["Ready to buy", "badge-check", "Take the token now", "good", "N2"], ["Needs time", "clock", "Agree a date", "warn", "N4"], [t === "vtd" ? "Hub drive" : "Another car", "car", t === "vtd" ? "Book a real drive" : "Book another drive", "warn", "N6"], ["Not interested", "circle-x", "Record the reason", "bad", "N7"]];
    const suggested = t === "vtd" ? 2 : 0;
    const body = `<div class="jcard"><h3>Debrief</h3><div class="desc">Prefilled from the conversation since check-in. Edit anything that's off.</div>
      <div class="aisum">${[["Liked", sum[0]], ["Concerns", sum[1]], ["Intent", sum[2]]].map(([k, v]) => `<div><div class="k">${k}<span class="prefill">${ic("sparkles")}AI</span></div><p>${v}</p></div>`).join("")}</div>
      ${isHub(t) ? `<div class="formgrid" style="margin-top:12px;"><div class="fld"><label for="n-sal">Monthly salary</label><input class="box" id="n-sal" value="AED 18,000"></div><div class="fld"><label for="n-emi">Existing EMI</label><input class="box" id="n-emi" value="AED 1,200"></div></div>` : ""}
      <div class="sectlabel" style="margin-top:14px;">What happens next?</div>
      <div class="decisions">${decs.map(([nm, icon, s, tone, go], i) => `<button class="dec ${tone} ${i === suggested ? "on" : ""}" data-go="${go}">${ic(icon)}<b>${nm}</b><span>${s}</span></button>`).join("")}</div></div>`;
    return daScreen(t, { stage: "next-step", idx: 0, id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: one of four decisions", [[decs[suggested][0], decs[suggested][4], "primary", "arrow-right"]]),
      cp: [["Suggested", "sparkles", `<p>${t === "vtd" ? "Khalid wants to feel it on the road: book a hub drive." : `${p.name.split(" ")[0]} would reserve today if the price holds.`}</p>`], ["Objections tagged", "tag", `<p>Price (1)</p>`]] });
  },

  N2: (t) => {
    const p = PEOPLE[t];
    const link = !isHub(t);
    const tabs = [["qr", "QR code", "qr-code"], ["bank", "Bank transfer", "landmark"], ["link", "Payment link", "link"]];
    const on = link ? "link" : "qr";
    const body = `<div class="jcard"><h3>Collect the token</h3><div class="desc">${aed(5000)} to reserve ${t === "walkin" ? "the Kia Sportage" : link ? "the Camry" : "the Altima"}. Example amount.</div>
      <div class="seg2" data-tabs>${tabs.map(([k, l, icon]) => `<button class="${k === on ? "on" : ""}" data-tab="${k}">${ic(icon)}${l}</button>`).join("")}</div>
      <div style="margin-top:14px; display:flex; gap:18px; align-items:center;">
        <div data-panel="qr" ${on === "qr" ? "" : "hidden"}>${qrSvg()}</div>
        <div data-panel="bank" ${on === "bank" ? "" : "hidden"} class="bank-box" style="min-width:340px;"><div class="bank-row"><span>Account name</span><b>CARS24 UAE</b></div><div class="bank-row"><span>IBAN</span><b>AE07 0331 0000 0123 4567 890</b></div><div class="bank-row"><span>Reference</span><b>${t === "walkin" ? "BK-89004" : p.id}</b></div></div>
        <div data-panel="link" ${on === "link" ? "" : "hidden"} class="kv" style="min-width:340px;"><span class="k">Sent by WhatsApp and SMS</span><span class="v">${p.phone} &middot; expires in 24 h</span></div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <span class="warnline">${ic("loader")}Waiting for the payment gateway</span>
          <span style="font-size:12px; color:var(--muted); max-width:260px; line-height:1.5;">The status changes by itself when the gateway confirms. There is no manual Mark as paid.</span>
          <button class="btn" data-go="N3" style="align-self:flex-start;">${ic("zap")}Simulate gateway confirmation</button>
        </div>
      </div></div>`;
    return daScreen(t, { stage: "next-step", idx: 1, id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: gateway confirms the payment", [["Pays later: keep link live", "N4", "", "clock"]]),
      cp: [["If asked", "message-square", `<p>The token reserves this car while documents and finance are done.</p>`]] });
  },

  N3: (t) => {
    const p = PEOPLE[t];
    const id = t === "walkin" ? "BK-89004" : p.id;
    const tasks = [["Documents", "Order &rsaquo; RM", "Rania Haddad"], ["Finance application", "Order &rsaquo; FinOps", "FinOps queue"], ["VAS offer", "Order &rsaquo; VAS Refurb", "VAS team"], ["Delivery slot", "Order &rsaquo; Delivery Schedule", "Delivery team"]];
    const body = `<div class="jcard"><div style="display:flex; align-items:center; gap:10px;"><h3 style="margin:0;">Token paid</h3><span class="hex good">TOKEN PAID</span></div>
      <div class="desc" style="margin-top:6px;">${id} &middot; car reserved &middot; ${p.name.split(" ")[0]} gets a WhatsApp confirmation with the RM's name.</div>
      <div class="sectlabel">Created in Leadverse Tasks, in existing Order personas</div>
      <div class="tl">${tasks.map(([k, persona, who]) => `<div>${ic("circle-check")}<div><b>${k}</b><span>${persona}</span></div><span class="who">${who}</span></div>`).join("")}</div></div>`;
    return daScreen(t, { stage: "next-step", idx: 2, id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: delivery tasks created, RM assigned", [["Back to my queue", isHub(t) ? "T1" : null, "primary", "list"]]) });
  },

  N4: (t) => {
    const p = PEOPLE[t];
    const body = `<div class="jcard"><h3>Agree a follow-up</h3><div class="desc">Set the date with ${p.name.split(" ")[0]} now. The RM gets a task for that day.</div>
      <div class="fld-row"><label>Day</label>${chips("day", ["Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct", "Pick a date"], ["Sat 10 Oct"])}</div>
      <div class="fld-row"><label>Time</label>${chips("time", ["Morning", "Afternoon", "Evening"], ["Morning"])}</div>
      <div class="fld-row"><label>Channel</label>${chips("ch", ["Call", "WhatsApp"], ["Call"])}</div>
      <div class="fld-row"><label>Shortlist to send</label><div class="chips-row">${p.picks.map(([cid], i) => `<button class="pick ${i < 2 ? "on" : ""}" data-pick="multi">${ic("car")}${PCARS[cid].title}</button>`).join("")}</div></div>
      <div class="fld" style="margin-top:10px;"><label for="n-note">Note for the RM</label><input class="box" id="n-note" value="Discussing with family. Price is the open question."></div></div>`;
    return daScreen(t, { stage: "next-step", idx: 1, subs: ["Debrief", "Follow-up"], id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: date agreed, shortlist sent, RM task created", [["Schedule and send shortlist", "N5", "primary", "calendar-check"]]) });
  },

  N5: (t) => {
    const p = PEOPLE[t];
    const body = `<div class="lv-body">
      <div class="list-head"><div><h2>Follow up with ${p.name}</h2><div class="sub">Lead &middot; TD follow-up &middot; due today 11:00 AM &middot; attempt 1 of 3</div></div><span class="chip warn">${ic("clock")}Due now</span></div>
      <div class="grid2">
        <div class="jcard"><h3>Last visit</h3><div class="desc">Summary from the co-pilot</div>
          <div class="tl"><div>${ic("car")}<div><b>${t === "vtd" ? "Video TD of the Camry" : t === "walkin" ? "Drove the Kia Sportage" : "Drove the Altima and the Tucson"}</b><span>Liked it. Price is the open question.</span></div></div>
          <div>${ic("message-square")}<div><b>Said</b><span>&ldquo;Let me discuss with family this weekend.&rdquo;</span></div></div></div></div>
        <div class="jcard"><h3>Shortlist today</h3><div class="desc">Live from Listing</div>
          ${p.picks.slice(0, 2).map(([cid], i) => `<div class="upload-row"><div class="l">${ic("car")}${PCARS[cid].title}</div><div class="status" style="color:${i === 1 ? "var(--ok-ink)" : "var(--muted)"};">${i === 1 ? "Price down AED 1,000" : "Available, price unchanged"}</div></div>`).join("")}</div>
      </div>
      <div class="jcard" style="margin-top:14px;"><h3>Call outcome</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn primary" data-go="N2">${ic("link")}Ready: send payment link</button>
          <button class="btn" data-go="N6">${ic("calendar")}Book another drive</button>
          <button class="btn">${ic("phone-missed")}No answer: try again</button>
          <button class="btn" data-go="N7">${ic("circle-x")}Not interested</button>
        </div></div>
    </div>`;
    return deskShell({ active: "tasks", who: "rm", crumb: `<a>Tasks</a> / <b>TD follow-up</b>`, body });
  },

  N6: (t) => {
    const p = PEOPLE[t];
    const car = t === "vtd" ? PCARS.c2 : t === "walkin" ? PCARS.c3 : PCARS.c2;
    const body = `<div class="jcard"><h3>${t === "vtd" ? "Book a hub test drive" : "Book another drive"}</h3><div class="desc">${t === "vtd" ? "Khalid wants to drive the Camry. Same slot picker as P2." : `${car.title} for ${p.name.split(" ")[0]}. Same slot picker as P2.`}</div>
      ${slotPicker("hub", "4:00 PM")}</div>`;
    return daScreen(t, { stage: "next-step", idx: 1, subs: ["Debrief", "Book"], id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: slot confirmed", [["Confirm booking", "P3", "primary", "calendar-check"]]) });
  },

  N7: (t) => {
    const body = `<div class="jcard"><h3>Close the visit</h3><div class="desc">Why did the customer say no? Reasons follow CRUISE.</div>
      <div class="fld-row"><label>Reason</label>${chips("rsn", ["Mechanical", "Non-mechanical", "Pricing", "Assortment", "No response", "Other"], ["Pricing"])}</div>
      <div class="fld-row"><label>Detail</label>${chips("sub", ["Found cheaper elsewhere", "Over budget", "Expected a discount"], ["Found cheaper elsewhere"])}</div>
      <div class="fld" style="margin-top:10px;"><label for="n-why">Note</label><input class="box" id="n-why" value="Saw a similar car for AED 3,000 less on another site."></div>
      <div style="margin-top:12px;">${sw(true, "OK to stay in touch", "Send new arrivals that match the shortlist. Only with the customer's agreement.")}</div></div>`;
    return daScreen(t, { stage: "next-step", idx: 1, subs: ["Debrief", "Close"], id: t === "walkin" ? "BK-89004" : null, body,
      bottom: bar("Exit: reason saved", [["Close visit", null, "primary", "check"]]) });
  },

  // ------------------------------------------------------------ M · Oversight
  M1: () => {
    const rows = [["BOOKED TODAY", 24, "", ""], ["ARRIVED", 26, "incl. 7 walk-ins", ""], ["CHECKED IN", 25, "3 min", ""], ["DA ASSIGNED", 25, "1 min", ""], ["MET CUSTOMER", 24, "4 min", "late"], ["TD STARTED", 19, "21 min", ""], ["TD CONSENT SIGNED", 19, "1 min", ""], ["TD CONDUCTED", 17, "18 min", ""], ["TOKEN PAID", 5, "9 min", "good"]];
    const body = `<div class="lv-body">
      <div class="list-head"><div><h2>Test drive funnel</h2><div class="sub">Al Quoz &middot; today &middot; every hexagon on the PISTON board is a row here</div></div><span class="chip ok">${ic("circle-dot")}Live</span></div>
      <div class="alert">${ic("triangle-alert")}Fatima Al Suwaidi has waited 7 min since check-in for a handshake (target 5 min)<button class="rowbtn" data-go="S2">${ic("users")}Reassign DA</button></div>
      <div class="minicards" style="margin:14px 0;"><div><b>26</b><span>Visits</span></div><div><b>5</b><span>Token paid</span></div><div><b>19%</b><span>Visit to token</span></div><div><b>6 min</b><span>Arrival to handshake, median</span></div></div>
      <div class="jcard"><div class="funnel">
        <div class="frow" style="color:var(--faint); font-size:10.5px; font-weight:700; letter-spacing:.06em;"><span>STATE</span><span></span><span style="text-align:right;">COUNT</span><span>FROM LAST STATE</span></div>
        ${rows.map(([nm, n, tm, tone]) => `<div class="frow"><span class="nm"><span class="hex ${tone === "good" ? "good" : ""}" style="padding:3px 12px;">${nm}</span></span><span class="bar"><i class="${tone === "good" ? "good" : ""}" style="width:${Math.round(n / 26 * 100)}%"></i></span><span class="n">${n}</span><span class="t ${tone === "late" ? "late" : ""}">${tm}${tone === "late" ? " &middot; target 5" : ""}</span></div>`).join("")}
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:14px;"><span class="hex good">TOKEN PAID 5</span><span class="hex warn">FOLLOW-UP SCHEDULED 11</span><span class="hex warn">NEW TD BOOKED 3</span><span class="hex bad">DROPPED 3</span></div></div>
    </div>`;
    return deskShell({ active: "oversight", who: "manager", manager: true, crumb: `<b>Manager Oversight</b> <span style="color:var(--faint); font-weight:400;">&middot; TD funnel</span>`, body });
  },
};

function kv(k, v) { return `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`; }

function slotPicker(mode, onSlot) {
  const slots = [["10:00 AM", "3 left"], ["11:30 AM", "1 left", "low"], ["1:00 PM", "Full", "full"], ["2:30 PM", "2 left"], ["3:00 PM", "2 left"], ["4:00 PM", "3 left"], ["5:30 PM", "1 left", "low"], ["7:00 PM", "2 left"]];
  return `<div class="fld-row"><label>Type</label><div class="seg2" data-tabs><button class="${mode === "hub" ? "on" : ""}" data-tab="hub">${ic("store")}Hub test drive</button><button class="${mode === "vtd" ? "on" : ""}" data-tab="vtd">${ic("video")}Video test drive</button></div></div>
    <div class="fld-row"><label>Where</label><span style="font-size:13px; font-weight:600;">${mode === "vtd" ? "Video call, link by WhatsApp" : "Al Quoz hub, Dubai"}</span></div>
    <div class="fld-row"><label>Day</label>${chips("dday", ["Today", "Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct"], ["Today"])}</div>
    <div class="slots" style="margin-top:10px;">${slots.map(([s, left, cls]) => `<button class="slot ${cls || ""} ${s === onSlot ? "on" : ""}" ${cls === "full" ? "disabled" : `data-pick="slot"`}>${s}<span>${left}</span></button>`).join("")}</div>
    <p style="font-size:12px; color:var(--muted); margin:12px 0 0; line-height:1.5;">A slot shows as free only when a ${mode === "vtd" ? "video operator" : "DA"} and the car are both free. Today this comes from the slot planner; the target is the central Appointment Service.</p>`;
}

function leadScreen(t, stepNo) {
  const p = PEOPLE[t];
  const viewed = t === "vtd" ? [["c2", "Viewed 4 times"], ["c1", "Viewed once"]] : [["c1", "Viewed 3 times"], ["c3", "Viewed once"]];
  const leadPane = `<div class="leftpane">
    <div class="lp-head"><div><div class="lp-av">${inits(p.name)}</div><div class="lp-name">${p.name}</div><span class="chip neutral">${p.source}</span></div><button class="kebab">${ic("more-vertical")}</button></div>
    <div class="lp-tabs"><span class="active">Contact</span><span>Activity</span><span>Orders</span></div>
    <div class="lp-section"><div class="stitle">DETAILS &amp; CONTACT</div>${lpf("Lead ID", "LD-55120")}${lpf("Phone", p.phone)}${lpf("Email", p.email.replace("@", "@<wbr>"))}${lpf("Language", p.language)}${lpf("Owner", "Reem Khalifa")}</div></div>`;
  const activity = `<div class="scr-pad">
    <div class="list-head"><div><h2>${p.name}</h2><div class="sub">Lead &middot; ${p.source} &middot; created today 9:12 AM</div></div></div>
    <div class="sectlabel">Activity</div>
    <div class="tl">${viewed.map(([cid, n]) => `<div>${ic("eye")}<div><b>${PCARS[cid].title}</b><span>${n} in the app</span></div></div>`).join("")}
      <div>${ic("phone")}<div><b>${t === "vtd" ? "Chatbot" : "Called in"} &middot; 9:12 AM</b><span>${t === "vtd" ? "Asked for a video viewing" : "Asked about finance options"}</span></div></div></div></div>`;
  const step1 = `<div class="sectlabel">Customer</div>
    <div class="fld-row"><label>Name</label><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:13px; font-weight:600;">${p.name}</span><span class="prefill">${ic("sparkles")}From the app profile</span></div></div>
    <div class="fld-row"><label>Mobile</label>${otpBlock(p.phone, "7731")}</div>
    <div class="fld-row"><label>Email</label><span style="font-size:13px; font-weight:600;">${p.email}</span></div>
    <div class="sectlabel">Car</div>
    <div class="radio-list">${viewed.map(([cid, n], i) => `<label class="radio-opt ${i === 0 ? "checked" : ""}"><input type="radio" name="p1car" ${i === 0 ? "checked" : ""}> ${PCARS[cid].title} <span style="margin-left:auto; font-size:11.5px; color:var(--faint);">${n}</span></label>`).join("")}</div>
    <p style="font-size:12px; color:var(--muted); margin:12px 0 0;">The order is created as BOOKING INITIATED once the mobile is verified.</p>`;
  const sheet = `<div class="dim"></div><div class="sheet">
    <div class="sheet-head"><h4>Book a test drive</h4><span style="font-size:12px; color:var(--faint);">Step ${stepNo} of 2</span></div>
    <div class="sheet-body">${stepNo === 1 ? step1 : slotPicker(t === "vtd" ? "vtd" : "hub", t === "vtd" ? "3:00 PM" : "2:30 PM")}</div>
    <div class="sheet-foot">${stepNo === 1
      ? `<button class="btn" data-go="P4">${ic("phone-forwarded")}Not ready: call back</button><button class="btn primary" data-go="P2">Continue to slot ${ic("arrow-right")}</button>`
      : `<button class="btn" data-go="P4">${ic("phone-forwarded")}No slot works: call back</button><button class="btn primary" data-go="P3">${ic("calendar-check")}Confirm booking</button>`}</div></div>`;
  return deskShell({ active: "leads", who: "cc", crumb: `<a>Leads</a> / <b>${p.name}</b>`, body: `<div class="scr-body">${leadPane}${activity}${sheet}</div>` });
}
