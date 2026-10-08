// ---- PISTON: one Leadverse screen per step, in the Leadverse TD Journey design ----
// Layout from the TD Journey Figma file: white icon rail, header with breadcrumb and search, then a lead pane
// (status, AI summary, contact actions, finance, documents), a center column (stage bar, content on a grey canvas,
// footer actions) and the CarGPT panel with live transcription. White theme only.
// SCREENS[stepId](track) returns one 1180 x 760 screen.
// data-go="ID" on a control is that step's exit: clicking it moves the walkthrough to step ID.
// data-part="key" marks a part of the screen for the anatomy pins (see piston-anatomy.js).

const ic = (n) => `<i data-lucide="${n}" class="icon"></i>`;
const isHub = (t) => t !== "vtd";
const first = (t) => PEOPLE[t].name.split(" ")[0];

// ================================================================== mock context for the lead pane
const VISIT = marketTable({
  booked: { id: "BK-88213", src: "Consumer app", owner: "Reem Khalifa", aecb: "742 &middot; Good", pre: "Eligible", area: "Al Barsha, Dubai", dl: "Verified", eid: "On file" },
  walkin: { id: "VS-2041", order: "BK-89004", src: "Drive-by", owner: "Omar Hassan", aecb: "Not checked yet", pre: "Not checked yet", area: "Deira, Dubai", dl: "Verified", eid: "Scanned" },
  vtd: { id: "BK-88190", src: "Chatbot", owner: "Reem Khalifa", aecb: "768 &middot; Very good", pre: "Eligible", area: "Khalifa City, Abu Dhabi", dl: "Not needed for video", eid: "On file" },
}, { au: {
  booked: { id: "BK-88213", src: "Consumer app", owner: "Chloe Davis", aecb: "742 &middot; Very good", pre: "Eligible", area: "Richmond, VIC 3121", dl: "Verified", eid: "VIC" },
  walkin: { id: "VS-2041", order: "BK-89004", src: "Drive-by", owner: "Josh Miller", aecb: "Not checked yet", pre: "Not checked yet", area: "Footscray, VIC 3011", dl: "Verified", eid: "VIC" },
  vtd: { id: "BK-88190", src: "Chatbot", owner: "Chloe Davis", aecb: "768 &middot; Very good", pre: "Eligible", area: "Canberra, ACT 2600", dl: "Not needed for video", eid: "ACT" },
} });
const STAFF_AV = marketTable({ receptionist: "K", da: "OH", operator: "SI", manager: "AP", cc: "RK", rm: "RH" },
  { au: { receptionist: "K", da: "JM", operator: "PS", manager: "AP", cc: "CD", rm: "GL" } });

const PILL = {
  P1: ["grey", "New lead"], P2: ["grey", "New lead"], P3: ["violet", "Booking initiated"], P4: ["violet", "Booking initiated"], P5: ["violet", "Booking initiated"],
  P6: ["violet", "Booking initiated"], P7: ["violet", "Booking initiated"], P8: ["violet", "TD booked"], P9: ["amber", "Callback due"],
  S1: ["red", "Not checked-in"], S2: ["green", "Checked in"], S3: ["green", "Checked in"],
  T1: ["violet", "With DA"], T2: ["violet", "With DA"], T3: ["violet", "With DA"], T4: ["violet", "With DA"], T5: ["violet", "With DA"],
  O1: ["violet", "With DA"], O2: ["violet", "With DA"], O3: ["red", "TD live"], O4: ["red", "TD live"], O5: ["red", "TD live"], O6: ["green", "TD done"],
  N1: ["green", "TD done"], N2: ["amber", "Token pending"], N3: ["green", "Token paid"], N4: ["amber", "Follow-up set"], N5: ["amber", "Follow-up due"],
  N6: ["violet", "New TD booked"], N7: ["red", "Dropped"],
};
const PILL_VTD = { I1: ["violet", "In waiting room"], S1: ["red", "Not checked-in"], T2: ["violet", "On video"], T3: ["violet", "On video"], T4: ["violet", "On video"], T5: ["violet", "On video"], O2: ["red", "Video live"], O6: ["green", "Video TD done"] };

const AI_AU = {
  booked: {
    P: ["Viewed the Mazda3 3 times in the app", "Asked about finance options", "Evening calls work best"],
    I: ["High intent: booked the Mazda3 for 2:30 PM", "Licence uploaded before the visit", "Lives nearby, in Richmond"],
    S: ["High intent: booked the Mazda3 for 2:30 PM", "Licence uploaded before the visit", "Lives nearby, in Richmond", "Asked about finance before the visit"],
    T: ["Family car for weekends and the city", "Likely finance: asked about repayments", "Tucson is the closest alternative"],
    O: ["Engaged on the drive", "Price question against the Camry", "Wants CarPlay: shown at the walkaround"],
    N: ["High urgency: would reserve today", "Wants finance options and the service history", "Main objection: price against the Camry"],
  },
  walkin: {
    I: ["New customer, came in as a drive-by", "No app history yet"],
    S: ["New customer, came in as a drive-by", "No app history yet", "Lives in Footscray"],
    T: ["Family of four, long drives on weekends", "Budget $27k to $33k", "Paying cash"],
    O: ["Liked the space and the rear camera", "Compares the price with the Tucson"],
    N: ["Cash buyer, wants to reserve today", "Asked for the service history"],
  },
  vtd: {
    P: ["Asked the chatbot for a video viewing", "Lives in Canberra, interstate from the hub", "Viewed the Camry 4 times"],
    I: ["Booked a video TD of the Camry", "Lives in Canberra, interstate"],
    S: ["Booked a video TD of the Camry", "Lives in Canberra, interstate"],
    T: ["Commutes to the city daily", "Wants adaptive cruise"],
    O: ["Clean interior noted", "Wants to feel it on the road"],
    N: ["Likely to book a hub drive this week", "Finance customer"],
  },
};
const AI = marketTable({
  booked: {
    P: ["Viewed the Altima 3 times in the app", "Asked about finance options", "Evening calls work best"],
    I: ["High intent: booked the Altima for 2:30 PM", "DL uploaded before the visit", "Prefers Arabic"],
    S: ["High intent: booked the Altima for 2:30 PM", "DL uploaded before the visit", "Prefers Arabic", "Asked about finance before the visit"],
    T: ["Family car for weekends and the city", "Likely finance: asked about EMI", "Tucson is the closest alternative"],
    O: ["Engaged on the drive", "Price question against the Camry", "Wants CarPlay: shown at the walkaround"],
    N: ["High urgency: would reserve today", "Wants EMI options and the service history", "Main objection: price against the Camry"],
  },
  walkin: {
    I: ["New customer, came in as a drive-by", "No app history yet"],
    S: ["New customer, came in as a drive-by", "No app history yet", "Speaks Arabic and English"],
    T: ["Family of four, long drives to Abu Dhabi", "Budget AED 55k to 65k", "Paying cash"],
    O: ["Liked the space and the rear camera", "Compares the price with the Tucson"],
    N: ["Cash buyer, wants to reserve today", "Asked for the service history"],
  },
  vtd: {
    P: ["Asked the chatbot for a video viewing", "Lives in Abu Dhabi, 90 min from the hub", "Viewed the Camry 4 times"],
    I: ["Booked a video TD of the Camry", "Lives in Abu Dhabi"],
    S: ["Booked a video TD of the Camry", "Lives in Abu Dhabi"],
    T: ["Commutes to Dubai daily", "Wants adaptive cruise"],
    O: ["Clean interior noted", "Wants to feel it on the road"],
    N: ["Likely to book a hub drive this week", "Finance customer"],
  },
}, { au: AI_AU });

// ================================================================== shell: icon rail + header
function rail(active, manager, who) {
  const items = [["tasks", "layout-grid"], ["leads", "contact"], ["testdrives", "car-front"], ["calls", "phone"]];
  if (manager) items.push(["oversight", "gauge"]);
  return `<aside class="v2-rail">
    <span class="v2-logo">${ic("layers")}</span>
    ${items.map(([k, icon]) => `<a class="${k === active ? "on" : ""}">${ic(icon)}</a>`).join("")}
    <span class="v2-av staff me">${STAFF_AV[who] || STAFF_AV.da}</span>
  </aside>`;
}
function shell({ active, who, crumb, body, manager }) {
  return `<div class="v2">${rail(active, manager, who)}<div class="v2-main">
    <header class="v2-head">
      <span class="v2-ib">${ic("panel-left")}</span><span class="v2-vsep"></span>
      <nav class="v2-crumb">${crumb}</nav>
      <div class="v2-search">${ic("search")}<span>Search order ID, customer name&hellip;</span><kbd>&#8984;F</kbd></div>
      <div class="v2-head-r"><span class="v2-ib box">${ic("bell")}</span><span class="v2-av staff" title="${PSTAFF[who].name}">${STAFF_AV[who]}</span></div>
    </header>
    ${body}
  </div></div>`;
}
const crumbOf = (...parts) => parts.map((p, i) => i === parts.length - 1 ? `<b>${p}</b>` : `<span>${p}</span>${ic("chevron-right")}`).join("");

// ================================================================== lead pane
function leadPane(t, stepId, opts = {}) {
  const p = PEOPLE[t], v = VISIT[t];
  const [tone, label, pillAttrs] = opts.pill || (t === "vtd" && PILL_VTD[stepId]) || PILL[stepId] || ["grey", "Open"];
  const ai = (AI[t] && (AI[t][stepId[0]] || AI[t].S)) || [];
  const isLead = stepId[0] === "P" && stepId !== "P8";
  const idLabel = isLead ? "Lead ID" : t === "walkin" && !opts.ordered ? "Visit ID" : "Order ID";
  const idVal = isLead ? (t === "vtd" ? "LD-55127" : "LD-55120") : t === "walkin" && opts.ordered ? v.order : v.id;
  return `<aside class="v2-lead" data-part="lead">
    <div class="v2-lh"><span class="v2-av lg">${inits(p.name)}</span><div><b>${p.name}</b><span class="v2-pill ${tone}"${pillAttrs ? " " + pillAttrs : ""}>${label}</span></div>
      <div class="v2-lh-ic">${ic("square-pen")}${ic("menu")}</div></div>
    <div class="v2-ltabs"><span class="on">${ic("user")}Contact</span><span>${ic("wallet")}Finance</span><span>${ic("file-text")}Documents</span><span>${ic("history")}Activity</span></div>
    <div class="v2-lscroll">
      ${ai.length ? `<div class="v2-ai"><div class="k">${ic("sparkles")}AI Summary</div><ul>${ai.map(x => `<li>${x}</li>`).join("")}</ul></div>` : ""}
      <div class="v2-sec">Details &amp; contacts</div>
      <div class="v2-group">
        <div class="v2-f"><div><small>${idLabel}</small><b>${idVal}</b></div><span class="v2-copy">${ic("copy")}</span></div>
        <div class="v2-f"><div><small>Phone</small><b>${p.phone}</b></div><div class="v2-acts"><span class="call">${ic("phone")}</span><span class="wa">${ic("message-circle")}</span><span>${ic("message-square")}</span></div></div>
        <div class="v2-f"><div><small>Email</small><b>${p.email}</b></div><div class="v2-acts"><span>${ic("mail")}</span></div></div>
        <div class="v2-f"><div><small>Lead source</small><b>${v.src}</b></div></div>
        <div class="v2-f"><div><small>${isLead ? "Lead owner" : "DA"}</small><b>${isLead ? v.owner : t === "vtd" ? "Sara Ibrahim" : ["S1", "S2", "I1", "I2"].includes(stepId) ? "Not assigned yet" : "Omar Hassan"}</b></div></div>
      </div>
      <div class="v2-sec">Finance</div>
      <div class="v2-group"><div class="v2-f"><div><small>${MK.credit}</small><b>${v.aecb}</b></div></div><div class="v2-f"><div><small>Pre-approval</small><b>${v.pre}</b></div></div></div>
      <div class="v2-sec">Documents</div>
      <div class="v2-group"><div class="v2-f"><div><small>Driving licence</small><b${opts.dlAttrs ? " " + opts.dlAttrs : ""}>${opts.dl || (["S1", "S2", "I1", "I2"].includes(stepId) && t !== "vtd" ? "To verify" : v.dl)}</b></div></div><div class="v2-f"><div><small>${MK.idDoc}</small><b>${v.eid}</b></div></div></div>
    </div>
  </aside>`;
}

// ================================================================== stage bar
const VISIT_STAGES = { hub: ["Check-in", "DL verify", "Car finding", "TD live", "Disposition"], vtd: ["Check-in", "Car finding", "Video TD", "Disposition"] };
const STAGE_AT = {
  hub: { I1: 0, I2: 0, S1: 0, S2: 1, S3: 2, T1: 2, T2: 2, T3: 2, T4: 2, T5: 2, O1: 3, O2: 3, O3: 3, O4: 3, O5: 3, O6: 3, N1: 4, N2: 4, N3: 5, N4: 4, N6: 4, N7: 4 },
  vtd: { I1: 0, I2: 0, S1: 0, T2: 1, T3: 1, T4: 1, T5: 1, O2: 2, O6: 2, N1: 3, N2: 3, N3: 4, N4: 3, N6: 3, N7: 3 },
};
function stageSub(t, name, state, stepId) {
  if (state === "todo") return "Pending";
  const done = state === "done";
  const walk = t === "walkin";
  const self = isHub(t) && CTX.mode === "link";
  switch (name) {
    case "Check-in": return done ? (t === "vtd" ? "3:01 PM" : `${self ? "Self &middot; " : ""}${walk ? "2:44 PM" : "2:27 PM"}`) : self ? "Link sent" : "In progress";
    case "DL verify": return done ? "Verified" : "Scan or upload";
    case "Car finding": return done ? (walk ? "1 car" : t === "vtd" ? "Camry" : "2 cars") : stepId === "S3" ? "Assigning DA" : t === "vtd" ? "On screen share" : "With Omar";
    case "TD live": return done ? (walk ? "1/1 done" : "2/2 done") : stepId === "O6" ? (walk ? "1/1 done" : "1/2 done") : (walk ? "0/1 done" : "0/2 done");
    case "Video TD": return done ? "Done" : "Live";
    case "Disposition": return done ? "Token paid" : "Open";
  }
  return "";
}
// opts.sync: the self check-in panel, where Check-in turns done and DL verify current when the customer submits
function stageBar(t, stepId, opts = {}) {
  const names = VISIT_STAGES[isHub(t) ? "hub" : "vtd"];
  const cur = STAGE_AT[isHub(t) ? "hub" : "vtd"][stepId] ?? 0;
  const hooks = opts.sync ? [
    [`data-cls-submitted="cur>done"`, `data-on-opened="Filling" data-on-submitted="Self &middot; ${opts.sync}"`],
    [`data-cls-submitted="todo>cur"`, `data-on-submitted="Up next"`],
  ] : [];
  return `<div class="v2-stages" data-part="stages">${names.map((n, i) => {
    const state = i < cur ? "done" : i === cur ? "cur" : "todo";
    const [a, b] = hooks[i] || [];
    return `<div class="v2-stg ${state}"${a ? " " + a : ""}><span class="c">${ic("square-check")}</span><b>${n}</b><span${b ? " " + b : ""}>${stageSub(t, n, state, stepId)}</span></div>`;
  }).join("")}</div>`;
}

