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
// tokens, hospital style: one queue per hub and day, B for bookings and W for walk-ins
const TOKEN = { booked: { no: "B-07", seat: "Seat 4", at: "2:27 PM" }, walkin: { no: "W-12", seat: "Seat 9", at: "2:44 PM" } };
// other customers on the ground TV: [token, name, status tone, status, DA index in PDAS, car, car state]
const BOARD = marketTable({ rows: [
  ["B-05", "Aisha A.", "live", "On test drive", 1, "c1", "on the road"],
  ["B-06", "Maryam R.", "ready", "Car ready at Bay 4", 1, "c3", "at the hub, Bay 4"],
  ["W-10", "Hamdan S.", "with", "With {da} &middot; car finding", 2, null, "Choosing with the DA"],
  ["B-08", "Noora A.", "wait", "Waiting for a DA", null, "c4", "in the yard, prepped"],
] }, { au: { rows: [
  ["B-05", "Ruby H.", "live", "On test drive", 1, "c1", "on the road"],
  ["B-06", "Ava R.", "ready", "Car ready at Bay 4", 1, "c3", "at the hub, Bay 4"],
  ["W-10", "Noah W.", "with", "With {da} &middot; car finding", 2, null, "Choosing with the DA"],
  ["B-08", "Isla T.", "wait", "Waiting for a DA", null, "c4", "in the yard, prepped"],
] } });
const STAFF_AV = marketTable({ receptionist: "K", da: "OH", operator: "SI", manager: "AP", cc: "RK", rm: "RH" },
  { au: { receptionist: "K", da: "JM", operator: "PS", manager: "AP", cc: "CD", rm: "GL" } });

const PILL = {
  P1: ["grey", "New lead"], P2: ["violet", "Booking initiated"], P3: ["violet", "Booking initiated"], P4: ["violet", "Booking initiated"], P5: ["violet", "Booking initiated"],
  P6: ["violet", "Booking initiated"], P7: ["violet", "Booking initiated"], P8: ["violet", "TD booked"], P9: ["amber", "Callback due"],
  I1: ["red", "Not checked-in"], I2: ["green", "Checked in"], S1: ["green", "Checked in"], S2: ["violet", "DA assigned"],
  T1: ["violet", "With DA"], T2: ["violet", "With DA"], T3: ["violet", "With DA"], T4: ["violet", "With DA"], T5: ["violet", "With DA"],
  O1: ["violet", "Car on its way"], O2: ["red", "TD live"], O3: ["red", "TD live"], O4: ["red", "TD live"],
  O5: ["red", "TD live"], O6: ["red", "TD live"], O7: ["green", "TD done"],
  N1: ["green", "TD done"], N2: ["amber", "Token pending"], N3: ["green", "Token paid"], N4: ["amber", "Follow-up set"], N5: ["amber", "Follow-up due"],
  N6: ["violet", "New TD booked"], N7: ["red", "Dropped"],
};
const PILL_VTD = { P2: ["grey", "Contact, no order"], P3: ["grey", "Contact, no order"], I1: ["red", "Not checked-in"], T2: ["violet", "On video"], T3: ["violet", "On video"], T4: ["violet", "On video"], T5: ["violet", "On video"], O5: ["red", "Video live"], O7: ["green", "Video TD done"] };

const AI_AU = {
  booked: {
    P: ["Viewed the Mazda3 3 times in the app", "Asked about finance options", "Evening calls work best"],
    I: ["High intent: booked the Mazda3 for 2:30 PM", "Licence uploaded before the visit", "Lives nearby, in Richmond"],
    S: ["High intent: booked the Mazda3 for 2:30 PM", "Licence uploaded before the visit", "Lives nearby, in Richmond", "Asked about finance before the visit"],
    T: ["High intent: chose the Mazda3 on the call", "Mazda3 at the hub, Bay 2", "Likely finance: asked about repayments"],
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
    T: ["High intent: chose the Altima on the call", "Altima at the hub, Bay 2", "Likely finance: asked about EMI"],
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
// the licence is checked at O4, after Start TD and the consent; until then it shows as to verify
const PRE_DL = ["I1", "I2", "S1", "S2", "T1", "T2", "T3", "T4", "T5", "O1", "O2", "O3", "O4"];
// the queue token shows while the customer is on the floor; it is not the payment token of N2
const ON_FLOOR = ["I2", "S1", "S2", "T1", "T2", "T3", "T4", "T5", "O1", "O2", "O3", "O4", "O5", "O6", "O7", "N1"];
function leadPane(t, stepId, opts = {}) {
  const p = PEOPLE[t], v = VISIT[t];
  const [tone, label, pillAttrs] = opts.pill || (t === "vtd" && PILL_VTD[stepId]) || PILL[stepId] || ["grey", "Open"];
  const ai = (AI[t] && (AI[t][stepId[0]] || AI[t].S)) || [];
  const isLead = stepId[0] === "P" && stepId !== "P8";
  const idLabel = isLead ? "Lead ID" : t === "walkin" && !opts.ordered ? "Visit ID" : "Order ID";
  const idVal = isLead ? (t === "vtd" ? "LD-55127" : "LD-55120") : t === "walkin" && opts.ordered ? v.order : v.id;
  return `<aside class="v2-lead" data-part="lead">
    <div class="v2-lh"><span class="v2-av lg">${inits(p.name)}</span><div><b>${p.name}</b><span class="v2-pill ${tone}"${pillAttrs ? " " + pillAttrs : ""}>${label}</span>${TOKEN[t] && ON_FLOOR.includes(stepId) ? ` <span class="v2-pill grey" title="Queue token, ${TOKEN[t].seat.toLowerCase()}">${ic("ticket")}${TOKEN[t].no}</span>` : ""}</div>
      <div class="v2-lh-ic">${ic("square-pen")}${ic("menu")}</div></div>
    <div class="v2-ltabs"><span class="on">${ic("user")}Contact</span><span>${ic("wallet")}Finance</span><span>${ic("file-text")}Documents</span><span>${ic("history")}Activity</span></div>
    <div class="v2-lscroll">
      ${ai.length ? `<div class="v2-ai"><div class="k">${ic("sparkles")}AI Summary</div><ul>${ai.map(x => `<li>${x}</li>`).join("")}</ul></div>` : ""}
      <div class="v2-sec">Details &amp; contacts</div>
      <div class="v2-group">
        <div class="v2-f"><div><small>${idLabel}</small><b>${idVal}</b></div><span class="v2-copy">${ic("copy")}</span></div>
        <div class="v2-f"><div><small>Phone</small><b>${p.phone}</b></div><div class="v2-acts">${isLead ? `<span class="edit" title="Edit">${ic("pencil")}</span>` : ""}<span class="call">${ic("phone")}</span><span class="wa">${ic("message-circle")}</span>${isLead ? "" : `<span>${ic("message-square")}</span>`}</div></div>
        ${opts.emailEdit ? `<div class="v2-f edit-row" data-part="edit-email"><div><small>Email <span class="v2-tag warn">Was missing: added on this call</span></small><input class="v2-input sm" value="${p.email}" aria-label="Email"></div></div>`
          : `<div class="v2-f"><div><small>Email</small><b>${p.email}</b></div><div class="v2-acts">${isLead ? `<span class="edit" title="Edit">${ic("pencil")}</span>` : ""}<span>${ic("mail")}</span></div></div>`}
        <div class="v2-f"><div><small>Lead source</small><b>${v.src}</b></div></div>
        <div class="v2-f"><div><small>${isLead ? "Lead owner" : "DA"}</small><b>${isLead ? v.owner : t === "vtd" ? PSTAFF.operator.name : ["I1", "I2"].includes(stepId) ? "Not assigned yet" : stepId === "S1" ? `${PSTAFF.da.name} (auto)` : PSTAFF.da.name}</b></div></div>
      </div>
      <div class="v2-sec">Finance</div>
      <div class="v2-group"><div class="v2-f"><div><small>${MK.credit}</small><b>${v.aecb}</b></div></div><div class="v2-f"><div><small>Pre-approval</small><b>${v.pre}</b></div></div></div>
      <div class="v2-sec">Documents</div>
      <div class="v2-group"><div class="v2-f"><div><small>Driving licence</small><b${opts.dlAttrs ? " " + opts.dlAttrs : ""}>${opts.dl || (PRE_DL.includes(stepId) && t !== "vtd" ? "To verify" : v.dl)}</b></div></div><div class="v2-f"><div><small>${MK.idDoc}</small><b>${v.eid}</b></div></div></div>
    </div>
  </aside>`;
}

// ================================================================== stage bar
// a booking has no car finding (the car was chosen on the call), so its stages are the DA and the car, then the TD
const VISIT_STAGES = { booked: ["Check-in", "DA and car", "TD live", "Disposition"], walkin: ["Check-in", "Car finding", "Car to hub", "TD live", "Disposition"], vtd: ["Check-in", "Car finding", "Video TD", "Disposition"] };
const STAGE_AT = {
  booked: { I1: 0, I2: 0, S1: 1, S2: 1, T1: 2, O3: 2, O4: 2, O5: 2, O6: 2, O7: 2, N1: 3, N2: 3, N3: 4, N4: 3, N6: 3, N7: 3 },
  walkin: { I1: 0, I2: 0, S1: 1, T1: 1, T2: 1, T4: 1, T5: 1, O1: 2, O2: 3, O3: 3, O4: 3, O5: 3, O6: 3, O7: 3, N1: 4, N2: 4, N3: 5, N4: 4, N6: 4, N7: 4 },
  vtd: { I1: 0, T2: 1, T3: 1, T4: 1, T5: 1, O5: 2, O7: 2, N1: 3, N2: 3, N3: 4, N4: 3, N6: 3, N7: 3 },
};
function stageSub(t, name, state, stepId) {
  if (state === "todo") return "Pending";
  const done = state === "done";
  const walk = t === "walkin";
  const self = isHub(t) && CTX.mode === "qr";
  switch (name) {
    case "Check-in": return done ? (t === "vtd" ? "3:01 PM" : `${self ? "QR &middot; " : ""}${TOKEN[t].no} &middot; ${walk ? "2:44 PM" : "2:27 PM"}`) : "In progress";
    case "Car finding": return done ? (walk ? "1 car, booked now" : "Camry") : stepId === "S1" ? "Assigning DA" : t === "vtd" ? "On screen share" : stepId === "T5" ? "Booking the slot" : `With ${PSTAFF.da.name.split(" ")[0]}`;
    case "DA and car": return done ? `${PSTAFF.da.name.split(" ")[0]} &middot; car at ${PCARS[PEOPLE[t].car].bay}` : stepId === "S1" ? "Assigning DA" : "Car with the Yardie";
    case "Car to hub": return done ? "At the hub" : "With the Yardie";
    case "TD live": return done ? "1/1 done" : ({ T1: "Handshake &middot; starting", O2: "Starting &middot; recording", O3: "Consent", O4: "DL check", O5: "Walkaround", O6: "Driving" }[stepId] || "1/1 done");
    case "Video TD": return done ? "Done" : "Live";
    case "Disposition": return done ? "Token paid" : "Open";
  }
  return "";
}
// opts.sync: the self check-in panel, where Check-in turns done and DL verify current when the customer submits
function stageBar(t, stepId, opts = {}) {
  const names = VISIT_STAGES[t];
  const cur = STAGE_AT[t][stepId] ?? 0;
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
// the recording starts when the DA starts the TD (T1 for a booking, O2 for a walk-in); a video TD is recorded from the start of the call
const START = { booked: "2:52 PM", walkin: "3:08 PM" };
const TRANSCRIBING = { booked: "since 2:52 PM", walkin: "since 3:08 PM", vtd: "since 3:01 PM" };
const RECORDING = ["O2", "O3", "O4", "O5", "O6", "O7", "N1", "N2", "N3", "N4", "N6", "N7"];

// ================================================================== center column parts
function prevOf(t, id) {
  const list = stepsForTrack(t).filter(s => s.phase !== "M");
  const i = list.findIndex(s => s.id === id);
  return i > 0 ? list[i - 1].id : null;
}
// The standard footer: Previous, the step's main exit as Next, and every other exit in a menu under the arrow next
// to it, so no screen carries a row of buttons. A customer drop-off (to the disposition) is always in that menu.
// buttons: [label, go, kind, icon, iconAfter, attrs]; the primary one (or the last) is Next.
function foot(t, id, hint, buttons) {
  const prev = prevOf(t, id);
  let mi = buttons.map(b => b[2]).lastIndexOf("primary");
  if (mi < 0) mi = buttons.length - 1;
  const main = buttons[mi];
  const phase = id[0];
  const drop = phase === "P" ? ["Customer dropped off: call disposition", "N7", "", "phone-off"] : phase === "N" ? null : ["Customer left: fill the disposition", "N1", "", "log-out"];
  const items = [...buttons.filter((_, i) => i !== mi), ...(drop ? [drop] : [])];
  const btn = ([label, go, kind, icon, after, attrs]) => `<button class="v2-btn ${kind || ""}" ${go ? `data-go="${go}"` : ""}${attrs ? " " + attrs : ""}>${icon && !after ? ic(icon) : ""}${label}${icon && after ? ic(icon) : ""}</button>`;
  return `<div class="v2-foot" data-part="foot">
    <button class="v2-btn" ${prev ? `data-go="${prev}"` : "disabled"}>${ic("arrow-left")}Previous</button>
    <span class="v2-hint">${hint}</span>
    <div class="v2-split">${main ? btn(main) : ""}${items.length ? `<button class="v2-btn ${main && main[2] === "primary" ? "primary" : ""} caret" data-menu aria-label="More actions" title="More actions">${ic("chevron-down")}</button>
      <div class="v2-menu" hidden>${items.map(([label, go, , icon]) => `<button ${go ? `data-go="${go}"` : ""}>${icon ? ic(icon) : ""}${label}</button>`).join("")}</div>` : ""}</div>
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
  return visit({ ...o, t, who: "da", gptOpts: o.gptOpts || { cards: o.cards || [], transcribing: RECORDING.includes(o.id) && o.id !== "O2" ? TRANSCRIBING[t] : null } });
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

// stepper pills: one filter per pill with its own Next, ending in the matches. steps: [key, label, html]
function pillSteps(steps) {
  return `<div class="dc-pills" data-part="pills">${steps.map(([k, l], i) => `<button class="dc-pill ${i === 0 ? "on" : ""}" data-step-to="dc:${k}" data-flow-pill="dc:${k}"><i>${i + 1}</i>${l}</button>`).join("")}</div>
    ${steps.map(([k, , html], i) => `<div class="v2-card dc-panel" data-flow="dc" data-flow-step="${k}"${i ? " hidden" : ""} data-part="${i === 0 ? "filter" : `filter-${k}`}">${html}
      ${i < steps.length - 1 ? `<div class="dc-next"><button class="v2-btn primary sm" data-step-to="dc:${steps[i + 1][0]}">Next: ${steps[i + 1][1].toLowerCase()}${ic("arrow-right")}</button></div>` : ""}</div>`).join("")}`;
}
// the filters, from who it's for to must-haves, then the matching cars with a link to each car's page
function needSteps(t, { who, pay, pickN = 2, compare } = {}) {
  const p = PEOPLE[t], n = p.needs;
  return [
    ["who", "Who it's for", `<b class="v2-q">Who is the car for?</b>${chips("who", ["Just me", "Couple", "Family with kids", "Business", "First car"], [who])}
      <b class="v2-q" style="margin-top:14px;">Mostly for</b>${chips("multi", MK.usage, n.usage)}`],
    ["budget", "Budget", `<b class="v2-q">What's the budget?</b>${chips("budget", MK.budgets, [n.budget])}
      <b class="v2-q" style="margin-top:14px;">Paying by</b>${chips("pay", ["Cash", "Finance", "Not sure yet"], [pay])}`],
    ["body", "Body type", `<b class="v2-q">Which body type?</b>${chips("multi", ["Sedan", "SUV", "Hatchback", "Ute", "7 seats"], n.body)}`],
    ["fuel", "Fuel and gearbox", `<b class="v2-q">Fuel</b>${chips("fuel", ["Petrol", "Hybrid", "Diesel", "Electric"], [n.fuel])}
      <b class="v2-q" style="margin-top:14px;">Gearbox</b>${chips("trans", ["Automatic", "Manual"], [n.trans])}`],
    ["must", "Must-haves", `<b class="v2-q">Anything they can't do without?</b>${chips("multi", ["Apple CarPlay", "Rear camera", "Adaptive cruise", "7 airbags", "Sunroof", "Heated seats"], n.must)}`],
    ["cars", "Matches", `<div class="dc-mh"><b class="v2-q">${p.picks.length} cars match. Pick one or two.</b>${compare || ""}</div>
      ${p.picks.map(([cid, match, why], i) => carRow(cid, { check: true, selected: i < pickN, sub: `${money(PCARS[cid].price)} &middot; ${why}`, badge: `<span class="v2-badge match">${match}% match</span>`, part: i === 0 ? "matches" : null,
        right: `<a class="v2-link" href="${PCARS[cid].url}" target="_blank" rel="noopener">${ic("external-link")}Car page</a>` })).join("")}`],
  ];
}

function cmpModal(ids) {
  return `<div class="v2-modal" id="cmpx" hidden style="z-index:7;"><div class="v2-mh"><div><h4>Compare cars</h4><p>Side by side, from live stock.</p></div><span class="v2-ib box x" data-close="cmpx">${ic("x")}</span></div>
    <div class="v2-mb"><table class="v2-cmp"><thead><tr><th></th>${ids.map(id => `<th>${PCARS[id].title}</th>`).join("")}</tr></thead><tbody>${[["Price", c => money(c.price)], ["Odometer", c => c.km], ["Body", c => c.body], ["Drive", c => c.drive], ["Seats", c => c.seats], ["Bay", c => c.bay]].map(([k, fn]) => `<tr><td>${k}</td>${ids.map(id => `<td>${fn(PCARS[id])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="v2-mf"><span></span><button class="v2-btn" data-close="cmpx">Close</button></div></div>`;
}

// ================================================================== list pages
function page({ who, active, crumb, title, sub, actions, tools, tabs, filterTabs, table, extra, manager, overlay, cls }) {
  const body = `<div class="v2-body"><div class="v2-page${cls ? " " + cls : ""}">
    <div class="v2-ph"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><div class="v2-ph-r">${actions || ""}</div></div>
    ${extra && extra.top ? extra.top : ""}
    ${tools ? `<div class="v2-tools">${tools}</div>` : ""}
    ${tabs ? `<div class="v2-tabs2">${tabs.map(([l, on]) => `<span class="${on ? "on" : ""}">${l}</span>`).join("")}</div>` : ""}
    ${filterTabs ? `<div class="v2-tabs2" data-filter-tabs data-part="tabs">${filterTabs.map(([l, key, on]) => `<button class="${on ? "on" : ""}" data-filter="${key}">${l}</button>`).join("")}</div>` : ""}
    ${table || ""}
    ${extra && extra.bottom ? extra.bottom : ""}
  </div>${overlay || ""}</div>`;
  return shell({ active, who, crumb, body, manager });
}
const toolsRow = (ph, buttons) => `<div class="v2-search inline">${ic("search")}<span>${ph}</span></div>${buttons.map(([l, icon]) => `<span class="v2-btn">${icon ? ic(icon) : ""}${l}</span>`).join("")}`;
function table(cols, rows, part) {
  return `<div class="v2-tbl" ${part ? `data-part="${part}"` : ""}><table class="v2-table"><thead><tr><th class="cb"><span class="v2-cb"></span></th>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.hl ? "hl" : ""}"${r.cat ? ` data-cat="${r.cat}"${r.hide ? " hidden" : ""}` : ""}><td class="cb"><span class="v2-cb"></span></td>${r.cells.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="v2-tfoot">0 of ${rows.length + 9} row(s) selected.</div></div>`;
}
const cust = (nm, sub2) => `<div class="v2-cust"><span class="v2-av">${inits(nm)}</span><div><b>${nm}</b>${sub2 ? `<small>${sub2}</small>` : ""}</div></div>`;
const pill = (tone, text) => `<span class="v2-pill ${tone}">${text}</span>`;

// ================================================================== the TD booking call (calling team persona task)
const CALL_TASK = { booked: "TK-6120", vtd: "TK-6127" };
const CALL_STEPS = ["Interest", "Discovery", "TD type", "Slots", "Book"];
function callStages(t, idx) {
  const done = t === "vtd"
    ? { Interest: "4 cars, 4 orders", Discovery: "Not needed", "TD type": "2 hub, 2 video", Slots: "Hub + video", Book: "Booked" }
    : { Interest: `Order ${PEOPLE[t].id}`, Discovery: "Not needed", "TD type": "1 hub", Slots: "Today 2:30 PM", Book: "Booked" };
  return `<div class="v2-stages" data-part="stages">${CALL_STEPS.map((n, i) => {
    const state = i < idx ? "done" : i === idx ? "cur" : "todo";
    return `<div class="v2-stg ${state}"><span class="c">${ic("square-check")}</span><b>${n}</b><span>${state === "done" ? done[n] : state === "cur" ? "In progress" : "Pending"}</span></div>`;
  }).join("")}</div>`;
}
function callTask(t, idx, id, { title, desc, right, body, hint, buttons, secs, cards, leadOpts }) {
  const p = PEOPLE[t];
  const callbar = `<div class="v2-call" data-part="call"><span class="cb">${ic("phone-call")}</span><div><b>On call with ${first(t)}</b><small>${p.phone} &middot; ${secs}</small></div><span class="v2-recpill"><i></i>Recording</span>
    <div class="v2-call-r"><span>${ic("mic-off")}</span><span>${ic("pause")}</span><span class="end">${ic("phone-off")}</span></div></div>`;
  const content = `<div class="v2-body">
    ${leadPane(t, id, leadOpts || {})}
    <section class="v2-center">${callbar}${callStages(t, idx)}<div class="v2-content">${head2(title, desc, right)}${body}</div>${foot(t, id, hint, buttons)}</section>
    ${gpt("cc", { cards: cards || [], transcribing: `call &middot; ${secs}` })}
  </div>`;
  return shell({ active: "tasks", who: "cc", crumb: crumbOf("Tasks", "TD booking call", `${p.name} - ${CALL_TASK[t]}`), body: content });
}

// ================================================================== screens
const SCREENS = {
  // ------------------------------------------------------------ P · Plan: the TD booking call
  P1: (t) => {
    const B = PEOPLE.booked, V = PEOPLE.vtd;
    const call = (trk) => `<button class="v2-btn ${trk === t ? "primary" : ""} sm" ${trk === t ? `data-go="P2" data-part="call-now"` : ""}>${ic("phone")}Call now</button>`;
    // [track, tab, name, sub, source, intent, cars, waiting, attempts, action]
    const rows = [
      ["booked", "queue", B.name, B.email, "Consumer app", pill("violet", `${ic("file-check")}Order ${B.id}`), carShort(B.car), "4 min", "0 of 3", call("booked")],
      ["vtd", "queue", V.name, V.phone, "Chatbot", pill("grey", "No order: email missing"), "4 cars", "9 min", "0 of 3", call("vtd")],
      ["", "callbacks", "Hamad Al Ketbi", "hamad.k@example.com", "Website", pill("violet", `${ic("file-check")}Order BK-88199`), carShort("c4"), "26 min", "1 of 3", pill("amber", "Callback 4:00 PM")],
      ["", "callbacks", "Sana Malik", "Mobile only", "Missed call", pill("grey", "No order: mobile only"), "&mdash;", "1 h", "2 of 3", pill("amber", "Callback tomorrow")],
      ["", "missed", "Maryam Rashidi", "BK-88177", "Consumer app", pill("red", "Missed TD at 11:00 AM"), carShort("c3"), "2 h", "0 of 3", `<button class="v2-btn sm">${ic("phone")}Call to rebook</button>`],
      ["", "closed", "Rashid Al Falasi", "BK-88140", "Website", pill("green", "TD booked"), carShort("c2"), "&mdash;", "1 of 3", `<span class="v2-muted">Closed 1:20 PM</span>`],
    ];
    return page({ who: "cc", active: "tasks", crumb: crumbOf("Tasks", "TD booking call"), title: "TD booking call", sub: `Lead &middot; ${PSTAFF.cc.name}'s queue`,
      extra: { top: `<div class="v2-note">${ic("sparkles")}<span><b>Every enquiry with a mobile number lands here.</b> With a mobile and an email, an order already exists. Without both, the cars of interest wait on the contact by appointment ID, and the call creates the orders.</span></div>` },
      tools: toolsRow("Search by name, mobile or appointment ID", [["Saved filters", "save"], ["Filters", "list-filter"], ["Sort by", "arrow-up-down"]]),
      filterTabs: [["All &middot; 44", "all", true], ["Queue &middot; 12", "queue"], ["Callbacks &middot; 3", "callbacks"], ["Closed today &middot; 27", "closed"], ["Today missed TD &middot; 2", "missed"]],
      table: table(["Lead", "Source", "Intent", "Cars", "Waiting", "Attempts", ""], rows.map(([trk, cat, nm, sub, src, intent, cars, wait, att, act]) => ({ hl: trk === t, cat,
        cells: [cust(nm, sub), pill("grey", src), intent, cars, wait, att, act] })), "queue") });
  },

  // the lead view: the customer's orders and cars first; the opening line and the pitch are in CarGPT
  P2: (t) => {
    const p = PEOPLE[t], vtd = t === "vtd", fn = first(t), cc = PSTAFF.cc.name.split(" ")[0];
    const link = (cid) => `<a class="v2-link" href="${PCARS[cid].url}" target="_blank" rel="noopener" title="Opens the car's page on the consumer website">${ic("external-link")}Car page</a>`;
    const script = vtd
      ? `&ldquo;Hi, this is ${cc} from CARS24. Am I speaking with ${fn}? You asked our chatbot about 4 cars, including the ${PCARS[p.car].title}. Is now a good time for a few minutes?&rdquo;`
      : `&ldquo;Hi, this is ${cc} from CARS24. Am I speaking with ${fn}? You were looking at the ${PCARS[p.car].title} in our app. Is now a good time for a few minutes?&rdquo;`;
    const cards = [["Say this", "quote", `<p>${script}</p>`], ["Why CARS24, once", "shield-check", `<p>Every car inspected, warranty included, a return window, finance and trade-in. Cover it early, then let the customer talk.</p>`]];
    const body = vtd
      ? `<div class="v2-note amber" data-part="intent">${ic("info")}<span><b>No order yet.</b> Only a mobile came from the chatbot, so the cars sit on contact LD-55127 by appointment ID. Ask which ones ${fn} wants to drive. No previous orders.</span></div>
        <div class="v2-card" data-part="interest"><div class="sc-h" style="border:none; padding-bottom:4px;"><b>Cars of interest &middot; 4</b><span class="v2-ok sm" data-part="order-rule">${ic("circle-check")}Mobile and email in: one order per ticked car</span></div>
          ${["c2", "c1", "c3", "c4"].map((cid, i) => carRow(cid, { check: true, selected: true, sub: `Appointment ${PCARS[cid].appt} &middot; ${money(PCARS[cid].price)}`, part: i === 0 ? "car-rows" : null, right: link(cid) })).join("")}
        </div>`
      : `<div class="v2-note" data-part="intent">${ic("file-check")}<span><b>Clear intent: an order exists.</b> ${fn} gave a mobile and an email in the app, so the order was created. Confirm it and go to the TD type.</span></div>
        <div class="v2-card" data-part="history"><div class="sc-h" style="border:none; padding-bottom:4px;"><b>Orders and cars, newest first</b><small>Current and previous</small></div>
          ${carRow(p.car, { check: true, selected: true, oid: p.id, sub: `Appointment ${PCARS[p.car].appt} &middot; from the app, 2 days ago`, badge: pill("violet", "Booking initiated"), part: "car-rows", right: link(p.car) })}
          <div class="hx-past" data-part="past"><span class="v2-av">${ic("history")}</span><div><b>BK-87410 &middot; 2019 Toyota Corolla Ascent</b><small>Appointment 09981230 &middot; March 2026</small></div>${pill("grey", "TD done, not bought")}</div>
        </div>
        <div class="v2-card" data-part="viewed"><div class="sc-h" style="border:none; padding-bottom:6px;"><b>Also viewed in the app</b><small>No order yet</small></div>
          <div class="v2-chips">${["c3", "c2"].map(cid => `<button class="v2-chip" data-pick="multi">${ic("plus")}${PCARS[cid].title}</button>`).join("")}</div>
          <p class="v2-small">Adding a car here creates an order for it too.</p></div>`;
    return callTask(t, 0, "P2", { secs: "00:40", title: vtd ? `Which cars does ${fn} want to drive?` : `${fn}'s order`, desc: "Contact details are edited on the left. The opening line and the pitch are in CarGPT.",
      body, cards, leadOpts: vtd ? { emailEdit: true } : {},
      hint: vtd ? "Exit: cars picked, orders created" : "Exit: order confirmed",
      buttons: [["Not sure: discover cars together", "P3", "", "compass"], ["Call back later", "P9", "", "phone-forwarded"], ["Wrong number or not interested", "N7", "", "circle-x"],
        [vtd ? "Create 4 orders: TD type" : "Next: TD type", "P4", "primary", "arrow-right", true]] });
  },

  // discovery: a stepper of filters, ending in the matching cars
  P3: (t) => {
    const body = pillSteps(needSteps(t, { who: t === "vtd" ? "Just me" : "Family with kids", pay: "Finance" }));
    return callTask(t, 1, "P3", { secs: "03:10", title: `Find the right car with ${first(t)}`, desc: "Five quick filters, then the cars that match. Open a car's page on the website for more detail.",
      body, hint: "Exit: one or two cars picked",
      buttons: [["Nothing fits: alert on new arrivals, call back", "P9", "", "bell"], ["Next: TD type", "P4", "primary", "arrow-right", true]],
      cards: [["Ask", "message-square", `<p>&ldquo;Who usually rides with you, and what do you drive most: city or highway?&rdquo;</p>`]] });
  },

  // TD type per car: the mix decides the slot steps
  P4: (t) => {
    const vtd = t === "vtd", p = PEOPLE[t];
    const cars = vtd ? [["c1", "hub", "BK-88191"], ["c3", "hub", "BK-88192"], ["c2", "video", "BK-88190"], ["c4", "video", "BK-88193"]] : [[p.car, "hub", p.id]];
    const rowsHtml = cars.map(([cid, type, oid], i) => {
      const c = PCARS[cid], only = vtd && cid === "c2";
      return `<div class="td-row" ${i === 0 ? `data-part="td-rows"` : ""}><span class="ph" style="background:${c.color}">${ic("car")}</span>
        <div class="mid"><b>${c.title}</b><small>Order ${oid}${vtd ? " (new)" : ""} &middot; appointment ${c.appt}${only ? ` &middot; <span class="v2-warn-txt">${MK.videoOnly}</span>` : ""}</small></div>
        <div class="v2-seg2"><button class="${type === "hub" ? "on" : ""}" data-pick="tdt-${cid}" ${only ? "disabled" : ""}>${ic("store")}Hub TD</button><button class="${type === "video" ? "on" : ""}" data-pick="tdt-${cid}">${ic("video")}Video TD</button></div></div>`;
    }).join("");
    return callTask(t, 2, "P4", { secs: "06:20", title: "Hub or video, for each car", desc: vtd ? "4 orders were created from the cars of interest. Pick the TD type car by car." : `One car, on order ${p.id}.`,
      body: `<div class="v2-card">${rowsHtml}</div>
        <div class="v2-note" data-part="next-steps">${ic("route")}<span>${vtd ? "<b>2 for a hub TD, 2 for a video TD.</b> Next comes the hub slot, then the video slot." : "<b>All cars for a hub TD.</b> One slot step next."} If every car had the same type, there would be a single slot step.</span></div>`,
      hint: "Exit: a TD type for every car",
      buttons: [["Call back later", "P9", "", "phone-forwarded"], ["Next: hub slot", "P5", "primary", "arrow-right", true]],
      cards: [["Tip", "lightbulb", `<p>${vtd ? "Cars at another hub or interstate can only be shown on video." : "A car at this hub can also be shown on video if the customer prefers."}</p>`]] });
  },

  P5: (t) => {
    const vtd = t === "vtd", p = PEOPLE[t];
    const cars = vtd ? ["c1", "c3"] : [p.car];
    return callTask(t, 3, "P5", { secs: "08:05", title: `Hub test drive: ${cars.length === 1 ? "1 car" : `${cars.length} cars, one visit`}`, desc: `Slots at the ${MK.hubFull} for ${cars.map(cid => carShort(cid)).join(" and ")}. Shown because ${cars.length === 1 ? "this car is" : "these cars are"} for a hub TD.`,
      body: `<div class="v2-card">
          ${row("Cars", `<div class="v2-chips">${cars.map(cid => `<span class="v2-tag">${ic("car")}${PCARS[cid].title}</span>`).join("")}</div>`, "hub-cars")}
          ${row("Where", `<b class="v2-b">${MK.hubFull}</b>`)}
          ${row("Day", chips("dday", ["Today", "Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct"], [vtd ? "Sat 10 Oct" : "Today"]), "day")}
          <div style="margin-top:8px;">${slotGrid(vtd ? "10:00 AM" : "2:30 PM")}</div>
          <p class="v2-small">A slot shows as free only when a DA and every car are free together. Today this comes from the slot planner; the target is the central Appointment Service.</p>
        </div>`,
      hint: vtd ? "Exit: hub slot picked, video slot next" : "Exit: hub slot picked",
      buttons: [["No slot works: call back", "P9", "", "phone-forwarded"], [vtd ? "Next: video slot" : "Next: confirm", vtd ? "P6" : "P7", "primary", "arrow-right", true]] });
  },

  P6: (t) => {
    const cars = ["c2", "c4"];
    return callTask(t, 3, "P6", { secs: "09:30", title: "Video test drive: 2 cars, one call", desc: `Slots for ${cars.map(cid => carShort(cid)).join(" and ")} on video. Shown because these cars are for a video TD.`,
      body: `<div class="v2-card">
          ${row("Cars", `<div class="v2-chips">${cars.map(cid => `<span class="v2-tag">${ic("video")}${PCARS[cid].title}</span>`).join("")}</div>`, "video-cars")}
          ${row("Where", `<b class="v2-b">Video call, link by WhatsApp</b>`)}
          ${row("Day", chips("dday", ["Today", "Thu 8 Oct", "Fri 9 Oct", "Sat 10 Oct"], ["Today"]), "day")}
          <div style="margin-top:8px;">${slotGrid("3:00 PM")}</div>
          <p class="v2-small">A slot shows as free only when a video operator is free and both cars can be on camera.</p>
        </div>`,
      hint: "Exit: video slot picked",
      buttons: [["No slot works: call back", "P9", "", "phone-forwarded"], ["Next: confirm", "P7", "primary", "arrow-right", true]] });
  },

  P7: (t) => {
    const vtd = t === "vtd", p = PEOPLE[t];
    const card = (icon, type, when, where, cars) => `<div class="bk-card"><span class="ic">${ic(icon)}</span><div class="mid"><b>${type} &middot; ${when}</b><small>${where}</small>
      <div class="v2-chips" style="margin-top:6px;">${cars.map(([cid, oid]) => `<span class="v2-tag">${PCARS[cid].title} &middot; ${oid}</span>`).join("")}</div></div></div>`;
    const cards = vtd
      ? card("store", "Hub TD", "Sat 10 Oct, 10:00 AM", MK.hubFull, [["c1", "BK-88191"], ["c3", "BK-88192"]]) + card("video", "Video TD", "Today, 3:00 PM", "Video call, link by WhatsApp", [["c2", "BK-88190"], ["c4", "BK-88193"]])
      : card("store", "Hub TD", "Today, 2:30 PM", MK.hubFull, [[p.car, p.id]]);
    return callTask(t, 4, "P7", { secs: "10:15", title: vtd ? "Read back both bookings" : "Read back the booking", desc: "Booking confirms on WhatsApp and SMS, sends any video link, and closes this task.",
      body: `<div data-part="bookings">${cards}</div>`,
      hint: "Exit: booked, task closed",
      buttons: [["Change a slot", vtd ? "P6" : "P5", "", "calendar"], [vtd ? "Book both and close the task" : "Book and close the task", "P8", "primary", "calendar-check"]] });
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
      extra: { top: `<div class="v2-note">${ic("sparkles")}<span><b>Readiness is the exit check for Plan.</b> Each amber square is a task for someone: the customer (DL), the Yardie (car prepped and parked in the yard), the receptionist (DA) or the system (reminder).</span></div>` },
      tabs: [["Today &middot; 6"], ["Upcoming &middot; 14", true], ["Hub &middot; 11"], ["Virtual &middot; 3"]],
      table: table(["Customer", "Slot", "Car", "Type", "DL &middot; Car &middot; DA &middot; Reminder", ""], rows.map(([trk, nm, id, slot, car, type, r, [act, aic]]) => ({ hl: trk === t,
        cells: [cust(nm, id), slot, car, pill("grey", type), `<div class="v2-ready" ${trk === t ? `data-part="readiness"` : ""}>${cell(r[0], "file-text")}${cell(r[1], "wrench")}${cell(r[2], "user-x")}${cell(r[3], "bell")}</div>`, `<button class="v2-btn sm" ${trk === t ? `data-part="row-action"` : ""}>${ic(aic)}${act}</button>`] })), "table") });
  },

  P9: (t) => {
    const p = PEOPLE[t];
    const rows = [[p.name, "callbacks", "Busy, call after work", "Today, 5:30 PM", "1 of 3", true, "Orders and interest"], ["Hamad Al Ketbi", "callbacks", "No answer", "Today, 4:00 PM", "2 of 3", false, "Orders and interest"],
      ["Sana Malik", "callbacks", "Call after payday", "Tomorrow, 10:00 AM", "2 of 3", false, "Discovery"], ["Maryam Rashidi", "missed", "Missed the 11:00 AM TD", "Today, 1:00 PM", "0 of 3", false, "Hub slot"]];
    return page({ who: "cc", active: "tasks", crumb: crumbOf("Tasks", "TD booking call", "Callbacks"), title: "TD booking call", sub: `Lead &middot; ${PSTAFF.cc.name}'s callbacks`,
      filterTabs: [["All &middot; 44", "all"], ["Queue &middot; 12", "queue"], ["Callbacks &middot; 3", "callbacks", true], ["Closed today &middot; 27", "closed"], ["Today missed TD &middot; 2", "missed"]],
      table: table(["Lead", "Why", "Callback", "Attempts", "Resumes at"], rows.map(([nm, cat, why, when, att, hl, step]) => ({ hl, cat, hide: cat !== "callbacks", cells: [cust(nm), why, when, pill(att.startsWith("2") ? "amber" : "grey", att), `<span ${hl ? `data-part="resume"` : ""}>${step}</span>`] })), "table"),
      extra: { bottom: `<div class="v2-card" style="margin-top:12px;"><div class="v2-ch" style="margin-bottom:6px;"><div><h3>Call ${first(t)} back</h3><p>The task resumes where the last call stopped. After 3 attempts it closes as dropped.</p></div></div>
          ${row("Move the callback", chips("cbk", ["In 2 hours", "This evening", "Tomorrow morning", "Pick a time"], ["This evening"]), "reschedule")}
          <div class="v2-btnrow"><button class="v2-btn primary" data-go="P2" data-part="call-now">${ic("phone")}Call now</button><button class="v2-btn">${ic("phone-missed")}No answer: try later</button><button class="v2-btn" data-go="N7">${ic("circle-x")}Not interested</button></div></div>` } });
  },

  // ------------------------------------------------------------ I · Introduce: welcome and check-in, one gesture
  I1: (t) => {
    const p = PEOPLE[t];
    if (!isHub(t)) {
      return vtdVisit({ id: "I1", title: `Welcome ${first(t)} and check in`, desc: "Joined 1 min before the 3:00 PM slot. Admit, welcome on camera, then ask for the code sent to the booked mobile. One gesture, no separate arrival.",
        body: `<div class="v2-card" data-part="waiting"><div class="v2-kvs">${kv("Car", PCARS[p.car].title)}${kv("Booked via", VISIT[t].src)}${kv("Language", p.language)}${kv("Car on camera", "Studio 1, helper ready")}</div></div>
          <div class="v2-card" data-part="otp"><div class="v2-otp-wrap"><div class="v2-otp">${"284611".split("").map(d => `<span>${d}</span>`).join("")}</div><button class="v2-btn" data-otp-verify>${ic("shield-check")}Verify OTP</button><span class="v2-ok" hidden>${ic("circle-check")}Verified &middot; ${p.phone}</span></div></div>
          <div>${toggle(true, "Recording consent", `${first(t)} agrees to record this call for AI notes and service quality. Saying no doesn't stop the call.`, "consent")}</div>`,
        footer: foot(t, "I1", "Exit: OTP verified, recording answered", [["Check in and start car finding", "T2", "primary", "arrow-right", true]]) });
    }
    const walk = t === "walkin", qr = CTX.mode === "qr", tk = TOKEN[t];
    // the Today list: Check in is the row action, there is no Mark arrived
    const checkBtn = (focus) => `<button class="v2-btn ${focus ? "primary" : ""} sm" ${focus ? `data-open-flow="ci" data-part="check-in"` : ""}>${ic("log-in")}Check in</button>`;
    const status = qr
      ? (walk ? `<span class="v2-pill violet" data-on-submitted="Checked in" data-cls-submitted="violet>green">Checking in by QR</span>`
              : `<span class="v2-pill amber" data-on-scanned="Checking in by QR" data-cls-scanned="amber>violet" data-on-submitted="Checked in" data-cls-submitted="amber>green violet>green">Expected</span>`)
      : pill("amber", "Expected");
    const tokenCell = `<span class="v2-tok" ${qr ? `data-on-submitted="${tk.no}"` : ""}>&mdash;</span>`;
    const rows = [
      ["", "Hamdan Saeed", "Walk-in", "1:10 PM", "Kia Sportage", "Faisal Noor", `<span class="v2-tok">W-09</span>`, pill("green", "TD conducted"), ""],
      ["", "Aisha Al Mazrouei", "050 774 2210", "11:00 AM", "Nissan Altima SV", "Layla Ahmed", `<span class="v2-tok">B-03</span>`, pill("green", "Token paid"), ""],
      ["", "Khalid Al Jaberi", "055 987 1230", "3:00 PM", "Toyota Camry GLE", "Sara Ibrahim", "&mdash;", pill("violet", "Video"), `<button class="v2-btn sm">${ic("video")}Open video room</button>`],
      ["", "Maryam Rashidi", "052 445 9981", "4:15 PM", "Hyundai Tucson", "Layla Ahmed", "&mdash;", pill("amber", "Expected"), checkBtn(false)],
    ];
    rows.unshift(walk
      ? ["walkin", qr ? `<span data-on-you="${p.name}">New walk-in</span>` : "New walk-in", qr ? `<span data-on-verified="${p.phone}">Scanned the seat QR</span>` : "At the desk", "Now", "Chosen with the DA", "Not assigned", tokenCell, qr ? status : pill("violet", "Checking in"), qr ? "" : `<button class="v2-btn primary sm" data-open-flow="ci" data-part="check-in">${ic("log-in")}Check in</button>`]
      : ["booked", "Fatima Al Suwaidi", "050 123 4567", "2:30 PM", "Nissan Altima SV", "Omar Hassan", tokenCell, status, qr ? "" : checkBtn(true)]);
    const purposes = ["Buy or test drive", "Drop off a car", "Pick up a car", "Service", "Sell my car", "Something else"];
    // by staff: the same form the seat QR opens, filled with the customer
    const modal = `<div class="v2-dim" data-flow-dim></div>
      <div class="v2-modal" data-flow="ci" data-flow-step="details" data-part="details">
        <div class="v2-mh"><div><h4>${walk ? "Check in a walk-in" : `Check in ${first(t)}`}</h4><p>${walk ? "The same form the seat QR opens. For a walk-in it also creates the lead." : "Found by mobile in today's bookings. The same form the seat QR opens."}</p></div><span class="v2-ib box x" data-close-flow>${ic("x")}</span></div>
        <div class="v2-mb">
          ${walk ? `<div class="v2-grid2">${inp("First name", p.name.split(" ")[0], "w-fn")}${inp("Last name", p.name.split(" ").slice(1).join(" "), "w-ln")}${inp("Mobile", p.phone, "w-mb")}${inp("Email", p.email, "w-em")}</div>
              <div class="v2-field" data-part="purpose"><label>Purpose of visit</label>${chips("purpose", purposes, ["Buy or test drive"])}</div>`
            : `<div class="v2-found" data-part="booking">${ic("calendar-check")}<div><b>Test drive &middot; 2:30 PM &middot; ${p.id}</b><small>${PCARS[p.car].title} &middot; licence uploaded before the visit</small></div><span class="v2-tag">From the booking</span></div>`}
          <div class="v2-grid2">${sel("Accompanied by", walk ? "Alone" : "Spouse")}${sel(MK.area, VISIT[t].area)}</div>
          <div data-part="finance">${sel("Do you need financing after the test drive?", FIN[0][1])}</div>
          ${toggle(true, "Recording consent", `${first(t)} agrees to record the test drive, from Start TD to the end, for AI notes and service quality. Saying no doesn't change the visit.`, "consent")}
        </div>
        <div class="v2-mf"><span class="v2-small" style="margin:0; align-self:center;">OTP goes to ${p.phone}</span><button class="v2-btn primary wide" data-step-to="ci:otp">Send OTP</button></div>
      </div>
      <div class="v2-modal sm" data-flow="ci" data-flow-step="otp" data-part="otp" hidden>
        <div class="v2-mh"><div><h4>Enter OTP and finish check-in</h4><p>We sent a 6-digit code to the mobile ${walk ? "just added" : "on the booking"}.</p></div><span class="v2-ib box x" data-close-flow>${ic("x")}</span></div>
        <div class="v2-mb center"><div class="v2-otp">${"481902".split("").map(d => `<span>${d}</span>`).join("")}</div><p class="v2-small">Sent to ${p.phone} &middot; <b>Resend OTP</b></p></div>
        <div class="v2-mf"><button class="v2-btn" data-step-to="ci:details">${ic("arrow-left")}Go back</button><button class="v2-btn primary wide" data-step-to="ci:token">Verify OTP</button></div>
      </div>
      <div class="v2-modal sm" data-flow="ci" data-flow-step="token" data-part="token" hidden>
        <div class="v2-mb center"><div class="v2-success"><span class="big">${ic("check")}</span><h4>${first(t)} is checked in</h4><p>Please take ${tk.seat.toLowerCase()}. ${walk ? "A DA is being assigned now." : `${PSTAFF.da.name.split(" ")[0]}, your DA, is being told now.`}</p></div>
          <div class="v2-tokcard" data-part="token-card"><small>Token</small><b>${tk.no}</b><span>On the ground TV now. Sent to ${first(t)}'s WhatsApp with a live tracker.</span></div>
          ${finCard(t, "need", "fin-card")}</div>
        <div class="v2-mf"><button class="v2-btn primary wide" data-go="I2">Done: show the token on the TV</button></div>
      </div>`;
    // by QR: the receptionist only watches; the answers arrive in the side panel as the customer gives them
    const answers = walk
      ? [["name", "Name and email", "", `data-on-you="${p.name} &middot; ${p.email}"`], ["purpose", "Purpose", "", `data-def-you="Not answered"`], ["acc", "Accompanied by", "", `data-def-today="Not answered"`], ["pay", "Finance", "", `data-def-today="Not answered"`], ["area", MK.area, "", `data-on-today="${VISIT[t].area}"`], ["licence", "Licence", "", `data-def-submitted="Not added: scan it at the car"`], ["rec", "Recording consent", "", ""]]
      : [["booking", "Booking", "", `data-on-verified="${p.id} &middot; 2:30 PM"`], ["acc", "Accompanied by", "", `data-def-today="Not answered"`], ["pay", "Finance", "", `data-def-today="Not answered"`], ["area", MK.area, "", `data-on-today="${VISIT[t].area}"`], ["licence", "Licence", "On file &middot; uploaded 2 days ago", ""], ["rec", "Recording consent", "", ""]];
    const tl = [["Scanned", walk ? "2:41 PM" : "2:24 PM", walk ? "done" : "", walk ? "" : `data-cls-scanned="done"`],
      ["Mobile verified", "", "", `data-cls-verified="done"`], ["Details", "", "", `data-cls-today="done"`], ["Submitted", "", "", `data-cls-submitted="done"`]];
    const side = `<aside class="v2-drawer side" data-part="live-checkin">
        <div class="v2-dh"><div class="sc-top"><span class="sc-dot ${walk ? "live" : ""}" ${walk ? "" : `data-cls-scanned="live"`} data-cls-submitted="live>done"></span><div class="sc-tt"><b ${walk ? `data-on-you="${p.name} is checking in"` : `data-on-scanned="${first(t)} is checking in"`} data-on-submitted="${first(t)} checked in &middot; token ${tk.no}">${walk ? "A walk-in is checking in" : `Waiting for ${first(t)}`}</b><small>From the QR on ${tk.seat.toLowerCase()}</small></div></div>
          <div class="sc-tl">${tl.map(([k, v, cls, a]) => `<div class="${cls}"${a ? " " + a : ""}><i>${ic("check")}</i><b>${k}</b><small>${v || "&nbsp;"}</small></div>`).join("")}</div></div>
        <div class="v2-db"><div class="sc-h"><b>Answers, synced live</b></div>
          ${answers.map(([k, label, v, hooks]) => `<div class="sc-row${v ? " got" : ""}" data-sync-row><label>${label}</label><span data-synced="${k}"${hooks ? " " + hooks : ""}>${v || "Waiting&hellip;"}</span></div>`).join("")}
          <p class="v2-small">Same questions as the staff form. Nothing to type here.</p></div>
        <div class="v2-df"><button class="v2-btn" data-mode-set="staff">${ic("user-check")}Finish it for ${walk ? "them" : first(t)}</button></div>
      </aside>`;
    return page({ who: "receptionist", active: "testdrives", crumb: crumbOf("Test Drives", "Today"), title: "Test Drives", sub: "Today's bookings and walk-ins at Al Quoz",
      cls: qr ? "with-side" : "",
      actions: `<button class="v2-btn primary" ${walk && !qr ? `data-open-flow="ci"` : ""}>${ic("user-plus")}New walk-in</button>`,
      extra: { top: `<div class="v2-note">${ic("sparkles")}<span><b>Check-in is the arrival.</b> Welcome the customer and check them in, in one go: they scan the QR on their seat, or you fill the same form with them. Every check-in gets a token on the ground TV, and the DA roster and the Yardie are told.</span></div>` },
      tools: toolsRow("Search by name, order ID or mobile", [["Filters", "list-filter"], ["Today", "chevron-down"]]),
      tabs: [["Today &middot; 6", true], ["Hub &middot; 5"], ["Virtual &middot; 1"], ["Upcoming &middot; 14"]],
      table: table(qr ? ["Customer", "Slot", "Car", "DA", "Token", "Status"] : ["Customer", "Slot", "Car", "DA", "Token", "Status", ""],
        rows.map(([trk, nm, ph, slot, car, da, tok, st, act]) => ({ hl: trk === t, cells: qr ? [cust(nm, ph), slot, car, da, tok, st] : [cust(nm, ph), slot, car, da, tok, st, act] })), "table"),
      overlay: qr ? side : modal });
  },

  // the ground TV, with the customer's own token page next to it
  I2: (t) => tvBoard(t, "i2"),

  // ------------------------------------------------------------ S · Set up: a DA, and for a booking the car
  S1: (t) => {
    const walk = t === "walkin", fn = first(t), tk = TOKEN[t], da = PDAS[0], daFirst = da.name.split(" ")[0];
    const reasons = [["circle-check", "Free now"], ["gauge", `${da.today} of ${da.max} drives today`], ["calendar-clock", "Free for the next hour"], ["languages", da.lang]];
    if (!walk) reasons.unshift(["bookmark", "Pre-assigned at booking"]);
    const rule = ["Free now: not on a drive or a break", "Under today's cap", "A free slot for the next hour", walk ? "Then the best language match, then the fewest drives today" : "The booking's pre-assigned DA first, then the fewest drives today"];
    const eta = ["free in about 5 min", "free in about 12 min", "on a break until 3:00 PM", "at today's cap"];
    const busyList = PDAS.map((d, i) => {
      const cap = d.today >= d.max, brk = d.status === "ON_BREAK", off = cap || brk;
      return `<div class="v2-da ${i === 0 ? "on" : ""} ${off ? "off" : ""}" ${off ? "" : `data-pick="da"`} ${i === 0 ? `data-part="da-row"` : ""}>
        <span class="v2-av">${inits(d.name)}<i style="background:${brk ? "#F79009" : cap ? "#98A2B3" : "#F04438"}"></i></span>
        <div class="mid"><b>${d.name}</b><small>${off ? (cap ? "At today's cap" : "On a break") : `With a customer &middot; ${eta[i]}`}</small></div>
        <div class="load"><span class="bar"><i style="width:${Math.round(d.today / d.max * 100)}%; background:${cap ? "#F04438" : "#4736FE"}"></i></span><small>${d.today}/${d.max} today</small></div></div>`;
    }).join("");
    return visit({ t, id: "S1", who: "receptionist", title: `A DA for ${fn}`, desc: `Assigned automatically when ${fn} checked in. You only step in when every DA is busy.`,
      right: `<div class="v2-seg2" data-tabs data-part="state"><button class="on" data-tab="auto">Auto-assigned</button><button data-tab="busy">Every DA busy</button></div>`,
      body: `<div data-panel="auto">
          <div class="v2-card sa-card" data-part="auto"><span class="v2-av lg">${inits(da.name)}</span>
            <div class="mid"><b>${da.name}</b><small>Assigned automatically at ${tk.at}, the moment ${fn} checked in. Pushed to ${daFirst}'s tablet with the token and seat.</small>
              <div class="v2-chips" style="margin-top:8px;">${reasons.map(([icon, txt]) => `<span class="v2-tag">${ic(icon)}${txt}</span>`).join("")}</div></div>
            <button class="v2-btn sm">${ic("repeat")}Change DA</button></div>
          <div class="v2-card" data-part="rule"><div class="v2-sec" style="margin-top:0;">How the rule picks a DA</div><ol class="sa-rule">${rule.map(r => `<li>${r}</li>`).join("")}</ol></div>
          <div class="v2-note" data-part="tv-note">${ic("tv")}<span>The ground TV now shows <b>${tk.no} &middot; ${daFirst} is coming to you</b>.${walk ? "" : " The Yardie is already bringing the car."}</span></div>
        </div>
        <div data-panel="busy" hidden>
          <div class="v2-alert amber" data-part="busy">${ic("hourglass")}<span>Every DA is busy or at their cap. ${tk.no} is next in line, about 5 min. Pick the next free DA, or let the rule assign when one frees up.</span></div>
          <div class="v2-card" data-part="pick">${busyList}</div>
        </div>`,
      footer: foot(t, "S1", "Exit: DA assigned, automatically or by hand", [[walk ? "Next: the handshake" : "Next: the car from the yard", walk ? "T1" : "S2", "primary", "arrow-right", true]]),
      leadOpts: { pill: ["green", "Checked in"] },
      gptOpts: { cards: [["Queue", "list-ordered", `<p>${tk.no} is ${walk ? "third" : "second"} in today's queue. Bookings at their slot time go first, then tokens in order.</p>`]] } });
  },
  S2: (t) => tvBoard(t, "s2"),

  // ------------------------------------------------------------ T · Tailor
  T1: (t) => {
    const p = PEOPLE[t], tk = TOKEN[t];
    // a booking: the car was chosen on the call and is at the hub, so the handshake is the start of the TD
    if (t === "booked") {
      const c = PCARS[p.car], yard = PSTAFF.prep.name.split(" ")[0];
      const ctx = [pill("violet", "Booked"), pill("green", `${ic("map-pin")}Car at the hub, ${c.bay}`), CTX.mode === "qr" ? pill("violet", `${ic("qr-code")}Checked in by QR`) : pill("grey", p.language)];
      return daStep(t, { id: "T1", ordered: true, title: `Meet ${first(t)}: the handshake starts the drive`, desc: "The car was chosen on the call and is at the hub: no car finding. Meet them, walk to the car together and start. That creates the TD record and turns the recording on.",
        leadOpts: { pill: ["violet", "Car at the hub"] },
        body: `<div class="v2-wait" data-part="wait-card"><span class="v2-av lg">${inits(p.name)}</span>
            <div class="mid"><b>${p.name}</b> <span class="v2-muted">is waiting at ${tk.seat.toLowerCase()} &middot; token ${tk.no}</span><div class="v2-chips" style="margin-top:6px;">${ctx.join("")}</div>
              <p class="v2-small" style="margin:6px 0 0;">${ic("bell-ring")} Parked at ${c.bay} at 2:35 PM by ${yard} (Yardie).</p></div>
            <div class="v2-timer"><b>1:48</b><small>since the car arrived</small></div></div>
          <div class="v2-card" data-part="summary"><div class="v2-kvs two" style="margin-bottom:0;">${kv("Car", `${c.title} &middot; ${c.plate}`)}${kv("Driver", `${p.name} &middot; licence checked after the consent`)}</div></div>
          <div class="v2-card"><div class="v2-grid2" data-part="odo">${inp("Odometer at start (km)", "18,412", "t1-odo")}<div class="v2-field"><label>Fuel</label>${chips("fuel", ["1/4", "1/2", "3/4", "Full"], ["3/4"])}</div></div>
            ${row("Route", chips("route", ["City loop &middot; 15 min", "Highway loop &middot; 20 min"], ["City loop &middot; 15 min"]), "route")}</div>
          ${toggle(true, "Recording starts with the drive", `${first(t)} agreed at check-in. Live notes and transcription run from this tap until the drive ends.`, "recording")}`,
        footer: foot(t, "T1", "Exit: met, TD record created, recording on", [["Met: start TD and recording", "O3", "primary", "play"]]),
        cards: [["Why one tap", "handshake", `<p>${first(t)} chose the car on the call and it is at the hub. Meeting them is the start of the drive: no car finding.</p>`], ["Next", "pen-line", `<p>${first(t)} signs the TD consent on your tablet, then you check the licence, then the walkaround.</p>`]] });
    }
    const ctx = [pill("amber", "Walk-in"), pill("grey", p.language), pill("grey", "Drive-by")];
    if (CTX.mode === "qr") ctx.push(pill("violet", `${ic("qr-code")}Checked in by QR`));
    return page({ who: "da", active: "testdrives", crumb: crumbOf("Test Drives", "My queue"), title: "My queue", sub: `${PSTAFF.da.name} &middot; 6 of 10 test drives today`,
      actions: pill("green", `${ic("circle-dot")}Available`),
      extra: { top: `<div class="v2-wait" data-part="wait-card"><span class="v2-av lg">${inits(p.name)}</span>
          <div class="mid"><b>${p.name}</b> <span class="v2-muted">is waiting at ${tk.seat.toLowerCase()} &middot; token ${tk.no}</span><div class="v2-chips" style="margin-top:6px;">${ctx.join("")}</div>
            <p class="v2-small" style="margin:6px 0 0;">${ic("sparkles")} Walked in at 2:41 PM. No booking, so car finding starts from scratch.</p></div>
          <div class="v2-timer"><b>1:48</b><small>since assigned</small></div>
          <button class="v2-btn primary lg" data-go="T2" data-part="met">${ic("handshake")}I've met ${first(t)}</button></div>`,
        bottom: `<div class="v2-note pink" style="margin-top:12px;" data-part="alert-note">${ic("timer")}<span>The handshake happens here, after the DA is assigned, never at check-in. Not met within 5 min: the receptionist and the manager are alerted.</span></div>` },
      tabs: [["Later today", true]],
      table: table(["Customer", "Slot", "Car", "Status"], [{ cells: [cust("Maryam Rashidi", "BK-88177"), "4:15 PM", "Hyundai Tucson", pill("amber", "Expected")] }, { cells: [cust("Rashid Al Falasi", "Follow-up"), "5:30 PM", "Toyota Camry GLE", pill("grey", "Follow-up call")] }], "later") });
  },

  // walk-in: needs as stepper pills, the same component as Discovery on the call, ending in the matches
  T2: (t) => {
    if (t === "walkin") {
      const compare = `<button class="v2-btn sm" data-open="cmpx" data-part="compare">${ic("git-compare")}Compare</button>`;
      return daStep(t, { id: "T2", title: `Find the right car with ${first(t)}`, desc: "The same quick filters as Discovery on the call, asked in conversation. Then the cars that match, from live stock at this hub.",
        right: `<div data-part="prefill"><span class="v2-tag">Captured in conversation</span></div>`,
        body: pillSteps(needSteps(t, { who: "Family with kids", pay: "Cash", pickN: 1, compare })),
        footer: foot(t, "T2", "Exit: one or two cars picked", [["Nothing fits: share shortlist", "N4", "", "share-2"], ["Next: why this car", "T4", "primary", "arrow-right", true]]),
        cards: [["Ask next", "message-square", `<p>&ldquo;How many people usually ride with you, and what do you drive most: city or long trips?&rdquo;</p>`], ["From before the visit", "history", `<p>First visit, no app account. Came in as a drive-by.</p>`]],
        overlay: cmpModal(["c4", "c3"]) });
    }
    const p = PEOPLE[t], n = p.needs;
    const body = `<div class="v2-card" data-part="needs">
        ${row("Budget", chips("budget", MK.budgets, [n.budget]))}
        ${row("Body type", chips("multi", ["Sedan", "SUV", "Hatchback", "Pickup"], n.body))}
        ${row("Transmission", chips("trans", ["Automatic", "Manual"], [n.trans]))}
        ${row("Drive", chips("drive", ["2WD", "4WD"], [n.drive]))}
        ${row("Mostly for", chips("multi", MK.usage, n.usage))}
        ${row("Must-haves", chips("multi", ["Apple CarPlay", "Rear camera", "7 airbags", "Adaptive cruise", "Sunroof", "7 seats"], n.must))}
        ${row("Paying by", chips("pay", ["Cash", "Finance", "Not sure yet"], ["Finance"]))}
      </div>`;
    return daStep(t, { id: "T2", title: "What are you looking for?", desc: "Prefilled from the booking and app browsing. Confirm or change; the booked car stays pinned next.",
      right: `<div data-part="prefill"><span class="v2-tag ai">${ic("sparkles")}Prefilled</span></div>`,
      body, footer: foot(t, "T2", "Exit: budget and body type captured", [["Show matching cars", "T3", "primary", "arrow-right", true]]),
      video: videoPanel({ main: vtdTile(), pip: "You &middot; Sara", share: "Sharing your screen" }) });
  },

  // video TD only: a walk-in's matches are the last pill of T2
  T3: (t) => {
    const p = PEOPLE[t];
    const rows = p.picks.map(([cid, match, why], i) => {
      const booked = cid === p.car;
      return carRow(cid, { check: true, selected: booked, oid: booked ? p.id : null, part: i === 0 ? "car-rows" : null,
        badge: `${booked ? `<span class="v2-badge booked">Booked</span>` : ""}<span class="v2-badge match">${match}% match</span>`,
        sub: `${money(PCARS[cid].price)} &middot; ${PCARS[cid].km} &middot; ${why}` });
    }).join("");
    return daStep(t, { id: "T3", title: "Cars for today", desc: `Shown to ${first(t)} over screen share.`,
      right: `<div class="v2-btnrow" style="margin:0;"><button class="v2-btn" data-open="cmpx" data-part="compare">${ic("git-compare")}Compare</button></div>`,
      body: rows, footer: foot(t, "T3", "Exit: a car chosen", [["Nothing fits: share shortlist", "N4", "", "share-2"], ["Next: why this car", "T4", "primary", "arrow-right", true]]),
      video: videoPanel({ main: vtdTile(), pip: "You &middot; Sara", share: "Sharing your screen" }),
      overlay: cmpModal(["c2", "c1"]) });
  },

  // the promise: for a walk-in, in the middle column of the visit page, in three columns
  T4: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    if (!isHub(t)) {
      const promise = `<div class="v2-promise" data-part="promise">${[["clipboard-check", "Inspected", "Full inspection report for this car, shared with you."], ["shield-check", "Warranty", "Included with the car. Terms apply."], ["rotate-ccw", "Return window", "Change your mind within the return window."], ["landmark", "Finance", `From about ${money(Math.round(c.price / 52))} a month. Example only.`]].map(([icon, k, s]) => `<div>${ic(icon)}<b>${k}</b><span>${s}</span></div>`).join("")}</div>`;
      return vtdVisit({ id: "T4", title: `${c.title}: why you can trust it`, desc: `Shared on screen with ${first(t)}. Inspection: passed, 2 small marks noted (example).`,
        body: promise, footer: foot(t, "T4", "Exit: customer wants to see the car", [["Wants to think", "N4", "", "clock"], ["Show the car on camera", "T5", "primary", "video"]]),
        video: videoPanel({ main: vtdTile(), pip: "You &middot; Sara", share: "Sharing your screen" }) });
    }
    const insp = [["Engine and gearbox", "Passed"], ["Brakes and suspension", "Passed"], ["Body and paint", "2 small marks"], ["Electrics and AC", "Passed"], ["Accident history", "None reported"]];
    const okv = (v) => v === "Passed" || v === "None reported";
    const item = (icon, k, sub, tone = "ok") => `<li class="${tone}">${ic(icon)}<span>${k}<small>${sub}</small></span></li>`;
    const pre = VISIT[t].pre === "Eligible";
    const body = `<div class="qp-hero" data-part="car"><span class="ph" style="background:${c.color}">${ic("car")}</span>
        <div class="mid"><b>${c.title}</b><small>${money(c.price)} &middot; ${c.km} &middot; ${c.body}, ${c.drive} &middot; ${c.bay} when prepped</small></div>
        <div class="qp-score"><b>4 of 5</b><small>checks clean</small></div></div>
      <div class="qp-grid">
        <div class="qp-col" data-part="inspection"><div class="qp-h">${ic("clipboard-check")}Inspected</div>
          <ul class="qp-list">${insp.map(([k, v]) => item(okv(v) ? "circle-check" : "info", k, v, okv(v) ? "ok" : "note")).join("")}</ul>
          <a class="v2-link">${ic("file-text")}Full report</a></div>
        <div class="qp-col" data-part="warranty"><div class="qp-h">${ic("shield-check")}Warranty and return</div>
          <ul class="qp-list">${item("shield-check", "Warranty", "Included with the car. Terms apply")}${item("rotate-ccw", "Return window", "Change your mind after you buy")}${item("history", "Service history", "Shared with the report")}${item("badge-check", "Fixed price", "No haggling")}</ul></div>
        <div class="qp-col" data-part="finance"><div class="qp-h">${ic("landmark")}Finance</div>
          <div class="qp-big">${money(Math.round(c.price / 52))}<small>a month, about (example)</small></div>
          <ul class="qp-list">${item("wallet", "Paying by", "Cash, from the needs")}${item("file-check", "Pre-approval", pre ? "Eligible" : "Not checked yet: 2 minutes", pre ? "ok" : "note")}</ul></div>
      </div>
      <div class="v2-note" data-part="turn">${ic("hand")}<span>Turn the tablet to ${first(t)} and talk it through. Everything here is this car's own.</span></div>`;
    return daStep(t, { id: "T4", title: `Why this ${c.title.replace(/^\d{4} /, "")}`, desc: "The reasons to trust the car, before the drive.",
      body, footer: foot(t, "T4", "Exit: the customer wants to drive now", [["Wants to think: share shortlist", "N4", "", "clock"], ["Drive it now: book the slot", "T5", "primary", "arrow-right", true]]),
      cards: [["Say this", "message-square", `<p>&ldquo;Every car is inspected before it's listed. This one passed 4 of 5 checks clean; the 2 small marks are on the report.&rdquo;</p>`], ["If they ask", "lightbulb", `<p>Warranty and return terms are on the car page. Finance can wait until after the drive.</p>`]] });
  },

  // walk-in: one tap books the current slot, creates the order for the TD and requests the prep
  T5: (t) => {
    const p = PEOPLE[t], yard = PSTAFF.prep.name;
    if (!isHub(t)) {
      return vtdVisit({ id: "T5", title: "Car on camera", desc: `${yard.split(" ")[0]} has the Camry at Studio 1 with the yard camera on.`,
        body: `<div class="v2-card" data-part="drives"><div class="v2-kvs">${kv("Car", PCARS[p.car].title)}${kv("Where", "Studio 1")}${kv("Yard helper", `${yard}, camera on`)}${kv("Order", `${p.id} (unchanged)`)}</div></div>`,
        footer: foot(t, "T5", "Exit: car confirmed and on camera", [["Start the walkaround", "O5", "primary", "video"]]) });
    }
    const c = PCARS.c4, tk = TOKEN[t];
    const slots = [["2:00 PM", "Past", "past"], ["2:30 PM", "Past", "past"], ["3:00 PM", "Now &middot; 2 left", "on"], ["3:30 PM", "2 left"], ["4:00 PM", "3 left"], ["4:30 PM", "1 left", "low"]];
    const body = `<div class="bk-card" data-part="slot"><span class="ic">${ic("calendar-clock")}</span><div class="mid"><b>1 &middot; The current slot</b><small>Today at ${MK.hub} &middot; hub TD &middot; picked for you, so the drive starts as soon as the car is here</small>
        <div class="v2-slots six">${slots.map(([s, l, cls]) => `<button class="v2-slot ${cls === "past" ? "full" : cls || ""}" ${cls === "past" ? "disabled" : `data-pick="slot"`}>${s}<span>${l}</span></button>`).join("")}</div></div></div>
      <div class="bk-card" data-part="order"><span class="ic">${ic("receipt-text")}</span><div class="mid"><b>2 &middot; The order, booked for a TD</b><small>Created in OMS with the car and ${first(t)}'s details from check-in</small>
        ${carRow("c4", { oid: "BK-89004 (new)", sub: `${money(c.price)} &middot; ${c.km} &middot; hub TD today, 3:00 PM`, badge: `<span class="v2-badge booked">TD booked</span>`, right: " " })}</div></div>
      <div class="bk-card" data-part="prep"><span class="ic">${ic("wrench")}</span><div class="mid"><b>3 &middot; Prep request to the Yardie</b><small>${yard}, Yardie &middot; yard row C, spot 14 &rarr; hub, ${c.bay} &middot; usually 12 min</small>
        <div class="v2-chips" style="margin-top:6px;">${["Quick wash", "Wipe the inside", "Fuel at least half", "Tyre pressure"].map(x => `<span class="v2-chip">${x}</span>`).join("")}</div></div></div>`;
    return daStep(t, { id: "T5", title: "Book the drive now", desc: `One tap books the current slot, creates order BK-89004 for the TD and sends the Yardie the prep request. ${first(t)} waits on token ${tk.no} until the car is at the hub; you are told when it arrives.`,
      body, footer: foot(t, "T5", "Exit: slot booked, order created, prep requested", [["Car is in another TD: pick again", "T2", "", "rotate-ccw"], ["No room now: book later today", "N6", "", "calendar"], ["Book, create order, request prep", "O1", "primary", "check"]]),
      cards: [["Yard", "warehouse", `<p>${yard} (Yardie) gets the prep request the moment you book. Usual time from the yard to the hub: 12 min.</p>`], ["Licence", "id-card", `<p>Not needed to book. You check it at the car, after Start TD and the consent.</p>`]] });
  },

  // ------------------------------------------------------------ O · On the road
  // the Yardie preps the chosen car and brings it from the yard; the ground TV's car column follows each tap
  O1: (t) => tvBoard(t, "o1"),

  // Start TD for a walk-in: the DA meets the customer again once the car is at the hub, and starts the recording.
  // A booking starts at the handshake (T1).
  O2: (t) => {
    const p = PEOPLE[t], walk = t === "walkin", tk = TOKEN[t], c = PCARS[walk ? "c4" : p.car], yard = PSTAFF.prep.name.split(" ")[0];
    const meet = walk
      ? `<div class="v2-wait" data-part="meet-again"><span class="v2-av lg">${inits(p.name)}</span>
          <div class="mid"><b>${p.name}</b> <span class="v2-muted">is waiting at ${tk.seat.toLowerCase()} &middot; token ${tk.no}</span>
            <p class="v2-small" style="margin:6px 0 0;">${ic("bell-ring")} Told at 3:05 PM: the ${c.title.replace(/^\d{4} /, "")} is at the hub, ${c.bay}, brought by ${yard} (Yardie). Go back to ${first(t)} and start the drive together.</p></div>
          <div class="v2-timer"><b>3 min</b><small>since the car arrived</small></div></div>`
      : `<div class="v2-card" data-part="meet-again"><div class="v2-row"><label>With you</label><div><b class="v2-b">${first(t)} &middot; token ${tk.no}</b></div></div><div class="v2-row"><label>Car</label><div><b class="v2-b">${c.title} &middot; at the hub, ${c.bay} since 2:35 PM</b></div></div></div>`;
    return daStep(t, { id: "O2", ordered: true, title: walk ? `Back to ${first(t)}: start the test drive` : "Start the test drive", desc: "Starting creates the TD record (car, plate, time and odometer) and turns the recording on. The consent and the licence check come next.",
      body: `${meet}
        <div class="v2-card" data-part="summary"><div class="v2-kvs two" style="margin-bottom:0;">${kv("Car", `${c.title} &middot; ${c.plate}`)}${kv("Driver", `${p.name} &middot; licence checked next (O4)`)}</div></div>
        <div class="v2-card"><div class="v2-grid2" data-part="odo">${inp("Odometer at start (km)", walk ? "31,214" : "18,412", "o-odo")}<div class="v2-field"><label>Fuel</label>${chips("fuel", ["1/4", "1/2", "3/4", "Full"], ["3/4"])}</div></div>
          ${row("Route", chips("route", ["City loop &middot; 15 min", "Highway loop &middot; 20 min"], [walk ? "Highway loop &middot; 20 min" : "City loop &middot; 15 min"]), "route")}</div>
        ${toggle(true, "Recording starts with the drive", `${first(t)} agreed at check-in. Live notes and transcription run from this tap until the drive ends.`, "recording")}`,
      footer: foot(t, "O2", "Exit: TD record created, recording on", [["Start TD and recording", "O3", "primary", "play"]]),
      cards: [["Checks", "list-checks", `<p>Car at the hub. Not in another TD. Recording consent given at check-in.</p>`], ["Next", "pen-line", `<p>${first(t)} signs the TD consent, then you check the licence, then the walkaround.</p>`]] });
  },

  // the consent sits in the middle column of the visit page; the DA hands the tablet over to sign
  O3: (t) => {
    const p = PEOPLE[t], walk = t === "walkin";
    const c = PCARS[walk ? "c4" : p.car];
    const body = `<div class="cs-strip" data-part="details">${kv("Driver", `${p.name}<small>Licence checked next</small>`)}${kv("Car", `${c.title}<small>${c.plate}</small>`)}${kv("Started", `${START[t]}<small>${walk ? "31,214" : "18,412"} km</small>`)}${kv("With", `${PSTAFF.da.name}<small>CARS24, rides along</small>`)}</div>
      <div class="cs-grid">
        <div class="v2-card cs-col" data-part="terms"><div class="cs-h">${ic("file-text")}What ${first(t)} agrees to</div>
          <ul class="cs-terms"><li>I hold a valid driving licence and I am fit to drive.</li><li>I will follow UAE traffic laws and speed limits.</li><li>I am responsible for traffic fines during this drive.</li><li>A CARS24 associate rides with me for the whole drive.</li><li>The drive is recorded, as agreed at check-in.</li></ul>
          <p class="v2-small">Example terms for the prototype. One consent per car.</p></div>
        <div class="v2-card cs-col" data-part="signature"><div class="cs-h">${ic("pen-line")}Sign here</div>
          <div class="v2-sig cs-sig"><canvas id="sig" aria-label="Signature pad"></canvas><div class="line"></div><div class="sig-ph">Sign with your finger</div></div>
          <div class="v2-agree" data-part="agree"><label><input type="checkbox" id="agree"> I have read and agree to these terms.</label><button class="v2-btn sm" data-sig-clear>${ic("eraser")}Clear</button></div></div>
      </div>`;
    return daStep(t, { id: "O3", ordered: true, title: "Test drive consent", desc: `Hand the tablet to ${first(t)}. They check the details, sign and tick; the licence check comes next.`,
      right: `<span class="v2-tag" data-part="handover">${ic("hand")}${first(t)} signs on this tablet</span>`,
      body, footer: foot(t, "O3", `<span id="sig-hint">Sign and tick the box to continue</span>`, [["Customer declines: cancel the TD", "N1", "", "circle-x"], ["Signed: check the licence", "O4", "primary", "arrow-right", true, `id="sig-go" disabled`]]),
      cards: [["Say this", "message-square", `<p>&ldquo;This covers today's drive in this car. If we try another car, you'll sign for that one too.&rdquo;</p>`], ["Signed copy", "file-check", `<p>The signed PDF is saved to Documents and sent to ${first(t)} on WhatsApp.</p>`]] });
  },

  // DL verify: the DA checks the licence after the consent, the last check before the car moves
  O4: (t) => {
    const p = PEOPLE[t], walk = t === "walkin", qr = CTX.mode === "qr";
    const got = walk ? (qr ? "from the seat QR form" : "scanned now") : "uploaded 2 days ago";
    const desc = walk ? (qr ? `${first(t)} added both sides on the seat QR form. Check the photo against them.` : "Scan both sides now. The licence is linked to the contact once verified.") : "Uploaded before the visit. Check the photo against the customer.";
    return daStep(t, { id: "O4", ordered: true, title: "Check the licence before the car moves", desc,
      body: `<div class="v2-uploads" data-part="upload">
          ${["Front", "Back"].map(side => `<div class="v2-drop done"><span class="v2-dl">${ic("id-card")}<i>${side}</i></span><div><b>DL ${side.toLowerCase()} &middot; ${got}</b><small>dl-${side.toLowerCase()}.jpg &middot; 1.2 MB</small></div><span class="v2-ib">${ic("refresh-cw")}</span></div>`).join("")}
        </div>
        <div class="v2-card" data-part="ocr"><div class="v2-sec" style="margin-top:0;">Read from the licence</div>
          <div class="v2-kvs">${kv("Name", p.name)}${kv("Licence no.", p.dl)}${kv("Expiry", walk ? "14 Mar 2027" : "02 Jun 2028")}${kv("Issued by", "Dubai RTA (example)")}</div>
          ${walk && p.homeDl ? `<div class="v2-row" style="margin-top:6px;"><label>Home-country DL</label><div><b class="v2-b">${p.homeDl}</b></div></div>` : ""}
        </div>
        <div class="v2-card" data-part="checks"><div class="v2-sec" style="margin-top:0;">Checks</div>
          <div class="v2-checks"><span class="ok">${ic("circle-check")}Name matches the Emirates ID</span><span class="ok">${ic("circle-check")}Not expired</span><button class="v2-check2" data-zone>${ic("square")}Photo matches the customer (DA)</button></div></div>`,
      footer: foot(t, "O4", "Exit: DL verified, or the drive is cancelled", [["No valid DL: cancel the drive", "N6", "", "calendar"], ["Verified: on to the walkaround", "O5", "primary", "arrow-right", true]]),
      cards: [["OCR", "scan-line", `<p>All fields read with high confidence. ${walk ? (p.homeDl ? "Home-country DL noted for the record." : qr ? "Read from the photos on the seat QR form." : "Read from the scan.") : "Matches the copy uploaded before the visit."}</p>`], ["Why here", "info", `<p>The TD is started and signed. The licence is the last check before the car moves.</p>`]] });
  },

  O5: (t) => {
    const p = PEOPLE[t];
    const c = PCARS[t === "walkin" ? "c4" : p.car];
    const zones = [["Exterior", "scan", "Paint and panels, tyres, lights", true], ["Interior", "armchair", "Seats, screen and CarPlay, rear seats", true], ["Under the bonnet", "wrench", "Engine bay, service history", false], ["Boot", "luggage", "Boot space, spare wheel", false]];
    const body = `<div class="v2-zones" data-part="zones">${zones.map(([nm, icon, pts, d]) => `<button class="v2-check ${d ? "done" : ""}" data-zone>${ic(icon)}<b>${nm}</b><span>${pts}</span></button>`).join("")}</div>`;
    if (!isHub(t)) {
      return vtdVisit({ id: "O5", title: `Walk round the ${c.title.replace(/^\d{4} /, "")}`, desc: "The yard helper moves the camera; tick each zone as you cover it.", body,
        footer: foot(t, "O5", "Exit: walkaround and drive clip done", [["Play drive clip and wrap up", "O7", "primary", "play"]]),
        video: videoPanel({ main: carTile("c2"), pip: first(t) }) });
    }
    return daStep(t, { id: "O5", ordered: true, title: `Walk round the ${c.title.replace(/^\d{4} /, "")}`, desc: "Tap a zone once it's covered. The recording is on, so the talk around the car is in the notes.", body,
      footer: foot(t, "O5", "Exit: zones covered", [t === "walkin" ? ["Goes off the car: end this TD, find another", "T2", "", "rotate-ccw"] : ["Goes off the car: end this TD", "O7", "", "flag"], ["Start driving", "O6", "primary", "car"]]),
      cards: [["Say at the bonnet", "message-square", `<p>Point to the service stamps. The inspection found no leaks.</p>`], ["Customer asked", "message-circle", `<p>&ldquo;Does it have CarPlay?&rdquo; Yes, wired.</p>`]] });
  },

  O6: (t) => {
    const p = PEOPLE[t];
    const cid = t === "walkin" ? "c4" : p.car;
    const tags = [["Price", "vs other cars"], ["Mileage", "km on the clock"], ["Condition", "marks, wear"], ["Features", "missing something"], ["Finance", "EMI, down payment"], ["Other", "anything else"]];
    const other = t === "walkin" ? "Tucson" : "Camry";
    return daStep(t, { id: "O6", ordered: true, title: "Test drive live", desc: "Drive, tag objections as they come up, and keep an eye on the live transcription.",
      body: carRow(cid, { oid: t === "walkin" ? "BK-89004" : p.id, sub: `Today, ${START[t]} &middot; Agent: Omar Hassan`, badge: `<span class="v2-badge live">${ic("circle-dot")}LIVE</span>`, part: "live-car", right: " " })
        + `<div class="v2-tx" data-part="transcript"><div class="v2-tx-h"><span>Live note &amp; transcription</span><span class="t"><i></i>00:12:40</span></div>
          <div class="v2-tx-b"><p><span class="ts">12:02</span><b>${first(t)}:</b> It's smooth. How does it compare with the ${other} on price?</p><p><span class="ts">12:20</span><b>Omar:</b> The ${other} costs more; this one has fewer km and a warranty.</p><p><span class="ts">12:38</span><b>${first(t)}:</b> Can I get it on monthly payments?</p></div></div>
        <div class="v2-sec">Tap when an objection comes up</div>
        <div class="v2-tags" data-part="objections">${tags.map(([k, s], i) => `<button class="v2-tagbtn ${i === 0 ? "on" : ""}" data-pick="multi"><b>${k}</b><span>${s}</span></button>`).join("")}</div>`,
      footer: foot(t, "O6", "Exit: back at the hub", [["Report an incident", null, "", "triangle-alert"], ["Back at the hub: end drive", "O7", "primary", "flag"]]),
      cards: [["Try now", "zap", `<p>Highway stretch: cruise control and lane assist. Parking: rear camera.</p>`], ["Suggested answer", "sparkles", `<p>Monthly payments: pre-approval looks eligible. Offer an EMI estimate at the debrief.</p>`]] });
  },

  O7: (t) => {
    if (!isHub(t)) {
      return vtdVisit({ id: "O7", title: "Wrap up the video viewing", desc: "Walkaround done, drive clip played. 24 min on the call.",
        body: `<div class="v2-card" data-part="end-form">${row(`${first(t)}'s reaction`, chips("react", ["Loved it", "It's okay", "Not for me"], ["Loved it"]))}${row("Wants a real drive?", chips("rd", ["Yes, at a hub", "No need"], ["Yes, at a hub"]))}</div>`,
        footer: foot(t, "O7", "Exit: call wrapped up", [["End video TD", "N1", "primary", "flag"]]) });
    }
    const p = PEOPLE[t], walk = t === "walkin";
    const cid = walk ? "c4" : p.car;
    return daStep(t, { id: "O7", ordered: true, title: "End the drive", desc: "Recorded as TD CONDUCTED for this car. The recording stops; the TV shows the customer back, wrapping up.",
      body: carRow(cid, { oid: walk ? "BK-89004" : p.id, sub: `Today, ${START[t]} &middot; 19 min &middot; Agent: Omar Hassan`, badge: `<span class="v2-badge done">TD done</span>`, part: "done-car", right: " " })
        + `<div class="v2-card" data-part="end-form"><div class="v2-grid2">${inp("Odometer at end (km)", walk ? "31,236" : "18,431", "o-odo2")}<div class="v2-field"><label>Duration</label><div class="v2-select ph"><span>19 min</span></div></div></div>
          ${row("Customer's reaction", chips("react", ["Loved it", "It's okay", "Not for me"], ["Loved it"]), "reaction")}</div>`,
      footer: foot(t, "O7", "Exit: TD conducted", walk ? [["Another car", "O2", "", "rotate-ccw"], ["Done driving: debrief", "N1", "primary", "arrow-right", true]] : [["Another car on the booking: start it", "O3", "", "car"], ["Done driving: debrief", "N1", "primary", "arrow-right", true]]),
      cards: [["Next car", "car", `<p>${walk ? "No second car queued." : "One car on this booking. A second booked car would start here, then get its own consent; the licence is already verified."}</p>`]] });
  },

  // ------------------------------------------------------------ N · Next step
  N1: (t) => {
    const hub = isHub(t);
    const notes = t === "walkin" ? "Liked the space and the rear camera. Paying cash; wants the service history before reserving." : t === "vtd" ? "Liked the clean interior and adaptive cruise. Wants to feel it on the road before deciding." : "Customer liked the car. Wants EMI options and confirmation of the scratch repair before payment.";
    const decs = [["Ready to buy", "badge-check", "Take the token now", "good", "N2"], ["Needs time", "clock", "Agree a date", "warn", "N4"], [t === "vtd" ? "Hub drive" : "Another car", "car", t === "vtd" ? "Book a real drive" : "Book another drive", "warn", "N6"], ["Not interested", "circle-x", "Record the reason", "bad", "N7"]];
    const suggested = t === "vtd" ? 2 : 0;
    return daStep(t, { id: "N1", ordered: true, title: "Disposition form", desc: "Prefilled from the recording since Start TD. Edit anything that's off.",
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
        ${foot(t, "N5", "Exit: one call outcome", [["Not interested", "N7", "", "circle-x"], ["Book another drive", "N6", "", "calendar"], ["Send payment link", "N2", "primary", "link"]])}
      </section>
      ${gpt("rm", { cards: [["Visit summary", "sparkles", `<p>Liked it; price is the question. A shortlisted car dropped AED 1,000 since the visit.</p>`]] })}
    </div>`;
    return shell({ active: "tasks", who: "rm", crumb: crumbOf("Tasks", "TD follow-up", p.name), body });
  },

  N6: (t) => {
    const p = PEOPLE[t];
    const car = t === "walkin" ? PCARS.c3 : PCARS.c2;
    return daStep(t, { id: "N6", ordered: true, title: t === "vtd" ? "Book a hub test drive" : "Book another drive", desc: t === "vtd" ? "Khalid wants to drive the Camry. Same slot picker as P5." : `${car.title} for ${first(t)}. Same slot picker as P5.`,
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
    const rows = [["BOOKED TODAY", 24, "", ""], ["CHECKED IN", 26, "incl. 7 walk-ins", ""], ["DA ASSIGNED", 26, "1 min &middot; 3 by hand", ""], ["MET CUSTOMER", 25, "4 min", "late"], ["CAR AT HUB", 23, "8 min", ""], ["TD STARTED", 21, "3 min", ""], ["TD CONSENT SIGNED", 20, "1 min", ""], ["DL VERIFIED", 19, "2 min", ""], ["TD CONDUCTED", 17, "18 min", ""], ["TOKEN PAID", 5, "9 min", "good"]];
    return page({ who: "manager", active: "oversight", manager: true, crumb: crumbOf("Manager Oversight", "TD funnel"), title: "Test drive funnel", sub: "Al Quoz &middot; today &middot; every hexagon on the PISTON board is a row here",
      actions: pill("green", `${ic("circle-dot")}Live`),
      extra: { top: `<div class="v2-alert" data-part="alert">${ic("triangle-alert")}<span>B-07 Fatima Al Suwaidi has waited 7 min since check-in for a handshake (target 5 min)</span><button class="v2-btn sm" data-go="S1">${ic("users")}Reassign DA</button></div>
          <div class="v2-kpis" data-part="kpis"><div><b>26</b><span>Visits</span></div><div><b>5</b><span>Token paid</span></div><div><b>19%</b><span>Visit to token</span></div><div><b>6 min</b><span>Arrival to handshake, median</span></div><div data-part="by-qr"><b>${CTX.market === "au" ? "19 of 26" : "4 of 26"}</b><span>Checked in by seat QR</span></div></div>
          <div class="v2-card" data-part="funnel"><div class="v2-funnel"><div class="frow head"><span>STATE</span><span></span><span>COUNT</span><span>FROM LAST STATE</span></div>
            ${rows.map(([nm, n, tm, tone]) => `<div class="frow"><span><span class="hex ${tone === "good" ? "good" : ""}">${nm}</span></span><span class="bar"><i class="${tone === "good" ? "good" : ""}" style="width:${Math.round(n / 26 * 100)}%"></i></span><span class="n">${n}</span><span class="t ${tone === "late" ? "late" : ""}">${tm}${tone === "late" ? " &middot; target 5" : ""}</span></div>`).join("")}</div>
            <div class="v2-chips" style="margin-top:10px;" data-part="outcomes"><span class="hex good">TOKEN PAID 5</span><span class="hex warn">FOLLOW-UP SCHEDULED 11</span><span class="hex warn">NEW TD BOOKED 3</span><span class="hex bad">DROPPED 3</span></div></div>` } });
  },
};

// ================================================================== the ground TV (hospital logic)
// Everyone in the hub sees it. Each row is a token; its status, DA and car change only when staff act.
// The row of this track's customer carries data-on-EVENT and data-cls-EVENT hooks, fired by staff actions on the
// stage (see mountSync in piston.js): assigned, yard, met, chosen, prepped, picked, hub, drive.
const carShort = (cid) => PCARS[cid].title.replace(/^\d{4} /, "").split(" ").slice(0, 2).join(" ");
const boardName = (t) => { const [f, ...rest] = PEOPLE[t].name.split(" "); return `${f} ${(rest.join(" ")[0] || "")}.`; };
const TV_TONES = [["wait", "Waiting for a DA"], ["coming", "DA coming to you"], ["with", "With your DA"], ["ready", "Car ready"], ["live", "On test drive"]];
function tvBoard(t, ctx) {
  const walk = t === "walkin", p = PEOPLE[t], tk = TOKEN[t];
  const da = PDAS[0].name.split(" ")[0], daOf = (i) => i == null ? "&mdash;" : PDAS[i].name.split(" ")[0];
  const carB = carShort(PEOPLE.booked.car), carW = carShort("c4");
  // where this customer's row starts, and how each staff action moves it: { event: text } or { event: [text, class swap] }
  const F = {
    i2: walk
      ? { tone: "wait", status: "Waiting for a DA", da: "&mdash;", car: "Chosen with the DA", wait: "1 min",
          hooks: { status: { assigned: [`${da} is coming to you`, "wait>coming"], met: [`With ${da} &middot; car finding`, "coming>with"], chosen: ["Waiting for the car", "with>wait"], hub: [`Car ready &middot; ${da} is coming`, "wait>ready"], drive: ["On test drive", "ready>live"] },
            da: { assigned: da }, car: { chosen: `${carW} &middot; being prepped`, hub: `${carW} &middot; at the hub, Bay 1`, drive: `${carW} &middot; on the road` }, wait: { met: "&mdash;", chosen: "car in ~12 min", hub: "&mdash;" } } }
      // a booking: the DA meets the customer once the car is at the hub, and that handshake starts the drive
      : { tone: "wait", status: "Waiting for a DA", da: "&mdash;", car: `${carB} &middot; in the yard, prepped`, wait: "2 min",
          hooks: { status: { assigned: [`${da} assigned &middot; car coming`, "wait>coming"], hub: [`Car ready &middot; ${da} is coming`, "coming>ready"], met: ["On test drive", "ready>live"] },
            da: { assigned: da }, car: { yard: `${carB} &middot; on its way, about 3 min`, hub: `${carB} &middot; at the hub, Bay 2`, met: `${carB} &middot; on the road` }, wait: { hub: "&mdash;" } } },
    s2: { tone: "coming", status: `${da} assigned &middot; car coming`, da, car: `${carB} &middot; in the yard, prepped`, wait: "2 min",
      hooks: { car: { picked: `${carB} &middot; on its way, about 3 min`, hub: `${carB} &middot; at the hub, Bay 2` }, status: { hub: [`Car ready &middot; ${da} is coming`, "coming>ready"] }, wait: { hub: "&mdash;" } } },
    o1: { tone: "wait", status: "Waiting for the car", da, car: `${carW} &middot; being prepped`, wait: "car in ~12 min",
      hooks: { car: { prepped: `${carW} &middot; prepped, leaving the yard`, picked: `${carW} &middot; on its way, about 3 min`, hub: `${carW} &middot; at the hub, Bay 1` }, status: { hub: [`Car ready &middot; ${da} is coming`, "wait>ready"] }, wait: { picked: "car in ~3 min", hub: "&mdash;" } } },
  }[ctx];
  const hooks = (h) => !h ? "" : " " + Object.entries(h).map(([ev, v]) => Array.isArray(v) ? `data-on-${ev}="${v[0]}" data-cls-${ev}="${v[1]}"` : `data-on-${ev}="${v}"`).join(" ");
  const me = `<tr class="me" data-part="tv-row"><td><b class="tv-tok">${tk.no}</b></td><td>${boardName(t)}</td><td><span class="tv-st ${F.tone}"${hooks(F.hooks.status)}>${F.status}</span></td>
    <td${hooks(F.hooks.da)}>${F.da}</td><td${hooks(F.hooks.car)}>${F.car}</td><td${hooks(F.hooks.wait)}>${F.wait}</td></tr>`;
  // the other hub customer of this prototype sits on the board too, at a plausible point
  const other = walk
    ? ["B-07", boardName("booked"), "live", "On test drive", 0, PEOPLE.booked.car, "on the road"]
    : ["W-12", boardName("walkin"), "wait", "Waiting for a DA", null, null, "Chosen with the DA"];
  const rows = [...BOARD.rows, other].map(([tok, nm, tone, st, di, cid, cs]) => ({ tok, html: `<tr><td><b class="tv-tok">${tok}</b></td><td>${nm}</td><td><span class="tv-st ${tone}">${st.replace("{da}", daOf(di))}</span></td><td>${daOf(di)}</td><td>${cid ? `${carShort(cid)} &middot; ${cs}` : cs}</td><td>${tone === "wait" ? "4 min" : "&mdash;"}</td></tr>` }));
  rows.push({ tok: tk.no, html: me });
  rows.sort((a, b) => a.tok.localeCompare(b.tok));
  return `<div class="tv" data-part="tv">
    <div class="tv-head"><span class="v2-logo">${ic("car-front")}</span><div class="tv-hub"><b>CARS24 &middot; ${MK.hub}</b><small>Test drives today</small></div>
      <div class="tv-clock"><b>2:31</b><small>PM</small></div>
      <div class="tv-qr" data-part="tv-qr">${qrSvg(15, 3)}<span><b>Not checked in yet?</b><small>Scan the QR on your seat</small></span></div></div>
    <table class="tv-table"><thead><tr><th>Token</th><th>Name</th><th>Status</th><th>DA</th><th>Car</th><th>Waiting</th></tr></thead><tbody>${rows.map(r => r.html).join("")}</tbody></table>
    <div class="tv-foot" data-part="tv-legend">${TV_TONES.map(([tone, l]) => `<span class="tv-st ${tone}">${l}</span>`).join("")}<span class="tv-note">${ic("smartphone")}Your token is on your phone too. Your DA comes to your seat.</span></div>
  </div>`;
}

// ================================================================== the customer's phone: a form, a token, and nothing else
// PHONES[stepId](track) returns one 360 x 740 phone screen, shown next to the panel or the TV. It has no Leadverse
// chrome. Its panels (data-flow) are the page's steps; data-sync="key" sends an answer to the screen beside it,
// and data-sync-event fires a status change there.
const phStatus = (time) => `<div class="ph-status"><b>${time}</b><span>${ic("signal")}${ic("wifi")}${ic("battery-full")}</span></div>`;
const phBrand = () => `<div class="ph-brand"><span class="v2-logo sm">${ic("car-front")}</span><b>CARS24</b><span>${MK.hub}</span></div>`;
// After check-in, the next thing to do depends on the financing answer and whether the customer is pre-approved:
// might need finance and not pre-approved: the 2-minute pre-approval; own loan: a check against their lender;
// no finance, or already pre-approved: take a seat, with the listing page to browse. Each has a QR and a link.
const FIN = [["need", "I might need finance from CARS24"], ["none", "I don't need finance"], ["own", "I have already arranged my own loan"]];
function finCard(t, key, part, hidden) {
  const pre = VISIT[t].pre === "Eligible";
  const kind = key === "own" ? "lender" : key === "need" && !pre ? "pre" : "seat";
  const [text, url, cta] = {
    pre: ["While you wait, please do our 2-minute finance pre-approval. It helps us show you the best payment plan options.", `${MK.site}/finance/pre-approval`, "Start pre-approval"],
    lender: [`Want to see if we can beat your lender? 2-minute check. We work with ${MK.lenders}.`, `${MK.site}/finance/pre-approval`, "Start the 2-minute check"],
    seat: [`${pre && key === "need" ? "You're already pre-approved. " : ""}Please take a seat. Our team will show you to your car shortly.`, `${MK.site}/buy-used-cars`, "Browse our cars"],
  }[kind];
  return `<div class="ph-fin ${kind}" data-part="${part}" data-when="fin=${key}"${hidden ? " hidden" : ""}>${qrSvg(15, 3)}<div><p>${text}</p><small>${url}</small><button class="ph-btn sm">${cta}</button></div></div>`;
}
function tokenPanel(t, { flowed } = {}) {
  const p = PEOPLE[t], walk = t === "walkin", tk = TOKEN[t], da = PDAS[0].name, daFirst = da.split(" ")[0];
  const steps = walk
    ? [["Checked in", "done", ""], ["DA on the way", "", `data-cls-assigned="done"`], ["With your DA", "", `data-cls-met="done"`], ["Car ready", "", `data-cls-hub="done"`], ["Test drive", "", `data-cls-drive="done"`]]
    : [["Checked in", "done", ""], ["DA assigned", "", `data-cls-assigned="done"`], ["Car ready", "", `data-cls-hub="done"`], ["Test drive", "", `data-cls-met="done"`]];
  const live = walk ? "drive" : "met";
  return `<div class="ph-scr"${flowed ? ` data-flow="ph" data-flow-step="token" hidden` : ""} data-part="ph-token">
    ${phStatus(walk ? "2:44" : "2:27")}<div class="ph-url">${ic("lock")}<span>${pick(stepById("I2").screen.phone, t)}</span></div>
    <div class="ph-page">${phBrand()}
      <div class="ph-token"><small>Your token</small><b>${tk.no}</b><span>${tk.seat} &middot; checked in ${tk.at}</span></div>
      <div class="ph-live"><div class="ph-live-h"><i class="sc-dot live" data-cls-${live}="live>done"></i><b ${walk
        ? `data-on-assigned="${daFirst} is coming to your seat" data-on-chosen="Your car is being prepped" data-on-met="You're with ${daFirst}" data-on-hub="Your car is ready" data-on-drive="Enjoy the drive"`
        : `data-on-assigned="${daFirst} is your DA. Your car is coming" data-on-yard="Your car is on its way from the yard" data-on-hub="Your car is ready. ${daFirst} is coming to your seat" data-on-met="Enjoy the drive"`}>Finding you a DA</b></div>
        <div class="ph-steps">${steps.map(([k, cls, a]) => `<span class="${cls}"${a ? " " + a : ""}><i></i>${k}</span>`).join("")}</div></div>
      <div class="ph-row">${ic("user-round")}<div><small>Your DA</small><b data-on-assigned="${da}">Assigning one now&hellip;</b></div></div>
      <div class="ph-row">${ic("car-front")}<div><small>Your car</small><b${walk ? ` data-on-chosen="${PCARS.c4.title}"` : ""}>${walk ? "You'll choose it with your DA" : PCARS[p.car].title}</b>
        <span${walk ? ` data-on-chosen="Being prepped in the yard, about 12 min. Wait at your seat" data-on-hub="At the hub, Bay 1. ${daFirst} is coming back to you"` : ` data-on-yard="On its way from the yard, about 3 min" data-on-hub="At the hub, Bay 2"`} data-on-${live}="On the road with you">${walk ? "&nbsp;" : "Prepped, waiting in the yard"}</span></div></div>
      ${FIN.map(([key]) => finCard(t, key, "ph-fin", key !== "need")).join("")}
      <p class="ph-legal">This page updates by itself. We've sent it to your WhatsApp too.</p>
    </div></div>`;
}
// the Yardie's phone: Leadverse mobile, a task list. kind: "bring" (a booked car, prepped before the day) or "prep"
function yardPhone(t, kind) {
  const walk = t === "walkin", tk = TOKEN[t], y = PSTAFF.prep, daFirst = PDAS[0].name.split(" ")[0], prep = kind === "prep";
  const c = PCARS[kind === "bring" ? PEOPLE[t].car : walk ? "c4" : "c3"];
  const checklist = [["droplets", "Quick wash"], ["armchair", "Wipe the inside"], ["fuel", "Fuel at least half"], ["gauge", "Tyre pressure"]];
  const card = `<div class="yd-card" data-part="yard-task">
      <div class="yd-meta"><span class="yd-kind">${prep ? "Prep and bring" : "Bring to the hub"}</span><span class="v2-tok">${tk.no}</span><span>${boardName(t)} &middot; DA ${daFirst}</span></div>
      <b class="yd-car">${c.title}</b><small class="yd-plate">${c.plate}</small>
      <div class="yd-route"><div><small>From</small><b>Yard, row C &middot; spot 14</b></div>${ic("arrow-right")}<div><small>To</small><b>Hub, ${c.bay}</b></div></div>
      ${prep ? `<div data-flow="yd" data-flow-step="prep"><div class="yd-check">${checklist.map(([icon, l], i) => `<button class="yd-item ${i < 2 ? "done" : ""}" data-zone>${ic(icon)}<span>${l}</span>${ic("check")}</button>`).join("")}</div>
        <button class="ph-btn" data-step-to="yd:ready" data-sync-event="prepped">Prep done</button></div>` : ""}
      <div data-flow="yd" data-flow-step="ready"${prep ? " hidden" : ""}><p class="yd-ok">${ic("circle-check")}${prep ? "Prepped at 2:46 PM" : "Prepped yesterday (P8)"}</p><button class="ph-btn" data-step-to="yd:moving" data-sync-event="picked">${ic("key-round")}Picked up, driving over</button></div>
      <div data-flow="yd" data-flow-step="moving" hidden><p class="yd-live">${ic("navigation")}On the way &middot; about 3 min</p><button class="ph-btn" data-step-to="yd:done" data-sync-event="hub">${ic("map-pin")}Parked at the hub, ${c.bay}</button></div>
      <div data-flow="yd" data-flow-step="done" hidden><p class="yd-ok">${ic("circle-check")}At the hub, ${c.bay}. ${daFirst} and the TV are told.</p><button class="ph-btn ghost">Next task</button></div>
    </div>`;
  const others = `<div class="yd-other"><span class="yd-kind grey">Prep for tomorrow</span><b>${PCARS.c2.title}</b><small>B-11 &middot; 10:00 AM booking</small></div>
    <div class="yd-other"><span class="yd-kind grey">Back to the yard</span><b>${PCARS.c1.title}</b><small>B-05 &middot; after the drive</small></div>`;
  return `<div class="ph"><div class="ph-scr yd">${phStatus(prep ? "2:46" : "2:27")}
    <div class="yd-bar"><span class="v2-logo sm">${ic("layers")}</span><div><b>Yard tasks</b><small>${y.name} &middot; Yardie &middot; ${MK.hub}</small></div><span class="v2-av staff">${inits(y.name)}</span></div>
    <div class="yd-tabs"><span class="on">To do &middot; 3</span><span>Done today &middot; 11</span></div>
    <div class="ph-page">${card}${others}</div></div></div>`;
}
const PHONE_LABEL = { I1: "Customer's phone &middot; the form only", I2: "Customer's phone &middot; their token", S2: "Yardie's phone &middot; Leadverse mobile", O1: "Yardie's phone &middot; Leadverse mobile" };
const PHONES = {
  // I1 by seat QR: scan, mobile and OTP, (about you), about today, consent, then the token
  I1: (t) => {
    const p = PEOPLE[t], walk = t === "walkin", fn = first(t), c = PCARS[p.car], tk = TOKEN[t];
    const url = pick(stepById("I1").screen.phone, t);
    const times = walk ? ["2:41", "2:42", "2:43", "2:44"] : ["2:24", "2:25", "2:26", "2:27"];
    const top = (i) => `${phStatus(times[i])}<div class="ph-url">${ic("lock")}<span>${url}</span></div>`;
    const total = walk ? 4 : 3;
    const prog = (n, label) => `<div class="ph-prog"><div>${Array.from({ length: total }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div><small>Step ${n} of ${total} &middot; ${label}</small></div>`;
    const choose = (key, opts) => `<div class="ph-chips">${opts.map(o => `<button class="ph-chip" data-pick="${key}" data-sync="${key}">${o}</button>`).join("")}</div>`;
    const purposes = [["car-front", "Buy or test drive"], ["package", "Drop off a car"], ["key-round", "Pick up a car"], ["wrench", "A booked service"], ["banknote", "Sell my car"], ["message-circle", "Something else"]];
    const [fName, ...lName] = p.name.split(" ");
    return `<div class="ph">
      <div class="ph-scr ph-cam" data-flow="ph" data-flow-step="scan" data-part="ph-scan">
        ${phStatus(times[0])}
        <div class="ph-view"><div class="ph-seatqr"><span class="v2-logo sm">${ic("car-front")}</span><b>Check in here</b>${qrSvg(17, 5)}<small>${MK.hub} &middot; ${tk.seat}</small></div><i class="ph-aim"></i></div>
        <button class="ph-banner" data-step-to="ph:mobile" data-sync-event="scanned">${ic("qr-code")}<span><b>Open ${MK.site}</b><small>${url}</small></span>${ic("chevron-right")}</button>
        <p class="ph-camhint">Point your camera at the QR on your seat</p>
      </div>
      <div class="ph-scr" data-flow="ph" data-flow-step="mobile" data-part="ph-mobile" hidden>
        ${top(0)}
        <div class="ph-page">${phBrand()}
          <h3>Welcome to the ${MK.hub}</h3>
          <p class="ph-sub">Check in here and we'll find you a DA. About 2 minutes.</p>
          ${prog(1, "Your mobile")}
          <b class="ph-q">Your mobile number</b><div class="ph-input">${p.phone}</div>
          <b class="ph-q">The code we just sent</b><div class="ph-otp">${"481902".split("").map(d => `<span>${d}</span>`).join("")}</div>
          <p class="ph-legal">Filled in from your messages.</p>
        </div>
        <div class="ph-foot"><button class="ph-btn" data-step-to="ph:${walk ? "you" : "today"}" data-sync-event="verified">Verify and continue</button></div>
      </div>
      ${walk ? `<div class="ph-scr" data-flow="ph" data-flow-step="you" data-part="ph-you" hidden>
        ${top(1)}
        <div class="ph-page">${phBrand()}
          <h3>Tell us about you</h3><p class="ph-sub">No booking on this mobile, so we'll set you up now.</p>
          ${prog(2, "About you")}
          <div class="ph-two"><div><b class="ph-q">First name</b><div class="ph-input">${fName}</div></div><div><b class="ph-q">Last name</b><div class="ph-input">${lName.join(" ")}</div></div></div>
          <b class="ph-q">Email</b><div class="ph-input">${p.email}</div>
          <b class="ph-q">What brings you in today?</b><div class="ph-opts">${purposes.map(([icon, l]) => `<button class="ph-opt" data-pick="purpose" data-sync="purpose">${ic(icon)}<span>${l}</span></button>`).join("")}</div>
        </div>
        <div class="ph-foot"><button class="ph-btn" data-step-to="ph:today" data-sync-event="you">Next</button></div>
      </div>` : ""}
      <div class="ph-scr" data-flow="ph" data-flow-step="today" data-part="ph-today" hidden>
        ${top(walk ? 2 : 1)}
        <div class="ph-page">${phBrand()}
          <h3>${walk ? "About today" : `Hi ${fn}, we found your booking`}</h3>
          ${walk ? `<p class="ph-sub">Three quick questions, so your DA can help you faster.</p>` : `<div class="ph-visit">${ic("calendar-check")}<div><b>Test drive &middot; today 2:30 PM</b><small>${c.title}</small></div></div>`}
          ${prog(walk ? 3 : 2, "About today")}
          <b class="ph-q">Who's with you today?</b>${choose("acc", ["Just me", "Partner", "Family", "A friend"])}
          <b class="ph-q">Do you need financing after the test drive?</b>
          <div class="ph-radios" data-part="ph-finance">${FIN.map(([key, label]) => `<button class="ph-radio" data-pick="fin" data-sync="pay" data-sync-key="fin=${key}" data-sync-val="${label}"><i></i>${label}</button>`).join("")}</div>
          <b class="ph-q">${MK.area}</b><div class="ph-input">${VISIT[t].area}</div>
        </div>
        <div class="ph-foot"><button class="ph-btn" data-step-to="ph:consent" data-sync-event="today">Next</button></div>
      </div>
      <div class="ph-scr" data-flow="ph" data-flow-step="consent" data-part="ph-consent" hidden>
        ${top(walk ? 3 : 2)}
        <div class="ph-page">${phBrand()}
          <h3>Almost done</h3>
          ${prog(total, "Licence and consent")}
          ${walk ? `<b class="ph-q">Your driving licence <span class="ph-tag">optional</span></b><div class="ph-tiles sm">${["Front", "Back"].map((side, i) => `<button class="ph-tile" data-zone data-sync="licence" data-sync-val="${i ? "Front and back added" : "Front added"}">${ic("camera")}<b>${side}</b><small>Take a photo</small></button>`).join("")}</div><p class="ph-legal">Or show it to your DA at the car.</p>`
            : `<div class="ph-onfile">${ic("badge-check")}<div><b>Licence already on file</b><small>Uploaded 2 days ago. Your DA checks it before the drive.</small></div></div>`}
          <b class="ph-q">Can we record your test drive?</b>
          <p class="ph-sub">From the moment your DA starts it. It helps your DA keep notes. Your visit is the same either way.</p>
          <div class="ph-radios">
            <button class="ph-radio" data-pick="rec" data-sync="rec" data-sync-val="Yes, recording on" data-enables="ph-submit"><i></i>Yes, that's fine</button>
            <button class="ph-radio" data-pick="rec" data-sync="rec" data-sync-val="No: AI notes off for this visit" data-enables="ph-submit"><i></i>No, please don't</button>
          </div>
          <p class="ph-legal">By checking in you agree to the CARS24 <u>${MK.privacy}</u>.</p>
        </div>
        <div class="ph-foot"><button class="ph-btn" id="ph-submit" disabled data-step-to="ph:token" data-sync-event="submitted">Check in</button></div>
      </div>
      ${tokenPanel(t, { flowed: true })}
    </div>`;
  },
  I2: (t) => `<div class="ph">${tokenPanel(t)}</div>`,
  S2: (t) => yardPhone(t, "bring"),
  O1: (t) => yardPhone(t, "prep"),
};