// ================================================================== CarGPT panel
function gpt(who, { cards = [], transcribing = null } = {}) {
  const name = (PSTAFF[who] || PSTAFF.da).name.split(" ")[0];
  return `<aside class="v2-gpt" data-part="gpt">
    <div class="v2-gh">${ic("panel-right")}CarGPT<span class="r">${ic("folder")}</span></div>
    <div class="v2-gbody">
      ${cards.length ? cards.map(([k, icon, html]) => `<div class="v2-gcard"><div class="k">${ic(icon)}${k}</div>${html}</div>`).join("") : `<div class="v2-hi">Hi ${name},<br>how can I help you?</div>`}
    </div>
    <div class="v2-compose"><span>Type &lsquo;/&rsquo; to mention a record&hellip;</span><div class="row">${ic("plus")}<span class="v2-send">${ic("arrow-up")}</span></div></div>
    ${transcribing
      ? `<div class="v2-trans on"><i class="rec"></i>Live transcription on &middot; ${transcribing}</div>`
      : `<div class="v2-trans">${ic("audio-lines")}Start live transcription</div>`}
  </aside>`;
}
const TRANSCRIBING = { booked: "since 2:27 PM", walkin: "since 2:44 PM", vtd: "since 3:01 PM" };

// ================================================================== center column parts
function prevOf(t, id) {
  const list = stepsForTrack(t).filter(s => s.phase !== "M");
  const i = list.findIndex(s => s.id === id);
  return i > 0 ? list[i - 1].id : null;
}
// buttons: [label, go, kind, icon, iconAfter]
function foot(t, id, hint, buttons) {
  const prev = prevOf(t, id);
  return `<div class="v2-foot" data-part="foot">
    <button class="v2-btn" ${prev ? `data-go="${prev}"` : "disabled"}>${ic("arrow-left")}Previous</button>
    <span class="v2-hint">${hint}</span>
    <div class="v2-foot-r">${buttons.map(([label, go, kind, icon, after, attrs]) => `<button class="v2-btn ${kind || ""}" ${go ? `data-go="${go}"` : ""}${attrs ? " " + attrs : ""}>${icon && !after ? ic(icon) : ""}${label}${icon && after ? ic(icon) : ""}</button>`).join("")}</div>
  </div>`;
}
function head2(title, desc, right) {
  return `<div class="v2-ch"><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ""}</div>${right || ""}</div>`;
}
function subSteps(list, idx) {
  return `<div class="v2-substeps">${list.map((x, i) => `<span class="${i < idx ? "done" : i === idx ? "on" : ""}">${i < idx ? ic("check") : ""}${x}</span>`).join("")}</div>`;
}
// the visit page: lead pane | stage bar + content + footer | CarGPT
function visit({ t, id, ordered, title, desc, right, body, footer, gptOpts, overlay, who = "da", crumb, leadOpts, stageOpts }) {
  const p = PEOPLE[t];
  const content = `<div class="v2-body">
    ${leadPane(t, id, { ordered, ...(leadOpts || {}) })}
    <section class="v2-center">${stageBar(t, id, stageOpts)}<div class="v2-content">${head2(title, desc, right)}${body}</div>${footer}</section>
    ${gptOpts === false ? "" : gpt(who, gptOpts || {})}
    ${overlay || ""}
  </div>`;
  return shell({ active: "testdrives", who, crumb: crumb || crumbOf("Test Drives", `${p.name} - ${t === "walkin" && !ordered ? VISIT[t].id : t === "walkin" ? VISIT[t].order : p.id}`), body: content });
}
// the video console for VTD: video | stage bar + content + footer
function videoPanel({ main, pip, share }) {
  return `<div class="video" data-part="video">
    <div class="top"><span>${PEOPLE.vtd.name} &middot; BK-88190</span><span class="rec"><i></i>Recording &middot; transcribing</span></div>
    ${share ? `<div class="share">${ic("screen-share")}${share}</div>` : ""}
    <div class="main">${main}</div>
    ${pip ? `<div class="pip">${pip}</div>` : ""}
    <div class="ctrls"><span>${ic("mic")}</span><span>${ic("video")}</span><span>${ic("screen-share")}</span><span class="end">${ic("phone-off")}</span></div>
  </div>`;
}
const vtdTile = () => `<div class="who"><span class="big">${inits(PEOPLE.vtd.name)}</span>${first("vtd")} &middot; camera on</div>`;
const carTile = (cid) => `<div class="who">${ic("car")}Yard camera &middot; ${PCARS[cid].title}</div>`;
function vtdVisit({ id, title, desc, right, body, footer, video, overlay }) {
  const t = "vtd";
  const content = `<div class="v2-body">
    <div class="v2-vcol">${video || videoPanel({ main: vtdTile(), pip: "You &middot; Sara" })}</div>
    <section class="v2-center">${stageBar(t, id)}<div class="v2-content">${head2(title, desc, right)}${body}</div>${footer}</section>
    ${overlay || ""}
  </div>`;
  return shell({ active: "testdrives", who: "operator", crumb: crumbOf("Test Drives", `${PEOPLE.vtd.name} - BK-88190`, "Video TD"), body: content });
}
// DA steps run on the DA's tablet for hub tracks, and on the operator's video console for VTD
function daStep(t, o) {
  if (!isHub(t)) return vtdVisit(o);
  return visit({ ...o, t, who: "da", gptOpts: o.gptOpts || { cards: o.cards || [], transcribing: TRANSCRIBING[t] } });
}

// ================================================================== small components
const sel = (label, value, ph) => `<div class="v2-field"><label>${label}</label><div class="v2-select ${ph ? "ph" : ""}"><span>${value}</span>${ic("chevron-down")}</div></div>`;
const inp = (label, value, id) => `<div class="v2-field"><label for="${id}">${label}</label><input class="v2-input" id="${id}" value="${value}"></div>`;
function chips(group, opts, on) {
  return `<div class="v2-chips">${opts.map(o => `<button class="v2-chip ${on.includes(o) ? "on" : ""}" data-pick="${group}">${o}</button>`).join("")}</div>`;
}
const row = (label, html, part) => `<div class="v2-row" ${part ? `data-part="${part}"` : ""}><label>${label}</label><div>${html}</div></div>`;
function toggle(on, title, text, part) {
  return `<div class="v2-toggle" ${part ? `data-part="${part}"` : ""}><button class="v2-sw ${on ? "on" : ""}" data-sw aria-label="${title}"></button><div><b>${title}</b><span>${text}</span></div></div>`;
}
function radios(group, opts, on) {
  return opts.map(o => `<button class="v2-radio ${o === on ? "on" : ""}" data-pick="${group}"><i class="dot"></i>${o}</button>`).join("");
}
function carRow(cid, { check, selected, oid, badge, sub, right, part, likes } = {}) {
  const c = PCARS[cid];
  return `<div class="v2-car ${selected ? "sel" : ""}" ${part ? `data-part="${part}"` : ""} ${check ? "data-toggle-sel" : ""}>
    ${check ? `<span class="ck">${ic("check")}</span>` : ""}
    <span class="ph" style="background:${c.color}">${ic("car")}</span>
    <div class="mid">${oid ? `<span class="oid">Order ID: ${oid} ${ic("copy")}</span>` : ""}<div class="tt">${c.title}${ic("chevron-right")}</div><div class="sub">${sub || `${money(c.price)} &middot; ${c.km} &middot; ${c.body}`}</div></div>
    <div class="rt">${badge || ""}${likes ? `<span class="v2-likes"><button class="v2-chip ${likes === "like" ? "on" : ""}" data-pick="lk-${cid}">${ic("thumbs-up")}Like</button><button class="v2-chip ${likes === "pass" ? "on" : ""}" data-pick="lk-${cid}">${ic("thumbs-down")}Dislike</button></span>` : ""}${right || `<span class="v2-ib">${ic("more-vertical")}</span>`}</div>
  </div>`;
}
function qrSvg(n = 21, s = 5) {
  let cells = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fin = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
    let on;
    if (fin) { const fx = x < 7 ? x : x - (n - 7), fy = y < 7 ? y : y - (n - 7); on = fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5); }
    else on = ((x * 7 + y * 13 + x * y) % 5) < 2;
    if (on) cells += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}"/>`;
  }
  return `<svg width="${n * s + 12}" height="${n * s + 12}" viewBox="-6 -6 ${n * s + 12} ${n * s + 12}" style="background:#fff; border-radius:8px;"><g fill="#101828">${cells}</g></svg>`;
}
function slotGrid(onSlot) {
  const slots = [["10:00 AM", "3 left"], ["11:30 AM", "1 left", "low"], ["1:00 PM", "Full", "full"], ["2:30 PM", "2 left"], ["3:00 PM", "2 left"], ["4:00 PM", "3 left"], ["5:30 PM", "1 left", "low"], ["7:00 PM", "2 left"]];
  return `<div class="v2-slots" data-part="slots">${slots.map(([s, left, cls]) => `<button class="v2-slot ${cls || ""} ${s === onSlot ? "on" : ""}" ${cls === "full" ? "disabled" : `data-pick="slot"`}>${s}<span>${left}</span></button>`).join("")}</div>`;
}
const kv = (k, v) => `<div class="v2-kv"><small>${k}</small><b>${v}</b></div>`;

// ================================================================== list pages
function page({ who, active, crumb, title, sub, actions, tools, tabs, table, extra, manager, overlay }) {
  const body = `<div class="v2-body"><div class="v2-page">
    <div class="v2-ph"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><div class="v2-ph-r">${actions || ""}</div></div>
    ${extra && extra.top ? extra.top : ""}
    ${tools ? `<div class="v2-tools">${tools}</div>` : ""}
    ${tabs ? `<div class="v2-tabs2">${tabs.map(([l, on]) => `<span class="${on ? "on" : ""}">${l}</span>`).join("")}</div>` : ""}
    ${table || ""}
    ${extra && extra.bottom ? extra.bottom : ""}
  </div>${overlay || ""}</div>`;
  return shell({ active, who, crumb, body, manager });
}
const toolsRow = (ph, buttons) => `<div class="v2-search inline">${ic("search")}<span>${ph}</span></div>${buttons.map(([l, icon]) => `<span class="v2-btn">${icon ? ic(icon) : ""}${l}</span>`).join("")}`;
function table(cols, rows, part) {
  return `<div class="v2-tbl" ${part ? `data-part="${part}"` : ""}><table class="v2-table"><thead><tr><th class="cb"><span class="v2-cb"></span></th>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.hl ? "hl" : ""}"><td class="cb"><span class="v2-cb"></span></td>${r.cells.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="v2-tfoot">0 of ${rows.length + 9} row(s) selected.</div></div>`;
}
const cust = (nm, sub2) => `<div class="v2-cust"><span class="v2-av">${inits(nm)}</span><div><b>${nm}</b>${sub2 ? `<small>${sub2}</small>` : ""}</div></div>`;
const pill = (tone, text) => `<span class="v2-pill ${tone}">${text}</span>`;

// ================================================================== the TD booking call (calling team persona task)
const CALL_TASK = { booked: "TK-6120", vtd: "TK-6127" };
const CALL_STEPS = ["Welcome", "Contact", "Pitch", "Discovery", "Finalize", "Book"];
function callStages(t, idx) {
  const done = { Welcome: first(t), Contact: "Order created", Pitch: "Interested", Discovery: "2 liked", Finalize: t === "vtd" ? "Camry &middot; Video" : "Altima &middot; Hub", Book: "Booked" };
  return `<div class="v2-stages" data-part="stages">${CALL_STEPS.map((n, i) => {
    const state = i < idx ? "done" : i === idx ? "cur" : "todo";
    return `<div class="v2-stg ${state}"><span class="c">${ic("square-check")}</span><b>${n}</b><span>${state === "done" ? done[n] : state === "cur" ? "In progress" : "Pending"}</span></div>`;
  }).join("")}</div>`;
}
function callTask(t, idx, id, { title, desc, right, body, hint, buttons, secs, cards }) {
  const p = PEOPLE[t];
  const callbar = `<div class="v2-call" data-part="call"><span class="cb">${ic("phone-call")}</span><div><b>On call with ${first(t)}</b><small>${p.phone} &middot; ${secs}</small></div><span class="v2-recpill"><i></i>Recording</span>
    <div class="v2-call-r"><span>${ic("mic-off")}</span><span>${ic("pause")}</span><span class="end">${ic("phone-off")}</span></div></div>`;
  const content = `<div class="v2-body">
    ${leadPane(t, id)}
    <section class="v2-center">${callbar}${callStages(t, idx)}<div class="v2-content">${head2(title, desc, right)}${body}</div>${foot(t, id, hint, buttons)}</section>
    ${gpt("cc", { cards: cards || [], transcribing: `call &middot; ${secs}` })}
  </div>`;
  return shell({ active: "tasks", who: "cc", crumb: crumbOf("Tasks", "TD booking call", `${p.name} - ${CALL_TASK[t]}`), body: content });
}

// ================================================================== screens
const SCREENS = {
  // ------------------------------------------------------------ P · Plan: the TD booking call
  P1: (t) => {
    const rows = [
      ["booked", "Fatima Al Suwaidi", "fatima.s@example.com", "Consumer app", "Nissan Altima SV", "4 min", "0 of 3"],
      ["vtd", "Khalid Al Jaberi", "khalid.j@example.com", "Chatbot", "Toyota Camry GLE", "9 min", "0 of 3"],
      ["", "Hamad Al Ketbi", "hamad.k@example.com", "Website", "Kia Sportage", "26 min", "1 of 3", "Callback 4:00 PM"],
      ["", "Sana Malik", "Mobile only", "Missed call", "&mdash;", "1 h", "2 of 3", "Callback tomorrow"],
    ];
    return page({ who: "cc", active: "tasks", crumb: crumbOf("Tasks", "TD booking call"), title: "TD booking call", sub: "Lead &middot; Reem Khalifa's queue",
      extra: { top: `<div class="v2-note">${ic("sparkles")}<span><b>A persona task of its own.</b> Every lead with a mobile number lands here. The agent works it on the call: welcome, contact, pitch, discovery, finalize, book. Booking closes the task.</span></div>` },
      tools: toolsRow("Search by name and UID", [["Saved filters", "save"], ["Filters", "list-filter"], ["Sort by", "arrow-up-down"], ["TD booking call", "chevron-down"]]),
      tabs: [["Queue &middot; 12", true], ["Callbacks &middot; 3"], ["Closed today &middot; 27"]],
      table: table(["Lead", "Source", "Car of interest", "Waiting", "Attempts", ""], rows.map(([trk, nm, mail, src, car, wait, att, cb]) => ({ hl: trk === t,
        cells: [cust(nm, mail), pill("grey", src), car, wait, att, cb ? pill("amber", cb) : `<button class="v2-btn ${trk === t ? "primary" : ""} sm" ${trk === t ? `data-go="P2" data-part="call-now"` : ""}>${ic("phone")}Call now</button>`] })), "queue") });
  },

  P2: (t) => {
    const p = PEOPLE[t], car = PCARS[p.car].title;
    return callTask(t, 0, "P2", { secs: "00:18", title: "Welcome", desc: "Open the call. The name comes first, nothing else yet.",
      body: `<div class="v2-script" data-part="script">${ic("quote")}<p>&ldquo;Hi, this is Reem from CARS24. Am I speaking with ${first(t)}? ${t === "vtd" ? `You asked our chatbot about a video viewing of the ${car}.` : `You were looking at the ${car} in our app.`} Is now a good time for a few minutes?&rdquo;</p></div>
        <div class="v2-card" style="margin-top:10px;">
          ${row("Name", `<div class="v2-inline"><input class="v2-input" id="c-name" value="${p.name}"><span class="v2-tag ai">${ic("sparkles")}From the ${t === "vtd" ? "chatbot" : "app profile"}</span></div>`, "name")}
          ${row("Language", chips("lang", MK.langs, [p.language.split(",")[0].trim()]), "lang")}
        </div>`,
      hint: "Exit: name confirmed", buttons: [["Call back later", "P9", "", "phone-forwarded"], ["Wrong number", "N7", "", "circle-x"], ["Name confirmed", "P3", "primary", "arrow-right", true]],
      cards: [["Say next", "message-square", `<p>Confirm the name, then ask for the email.</p>`], ["Lead signals", "sparkles", `<p>${t === "vtd" ? "Chatbot lead, asked for a video viewing." : "Viewed the Altima 3 times. Asked about finance."}</p>`]] });
  },

  P3: (t) => {
    const p = PEOPLE[t];
    return callTask(t, 1, "P3", { secs: "01:02", title: "Email and mobile", desc: "These basic details create the order.",
      body: `<div class="v2-card">
          ${row("Mobile", `<span class="v2-ok">${ic("circle-check")}${p.phone} &middot; from the lead</span>`, "mobile")}
          ${row("Same on WhatsApp?", chips("wa", ["Yes", "No, another number"], ["Yes"]), "whatsapp")}
          ${row("Email", `<div class="v2-inline"><input class="v2-input" id="c-mail" value="${p.email}">${t === "vtd" ? `<span class="v2-tag">Typed on the call</span>` : `<span class="v2-tag ai">${ic("sparkles")}From the app profile</span>`}</div>`, "email")}
        </div>
        <div style="margin-top:10px;">${toggle(true, "Booking updates on WhatsApp", "Confirmation, reminders and the video link go to this number.", "wa-consent")}</div>
        <div class="v2-note" style="margin-top:10px;" data-part="order-note">${ic("file-plus")}<span>Next creates the order in OMS as BOOKING INITIATED, with the ${PCARS[p.car].title}. The car can still change at Finalize.</span></div>`,
      hint: "Exit: email and mobile confirmed, order created", buttons: [["Create order and continue", "P4", "primary", "arrow-right", true]] });
  },

  P4: (t) => {
    const pts = [
      ["clipboard-check", "Every car inspected", "The report is shared before you decide", true],
      ["shield-check", "Warranty included", "Terms apply", true],
      ["rotate-ccw", "Return window", "Change your mind within the window", true],
      ["landmark", "Finance and trade-in", "Monthly plans; we take your current car", false],
      ["layout-grid", "Live stock to choose from", "Filter by budget and body type", false],
      ["video", "Test drive your way", "At a hub, or on a video call", false],
    ];
    return callTask(t, 2, "P4", { secs: "03:40", title: "Why CARS24", desc: "Tick each point as you cover it. Move on once the customer is interested.",
      right: `<span class="v2-pill violet" data-part="order-chip">${ic("file-check")}BOOKING INITIATED &middot; ${PEOPLE[t].id}</span>`,
      body: `<div class="v2-pitch" data-part="pitch-points">${pts.map(([icon, k, s, d]) => `<button class="v2-check ${d ? "done" : ""}" data-zone>${ic(icon)}<b>${k}</b><span>${s}</span></button>`).join("")}</div>
        <div class="v2-card" style="margin-top:10px;">
          ${row("Customer", chips("rx", ["Interested", "Has questions", "Not now", "Not interested"], ["Interested"]), "reaction")}
          ${row("Objections", chips("multi", ["Price", "Trust", "Finance", "Already bought"], ["Price"]), "objections")}
        </div>`,
      hint: "Exit: customer interested", buttons: [["Call back", "P9", "", "phone-forwarded"], ["Not interested", "N7", "", "circle-x"], ["Show cars", "P5", "primary", "arrow-right", true]],
      cards: [["Objection help", "shield-check", `<p>On price: every car is inspected and comes with a return window, so the price buys certainty.</p>`]] });
  },

  P5: (t) => {
    const p = PEOPLE[t], n = p.needs;
    const cars = t === "vtd" ? [["c2", "like", "Viewed 4 times"], ["c1", "like", ""], ["c3", "pass", ""]] : [["c1", "like", "Viewed 3 times"], ["c3", "like", ""], ["c2", "pass", ""]];
    return callTask(t, 3, "P5", { secs: "06:12", title: `What does ${first(t)} like?`, desc: "Describe each car on the call. Every answer narrows the next cars.",
      right: `<button class="v2-btn" data-part="send">${ic("send")}Send liked cars on WhatsApp</button>`,
      body: `<div class="v2-chips" style="margin-bottom:10px;" data-part="filters">${[n.budget, ...n.body, n.trans].map(x => `<span class="v2-chip on">${x}</span>`).join("")}<span class="v2-chip">${ic("plus")}Filter</span><span class="v2-tag ai">${ic("sparkles")}From ${t === "vtd" ? "the chat" : "app browsing"}</span></div>
        ${cars.map(([cid, v, note], i) => carRow(cid, { likes: v, badge: note ? `<span class="v2-badge booked">${note}</span>` : "", part: i === 0 ? "car-rows" : null, right: " " })).join("")}
        <p class="v2-small">2 liked &middot; 1 disliked. A dislike removes similar cars from the next set.</p>`,
      hint: "Exit: liked cars shortlisted", buttons: [["Nothing fits: alert and call back", "P9", "", "bell"], ["Next: finalize", "P6", "primary", "arrow-right", true]] });
  },

  P6: (t) => {
    const p = PEOPLE[t], vtd = t === "vtd";
    const liked = vtd ? ["c2", "c1"] : ["c1", "c3"];
    return callTask(t, 4, "P6", { secs: "08:31", title: "Finalize the car and the test drive", desc: `Pick from the cars ${first(t)} liked.`,
      body: `<div class="v2-card" data-part="final-car"><div class="v2-sec" style="margin-top:0;">Final car</div>${liked.map((cid, i) => `<button class="v2-radio ${i === 0 ? "on" : ""}" data-pick="fc"><i class="dot"></i>${PCARS[cid].title} &middot; ${money(PCARS[cid].price)}<span class="v2-r-note">${i === 0 ? "Car of interest" : "Liked on this call"}</span></button>`).join("")}</div>
        <div class="v2-card" data-part="td-type"><div class="v2-sec" style="margin-top:0;">Test drive</div>
          <div class="v2-seg2" data-tabs><button class="${vtd ? "" : "on"}" data-tab="hub">${ic("store")}Hub test drive</button><button class="${vtd ? "on" : ""}" data-tab="vtd">${ic("video")}Video test drive</button></div>
          <p class="v2-small">${vtd ? "This car can be shown on video from Studio 1." : "This car is at Al Quoz hub."}</p></div>
        <div class="v2-ok" style="margin-top:10px;" data-part="order-update">${ic("circle-check")}Order ${p.id} &middot; car set to ${PCARS[liked[0]].title}</div>`,
      hint: "Exit: car and TD type final", buttons: [["Next: pick a slot", "P7", "primary", "arrow-right", true]] });
  },

  P7: (t) => {
    const p = PEOPLE[t], vtd = t === "vtd";
    return callTask(t, 5, "P7", { secs: "09:47", title: `Book the ${vtd ? "video" : "hub"} test drive`, desc: `Slots for the ${PCARS[p.car].title}${vtd ? " on video" : " at Al Quoz hub"}. Booking closes this task.`,
      body: `<div class="v2-card">
          ${row("Where", `<b class="v2-b">${vtd ? "Video call, link by WhatsApp" : "Al Quoz hub, Dubai"}</b>`)}
          ${row("Day", chips("dday", ["Today", "Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct"], ["Today"]), "day")}
          <div style="margin-top:8px;">${slotGrid(vtd ? "3:00 PM" : "2:30 PM")}</div>
          <p class="v2-small">A slot shows as free only when ${vtd ? "a video operator" : "a DA"} and the car are both free. Today this comes from the slot planner; the target is the central Appointment Service.</p>
        </div>`,
      hint: "Exit: slot booked, calling task closed", buttons: [["No slot works: call back", "P9", "", "phone-forwarded"], ["Book test drive", "P8", "primary", "calendar-check"]] });
  },

  P8: (t) => {
    const rows = [
      ["booked", "Fatima Al Suwaidi", "BK-88213", "Today, 2:30 PM", "Nissan Altima SV", "Hub", [1, 0, 1, 1], ["Raise prep", "wrench"]],
      ["vtd", "Khalid Al Jaberi", "BK-88190", "Today, 3:00 PM", "Toyota Camry GLE", "Virtual", [2, 1, 1, 1], ["Open video room", "video"]],
      ["", "Maryam Rashidi", "BK-88177", "Today, 4:15 PM", "Hyundai Tucson", "Hub", [0, 1, 1, 1], ["Resend DL link", "send"]],
      ["", "Noora Al Shamsi", "BK-88102", "Tomorrow, 2:00 PM", "Hyundai Tucson", "Hub", [0, 0, 0, 0], ["Assign DA", "user-check"]],
    ];
    const cell = (v, icon) => v === 2 ? `<span class="y" title="Not needed">${ic("minus")}</span>` : `<span class="${v ? "y" : "n"}">${ic(v ? "check" : icon)}</span>`;
    return page({ who: "receptionist", active: "testdrives", crumb: crumbOf("Test Drives", "Upcoming"), title: "Test Drives", sub: "Upcoming visits at Al Quoz",
      actions: `<button class="v2-btn primary" data-go="I1" data-part="open">${ic("door-open")}Open today's arrivals</button>`,
      extra: { top: `<div class="v2-note">${ic("sparkles")}<span><b>Readiness is the exit check for Plan.</b> Each amber square is a task for someone: the customer (DL), the yard (car prep), the receptionist (DA) or the system (reminder).</span></div>` },
      tabs: [["Today &middot; 6"], ["Upcoming &middot; 14", true], ["Hub &middot; 11"], ["Virtual &middot; 3"]],
      table: table(["Customer", "Slot", "Car", "Type", "DL &middot; Car &middot; DA &middot; Reminder", ""], rows.map(([trk, nm, id, slot, car, type, r, [act, aic]]) => ({ hl: trk === t,
        cells: [cust(nm, id), slot, car, pill("grey", type), `<div class="v2-ready" ${trk === t ? `data-part="readiness"` : ""}>${cell(r[0], "file-text")}${cell(r[1], "wrench")}${cell(r[2], "user-x")}${cell(r[3], "bell")}</div>`, `<button class="v2-btn sm" ${trk === t ? `data-part="row-action"` : ""}>${ic(aic)}${act}</button>`] })), "table") });
  },

  P9: (t) => {
    const p = PEOPLE[t];
    const rows = [[p.name, "Busy, call after work", "Today, 5:30 PM", "1 of 3", true, "Welcome"], ["Hamad Al Ketbi", "No answer", "Today, 4:00 PM", "2 of 3", false, "Welcome"], ["Sana Malik", "Call after payday", "Tomorrow, 10:00 AM", "2 of 3", false, "Discovery"]];
    return page({ who: "cc", active: "tasks", crumb: crumbOf("Tasks", "TD booking call", "Callbacks"), title: "TD booking call", sub: "Lead &middot; Reem Khalifa's callbacks",
      tabs: [["Queue &middot; 12"], ["Callbacks &middot; 3", true], ["Closed today &middot; 27"]],
      table: table(["Lead", "Why", "Callback", "Attempts", "Resumes at"], rows.map(([nm, why, when, att, hl, step]) => ({ hl, cells: [cust(nm), why, when, pill(att.startsWith("2") ? "amber" : "grey", att), `<span ${hl ? `data-part="resume"` : ""}>${step}</span>`] })), "table"),
      extra: { bottom: `<div class="v2-card" style="margin-top:12px;"><div class="v2-ch" style="margin-bottom:6px;"><div><h3>Call ${first(t)} back</h3><p>The task resumes at Welcome, where the last call stopped. After 3 attempts it closes as dropped.</p></div></div>
          ${row("Move the callback", chips("cbk", ["In 2 hours", "This evening", "Tomorrow morning", "Pick a time"], ["This evening"]), "reschedule")}
          <div class="v2-btnrow"><button class="v2-btn primary" data-go="P2" data-part="call-now">${ic("phone")}Call now</button><button class="v2-btn">${ic("phone-missed")}No answer: try later</button><button class="v2-btn" data-go="N7">${ic("circle-x")}Not interested</button></div></div>` } });
  },

  // ------------------------------------------------------------ I · Introduce
  I1: (t) => {
    if (!isHub(t)) {
      return vtdVisit({ id: "I1", title: "Khalid is in the waiting room", desc: "Joined 1 min before the 3:00 PM slot. Camera and mic are on.",
        body: `<div class="v2-card" data-part="waiting"><div class="v2-kvs">${kv("Car", "2022 Toyota Camry GLE")}${kv("Booked via", "Chatbot")}${kv("Language", "English")}${kv("Car on camera", "Studio 1, helper ready")}</div></div>`,
        footer: foot(t, "I1", "Exit: customer in the call", [["Admit and start the call", "I2", "primary", "video"]]) });
    }
    const walk = t === "walkin", p = PEOPLE[t];
    const viaLink = CTX.mode === "link";
    const rows = [
      ["booked", "Fatima Al Suwaidi", "050 123 4567", "2:30 PM", "Nissan Altima SV", "Omar Hassan", pill("amber", "Expected"), `<button class="v2-btn ${walk ? "" : "primary"} sm" ${walk ? "" : `data-part="mark-arrived"`}>${ic("door-open")}Mark arrived</button>`],
      ["", "Khalid Al Jaberi", "055 987 1230", "3:00 PM", "Toyota Camry GLE", "Sara Ibrahim", pill("violet", "Video"), `<button class="v2-btn sm">${ic("video")}Open video room</button>`],
      ["", "Maryam Rashidi", "052 445 9981", "4:15 PM", "Hyundai Tucson", "Layla Ahmed", pill("amber", "Expected"), `<button class="v2-btn sm">${ic("door-open")}Mark arrived</button>`],
      ["", "Hamdan Saeed", "Walk-in", "1:10 PM", "Kia Sportage", "Faisal Noor", pill("green", "TD conducted"), ""],
      ["", "Aisha Al Mazrouei", "050 774 2210", "11:00 AM", "Nissan Altima SV", "Layla Ahmed", pill("green", "Token paid"), ""],
    ];
    // by link, the list shows each customer's check-in as it happens on their phone
    if (viaLink) rows.splice(1, 0, ["", "Noora Al Shamsi", "Walk-in", "2:20 PM", "Kia Sportage", "Not assigned", pill("violet", `${ic("smartphone")}Checking in &middot; 2 of 3`), ""]);
    // the check-in choice: the market sets the default, the receptionist can pick the other way for this visit
    const way = (mode, icon, title, text, tag) => `<button class="v2-way ${CTX.mode === mode ? "on" : ""}" data-pick="ci-way" data-mode-val="${mode}"><span class="ic">${ic(icon)}</span><span class="tx"><b>${title}</b><small>${text}</small></span><span class="v2-tag">${tag}</span></button>`;
    const ways = (to) => way("link", "send", "Send check-in link", `WhatsApp and email to ${to}. They fill it on their phone while seated.`, "Default in Australia")
      + way("desk", "monitor", "Check in at the desk", "You fill it in with them on the desk tablet.", "Default in the UAE");
    const drawer = walk ? `<div class="v2-dim"></div><div class="v2-drawer" data-part="add-lead">
        <div class="v2-dh"><h4>Add lead information</h4><p>Starts a walk-in visit. The order comes later, with the DA.</p></div>
        <div class="v2-db">${inp("First name", "Ahmed", "w-fn")}${inp("Last name", "Saleh", "w-ln")}${inp("Email ID", PEOPLE.walkin.email, "w-em")}${inp("Mobile number", PEOPLE.walkin.phone, "w-mb")}
          <p class="v2-small">Mobile is checked for an existing lead first, so the same customer is not added twice.</p>
          <div class="v2-ways sm" data-part="checkin-way"><b class="v2-q">How will ${first(t)} check in?</b>${ways("this mobile and email")}</div></div>
        <div class="v2-df"><button class="v2-btn">Cancel</button><button class="v2-btn primary" data-go="I2" data-mode-from="ci-way">Add lead</button></div></div>`
      : `<div class="v2-pop" data-part="checkin-way">
        <div class="v2-pop-h"><span class="v2-av">${inits(p.name)}</span><div><b>${p.name} has arrived</b><small>Booked for 2:30 PM &middot; How will ${first(t)} check in?</small></div></div>
        <div class="v2-ways">${ways(p.phone)}</div>
        <div class="v2-pop-f"><button class="v2-btn">Cancel</button><button class="v2-btn primary" data-go="I2" data-mode-from="ci-way">${ic("door-open")}Mark arrived</button></div></div>`;
    return page({ who: "receptionist", active: "testdrives", crumb: crumbOf("Test Drives", "Today"), title: "Test Drives", sub: "Today's bookings and walk-ins at Al Quoz",
      actions: `<button class="v2-btn primary" ${walk ? `data-part="add-lead-btn"` : ""}>${ic("user-plus")}New walk-in</button>`,
      extra: { top: `<div class="v2-note">${ic("sparkles")}<span><b>Arrival is its own event.</b> Mark arrived starts the arrival-to-handshake clock, gives the pre-assigned DA a heads-up and asks one thing: does the customer check in on their own phone, by link, or at the desk? A walk-in starts with Add lead, before any order exists.</span></div>` },
      tools: toolsRow("Search by name, order ID or mobile", [["Filters", "list-filter"], ["Today", "chevron-down"]]),
      tabs: [["Today &middot; 6", true], ["Hub &middot; 5"], ["Virtual &middot; 1"], ["Upcoming &middot; 14"]],
      table: table(["Customer", "Slot", "Car", "DA", "Status", ""], rows.map(([trk, nm, ph, slot, car, da, st, act]) => ({ hl: trk === t, cells: [cust(nm, ph), slot, car, da, st, act] })), "table"),
      overlay: drawer });
  },

  // I2 has no screen by design; the viewer draws the "no screen" card from the step spec.
  I2: null,

  // ------------------------------------------------------------ S · Sign-in
  S1: (t) => {
    const p = PEOPLE[t];
    if (!isHub(t)) {
      return vtdVisit({ id: "S1", title: "Check-in on the call", desc: "Ask Khalid to read out the code sent to the booked mobile. No DL needed for a video TD.",
        body: `<div class="v2-card" data-part="otp"><div class="v2-otp-wrap"><div class="v2-otp">${"284611".split("").map(d => `<span>${d}</span>`).join("")}</div><button class="v2-btn" data-otp-verify>${ic("shield-check")}Verify OTP</button><span class="v2-ok" hidden>${ic("circle-check")}Verified &middot; ${p.phone}</span></div></div>
          <div style="margin-top:10px;">${toggle(true, "Recording consent", "Khalid agrees to record this call for AI notes and service quality. Saying no doesn't stop the call.", "consent")}</div>`,
        footer: foot(t, "S1", "Exit: OTP verified, recording answered", [["Check in and start car finding", "T2", "primary", "arrow-right", true]]) });
    }
    if (CTX.mode === "link") return selfCheckin(t);
    const walk = t === "walkin";
    const hub = "Al Quoz hub, Dubai";
    const purposes = [["car-front", "Buy / Test drive a car", "#FEF3F2", "#D92D20"], ["package", "Drop off your car", "#F2F4F7", "#475467"], ["key-round", "Car pickup", "#EFF8FF", "#1570EF"], ["wrench", "Pre-booked service", "#ECFDF3", "#079455"], ["banknote", "Sell to CARS24", "#FFFAEB", "#DC6803"], ["message-circle", "Others", "#F4F3FF", "#6938EF"]];
    const modal = `<div class="v2-dim" data-flow-dim></div>
      <div class="v2-modal" data-flow="ci" data-flow-step="details" data-part="details">
        <div class="v2-mh"><div><h4>Let's continue with check-in</h4><p>Please fill out the check-in form so we can serve you better. Your details are kept confidential and help us improve your experience.</p></div><span class="v2-ib box x" data-close-flow>${ic("x")}</span></div>
        <div class="v2-mb">
          ${walk ? "" : sel("Visit purpose", "Buy / Test drive a car (from the booking)")}
          ${sel("Hub", hub)}
          <div class="v2-grid2">${sel("Accompanied by", walk ? "Alone" : "Spouse")}${sel("Financial interest", walk ? "Cash" : "Loan EMI")}</div>
          ${sel(MK.area, VISIT[t].area)}
          ${toggle(true, "Recording consent", `${first(t)} agrees to record today's conversation for AI notes and service quality. Saying no doesn't change the visit.`, "consent")}
        </div>
        <div class="v2-mf"><span class="v2-small" style="margin:0; align-self:center;">OTP goes to ${p.phone}</span><button class="v2-btn primary wide" data-step-to="ci:otp">Send OTP</button></div>
      </div>
      <div class="v2-modal sm" data-flow="ci" data-flow-step="otp" data-part="otp" hidden>
        <div class="v2-mh"><div><h4>Enter OTP and continue with check-in</h4><p>We sent a 6-digit code to the mobile on the ${walk ? "lead" : "booking"}.</p></div><span class="v2-ib box x" data-close-flow>${ic("x")}</span></div>
        <div class="v2-mb center"><div class="v2-otp">${"481902".split("").map(d => `<span>${d}</span>`).join("")}</div><p class="v2-small">Sent to ${p.phone} &middot; <b>Resend OTP</b></p></div>
        <div class="v2-mf"><button class="v2-btn" data-step-to="ci:details">${ic("arrow-left")}Go back</button><button class="v2-btn primary wide" data-step-to="ci:checked">Verify OTP</button></div>
      </div>
      <div class="v2-modal sm" data-flow="ci" data-flow-step="checked" data-part="checked" hidden>
        <div class="v2-mb center"><div class="v2-success"><span class="big">${ic("check")}</span><h4>You're all checked in</h4><p>Please have a seat. ${walk ? "A DA will be with you soon." : "Omar, your DA, will be with you soon."} Meanwhile, scan the QR to browse our cars.</p></div>
          <div class="v2-qrcard" data-part="qr">${qrSvg()}<span>Browse our cars, scan to check availability, and start your selection. Cars you like show up for your DA.</span></div></div>
        <div class="v2-mf">${walk ? `<button class="v2-btn primary wide" data-step-to="ci:purpose">Continue to onboarding questions</button>` : `<button class="v2-btn primary wide" data-go="S2">Continue to DL verify</button>`}</div>
      </div>
      ${walk ? `<div class="v2-modal" data-flow="ci" data-flow-step="purpose" data-part="purpose" hidden>
        <div class="v2-mh"><div><h4>Complete onboarding questions</h4><p>A few questions so we send you to the right person.</p></div><span class="v2-ib box x" data-close-flow>${ic("x")}</span></div>
        <div class="v2-mb"><div class="v2-progress"><i class="on"></i><i></i><i></i><i></i></div><b class="v2-q">Purpose of visit *</b>
          <div class="v2-opts">${purposes.map(([icon, l, bg, fg], i) => `<button class="v2-opt ${i === 0 ? "on" : ""}" data-pick="purpose"><span class="ill" style="background:${bg}; color:${fg};">${ic(icon)}</span>${l}</button>`).join("")}</div>
          <p class="v2-small">Only Buy / Test drive continues to a DA. The others go to the drop-off, pickup, service or selling desk.</p></div>
        <div class="v2-mf"><button class="v2-btn" data-step-to="ci:checked">${ic("arrow-left")}Previous</button><button class="v2-btn primary" data-go="S2">Continue to DL verify${ic("arrow-right")}</button></div>
      </div>` : ""}`;
    return visit({ t, id: "S1", who: "receptionist", title: `${first(t)} has not checked in yet`, desc: "Check-in isn't complete yet. Start it below; the customer can fill it on the desk tablet.",
      body: `<div class="v2-empty" data-part="empty"><span class="v2-empty-ic">${ic("log-in")}</span><b>Check-in isn't complete yet</b><p>Click the button below to begin the check-in.</p><button class="v2-btn primary" data-open-flow="ci">Start check-in${ic("arrow-right")}</button><button class="v2-linkbtn" data-mode-set="link" data-part="send-link">${ic("send")}Or send ${first(t)} a check-in link instead</button></div>`,
      footer: foot(t, "S1", "Exit: OTP verified, recording answered", [["Proceed to DL verify", "S2", "primary", "arrow-right", true]]),
      gptOpts: { cards: [["Before you start", "sparkles", `<p>${walk ? "New walk-in. Ask the purpose of the visit first." : "Booked for 2:30 PM. DL uploaded 2 days ago, so DL verify should take a minute."}</p>`]] },
      overlay: modal });
  },

  S2: (t) => {
    const p = PEOPLE[t], walk = t === "walkin", viaLink = CTX.mode === "link";
    const got = walk ? (viaLink ? "from the check-in form" : "scanned now") : "uploaded 2 days ago";
    return visit({ t, id: "S2", who: "receptionist", title: "Upload driving licence and verify identification", desc: viaLink && walk ? "Both sides came in with the check-in form. Check the photo against the customer." : "Upload or scan both sides. The licence is linked to the contact once verified.",
      body: `<div class="v2-uploads" data-part="upload">
          ${["Front", "Back"].map(side => `<div class="v2-drop done"><span class="v2-dl">${ic("id-card")}<i>${side}</i></span><div><b>DL ${side.toLowerCase()} &middot; ${got}</b><small>dl-${side.toLowerCase()}.jpg &middot; 1.2 MB</small></div><span class="v2-ib">${ic("refresh-cw")}</span></div>`).join("")}
        </div>
        <div class="v2-card" data-part="ocr"><div class="v2-sec" style="margin-top:0;">Read from the licence</div>
          <div class="v2-kvs">${kv("Name", p.name)}${kv("Licence no.", p.dl)}${kv("Expiry", walk ? "14 Mar 2027" : "02 Jun 2028")}${kv("Issued by", "Dubai RTA (example)")}</div>
          ${walk && p.homeDl ? `<div class="v2-row" style="margin-top:6px;"><label>Home-country DL</label><div><b class="v2-b">${p.homeDl}</b></div></div>` : ""}
        </div>
        <div class="v2-card" data-part="checks"><div class="v2-sec" style="margin-top:0;">Checks</div>
          <div class="v2-checks"><span class="ok">${ic("circle-check")}Name matches the Emirates ID</span><span class="ok">${ic("circle-check")}Not expired</span><button class="v2-check2" data-zone>${ic("square")}Photo matches the customer (receptionist)</button></div></div>`,
      footer: foot(t, "S2", "Exit: DL verified, or flagged browse only", [["No valid DL: browse only", "S3", "", "eye"], ["Verify and continue", "S3", "primary", "arrow-right", true]]),
      gptOpts: { cards: [["OCR", "scan-line", `<p>All fields read with high confidence. ${walk ? (p.homeDl ? "Home-country DL noted for the record." : "Read from the photos on the check-in form.") : "Matches the copy uploaded before the visit."}</p>`]], transcribing: TRANSCRIBING[t] } });
  },

  S3: (t) => {
    const walk = t === "walkin";
    const dot = (s) => s === "AVAILABLE" ? "#17B26A" : s === "ON_BREAK" ? "#F79009" : "#98A2B3";
    const modal = `<div class="v2-dim"></div><div class="v2-modal" data-part="modal">
      <div class="v2-mh"><div><h4>${walk ? "Assign a DA" : "Confirm the DA"}</h4><p>Ranked by status, today's load and language. A DA at their daily cap can't be picked. This reuses Leadverse's ManualAssignmentModal.</p></div><span class="v2-ib box x">${ic("x")}</span></div>
      <div class="v2-mb">${PDAS.map((d, i) => {
        const cap = d.today >= d.max, brk = d.status === "ON_BREAK", off = cap || brk;
        return `<div class="v2-da ${d.pre ? "on" : ""} ${off ? "off" : ""}" ${off ? "" : `data-pick="da"`} ${i === 0 ? `data-part="da-row"` : ""}>
          <span class="v2-av">${inits(d.name)}<i style="background:${dot(d.status)}"></i></span>
          <div class="mid"><b>${d.name}${d.pre && !walk ? ` <span class="v2-tag">Pre-assigned</span>` : ""}</b><small>${d.role} &middot; ${d.lang}</small></div>
          <div class="load" ${i === 0 ? `data-part="cap"` : ""}><span class="bar"><i style="width:${Math.round(d.today / d.max * 100)}%; background:${cap ? "#F04438" : "#4736FE"}"></i></span><small>${cap ? "At daily cap" : brk ? "On break" : `${d.today}/${d.max} today`}</small></div>
          <b class="score">${d.score}</b></div>`;
      }).join("")}</div>
      <div class="v2-mf"><span class="v2-small" style="margin:0; align-self:center;">No DA free in 10 min: the manager is alerted</span><button class="v2-btn primary" data-go="T1">${ic("send")}Assign and notify</button></div></div>`;
    return visit({ t, id: "S3", who: "receptionist", title: "Hand over to a DA", desc: `One DA owns ${first(t)} from the handshake to the close.`,
      body: `<div class="v2-card"><div class="v2-row"><label>${walk ? "Best match" : "Pre-assigned"}</label><div><b class="v2-b">Omar Hassan &middot; 6/10 today</b></div></div></div>`,
      footer: foot(t, "S3", "Exit: DA confirmed and notified", [["Assign DA", "T1", "primary", "users"]]),
      gptOpts: { cards: [], transcribing: TRANSCRIBING[t] }, overlay: modal });
  },

  // ------------------------------------------------------------ T · Tailor
  T1: (t) => {
    const p = PEOPLE[t], walk = t === "walkin";
    const ctx = walk ? [pill("amber", "Walk-in"), pill("green", "DL verified"), pill("grey", p.language), pill("grey", "Drive-by")] : [pill("violet", "Booked"), pill("grey", PCARS[p.car].title), pill("green", "DL verified"), pill("grey", p.language)];
    if (CTX.mode === "link") ctx.push(pill("violet", `${ic("smartphone")}Checked in by link`));
    return page({ who: "da", active: "testdrives", crumb: crumbOf("Test Drives", "My queue"), title: "My queue", sub: "Omar Hassan &middot; 6 of 10 test drives today",
      actions: pill("green", `${ic("circle-dot")}Available`),
      extra: { top: `<div class="v2-wait" data-part="wait-card"><span class="v2-av lg">${inits(p.name)}</span>
          <div class="mid"><b>${p.name}</b> <span class="v2-muted">is checked in at the front desk</span><div class="v2-chips" style="margin-top:6px;">${ctx.join("")}</div>
            <p class="v2-small" style="margin:6px 0 0;">${ic("sparkles")} ${walk ? "Walked in at 2:41 PM. No booking, so car finding starts from scratch." : "Viewed the Altima 3 times in the app. Asked the call centre about finance."}</p></div>
          <div class="v2-timer"><b>1:48</b><small>waiting</small></div>
          <button class="v2-btn primary lg" data-go="T2" data-part="met">${ic("handshake")}I've met ${first(t)}</button></div>`,
        bottom: `<div class="v2-note pink" style="margin-top:12px;" data-part="alert-note">${ic("timer")}<span>Not met within 5 min: the receptionist and the manager are alerted.</span></div>` },
      tabs: [["Later today", true]],
      table: table(["Customer", "Slot", "Car", "Status"], [{ cells: [cust("Maryam Rashidi", "BK-88177"), "4:15 PM", "Hyundai Tucson", pill("amber", "DL missing")] }, { cells: [cust("Rashid Al Falasi", "Follow-up"), "5:30 PM", "Toyota Camry GLE", pill("grey", "Follow-up call")] }], "later") });
  },

  T2: (t) => {
    const p = PEOPLE[t], n = p.needs, pre = t !== "walkin";
    const body = `<div class="v2-card" data-part="needs">
        ${row("Budget", chips("budget", MK.budgets, [n.budget]))}
        ${row("Body type", chips("multi", ["Sedan", "SUV", "Hatchback", "Pickup"], n.body))}
        ${row("Transmission", chips("trans", ["Automatic", "Manual"], [n.trans]))}
        ${row("Drive", chips("drive", ["2WD", "4WD"], [n.drive]))}
        ${row("Mostly for", chips("multi", MK.usage, n.usage))}
        ${row("Must-haves", chips("multi", ["Apple CarPlay", "Rear camera", "7 airbags", "Adaptive cruise", "Sunroof", "7 seats"], n.must))}
        ${row("Paying by", chips("pay", ["Cash", "Finance", "Not sure yet"], [t === "walkin" ? "Cash" : "Finance"]))}
      </div>`;
    const buttons = t === "booked" ? [["Set on the booked car: skip", "T4", "", "skip-forward"], ["Show matching cars", "T3", "primary", "arrow-right", true]] : [["Show matching cars", "T3", "primary", "arrow-right", true]];
    return daStep(t, { id: "T2", title: "What are you looking for?", desc: pre ? "Prefilled from the booking and app browsing. Confirm or change; the booked car stays pinned next." : "Nothing to prefill for a walk-in. Budget and body type are enough to start.",
      right: `<div data-part="prefill">${pre ? `<span class="v2-tag ai">${ic("sparkles")}Prefilled</span>` : `<span class="v2-tag">Captured in conversation</span>`}</div>`,
      body, footer: foot(t, "T2", "Exit: budget and body type captured", buttons),
      cards: [["Ask next", "message-square", `<p>${t === "walkin" ? "&ldquo;How many people usually ride with you?&rdquo;" : "&ldquo;Is the Altima still the one, or should we look at an SUV too?&rdquo;"}</p>`], ["From before the visit", "history", `<p>${t === "walkin" ? "First visit, no app account. Came in as a drive-by." : t === "vtd" ? "Viewed the Camry 4 times." : "Viewed the Altima 3 times. Asked about finance on the call."}</p>`]],
      video: isHub(t) ? null : videoPanel({ main: vtdTile(), pip: "You &middot; Sara", share: "Sharing your screen" }) });
  },

  T3: (t) => {
    const p = PEOPLE[t];
    const sel3 = t === "booked" ? ["c1", "c3"] : t === "walkin" ? ["c4"] : ["c2"];
    const rows = p.picks.map(([cid, match, why], i) => {
      const booked = t !== "walkin" && cid === p.car;
      return carRow(cid, { check: true, selected: sel3.includes(cid), oid: booked ? p.id : null, part: i === 0 ? "car-rows" : null,
        badge: `${booked ? `<span class="v2-badge booked">Booked</span>` : ""}${!booked && i === 1 && t === "booked" ? `<span class="v2-badge booked">Liked while waiting</span>` : ""}<span class="v2-badge match">${match}% match</span>`,
        sub: `${money(PCARS[cid].price)} &middot; ${PCARS[cid].km} &middot; ${why}` });
    }).join("");
    const drawer = `<div class="v2-dim" data-drawer-dim hidden></div><div class="v2-drawer" id="addcars" hidden>
      <div class="v2-dh"><h4>Add cars for booking</h4><p>Live stock at Al Quoz. Pick cars to add to today's drives.</p><div class="v2-search inline" style="margin-top:10px;">${ic("search")}<span>Search order ID, car name&hellip;</span></div>
        <div class="v2-chips" style="margin-top:8px;"><span class="v2-chip">${ic("save")}Saved filters</span><span class="v2-chip">${ic("list-filter")}Filters</span><span class="v2-chip">Sort by${ic("chevron-down")}</span></div></div>
      <div class="v2-db">${["c4", "c2", "c3"].map((cid, i) => carRow(cid, { check: true, selected: i === 0, sub: `${money(PCARS[cid].price)} &middot; ${PCARS[cid].bay}`, right: " " })).join("")}</div>
      <div class="v2-df"><button class="v2-btn" data-close="addcars">Cancel</button><button class="v2-btn primary" data-close="addcars">Add cars</button></div></div>`;
    const cmp = (t === "booked" ? ["c1", "c3"] : t === "walkin" ? ["c4", "c3"] : ["c2", "c1"]);
    const compare = `<div class="v2-modal" id="cmpx" hidden style="z-index:7;"><div class="v2-mh"><div><h4>Compare cars</h4><p>Side by side, from live stock.</p></div><span class="v2-ib box x" data-close="cmpx">${ic("x")}</span></div>
      <div class="v2-mb"><table class="v2-cmp"><thead><tr><th></th>${cmp.map(id => `<th>${PCARS[id].title}</th>`).join("")}</tr></thead><tbody>${[["Price", c => money(c.price)], ["Odometer", c => c.km], ["Body", c => c.body], ["Drive", c => c.drive], ["Seats", c => c.seats], ["Bay", c => c.bay]].map(([k, fn]) => `<tr><td>${k}</td>${cmp.map(id => `<td>${fn(PCARS[id])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="v2-mf"><span></span><button class="v2-btn" data-close="cmpx">Close</button></div></div>`;
    return daStep(t, { id: "T3", title: "Cars for today", desc: t === "booked" ? "The booked car is pinned. Alternatives sit next to it, so a change of mind is a tap, not a lost customer." : t === "walkin" ? "Matched to what Ahmed just told you. Live stock at Al Quoz, not reserved." : "Shown to Khalid over screen share.",
      right: `<div class="v2-btnrow" style="margin:0;"><button class="v2-btn" data-open="cmpx" data-part="compare">${ic("git-compare")}Compare</button>${isHub(t) ? `<button class="v2-btn" data-open="addcars" data-part="add-cars">${ic("plus")}Add cars</button>` : ""}</div>`,
      body: rows, footer: foot(t, "T3", "Exit: one or more cars chosen", [["Nothing fits: share shortlist", "N4", "", "share-2"], ["Next: why this car", "T4", "primary", "arrow-right", true]]),
      cards: [["Why these", "list-checks", `<p>${t === "walkin" ? "Sportage: in budget, rear camera. Tucson: 4WD for long drives." : "Tucson: more boot space for family weekends. Camry: AED 1,500 over budget."}</p>`], ["Stock check", "warehouse", `<p>${t === "walkin" ? "Sportage at Bay 1, free now." : "Altima at Bay 2, Tucson at Bay 4. Both free for the next hour."}</p>`]],
      video: isHub(t) ? null : videoPanel({ main: vtdTile(), pip: "You &middot; Sara", share: "Sharing your screen" }),
      overlay: (isHub(t) ? drawer : "") + compare });
  },

  T4: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const insp = `<div class="v2-insp" data-part="inspection">${[["Engine and gearbox", "Passed"], ["Brakes and suspension", "Passed"], ["Body and paint", "2 small marks noted"], ["Electrics and AC", "Passed"], ["Accident history", "None reported"]].map(([k, v]) => `<div><span>${k}</span><b>${ic("circle-check")}${v}</b></div>`).join("")}</div><p class="v2-small">Example inspection values for the prototype.</p>`;
    const promise = `<div class="v2-promise" data-part="promise">${[["clipboard-check", "Inspected", "Full inspection report for this car, shared with you."], ["shield-check", "Warranty", "Included with the car. Terms apply."], ["rotate-ccw", "Return window", "Change your mind within the return window."], ["landmark", "Finance", `From about ${money(Math.round(c.price / 52))} a month. Example only.`]].map(([icon, k, s]) => `<div>${ic(icon)}<b>${k}</b><span>${s}</span></div>`).join("")}</div>`;
    if (!isHub(t)) {
      return vtdVisit({ id: "T4", title: `${c.title}: why you can trust it`, desc: "Shared on screen with Khalid. Inspection: passed, 2 small marks noted (example).",
        body: promise, footer: foot(t, "T4", "Exit: customer wants to see the car", [["Wants to think", "N4", "", "clock"], ["Show the car on camera", "T5", "primary", "video"]]),
        video: videoPanel({ main: vtdTile(), pip: "You &middot; Sara", share: "Sharing your screen" }) });
    }
    return customerView({ title: `Why this ${c.title.replace(/^\d{4} /, "")}`, lead: `${c.title} &middot; ${money(c.price)} &middot; ${c.km}`, left: insp, right: promise,
      foot: `<button class="v2-btn" data-go="N4">${ic("clock")}I need to think</button><button class="v2-btn primary lg" data-go="T5">${ic("car-front")}Let's drive it</button>` });
  },

  T5: (t) => {
    const p = PEOPLE[t], walk = t === "walkin";
    if (!isHub(t)) {
      return vtdVisit({ id: "T5", title: "Car on camera", desc: "Bilal has the Camry at Studio 1 with the yard camera on.",
        body: `<div class="v2-card" data-part="drives"><div class="v2-kvs">${kv("Car", "2022 Toyota Camry GLE")}${kv("Where", "Studio 1")}${kv("Yard helper", "Bilal Raza, camera on")}${kv("Order", "BK-88190 (unchanged)")}</div></div>`,
        footer: foot(t, "T5", "Exit: car confirmed and on camera", [["Start the walkaround", "O2", "primary", "video"]]) });
    }
    const drives = walk ? [["c4", "Drive 1", "Bay 1"]] : [["c1", "Drive 1 &middot; booked", "Bay 2"], ["c3", "Drive 2 &middot; added", "Bay 4"]];
    return daStep(t, { id: "T5", title: walk ? "Create the order and get the car ready" : "Lock today's drives", desc: walk ? "This creates order BK-89004 in OMS and asks the yard to bring the car round." : "The Tucson joins today's visit. No new booking needed.",
      body: `<div data-part="drives">${drives.map(([cid, label, bay], i) => carRow(cid, { oid: walk ? (i === 0 ? "BK-89004 (new)" : null) : i === 0 ? p.id : null, sub: `${label} &middot; ${bay}`, badge: `<span class="v2-badge busy" ${i === 0 ? `data-part="prep"` : ""}>${ic("wrench")}Prep requested</span>`, right: " " })).join("")}</div>
        <div class="v2-card" data-part="summary"><div class="v2-kvs">${kv("Customer", walk ? "Ahmed Saleh, verified" : "Fatima, verified")}${kv("Driving licence", walk ? "Valid until Mar 2027" : "Valid until 2028")}${kv("Order", walk ? "BK-89004, new" : "BK-88213, updated")}</div></div>`,
      footer: foot(t, "T5", "Exit: order ready, prep raised", walk ? [["No valid DL: book later", "N6", "", "calendar"], ["Create order and request prep", "O1", "primary", "check"]] : [["Car is taken: pick again", "T3", "", "rotate-ccw"], ["Confirm and request prep", "O1", "primary", "check"]]),
      cards: [["Yard", "warehouse", `<p>Bilal Raza (prep) gets the request now. Usual time to bay: 6 min.</p>`]], ordered: walk });
  },

  // ------------------------------------------------------------ O · On the road
  O1: (t) => {
    const walk = t === "walkin";
    return daStep(t, { id: "O1", ordered: true, title: walk ? "Kia Sportage is ready at Bay 1" : "Altima is ready at Bay 2", desc: "Marked ready by Bilal Raza at 2:49 PM. Keys at the bay, fuel 3/4, cleaned.",
      body: `<div class="v2-bays" data-part="bays">${["Bay 1", "Bay 2", "Bay 3", "Bay 4"].map(b => {
          const here = walk ? b === "Bay 1" : b === "Bay 2", next = !walk && b === "Bay 4";
          return `<div class="v2-bay ${here ? "here" : next ? "next" : ""}"><small>${b}</small><b>${here ? (walk ? "Kia Sportage" : "Nissan Altima") : next ? "Hyundai Tucson" : "Free"}</b><span>${here ? "Ready" : next ? "4 min" : ""}</span></div>`;
        }).join("")}</div>
        ${walk ? "" : carRow("c3", { sub: "Drive 2 &middot; Bay 4", badge: `<span class="v2-badge busy" data-part="next-car">Getting ready</span>`, right: " " })}`,
      footer: foot(t, "O1", "Exit: DA and customer at the car", [["Car not ready: swap", "T3", "", "rotate-ccw"], ["We're at the car", "O2", "primary", "map-pin"]]),
      cards: [["On the walk", "message-square", `<p>Ask about the daily commute. Mention the return window if not covered yet.</p>`]] });
  },

  O2: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const zones = [["Exterior", "scan", "Paint and panels, tyres, lights", true], ["Interior", "armchair", "Seats, screen and CarPlay, rear seats", true], ["Under the bonnet", "wrench", "Engine bay, service history", false], ["Boot", "luggage", "Boot space, spare wheel", false]];
    const body = `<div class="v2-zones" data-part="zones">${zones.map(([nm, icon, pts, d]) => `<button class="v2-check ${d ? "done" : ""}" data-zone>${ic(icon)}<b>${nm}</b><span>${pts}</span></button>`).join("")}</div>`;
    if (!isHub(t)) {
      return vtdVisit({ id: "O2", title: `Walk round the ${c.title.replace(/^\d{4} /, "")}`, desc: "The yard helper moves the camera; tick each zone as you cover it.", body,
        footer: foot(t, "O2", "Exit: walkaround and drive clip done", [["Play drive clip and wrap up", "O6", "primary", "play"]]),
        video: videoPanel({ main: carTile("c2"), pip: "Khalid" }) });
    }
    return daStep(t, { id: "O2", ordered: true, title: `Walk round the ${c.title.replace(/^\d{4} /, "")}`, desc: "Tap a zone once it's covered. Talking points come from this car's inspection and features.", body,
      footer: foot(t, "O2", "Exit: zones covered", [["Try another car", "T3", "", "rotate-ccw"], ["Start test drive", "O3", "primary", "play"]]),
      cards: [["Say at the bonnet", "message-square", `<p>Point to the service stamps. The inspection found no leaks.</p>`], ["Customer asked", "message-circle", `<p>&ldquo;Does it have CarPlay?&rdquo; Yes, wired.</p>`]] });
  },

  O3: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    return daStep(t, { id: "O3", ordered: true, title: "Start the test drive", desc: "Starting creates the TD record: car, plate, time and odometer. The consent refers to it.",
      body: `<div class="v2-card" data-part="summary"><div class="v2-kvs">${kv("Car", `${c.title} &middot; ${c.plate}`)}${kv("Driver", `${p.name} &middot; DL ${p.dl}`)}</div></div>
        <div class="v2-card"><div class="v2-grid2" data-part="odo">${inp("Odometer at start (km)", t === "walkin" ? "31,214" : "18,412", "o-odo")}<div class="v2-field"><label>Fuel</label>${chips("fuel", ["1/4", "1/2", "3/4", "Full"], ["3/4"])}</div></div>
          ${row("Route", chips("route", ["City loop &middot; 15 min", "Highway loop &middot; 20 min"], [t === "walkin" ? "Highway loop &middot; 20 min" : "City loop &middot; 15 min"]), "route")}</div>
        <div class="v2-note pink" data-part="note">${ic("pen-line")}<span>Next the customer signs the TD consent for this car, before it moves.</span></div>`,
      footer: foot(t, "O3", "Exit: TD record created", [["Start test drive", "O4", "primary", "play"]]),
      cards: [["Checks", "list-checks", `<p>DL verified at S2. Car not in another TD. Walkaround done.</p>`]] });
  },

  O4: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const left = `<div class="v2-kvs two" data-part="details">${kv("Driver", `${p.name}<small>DL ${p.dl}</small>`)}${kv("Car", `${c.title}<small>${c.plate}</small>`)}${kv("Started", `2:52 PM &middot; ${t === "walkin" ? "31,214" : "18,412"} km`)}${kv("With", "Omar Hassan, CARS24")}</div>
      <ul class="v2-terms" data-part="terms"><li>I hold a valid driving licence and I am fit to drive.</li><li>I will follow UAE traffic laws and speed limits.</li><li>I am responsible for traffic fines during this drive.</li><li>A CARS24 associate rides with me for the whole drive.</li></ul>
      <p class="v2-small">Example terms for the prototype. One consent per car.</p>`;
    const right = `<b class="v2-q">Sign here</b>
      <div class="v2-sig" data-part="signature"><canvas id="sig" aria-label="Signature pad"></canvas><div class="line"></div><div class="ph">Sign with your finger</div></div>
      <div class="v2-agree" data-part="agree"><label><input type="checkbox" id="agree"> I have read and agree to these terms.</label><button class="v2-btn" data-sig-clear>${ic("eraser")}Clear</button></div>`;
    return customerView({ title: "Test drive consent", lead: "Please check the details and sign. The car moves once this is signed.", left, right,
      foot: `<span class="v2-hint left" id="sig-hint">Sign and tick the box to continue</span><button class="v2-btn" data-go="N1">${ic("circle-x")}Customer declines</button><button class="v2-btn primary lg" id="sig-go" data-go="O5" disabled>${ic("pen-line")}Sign and start driving</button>` });
  },

  O5: (t) => {
    const p = PEOPLE[t];
    const cid = t === "walkin" ? "c4" : p.car;
    const tags = [["Price", "vs other cars"], ["Mileage", "km on the clock"], ["Condition", "marks, wear"], ["Features", "missing something"], ["Finance", "EMI, down payment"], ["Other", "anything else"]];
    const other = t === "walkin" ? "Tucson" : "Camry";
    return daStep(t, { id: "O5", ordered: true, title: "Test drive live", desc: "Begin the drive, tag objections as they come up, and keep an eye on the live transcription.",
      body: carRow(cid, { oid: t === "walkin" ? "BK-89004" : p.id, sub: `Today, 2:52 PM &middot; Agent: Omar Hassan`, badge: `<span class="v2-badge live">${ic("circle-dot")}LIVE</span>`, part: "live-car", right: " " })
        + `<div class="v2-tx" data-part="transcript"><div class="v2-tx-h"><span>Live note &amp; transcription</span><span class="t"><i></i>00:12:40</span></div>
          <div class="v2-tx-b"><p><span class="ts">12:02</span><b>${first(t)}:</b> It's smooth. How does it compare with the ${other} on price?</p><p><span class="ts">12:20</span><b>Omar:</b> The ${other} costs more; this one has fewer km and a warranty.</p><p><span class="ts">12:38</span><b>${first(t)}:</b> Can I get it on monthly payments?</p></div></div>
        <div class="v2-sec">Tap when an objection comes up</div>
        <div class="v2-tags" data-part="objections">${tags.map(([k, s], i) => `<button class="v2-tagbtn ${i === 0 ? "on" : ""}" data-pick="multi"><b>${k}</b><span>${s}</span></button>`).join("")}</div>`,
      footer: foot(t, "O5", "Exit: back at the hub", [["Report an incident", null, "", "triangle-alert"], ["Back at the hub: end drive", "O6", "primary", "flag"]]),
      cards: [["Try now", "zap", `<p>Highway stretch: cruise control and lane assist. Parking: rear camera.</p>`], ["Suggested answer", "sparkles", `<p>Monthly payments: pre-approval looks eligible. Offer an EMI estimate at the debrief.</p>`]] });
  },

  O6: (t) => {
    if (!isHub(t)) {
      return vtdVisit({ id: "O6", title: "Wrap up the video viewing", desc: "Walkaround done, drive clip played. 24 min on the call.",
        body: `<div class="v2-card" data-part="end-form">${row("Khalid's reaction", chips("react", ["Loved it", "It's okay", "Not for me"], ["Loved it"]))}${row("Wants a real drive?", chips("rd", ["Yes, at a hub", "No need"], ["Yes, at a hub"]))}</div>`,
        footer: foot(t, "O6", "Exit: call wrapped up", [["End video TD", "N1", "primary", "flag"]]) });
    }
    const p = PEOPLE[t], walk = t === "walkin";
    const cid = walk ? "c4" : p.car;
    return daStep(t, { id: "O6", ordered: true, title: "End the drive", desc: "Recorded as TD CONDUCTED for this car.",
      body: carRow(cid, { oid: walk ? "BK-89004" : p.id, sub: "Today, 2:52 PM &middot; 19 min &middot; Agent: Omar Hassan", badge: `<span class="v2-badge done">TD done</span>`, part: "done-car", right: " " })
        + `<div class="v2-card" data-part="end-form"><div class="v2-grid2">${inp("Odometer at end (km)", walk ? "31,236" : "18,431", "o-odo2")}<div class="v2-field"><label>Duration</label><div class="v2-select ph"><span>19 min</span></div></div></div>
          ${row("Customer's reaction", chips("react", ["Loved it", "It's okay", "Not for me"], ["Loved it"]), "reaction")}</div>
        ${walk ? "" : carRow("c3", { sub: "Drive 2 &middot; Bay 4 &middot; ready", badge: `<span class="v2-badge booked" data-part="next-car">Queued</span>`, right: " " })}`,
      footer: foot(t, "O6", "Exit: TD conducted", walk ? [["Another car", "O1", "", "rotate-ccw"], ["Done driving: debrief", "N1", "primary", "arrow-right", true]] : [["Start drive 2: Tucson", "O1", "", "car"], ["Done driving: debrief", "N1", "primary", "arrow-right", true]]),
      cards: [["Next car", "car", `<p>${walk ? "No second car queued." : "Drive 2 needs its own walkaround, start and consent."}</p>`]] });
  },

  // ------------------------------------------------------------ N · Next step
  N1: (t) => {
    const hub = isHub(t);
    const notes = t === "walkin" ? "Liked the space and the rear camera. Paying cash; wants the service history before reserving." : t === "vtd" ? "Liked the clean interior and adaptive cruise. Wants to feel it on the road before deciding." : "Customer liked the car. Wants EMI options and confirmation of the scratch repair before payment.";
    const decs = [["Ready to buy", "badge-check", "Take the token now", "good", "N2"], ["Needs time", "clock", "Agree a date", "warn", "N4"], [t === "vtd" ? "Hub drive" : "Another car", "car", t === "vtd" ? "Book a real drive" : "Book another drive", "warn", "N6"], ["Not interested", "circle-x", "Record the reason", "bad", "N7"]];
    const suggested = t === "vtd" ? 2 : 0;
    return daStep(t, { id: "N1", ordered: true, title: "Disposition form", desc: "Prefilled from the conversation since check-in. Edit anything that's off.",
      body: `<div class="v2-acc" data-part="outcome"><div class="v2-acc-h">Outcome${ic("chevron-down")}</div><div class="v2-acc-b">${radios("out", [hub ? "TD conducted: interested" : "Video TD conducted: interested", hub ? "TD conducted: not interested" : "Video TD conducted: not interested", "TD not conducted"], hub ? "TD conducted: interested" : "Video TD conducted: interested")}</div></div>
        <div class="v2-acc" data-part="objection"><div class="v2-acc-h">Primary objection <span class="v2-tag ai">${ic("sparkles")}AI: Price</span>${ic("chevron-down")}</div></div>
        <div class="v2-acc" data-part="notes"><div class="v2-acc-h">Agent notes <span class="v2-tag ai">${ic("sparkles")}AI draft</span></div><div class="v2-acc-b"><div class="v2-textarea">${notes}</div></div></div>
        ${hub ? `<div class="v2-card" data-part="finance"><div class="v2-grid2">${inp("Monthly salary", "AED 18,000", "n-sal")}${inp("Existing EMI", "AED 1,200", "n-emi")}</div></div>` : ""}
        <div class="v2-sec">What happens next?</div>
        <div class="v2-decs" data-part="decision">${decs.map(([nm, icon, s, tone, go], i) => `<button class="v2-dec ${tone} ${i === suggested ? "on" : ""}" data-go="${go}">${ic(icon)}<b>${nm}</b><span>${s}</span></button>`).join("")}</div>`,
      footer: foot(t, "N1", "Exit: one of four decisions", [[decs[suggested][0], decs[suggested][4], "primary", "arrow-right", true]]),
      cards: [["Suggested", "sparkles", `<p>${t === "vtd" ? "Khalid wants to feel it on the road: book a hub drive." : `${first(t)} would reserve today if the price holds.`}</p>`], ["Objections tagged", "tag", `<p>Price (1), at 12:02 in the transcript.</p>`]] });
  },

  N2: (t) => {
    const p = PEOPLE[t], link = !isHub(t);
    const tabs = [["qr", "QR code", "qr-code"], ["bank", "Bank transfer", "landmark"], ["link", "Payment link", "link"]];
    const on = link ? "link" : "qr";
    const ref = t === "walkin" ? "BK-89004" : p.id;
    return daStep(t, { id: "N2", ordered: true, title: "Collect the token", desc: `${money(MK.token)} to reserve ${t === "walkin" ? "the Kia Sportage" : link ? "the Camry" : "the Altima"}. Example amount.`,
      body: `<div class="v2-card"><div class="v2-seg2" data-tabs data-part="pay-tabs">${tabs.map(([k, l, icon]) => `<button class="${k === on ? "on" : ""}" data-tab="${k}">${ic(icon)}${l}</button>`).join("")}</div>
        <div class="v2-pay">
          <div data-panel="qr" ${on === "qr" ? "" : "hidden"} data-part="pay-method">${qrSvg(21, 6)}</div>
          <div data-panel="bank" ${on === "bank" ? "" : "hidden"} class="v2-kvs one">${kv("Account name", "CARS24 UAE")}${kv("IBAN", "AE07 0331 0000 0123 4567 890")}${kv("Reference", ref)}</div>
          <div data-panel="link" ${on === "link" ? "" : "hidden"} class="v2-kvs one" ${on === "link" ? `data-part="pay-method"` : ""}>${kv("Sent by WhatsApp and SMS", `${p.phone} &middot; expires in 24 h`)}</div>
          <div class="v2-gw" data-part="gateway"><span class="v2-warn">${ic("loader")}Waiting for the payment gateway</span><p class="v2-small">The status changes by itself when the gateway confirms. There is no manual Mark as paid.</p><button class="v2-btn" data-go="N3">${ic("zap")}Simulate gateway confirmation</button></div>
        </div></div>`,
      footer: foot(t, "N2", "Exit: gateway confirms the payment", [["Pays later: keep link live", "N4", "", "clock"]]),
      cards: [["If asked", "message-square", `<p>The token reserves this car while documents and finance are done.</p>`]] });
  },

  N3: (t) => {
    const p = PEOPLE[t];
    const id = t === "walkin" ? "BK-89004" : p.id;
    const tasks = [["Documents", "Order &rsaquo; RM", "Rania Haddad"], ["Finance application", "Order &rsaquo; FinOps", "FinOps queue"], ["VAS offer", "Order &rsaquo; VAS Refurb", "VAS team"], ["Delivery slot", "Order &rsaquo; Delivery Schedule", "Delivery team"]];
    return daStep(t, { id: "N3", ordered: true, title: "Token paid", desc: `${id} &middot; car reserved &middot; ${first(t)} gets a WhatsApp confirmation with the RM's name.`,
      right: `<span class="hex good" data-part="paid">TOKEN PAID</span>`,
      body: `<div class="v2-card" data-part="tasks"><div class="v2-sec" style="margin-top:0;">Created in Leadverse Tasks, in existing Order personas</div>
        <div class="v2-tl">${tasks.map(([k, persona, who]) => `<div>${ic("circle-check")}<div><b>${k}</b><small>${persona}</small></div><span>${who}</span></div>`).join("")}</div></div>`,
      footer: foot(t, "N3", "Exit: delivery tasks created, RM assigned", [["Back to my queue", isHub(t) ? "T1" : null, "primary", "list"]]) });
  },

  N4: (t) => {
    const p = PEOPLE[t];
    return daStep(t, { id: "N4", ordered: true, title: "Agree a follow-up", desc: `Set the date with ${first(t)} now. The RM gets a task for that day.`,
      body: `<div class="v2-card">
          ${row("Day", chips("day", ["Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct", "Pick a date"], ["Sat 10 Oct"]), "when")}
          ${row("Time", chips("time", ["Morning", "Afternoon", "Evening"], ["Morning"]))}
          ${row("Channel", chips("ch", ["Call", "WhatsApp"], ["Call"]), "channel")}
          ${row("Shortlist", `<div class="v2-chips">${p.picks.map(([cid], i) => `<button class="v2-chip ${i < 2 ? "on" : ""}" data-pick="multi">${ic("car")}${PCARS[cid].title}</button>`).join("")}</div>`, "shortlist")}
          <div style="margin-top:8px;" data-part="note">${inp("Note for the RM", "Discussing with family. Price is the open question.", "n-note")}</div>
        </div>`,
      footer: foot(t, "N4", "Exit: date agreed, shortlist sent, RM task created", [["Schedule and send shortlist", "N5", "primary", "calendar-check"]]) });
  },

  N5: (t) => {
    const p = PEOPLE[t];
    const body = `<div class="v2-body">
      ${leadPane(t, "N5", { ordered: true })}
      <section class="v2-center"><div class="v2-taskhead"><span class="v2-pill amber">${ic("clock")}Due now</span><b>Follow up with ${p.name}</b><small>Lead &middot; TD follow-up &middot; due today 11:00 AM &middot; attempt 1 of 3</small></div>
        <div class="v2-content">
          <div class="v2-card" data-part="summary"><div class="v2-sec" style="margin-top:0;">Last visit</div><p class="v2-p">${t === "vtd" ? "Video TD of the Camry." : t === "walkin" ? "Drove the Kia Sportage." : "Drove the Altima and the Tucson."} Liked it. Price is the open question. Said: &ldquo;Let me discuss with family this weekend.&rdquo;</p></div>
          <div class="v2-sec">Shortlist today</div>
          <div data-part="shortlist">${p.picks.slice(0, 2).map(([cid], i) => carRow(cid, { sub: i === 1 ? "Price down AED 1,000 since the visit" : "Available, price unchanged", badge: i === 1 ? `<span class="v2-badge match">Price drop</span>` : "", right: " " })).join("")}</div>
          <div class="v2-sec">Call outcome</div>
          <div data-part="outcome">${radios("rmout", ["Ready: send a payment link", "Book another drive", "No answer: try again", "Not interested"], "Ready: send a payment link")}</div>
        </div>
        <div class="v2-foot" data-part="foot"><span class="v2-hint">Exit: one call outcome</span><div class="v2-foot-r"><button class="v2-btn" data-go="N7">${ic("circle-x")}Not interested</button><button class="v2-btn" data-go="N6">${ic("calendar")}Book another drive</button><button class="v2-btn primary" data-go="N2">${ic("link")}Send payment link</button></div></div>
      </section>
      ${gpt("rm", { cards: [["Visit summary", "sparkles", `<p>Liked it; price is the question. A shortlisted car dropped AED 1,000 since the visit.</p>`]] })}
    </div>`;
    return shell({ active: "tasks", who: "rm", crumb: crumbOf("Tasks", "TD follow-up", p.name), body });
  },

  N6: (t) => {
    const p = PEOPLE[t];
    const car = t === "walkin" ? PCARS.c3 : PCARS.c2;
    return daStep(t, { id: "N6", ordered: true, title: t === "vtd" ? "Book a hub test drive" : "Book another drive", desc: t === "vtd" ? "Khalid wants to drive the Camry. Same slot picker as P7." : `${car.title} for ${first(t)}. Same slot picker as P7.`,
      body: `<div class="v2-card">${row("Where", `<b class="v2-b">Al Quoz hub, Dubai</b>`)}${row("Day", chips("dday", ["Today", "Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct"], ["Thu 8 Oct"]))}<div style="margin-top:8px;">${slotGrid("4:00 PM")}</div></div>`,
      footer: foot(t, "N6", "Exit: slot confirmed", [["Confirm booking", "P8", "primary", "calendar-check"]]) });
  },

  N7: (t) => {
    return daStep(t, { id: "N7", ordered: true, title: "Close the visit", desc: "Why did the customer say no? Reasons follow CRUISE.",
      body: `<div class="v2-card">
          ${row("Reason", chips("rsn", ["Mechanical", "Non-mechanical", "Pricing", "Assortment", "No response", "Other"], ["Pricing"]), "reason")}
          ${row("Detail", chips("sub", ["Found cheaper elsewhere", "Over budget", "Expected a discount"], ["Found cheaper elsewhere"]), "detail")}
          <div style="margin-top:8px;" data-part="note">${inp("Note", "Saw a similar car for AED 3,000 less on another site.", "n-why")}</div>
        </div>
        <div style="margin-top:10px;">${toggle(true, "OK to stay in touch", "Send new arrivals that match the shortlist. Only with the customer's agreement.", "keep-in-touch")}</div>`,
      footer: foot(t, "N7", "Exit: reason saved", [["Close visit", null, "primary", "check"]]) });
  },

  // ------------------------------------------------------------ M · Oversight
  M1: () => {
    const rows = [["BOOKED TODAY", 24, "", ""], ["ARRIVED", 26, "incl. 7 walk-ins", ""], ["CHECKED IN", 25, "3 min", ""], ["DL VERIFIED", 24, "2 min", ""], ["DA ASSIGNED", 24, "1 min", ""], ["MET CUSTOMER", 23, "4 min", "late"], ["TD STARTED", 19, "21 min", ""], ["TD CONSENT SIGNED", 19, "1 min", ""], ["TD CONDUCTED", 17, "18 min", ""], ["TOKEN PAID", 5, "9 min", "good"]];
    return page({ who: "manager", active: "oversight", manager: true, crumb: crumbOf("Manager Oversight", "TD funnel"), title: "Test drive funnel", sub: "Al Quoz &middot; today &middot; every hexagon on the PISTON board is a row here",
      actions: pill("green", `${ic("circle-dot")}Live`),
      extra: { top: `<div class="v2-alert" data-part="alert">${ic("triangle-alert")}<span>Fatima Al Suwaidi has waited 7 min since check-in for a handshake (target 5 min)</span><button class="v2-btn sm" data-go="S3">${ic("users")}Reassign DA</button></div>
          <div class="v2-kpis" data-part="kpis"><div><b>26</b><span>Visits</span></div><div><b>5</b><span>Token paid</span></div><div><b>19%</b><span>Visit to token</span></div><div><b>6 min</b><span>Arrival to handshake, median</span></div><div data-part="by-link"><b>${CTX.market === "au" ? "19 of 25" : "2 of 25"}</b><span>Checked in by link</span></div></div>
          <div class="v2-card" data-part="funnel"><div class="v2-funnel"><div class="frow head"><span>STATE</span><span></span><span>COUNT</span><span>FROM LAST STATE</span></div>
            ${rows.map(([nm, n, tm, tone]) => `<div class="frow"><span><span class="hex ${tone === "good" ? "good" : ""}">${nm}</span></span><span class="bar"><i class="${tone === "good" ? "good" : ""}" style="width:${Math.round(n / 26 * 100)}%"></i></span><span class="n">${n}</span><span class="t ${tone === "late" ? "late" : ""}">${tm}${tone === "late" ? " &middot; target 5" : ""}</span></div>`).join("")}</div>
            <div class="v2-chips" style="margin-top:10px;" data-part="outcomes"><span class="hex good">TOKEN PAID 5</span><span class="hex warn">FOLLOW-UP SCHEDULED 11</span><span class="hex warn">NEW TD BOOKED 3</span><span class="hex bad">DROPPED 3</span></div></div>` } });
  },
};

// ================================================================== customer view (the DA hands the tablet over)
function customerView({ title, lead, left, right, foot: footer }) {
  return `<div class="v2-cv">
    <div class="v2-cv-top"><span class="brand"><span class="v2-logo sm">${ic("car-front")}</span>CARS24</span><span class="hand">${ic("hand")}Customer view &middot; hand the tablet back to Omar when done</span></div>
    <div class="v2-cv-body"><div class="col"><h2>${title}</h2><p class="lead">${lead}</p>${left}</div><div class="col">${right}</div></div>
    <div class="v2-cv-foot" data-part="foot">${footer}</div>
  </div>`;
}

// ================================================================== self check-in (by link)
// The receptionist's view while the customer fills the form on their phone. Elements with data-on-EVENT,
// data-cls-EVENT or data-enable-EVENT react to the phone next to it (see mountSync in piston.js):
// opened, p1 and p2 (a section saved), submitted. data-synced="key" receives the answer the customer gave.
function selfCheckin(t) {
  const p = PEOPLE[t], walk = t === "walkin", fn = first(t);
  const at = walk ? { sent: "2:41 PM", opened: "2:42 PM", done: "2:44 PM" } : { sent: "2:24 PM", opened: "2:25 PM", done: "2:27 PM" };
  // [key, label, value already known, extra hooks]
  const answers = [
    ["purpose", "Visit purpose", walk ? "" : "Test drive &middot; from the booking", walk ? `data-def-p1="Not answered"` : ""],
    ["acc", "Accompanied by", "", `data-def-p1="Not answered"`],
    ["pay", "Paying by", "", `data-def-p1="Not answered"`],
    ["area", MK.area, "", `data-on-p1="${VISIT[t].area}"`],
    ["licence", "Driving licence", walk ? "" : "On file &middot; uploaded 2 days ago", walk ? `data-def-p2="Not uploaded: scan it at DL verify"` : ""],
    ["rec", "Recording consent", "", ""],
  ];
  const tl = [
    ["Sent", at.sent, "done"], ["Delivered", at.sent, "done"],
    ["Opened", "&mdash;", "", `data-cls-opened="done"`, `data-on-opened="${at.opened}"`],
    ["Filling", "0 of 3", "", `data-cls-opened="cur" data-cls-submitted="cur>done"`, `data-on-p1="1 of 3" data-on-p2="2 of 3" data-on-submitted="3 of 3"`],
    ["Submitted", "&mdash;", "", `data-cls-submitted="done"`, `data-on-submitted="${at.done}"`],
  ];
  const body = `<div class="v2-card sc-status" data-part="link-status">
      <div class="sc-top"><span class="sc-dot" data-cls-opened="live" data-cls-submitted="live>done"></span>
        <div class="sc-tt"><b data-on-opened="${fn} is filling in the form" data-on-submitted="${fn} checked in at ${at.done}">Waiting for ${fn} to open the link</b><small>Sent to ${p.phone} on WhatsApp and to ${p.email}</small></div>
        <span class="v2-pill violet">${ic("smartphone")}Self check-in</span></div>
      <div class="sc-tl">${tl.map(([k, v, cls, a, b]) => `<div class="${cls}"${a ? " " + a : ""}><i>${ic("check")}</i><b>${k}</b><small${b ? " " + b : ""}>${v}</small></div>`).join("")}</div>
    </div>
    <div class="v2-card" data-part="answers"><div class="sc-h"><b>Answers, synced live</b><small>The same questions as the desk check-in. Nothing to type here.</small></div>
      ${answers.map(([k, label, v, hooks]) => `<div class="sc-row${v ? " got" : ""}" data-sync-row><label>${label}</label><span data-synced="${k}"${hooks ? " " + hooks : ""}>${v || "Waiting&hellip;"}</span></div>`).join("")}
    </div>
    <div class="sc-actions" data-part="link-actions"><button class="v2-btn sm">${ic("send")}Resend link</button><button class="v2-btn sm">${ic("qr-code")}Show link as QR</button><button class="v2-btn sm" data-mode-set="desk">${ic("monitor")}Check ${fn} in at the desk</button>
      <span class="v2-small">No answer in 5 min? You get a nudge here. At the desk, what ${fn} filled carries over.</span></div>`;
  return visit({ t, id: "S1", who: "receptionist", title: `${fn} is checking in on their phone`, desc: `Link sent at ${at.sent} on WhatsApp and email. Each answer shows below as ${fn} gives it.`,
    body, gptOpts: false,
    leadOpts: { pill: ["amber", "Link sent", `data-on-opened="Filling in check-in" data-cls-opened="amber>violet" data-on-submitted="Checked in" data-cls-submitted="amber>green violet>green"`] },
    stageOpts: { sync: at.done },
    footer: foot(t, "S1", "Exit: the customer submits the form", [["Proceed to DL verify", "S2", "primary", "arrow-right", true, `disabled data-enable-submitted`]]) });
}

// ================================================================== the customer's phone: the form, and nothing else
// PHONES[stepId](track) returns one 360 x 740 phone screen. It has no Leadverse chrome: a message with the link,
// then a public page with the check-in form. Its panels (data-flow="ph") are the page's steps; data-sync="key"
// sends an answer to the panel beside it and data-sync-event fires a status change there.
const phStatus = (time) => `<div class="ph-status"><b>${time}</b><span>${ic("signal")}${ic("wifi")}${ic("battery-full")}</span></div>`;
const PHONES = {
  S1: (t) => {
    const p = PEOPLE[t], walk = t === "walkin", fn = first(t), c = PCARS[p.car];
    const url = pick(stepById("S1").screen.phone, t) || `${MK.site}/check-in/7Kq2Xw`;
    const times = walk ? ["2:41", "2:42", "2:43", "2:44"] : ["2:24", "2:25", "2:26", "2:27"];
    const top = (i) => `${phStatus(times[i])}<div class="ph-url">${ic("lock")}<span>${url}</span></div>`;
    const brand = `<div class="ph-brand"><span class="v2-logo sm">${ic("car-front")}</span><b>CARS24</b><span>${MK.hub}</span></div>`;
    const prog = (n, label) => `<div class="ph-prog"><div>${[1, 2, 3].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div><small>Step ${n} of 3 &middot; ${label}</small></div>`;
    const choose = (key, opts) => `<div class="ph-chips">${opts.map(o => `<button class="ph-chip" data-pick="${key}" data-sync="${key}">${o}</button>`).join("")}</div>`;
    const purposes = [["car-front", "Buy or test drive"], ["package", "Drop off a car"], ["key-round", "Pick up a car"], ["wrench", "A booked service"], ["banknote", "Sell my car"], ["message-circle", "Something else"]];
    return `<div class="ph">
      <div class="ph-scr" data-flow="ph" data-flow-step="msg" data-part="ph-msg">
        ${phStatus(times[0])}
        <div class="ph-wa">${ic("chevron-left")}<span class="v2-logo sm">${ic("car-front")}</span><div><b>CARS24 ${ic("badge-check")}</b><small>Business account</small></div></div>
        <div class="ph-chat">
          ${walk ? "" : `<div class="ph-bub">Your test drive is booked: ${c.title}, today at 2:30 PM at the ${MK.hubFull}.<small>Monday 9:12 AM</small></div>`}
          <div class="ph-day">Today</div>
          <div class="ph-bub">Hi ${fn}, welcome to CARS24! Check in from your seat. It takes about 2 minutes.
            <button class="ph-linkcard" data-step-to="ph:form" data-sync-event="opened"><b>${ic("clipboard-check")}Check in for your visit</b><small>${MK.site}</small><span>Open check-in</span></button>
            <small>${times[0]} PM ${ic("check-check")}</small></div>
          <p class="ph-hint">${ic("mail")}The same link is in ${fn}'s email.</p>
        </div>
      </div>
      <div class="ph-scr" data-flow="ph" data-flow-step="form" data-part="ph-form" hidden>
        ${top(1)}
        <div class="ph-page">${brand}
          <h3>Hi ${fn}, let's check you in</h3>
          <p class="ph-sub">About 2 minutes. Your answers go only to CARS24.</p>
          ${prog(1, "About today")}
          ${walk ? `<b class="ph-q">What brings you in today?</b><div class="ph-opts">${purposes.map(([icon, l]) => `<button class="ph-opt" data-pick="purpose" data-sync="purpose">${ic(icon)}<span>${l}</span></button>`).join("")}</div>`
            : `<div class="ph-visit">${ic("car-front")}<div><b>Test drive &middot; today 2:30 PM</b><small>${c.title}</small></div></div>`}
          <b class="ph-q">Who's with you today?</b>${choose("acc", ["Just me", "Partner", "Family", "A friend"])}
          <b class="ph-q">How are you thinking of paying?</b>${choose("pay", ["Cash", "Finance", "Not sure yet"])}
          <b class="ph-q">${MK.area}</b><div class="ph-input">${VISIT[t].area}</div>
        </div>
        <div class="ph-foot"><button class="ph-btn" data-step-to="ph:licence" data-sync-event="p1">Next</button></div>
      </div>
      <div class="ph-scr" data-flow="ph" data-flow-step="licence" data-part="ph-licence" hidden>
        ${top(2)}
        <div class="ph-page">${brand}
          <h3>Your driving licence</h3>
          <p class="ph-sub">You need it to drive. The photos go straight to CARS24, not into a chat.</p>
          ${prog(2, "Licence")}
          ${walk ? `<div class="ph-tiles">${["Front", "Back"].map((side, i) => `<button class="ph-tile" data-zone data-sync="licence" data-sync-val="${i ? "Front and back uploaded" : "Front uploaded"}">${ic("camera")}<b>${side}</b><small>Take a photo</small></button>`).join("")}</div>
              <button class="ph-textbtn" data-sync="licence" data-sync-val="Not with them: car finding only">I don't have it with me</button>`
            : `<div class="ph-onfile">${ic("badge-check")}<div><b>Already on file</b><small>Uploaded 2 days ago. We check it at the desk.</small></div></div>
              <button class="ph-textbtn">Upload it again</button>`}
        </div>
        <div class="ph-foot"><button class="ph-btn" data-step-to="ph:consent" data-sync-event="p2">Next</button></div>
      </div>
      <div class="ph-scr" data-flow="ph" data-flow-step="consent" data-part="ph-consent" hidden>
        ${top(3)}
        <div class="ph-page">${brand}
          <h3>Almost done</h3>
          ${prog(3, "Your consent")}
          <div class="ph-verified">${ic("shield-check")}<div><b>${p.phone}</b><small>Verified by this link. No code needed.</small></div></div>
          <b class="ph-q">Can we record today's conversation?</b>
          <p class="ph-sub">It helps your DA keep notes and helps us improve. Your visit is the same either way.</p>
          <div class="ph-radios">
            <button class="ph-radio" data-pick="rec" data-sync="rec" data-sync-val="Yes, recording on" data-enables="ph-submit"><i></i>Yes, that's fine</button>
            <button class="ph-radio" data-pick="rec" data-sync="rec" data-sync-val="No: AI notes off for this visit" data-enables="ph-submit"><i></i>No, please don't</button>
          </div>
          <p class="ph-legal">By checking in you agree to the CARS24 <u>${MK.privacy}</u>.</p>
        </div>
        <div class="ph-foot"><button class="ph-btn" id="ph-submit" disabled data-step-to="ph:done" data-sync-event="submitted">Check in</button></div>
      </div>
      <div class="ph-scr" data-flow="ph" data-flow-step="done" data-part="ph-done" hidden>
        ${top(3)}
        <div class="ph-page">${brand}
          <div class="ph-done"><span class="big">${ic("check")}</span><h3>You're checked in, ${fn}</h3>
            <p>${walk ? "Take a seat. A DA will meet you at the front desk in a few minutes." : `Take a seat. ${PSTAFF.da.name.split(" ")[0]}, your DA, will meet you at the front desk.`}</p></div>
          <div class="ph-card"><b>While you wait</b><p>Browse the cars at this hub. Cars you like show up for your DA.</p><button class="ph-btn ghost">${ic("car-front")}Browse cars</button></div>
          <p class="ph-legal">This page stays here until your visit ends. Need help? Ask at the front desk.</p>
        </div>
      </div>
    </div>`;
  },
};
