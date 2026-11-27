// ---- The Delivery persona (Australia): the order after the final payment, on delivery day ----
// The page: a step rail | the live Leadverse task (lead pane, stage bar, the action area on Turbo UI, CarGPT) | the
// step's spec. The order is settled and the delivery is booked. Happy path: check the car is ready (read-only), hand
// it over. Before the car is marked delivered the customer may still change the VAS, the rego term or the discount;
// every change lands on one new tax invoice and an updated booking confirmation, then the balance is collected. When
// the car is not ready at handover, the delivery associate can give free home delivery, behind a warning.
// Reuses the PISTON data (PEOPLE, PCARS, PSTAFF in the Australian market) and the shell (piston-screens.js, dls.js).

applyMarket("au");
PSTAFF.dl = { name: "Josh Kelly", init: "JK", role: "Delivery" };
STAFF_AV.dl = "JK";

const $d = (s) => document.querySelector(s);
const D_T = "booked";
const D_CAR = "c1";
const D_ORDER = { id: "BK-88213", task: "TK-7301", hub: "Melbourne hub", hubFull: "Melbourne hub, VIC", address: ["Home", "12 Swan Street, Richmond VIC 3121"],
  slot: "Today, Fri 27 Nov, 11:00 AM", rego: "1QZ 4KT", expiry: "27 Feb 2027", logistics: "LG-30418" };

// the government charges per registration term (placeholder rates: the state's fee table in the build), the fees,
// the discount a delivery associate can give without the sales manager, and the VAS catalogue (B2C admin, VAS Sales)
const D_REGO = { 3: { rego: 173, ctp: 147 }, 6: { rego: 346, ctp: 294 }, 12: { rego: 692, ctp: 588 } };
const D_FEE = { transfer: 46, handling: 599, home: 299 };
const D_LIMIT = 500;
const D_CATALOG = {
  TINTING: [["Tinting - 3M Color Stable", 449], ["Tinting - Global NR Quick Dry PLUS Films", 349], ["Tinting - 3M Crystalline", 899]],
  COATING: [["Coating - Ceramic 3 yr", 990], ["Coating - Paint Protection Film (front)", 1490]],
  SERVICE_CONTRACT: [["Service Contract - 1 yr / 15,000 km", 690], ["Service Contract - 2 yr / 30,000 km", 1290]],
  WARRANTY: [["Extended Warranty - 1 yr", 699], ["Extended Warranty - 2 yr", 1099], ["Extended Warranty - 3 yr", 1499]],
  INSURANCE: [["Comprehensive Insurance - 12 months", 1250], ["GAP Insurance - 36 months", 450]],
};
const D_REASONS = ["Car not ready on time", "Cosmetic issue found at handover", "Price match", "Loyalty", "Manager's discretion"];
const D_DAYS = [["sat", "Sat", "28 Nov"], ["sun", "Sun", "29 Nov", true], ["mon", "Mon", "30 Nov"], ["tue", "Tue", "1 Dec"]];
const D_SLOTS = [["9", "9&ndash;11 AM"], ["11", "11 AM&ndash;1 PM"], ["1", "1&ndash;3 PM"], ["3", "3&ndash;5 PM"]];

// the steps: [id, stage bar label, title on the screen]
const D_STEPS = [["D1", "Car prep", "Car prep status"], ["D2", "VAS", "Add or remove VAS"], ["D3", "Rego", "Change the rego term"], ["D4", "Discount", "Add or remove a discount"],
  ["D5", "Invoice", "Update the tax invoice"], ["D6", "Confirmation", "Send the booking confirmation"], ["D7", "Handover", "Balance and handover"]];

// ---------------------------------------------------------------- state
// the order's price breakup from a state: EGC + duty + rego + CTP + fees + VAS + delivery - discount = DAP
const dPrice = (s) => {
  const egc = PCARS[D_CAR].price, duty = Math.round(egc * 0.04223), r = D_REGO[s.months];
  const vas = s.vas.reduce((a, v) => a + v.price, 0), delivery = s.mode === "home" && !s.free ? D_FEE.home : 0;
  const disc = s.disc && s.disc.status === "Applied" ? s.disc.amount : 0;
  return { egc, duty, rego: r.rego, ctp: r.ctp, transfer: D_FEE.transfer, handling: D_FEE.handling, vas, delivery, disc,
    dap: egc + duty + r.rego + r.ctp + D_FEE.transfer + D_FEE.handling + vas + delivery - disc };
};
const dKey = (s) => JSON.stringify(dPrice(s));
function dFresh(scen) {
  const ready = scen !== "notready";
  return { step: 0, scen, months: 3, disc: null, dForm: { type: "flat", value: "", reason: "" }, dErr: "", addType: "", addPlan: "",
    vas: [{ name: "Cars24 Base Warranty", type: "WARRANTY", price: 0, base: true, state: "Active" }, { name: "Tinting - Global Nano Ceramic IR Films", type: "TINTING", price: 599, state: ready ? "Installed" : "Booked for install" }],
    inv: 1, invAt: "21 Nov", contractV: 1, signed: true, sent: [], confKey: "", collected: 0, payVia: "link", linkSent: false, payChecked: false, amount: "", receipt: false,
    mode: "pickup", free: false, modal: "", day: "", slot: "", scheduled: false, handed: false, delivered: false, date: "2026-11-27", time: "11:20", amtErr: "" };
}
// a fresh order: the booking's tax invoice and contract are at its own amounts
function dNew(scen) { const o = dFresh(scen); o.invKey = dKey(o); o.contractDap = dPrice(o).dap; return o; }
let DS = dNew("ready");
// what was booked: the same order before any change on delivery day
const D_BOOKED = dNew("ready");
const D_PAID = dPrice(D_BOOKED).dap;
const dPaid = (s) => D_PAID + s.collected;
const dBalance = (s) => dPrice(s).dap - dPaid(s);
const dChanged = (s) => dKey(s) !== dKey(D_BOOKED);
const dOutdated = (s) => dKey(s) !== s.invKey;
const dNeedsConf = (s) => dChanged(s) && s.confKey !== dKey(s);
const dGates = (s) => [["Finance GFD", true], ["Contract signed", s.signed], ["Registered", true], ["Refurb GFD", s.scen !== "notready"]];
const dVasChanges = (s) => {
  const before = D_BOOKED.vas.map(v => v.name), now = s.vas.map(v => v.name);
  return { added: now.filter(n => !before.includes(n)), removed: before.filter(n => !now.includes(n)) };
};
const dMoney = (n) => (n < 0 ? "&minus;" : "") + money(Math.abs(n));
const dDiff = (n) => n === 0 ? "&mdash;" : (n > 0 ? "+" : "&minus;") + money(Math.abs(n));

// ---------------------------------------------------------------- the frame: lead pane, stage bar, footer, CarGPT
function dLead(s) {
  const p = PEOPLE[D_T], c = PCARS[D_CAR];
  const [tone, label] = s.delivered ? ["green", "Delivered"] : s.scheduled ? ["violet", "Home delivery scheduled"] : ["violet", "Delivery booked"];
  const f = (k, v, extra = "") => `<div class="v2-f"><div><small>${k}</small><b>${v}</b></div>${extra}</div>`;
  return `<aside class="v2-lead" data-part="lead">
    <div class="v2-lh"><span class="v2-av lg">${inits(p.name)}</span><div><b>${p.name}</b><span class="v2-pill ${tone}">${label}</span></div><div class="v2-lh-ic">${ic("square-pen")}${ic("menu")}</div></div>
    <div class="v2-ltabs"><span class="on">${ic("user")}Contact</span><span>${ic("car")}Order</span><span>${ic("file-text")}Documents</span><span>${ic("history")}Activity</span></div>
    <div class="v2-lscroll">
      <div class="v2-sec">Order</div>
      <div class="v2-group">${f("Order ID", D_ORDER.id, `<span class="v2-copy">${ic("copy")}</span>`)}${f("Car", c.title)}${f("Payment mode", "Cash")}${f("RM", PSTAFF.rm.name)}</div>
      <div class="v2-sec">Contact</div>
      <div class="v2-group">${f("Phone", p.phone, `<div class="v2-acts"><span class="call">${ic("phone")}</span><span>${ic("message-square")}</span></div>`)}${f("Email", p.email, `<div class="v2-acts"><span>${ic("mail")}</span></div>`)}</div>
      <div class="v2-sec">Delivery</div>
      <div class="v2-group">${f("Booked", `Pick-up &middot; ${D_ORDER.slot.replace("Today, ", "")}`)}${f("Address", D_ORDER.address[1])}${f("Licence", "Verified &middot; VIC")}</div>
    </div>
  </aside>`;
}
function dStages(s) {
  const vc = dVasChanges(s), g = dGates(s).filter(x => x[1]).length;
  const sub = [`${g} of 4 gates`, vc.added.length || vc.removed.length ? [vc.added.length ? `+${vc.added.length} added` : "", vc.removed.length ? `${vc.removed.length} removed` : ""].filter(Boolean).join(", ") : "No change",
    s.months === 3 ? "3 months" : `${s.months} months, was 3`, s.disc ? (s.disc.status === "Applied" ? money(s.disc.amount) : "Awaiting approval") : "None",
    dOutdated(s) ? "To regenerate" : `Tax invoice v${s.inv}`, dNeedsConf(s) ? "To send" : s.confKey ? "Sent" : "No change", s.delivered ? "Delivered" : s.scheduled ? "With logistics" : "Pending"];
  return `<div class="v2-stages" data-part="stages">${D_STEPS.map(([, n], i) => {
    const st = s.delivered || i < s.step ? "done" : i === s.step ? "cur" : "todo";
    return `<div class="v2-stg ${st}"><span class="c">${ic("square-check")}</span><b>${n}</b><span>${sub[i]}</span></div>`;
  }).join("")}</div>`;
}
function dFoot(s, hint, main) {
  return `<div class="v2-foot" data-part="foot">
    <button class="v2-btn" ${s.step ? `data-d="prev"` : "disabled"}>${ic("arrow-left")}Previous</button>
    <span class="v2-hint">${hint}</span>
    <div class="v2-split"><button class="v2-btn primary" data-d="${main.act}"${main.ok ? "" : " disabled"}>${main.icon && !main.after ? ic(main.icon) : ""}${main.label}${main.icon && main.after ? ic(main.icon) : ""}</button></div>
  </div>`;
}
function dScreen(s) {
  const [id, , title] = D_STEPS[s.step], v = D_VIEWS[id](s);
  const p = PEOPLE[D_T];
  const body = `<div class="v2-body">${dLead(s)}
    <section class="v2-center">${dStages(s)}<div class="v2-content scrolls dls">${head2(title, v.desc, v.right || "")}<div class="tu-stack">${v.body}</div></div>${dFoot(s, v.hint, v.main)}</section>
    ${gptMini(v.cards || [])}</div>`;
  return shell({ active: "tasks", who: "dl", crumb: crumbOf("Tasks", "Delivery", `${p.name} - ${D_ORDER.task}`), body }) + (s.modal ? dModal(s) : "");
}

// ---------------------------------------------------------------- the steps
const toneBadge = (t) => ({ Done: "success", "In progress": "information", Blocked: "error", "Not started": "neutral" }[t]);
const next = (label) => ({ act: "next", label, ok: true, icon: "arrow-right", after: true });
const D_VIEWS = {
  // D1 · read-only: what the Ops teams have done on this order, live from their HubSpot pipelines
  D1(s) {
    const ready = s.scen !== "notready", gates = dGates(s), clear = gates.filter(g => g[1]).length;
    const rows = [
      ["Finance", "01a_Cash Customer Finance", "Finance GFD &middot; payment complete", "FinOps", "2d", "Done"],
      ["Sales contract", "02_Sales Contracts", s.signed ? "Contract signed" : "Contract re-sent &middot; awaiting signature", "RM", s.signed ? "3d" : "Just now", s.signed ? "Done" : "In progress"],
      ["Roadworthy (RWC)", "05_Refurb Pre-GFD", "RWC Complete - To be Detailed", "Rego", "2d", "Done"],
      ["Refurb &amp; detail", "05_Refurb Pre-GFD", ready ? "Refurb GFD" : "Pre-GFD QC failed &middot; rework", "Refurb", ready ? "1d" : "3h", ready ? "Done" : "Blocked"],
      ["Registration", "06_Registration", "Registered", "Rego", "1d", "Done"],
      ["VAS &middot; Ceramic tint", "05b_VAS Operations", ready ? "Installed" : "Booked for install", "Refurb", ready ? "1d" : "5h", ready ? "Done" : "In progress"],
    ].map(([pipe, code, stage, owner, age, status]) => ({ pipe, code, stage, owner, age, status: { label: status, variant: toneBadge(status) } }));
    const count = (k) => rows.filter(r => r.status.label === k).length;
    const sec = (title, sub, status, age, items, part) => TU.sectionCard({ title, subtitle: sub, badge: { label: status, variant: toneBadge(status) }, attrs: `data-part="${part}"`, items: [...items, `<small class="dv-age">${age}</small>`] });
    const ro = TU.info("Read-only. Status comes live from the Ops teams' HubSpot pipelines; ask the owner to change anything.", { icon: "eye-open-show-see-reveal-look-visible-outline", attrs: `data-part="readonly"` });
    const gateRow = `<div class="tu-sec framed dv-gates" data-part="gates"><b>${clear} of 4 delivery gates clear</b>${gates.map(([n, ok]) => TU.badge(n, { variant: ok ? "success" : "warning", icon: ok ? "check-outline" : "clock-timer-outline" })).join("")}</div>`;
    const pipes = TU.sectionCard({ title: "Pipelines on this order", subtitle: `${rows.length} HubSpot tickets across Finance, Contracts and Ops`, attrs: `data-part="pipelines"`,
      badge: { label: [count("Done") && `${count("Done")} done`, count("In progress") && `${count("In progress")} in progress`, count("Blocked") && `${count("Blocked")} blocked`].filter(Boolean).join(" &middot; "), variant: ready ? "success" : "warning" },
      items: [TU.dataTable({ columns: [{ key: "pipe", label: "Pipeline", subTextKey: "code" }, { key: "stage", label: "Current stage" }, { key: "owner", label: "Owner" }, { key: "age", label: "In stage" }, { key: "status", label: "Status", isBadge: true }], rows })] });
    const rwc = sec("Roadworthy (RWC)", "Roadworthy inspection and any mechanical or panel rework &middot; HubSpot 05_Refurb Pre-GFD &middot; Hannah L.", "Done", "Closed 2d ago",
      [TU.fetchedInfo({ items: [["RWC status", "Passed"], ["RWC serial number", "RWC-VIC-558213"], ["RWC issue date", "25 Nov 2026"], ["RWC expiry date", "25 Dec 2026"], ["Submitted by", "Hannah L."], ["Completed confirmation", "Yes"]], cols: 3 })], "rwc");
    const refurb = sec("Refurb &amp; detail", "Sales promises, detailing and pre-GFD QC &middot; HubSpot 05_Refurb Pre-GFD &middot; Marco D.", ready ? "Done" : "Blocked", ready ? "Closed 1d ago" : "In stage 3h",
      [TU.dataTable({ columns: [{ key: "task", label: "Task" }, { key: "detail", label: "Detail" }, { key: "owner", label: "Owner" }, { key: "status", label: "Status", isBadge: true }], rows: [
        { task: "Sales promise", detail: "Second key cut", owner: "Marco D.", status: { label: "Done", variant: "success" } },
        { task: "Detailing", detail: "Fresh detail before handover", owner: "Marco D.", status: { label: "Done", variant: "success" } },
        { task: "Pre-GFD QC inspection", detail: ready ? "Passed Pre-Refurb GFD Inspection" : "Failed: paint touch-up on the rear bumper, rework ETA tomorrow 10 AM", owner: "Marco D.", status: ready ? { label: "Done", variant: "success" } : { label: "Blocked", variant: "error" } }] })], "refurb");
    const vasRows = s.vas.filter(v => !v.base && /TINTING|COATING/.test(v.type)).map(v => ({ product: v.name.replace(/^(Tinting|Coating) - /, ""), type: v.type, stage: v.state === "Installed" ? "Installed" : v.state === "To install" ? "Created at the change" : "Booked for install",
      date: v.state === "Installed" ? "26 Nov" : v.state === "To install" ? "&mdash;" : "28 Nov", upd: v.state === "To install" ? "Just now" : v.state === "Installed" ? "1d ago" : "5h ago",
      status: { label: v.state === "Installed" ? "Done" : v.state === "To install" ? "Not started" : "In progress", variant: v.state === "Installed" ? "success" : v.state === "To install" ? "neutral" : "information" } }));
    const vas = sec("VAS operations", "Tinting, coating and accessory installs, one ticket per product &middot; HubSpot 05b_VAS Operations &middot; Marco D.", vasRows.every(r => r.status.label === "Done") && vasRows.length ? "Done" : vasRows.length ? "In progress" : "Not started", vasRows.length ? "Updated 1d ago" : "",
      [vasRows.length ? TU.dataTable({ columns: [{ key: "product", label: "Product" }, { key: "type", label: "Plan type" }, { key: "stage", label: "HubSpot stage" }, { key: "date", label: "Install date" }, { key: "upd", label: "Updated" }, { key: "status", label: "Status", isBadge: true }], rows: vasRows }) : TU.noData({ title: "No installable VAS on this order" }),
        TU.info("VAS never blocks the delivery slot; anything not installed in time moves to Post delivery - Schmick.")], "vasops");
    const r = D_REGO[3];
    const rego = sec("Registration", "Registration in the customer's state &middot; HubSpot 06_Registration &middot; Hannah L.", "Done", "Closed 1d ago",
      [TU.fetchedInfo({ items: [["Registration state", "VIC"], ["Registration number", D_ORDER.rego], ["Check digit", "7"], ["Registration expiry", D_ORDER.expiry], ["Fees charged", money(r.rego)], ["TAC charge", money(r.ctp)], ["Months registered", "3 months"], ["CTP insurance", money(r.ctp)], ["Number plates", "STANDARD"]], cols: 3 })], "rego");
    return { desc: `${PEOPLE[D_T].name}'s ${PCARS[D_CAR].title}, order ${D_ORDER.id}. Booked for pick-up today at 11:00 AM.`,
      right: TU.badge(ready ? "Ready for handover" : "Not ready", { variant: ready ? "success" : "warning", icon: ready ? "check-outline" : "caution-outline", attrs: `data-part="ready"` }),
      body: ro + gateRow + (ready ? "" : TU.info("<b>The car isn't ready.</b> Pre-GFD QC failed on a paint touch-up, so Refurb GFD is open. If the customer is here, offer free home delivery at Handover.", { state: "warning", icon: "caution-outline" })) + pipes + rwc + refurb + vas + rego,
      hint: ready ? "All four gates clear" : "Refurb GFD open: handover at the hub is blocked", main: next("Next: changes"),
      cards: ready ? [["Check", "list-checks", "<p>4 of 4 gates clear. Ask if anything changed before the handover: VAS, rego term or a discount.</p>"]]
        : [["Heads up", "triangle-alert", "<p>Refurb GFD is open (QC rework, ETA tomorrow). If the customer is at the hub, offer free home delivery at Handover.</p>"]] };
  },

  // D2 · add or remove VAS; the DAP and the balance move straight away, the invoice at D5
  D2(s) {
    const vc = dVasChanges(s);
    const rows = s.vas.map(v => {
      const fixed = v.base ? "Included" : v.state === "Installed" ? "Installed" : "";
      return { name: v.name, type: v.type, price: v.price ? money(v.price) : "Free", status: { label: v.base ? "Included" : D_BOOKED.vas.some(b => b.name === v.name) ? v.state : "Added today", variant: v.base ? "neutral" : v.state === "Installed" ? "success" : D_BOOKED.vas.some(b => b.name === v.name) ? "information" : "warning" },
        act: fixed ? `<span class="dv-dim">${fixed === "Installed" ? "Installed: can't remove" : "Can't remove"}</span>` : TU.link("Remove", { attrs: `data-d="vas-rm" data-v="${v.name}"` }) };
    });
    const list = TU.sectionCard({ title: "VAS on this order", subtitle: `${s.vas.length} products &middot; ${money(dPrice(s).vas)}`, attrs: `data-part="vas-list"`,
      badge: vc.added.length || vc.removed.length ? { label: "Changed", variant: "warning" } : { label: "As booked", variant: "neutral" },
      items: [TU.dataTable({ columns: [{ key: "name", label: "Product", subTextKey: "type" }, { key: "price", label: "Price", align: "right" }, { key: "status", label: "Status", isBadge: true }, { key: "act", label: "", align: "right" }], rows })] });
    const plans = s.addType ? D_CATALOG[s.addType].filter(([n]) => !s.vas.some(v => v.name === n)) : [];
    const add = TU.sectionCard({ title: "Add VAS", subtitle: "Pick a plan type, then the plan.", attrs: `data-part="vas-add"`, items: [
      `<div class="tu-row2">${TU.dropdown({ id: "dv-type", label: "Plan type", options: Object.keys(D_CATALOG), value: s.addType, placeholder: "Select plan type", required: true, attrs: `data-d-f="addType"` })}
        ${TU.dropdown({ id: "dv-plan", label: "Plan", options: plans.map(([n, p]) => [n, `${n} &middot; ${money(p)}`]), value: s.addPlan, placeholder: s.addType ? "Select plan" : "Pick a plan type first", required: true, attrs: `data-d-f="addPlan"${s.addType ? "" : " disabled"}` })}</div>`,
      `<div class="tu-btns">${TU.button("Add to the order", { variant: "primary", size: "medium", icon: "plus-large-outline", attrs: `data-d="vas-add"${s.addPlan ? "" : " disabled"}` })}</div>`,
      TU.info("A tint or a coating opens a 05b VAS Operations ticket. VAS never blocks the delivery slot; anything not installed in time moves to Post delivery - Schmick.")] });
    const n = vc.added.length + vc.removed.length;
    return { desc: "Only if the customer asks. The base warranty and anything already installed stay.", right: TU.badge(`VAS ${money(dPrice(s).vas)}`, { variant: n ? "warning" : "neutral", attrs: `data-part="vas-total"` }),
      body: list + add, hint: n ? `${n} change${n > 1 ? "s" : ""}: the invoice updates at Invoice` : "No change to the VAS", main: next("Next: rego"),
      cards: [["Say this", "message-square", "<p>&ldquo;Happy to add it. If it can't be fitted before you drive away, we'll book it in after delivery.&rdquo;</p>"]] };
  },

  // D3 · the registration term: 3, 6 or 12 months; the difference goes on the balance
  D3(s) {
    const base = D_REGO[3].rego + D_REGO[3].ctp;
    const tiles = TU.choiceTiles("d-months", [3, 6, 12].map(m => { const r = D_REGO[m], t = r.rego + r.ctp; return { value: String(m), label: `${m} months${m === 3 ? " &middot; booked" : ""}`, sub: `${money(t)} &middot; ${m === 3 ? "as booked" : dDiff(t - base)}` }; }), String(s.months), 3);
    const r = D_REGO[s.months];
    const now = TU.sectionCard({ title: "Registration term", subtitle: `VIC &middot; ${D_ORDER.rego} &middot; registered, expires ${D_ORDER.expiry}`, attrs: `data-part="rego-term"`,
      badge: s.months === 3 ? { label: "As booked", variant: "neutral" } : { label: "Changed", variant: "warning" }, items: [tiles,
        TU.paymentDetails([{ label: `${s.months} months registration`, value: money(r.rego) }, { label: "CTP insurance (TAC)", value: money(r.ctp) }, "sep", { label: "Change on the balance", value: dDiff(r.rego + r.ctp - base), highlight: true }], { showShadow: false, attrs: `data-part="rego-cost"` }),
        s.months === 3 ? "" : TU.info(`Already registered for 3 months. The Registration team gets a task to extend it to ${s.months} months with VicRoads; the plates stay the same.`, { state: "brand" })] });
    return { desc: "Only if the customer asks. Rates are placeholders; the build reads the state's fee table.", right: TU.badge(`${s.months} months`, { variant: s.months === 3 ? "neutral" : "warning", attrs: `data-part="rego-badge"` }),
      body: now, hint: s.months === 3 ? "No change to the rego term" : `Rego ${s.months} months: ${dDiff(r.rego + r.ctp - base)} on the balance`, main: next("Next: discount"),
      cards: [["Explain", "info", `<p>12 months costs ${money(D_REGO[12].rego + D_REGO[12].ctp - base)} more than 3 months and saves a renewal in February.</p>`]] };
  },

  // D4 · a discount at handover: up to the limit now, above it the sales manager approves
  D4(s) {
    const f = s.dForm, cur = s.disc;
    const current = TU.sectionCard({ title: "Discount on this order", attrs: `data-part="disc-current"`, badge: cur ? { label: cur.status, variant: cur.status === "Applied" ? "success" : "warning" } : { label: "None", variant: "neutral" },
      items: [cur ? `${TU.paymentDetails([{ label: "Discount", value: cur.type === "flat" ? money(cur.value) : `${cur.value}% &middot; ${money(cur.amount)}` }, { label: "Reason", value: cur.reason }, { label: "By", value: `${PSTAFF.dl.name}, today` }], { showShadow: false })}
        <div class="tu-btns">${cur.status === "Awaiting approval" ? `${TU.badge(`Above ${money(D_LIMIT)}: with the sales manager`, { variant: "warning", icon: "lock-private-outline" })}<span class="sp"></span>${TU.link("Simulate: the sales manager approves", { attrs: `data-d="disc-ok"` })}` : ""}<span class="sp"></span>${TU.button("Remove discount", { variant: "secondary", size: "small", attrs: `data-d="disc-rm"` })}</div>`
        : TU.noData({ title: "No discount on this order" })] });
    const form = cur ? "" : TU.sectionCard({ title: "Add a discount", subtitle: `Up to ${money(D_LIMIT)} applies now; above it waits for the sales manager.`, attrs: `data-part="disc-add"`, items: [
      TU.segmentTabs("d-dtype", [["flat", "Flat ($)"], ["pct", "Percent (%)"]], f.type),
      `<div class="tu-row2">${TU.textInput({ label: f.type === "flat" ? "Amount (AUD)" : "Percent of the car price", value: f.value, id: "dv-dval", required: true, error: s.dErr, hint: f.type === "pct" ? `Of ${money(PCARS[D_CAR].price)}` : "", attrs: `data-d-f="dval" inputmode="numeric"` })}
        ${TU.dropdown({ id: "dv-reason", label: "Reason", options: D_REASONS, value: f.reason, placeholder: "Select a reason", required: true, attrs: `data-d-f="reason"` })}</div>`,
      `<div class="tu-btns">${TU.button("Apply discount", { variant: "primary", size: "medium", attrs: `data-d="disc-add"` })}</div>`] });
    return { desc: "Only if the customer asks, or to make good a problem at handover.", right: TU.badge(cur ? (cur.status === "Applied" ? `&minus;${money(cur.amount)}` : "Awaiting approval") : "No discount", { variant: cur ? "warning" : "neutral", attrs: `data-part="disc-badge"` }),
      body: current + form, hint: cur ? (cur.status === "Applied" ? `Discount ${money(cur.amount)} applied` : "Waiting for the sales manager") : "No discount", main: next("Next: invoice"),
      cards: [["Rule", "shield-check", `<p>Give a reason every time. Above ${money(D_LIMIT)} the balance waits for the sales manager's approval.</p>`]] };
  },

  // D5 · booked against now, line by line; one new tax invoice for every change, and the contract when the price moved
  D5(s) {
    const a = dPrice(D_BOOKED), b = dPrice(s), out = dOutdated(s), changed = dChanged(s);
    const row = (item, k, $cls) => ({ item, was: dMoney(k === "disc" ? -a[k] : a[k]), now: dMoney(k === "disc" ? -b[k] : b[k]), chg: dDiff(k === "disc" ? a[k] - b[k] : b[k] - a[k]), $cls: $cls || (a[k] !== b[k] ? "chg" : "") });
    const rows = [row("EGC", "egc"), row("Motor vehicle duty", "duty"), row(`Registration (${s.months === 3 ? "3 months" : `3 &rarr; ${s.months} months`})`, "rego"), row("CTP insurance", "ctp"), row("Transfer fee", "transfer"), row("Handling fee", "handling"),
      row("VAS", "vas"), row(s.free ? "Home delivery (free exception)" : "Delivery", "delivery"), row("Discount", "disc"), { ...row("DAP", "dap"), $cls: "sum" },
      { item: "Paid", was: money(D_PAID), now: money(dPaid(s)), chg: dDiff(s.collected) }, { item: "Balance", was: money(0), now: dMoney(dBalance(s)), chg: dDiff(dBalance(s)), $cls: "due" + (dBalance(s) === 0 ? " paid" : "") }];
    const table = TU.sectionCard({ title: "Booked and now", framed: false, attrs: `data-part="inv-diff"`, items: [TU.dataTable({ columns: [{ key: "item", label: "Item" }, { key: "was", label: "At booking", align: "right" }, { key: "now", label: "Now", align: "right" }, { key: "chg", label: "Change", align: "right" }], rows })] });
    const docs = TU.sectionCard({ title: "Documents", attrs: `data-part="inv-docs"`, badge: out ? { label: "Outdated", variant: "warning" } : { label: "Up to date", variant: "success" }, items: [
      TU.fetchedInfo({ items: [["Tax invoice", `v${s.inv} &middot; ${s.invAt}`], ["Contract of sale", `v${s.contractV} &middot; ${s.signed ? "signed" : "awaiting signature"}`], ["Invoice amount", money(JSON.parse(s.invKey).dap)]], cols: 3 }),
      out ? `<div class="tu-btns">${TU.button("Regenerate the tax invoice", { variant: "primary", size: "medium", icon: "file-text-outline", attrs: `data-d="regen"` })}<span class="dv-dim">${b.dap !== s.contractDap ? "The DAP changed: the contract of sale goes out again on DocuSign." : "Same DAP: the contract stands."}</span></div>`
        : changed ? "" : TU.info("Nothing changed: the booking's tax invoice and contract stand.", { state: "positive", icon: "check-outline" }),
      s.signed ? "" : `<div class="tu-btns">${TU.badge("Contract v" + s.contractV + " sent on DocuSign: awaiting the customer's signature", { variant: "warning", icon: "page-check-signed-document-outline" })}<span class="sp"></span>${TU.link("Simulate: the customer signs", { attrs: `data-d="sign"` })}</div>`] });
    return { desc: "Every money change lands on one new tax invoice. A new DAP also needs a re-signed contract.", right: TU.badge(`DAP ${money(b.dap)}`, { variant: b.dap === a.dap ? "neutral" : "warning", attrs: `data-part="inv-dap"` }),
      body: table + docs, hint: out ? "Regenerate the tax invoice to continue" : !s.signed ? "Contract re-sent: the car can't go until it's signed" : changed ? `Tax invoice v${s.inv} at ${money(b.dap)}` : "No change",
      main: { act: "next", label: "Next: confirmation", ok: !out, icon: "arrow-right", after: true },
      cards: [["Check", "list-checks", `<p>Tell the customer the new DAP (${money(b.dap)}) and the balance (${dMoney(dBalance(s))}) before you regenerate.</p>`]] };
  },

  // D6 · the updated booking confirmation, as the customer gets it
  D6(s) {
    const pr = dPrice(s), c = PCARS[D_CAR], need = dNeedsConf(s), sent = s.confKey === dKey(s) && s.confKey;
    const lines = [{ label: "Car", value: c.title }, { label: "Order", value: D_ORDER.id }, { label: "Handover", value: `Pick-up &middot; ${D_ORDER.hub} &middot; ${D_ORDER.slot}` },
      { label: "Registration", value: `${s.months} months, VIC` }, ...s.vas.filter(v => !v.base).map(v => ({ label: "VAS", value: `${v.name.replace(/ - .*/, "")} &middot; ${money(v.price)}` })),
      ...(s.disc && s.disc.status === "Applied" ? [{ label: "Discount", value: `&minus;${money(s.disc.amount)}` }] : []), "sep",
      { label: "DAP", value: money(pr.dap), highlight: true }, { label: "Paid", value: money(dPaid(s)) }, { label: dBalance(s) < 0 ? "Refund due" : "Balance due", value: money(Math.abs(dBalance(s))), highlight: true }];
    const prev = TU.sectionCard({ title: "Booking confirmation", subtitle: `To ${PEOPLE[D_T].email} and ${PEOPLE[D_T].phone}`, attrs: `data-part="conf-preview"`,
      badge: sent ? { label: "Sent", variant: "success" } : need ? { label: "To send", variant: "warning" } : { label: "Sent at booking", variant: "neutral" },
      items: [TU.paymentDetails(lines, { heading: `Updated booking &middot; ${D_ORDER.id}`, showShadow: false }),
        `<div class="tu-chips" data-part="conf-send">${[["email", "email-envelope-outline", "Email"], ["sms", "bubble-text-message-chat-outline", "SMS"], ["whatsapp", "whatsapp", "WhatsApp"]]
          .map(([k, i, l]) => TU.chip(l, { leadingIcon: i, active: sent && s.sent.includes(k), green: true, trailing: `${tui("check-outline", "xs")}Sent`, attrs: `data-d="conf" data-v="${k}"` })).join("")}</div>`] });
    return { desc: need ? "Something changed: send the customer the updated confirmation." : "Nothing changed since booking; resend only if the customer asks.", right: TU.badge(sent ? "Sent" : need ? "To send" : "No change", { variant: sent ? "success" : need ? "warning" : "neutral", attrs: `data-part="conf-badge"` }),
      body: prev, hint: need ? "Send the updated confirmation to continue" : sent ? "Updated confirmation sent" : "No change since booking", main: { act: "next", label: "Next: handover", ok: !need, icon: "arrow-right", after: true },
      cards: [["Say this", "message-square", "<p>&ldquo;I've sent your updated booking confirmation to your email and phone. It shows the new total and what's left to pay.&rdquo;</p>"]] };
  },

  // D7 · collect the balance, confirm how the car goes, hand it over
  D7(s) {
    const bal = dBalance(s), ready = s.scen !== "notready", out = dOutdated(s), home = s.mode === "home";
    if (s.delivered) {
      const refund = bal < 0;
      const body = `${TU.successHeader({ title: home ? "Delivery handover done" : "Car delivered", sub: `${home ? `Home delivery by logistics &middot; ${D_DAYS.find(d => d[0] === s.day)[1]} ${D_DAYS.find(d => d[0] === s.day)[2]}, 10:42 AM` : `Picked up at ${D_ORDER.hub} &middot; ${s.date.split("-").reverse().join("/")}, ${s.time}`}` })}
        ${TU.fetchedInfo({ title: "Recorded on the order", items: [["Order status", "DELIVERED"], ["Actual delivery date", home ? `${D_DAYS.find(d => d[0] === s.day)[2]} 2026, 10:42 AM` : `${s.date.split("-").reverse().join("/")} ${s.time}`], ["Mode", home ? (s.free ? "Home delivery &middot; free exception" : "Home delivery") : "Pick-up"], ["Paid", money(dPaid(s))], [refund ? "Refund" : "Balance", refund ? `${money(-bal)} &middot; FinOps task` : money(0)], ["Tax invoice", `v${s.inv}`]], cols: 3, attrs: `data-part="delivered"` })}
        ${refund ? TU.info(`A FinOps refund task for ${money(-bal)} was created with the delivery.`, { state: "brand" }) : ""}
        ${s.vas.some(v => v.state !== "Installed" && !v.base && /TINTING|COATING/.test(v.type)) ? TU.info("A product not installed before handover moved to Post delivery - Schmick; the customer is booked in for it.", { state: "brand" }) : ""}`;
      return { desc: "The task is closed.", right: TU.badge("Delivered", { variant: "success", icon: "check-outline" }), body, hint: "Task closed", main: { act: "none", label: "Delivered", ok: false, icon: "check" } };
    }
    // the balance: settled, to collect (a payment link or a receipt), or a refund
    const sum = TU.paymentDetails([{ label: "DAP", value: money(dPrice(s).dap) }, { label: "Paid", value: money(dPaid(s)) }, "sep", { label: bal < 0 ? "Refund due" : "Balance due", value: money(Math.abs(bal)), highlight: true }], { showShadow: false, attrs: `data-part="bal-sum"` });
    const collect = bal <= 0 ? TU.info(bal < 0 ? `Refund due ${money(-bal)}. A FinOps refund task is created when the car is delivered.` : "Nothing to collect: the order is settled.", { state: bal < 0 ? "brand" : "positive", icon: bal < 0 ? "info-outline" : "check-outline" })
      : `${TU.segmentTabs("d-payvia", [["link", "Payment link"], ["receipt", "Bank transfer receipt"]], s.payVia)}
        ${s.payVia === "link" ? `<div class="tu-btns">${s.linkSent ? TU.badge(`Link for ${money(bal)} sent by SMS and email`, { variant: "success", icon: "check-outline" }) : TU.button(`Send a payment link for ${money(bal)}`, { variant: "primary", size: "medium", icon: "send-line", attrs: `data-d="paylink"` })}<span class="sp"></span>${TU.button("Refresh payment status", { variant: "secondary", size: "small", icon: "arrow-refresh-renew-outline", attrs: `data-d="payref"` })}</div>${s.payChecked && !s.linkSent ? `<small class="dep-note">No link sent yet</small>` : ""}`
        : `${TU.paymentDetails([...MK.bank, ["Reference", D_ORDER.id], ["Amount", money(bal)]].map(([label, value]) => ({ label, value })), { heading: "Account details", showShadow: false })}
          ${TU.textInput({ label: "Receipt amount (AUD)", value: s.amount, id: "dv-amt", hint: `At least ${money(bal)}, the balance`, error: s.amtErr, attrs: `data-d-f="amount" inputmode="numeric"` })}
          ${TU.fileUploadCard({ title: "Payment receipt", description: "JPG, PNG or PDF, up to 5 MB", cta: TU.link("Use a sample", { attrs: `data-d="receipt"` }) })}`}`;
    const pay = TU.sectionCard({ title: "Balance payment", attrs: `data-part="balance"`, badge: bal > 0 ? { label: "To collect", variant: "warning" } : bal < 0 ? { label: "Refund due", variant: "information" } : { label: "Settled", variant: "success" },
      items: [sum, collect, out ? `<div class="tu-btns">${TU.info("The price changed here: regenerate the tax invoice.", { state: "warning", icon: "caution-outline" })}${TU.button("Regenerate", { variant: "secondary", size: "small", attrs: `data-d="regen"` })}</div>` : "",
        s.signed ? "" : `<div class="tu-btns">${TU.badge(`Contract v${s.contractV} on DocuSign: awaiting the customer's signature`, { variant: "warning", icon: "page-check-signed-document-outline" })}<span class="sp"></span>${TU.link("Simulate: the customer signs", { attrs: `data-d="sign"` })}</div>`] });
    // the delivery mode: booked as pick-up; home delivery costs the fee unless it is the free exception (with a warning)
    const mode = TU.sectionCard({ title: "Delivery mode", subtitle: `Booked: pick-up at ${D_ORDER.hub}, ${D_ORDER.slot.replace("Today, ", "today, ")}`, attrs: `data-part="mode"`,
      badge: home ? { label: s.free ? "Free home delivery" : "Changed", variant: "warning" } : { label: "As booked", variant: "neutral" }, items: [
        TU.choiceTiles("d-mode", [{ value: "pickup", label: "Pick-up at the hub", sub: `${D_ORDER.hub} &middot; ${money(0)}`, icon: "store-outline" }, { value: "home", label: "Home delivery", sub: s.free ? "Free &middot; exception" : money(D_FEE.home), icon: "truck-delivery-outline" }], s.mode, 2),
        ready || home ? "" : TU.info("<b>The car isn't ready</b> (Refurb GFD open), so it can't be handed over at the hub. Offer free home delivery instead.", { state: "warning", icon: "caution-outline" }),
        home ? TU.checkbox("Free delivery exception", { checked: s.free, sub: `The car isn't ready at handover: waive the ${money(D_FEE.home)} fee`, attrs: `data-d="free" data-part="free"` }) : ""] });
    // how it is handed over: at the hub now, or scheduled for logistics
    const hand = home
      ? TU.sectionCard({ title: s.scheduled ? "Home delivery scheduled" : "Schedule the home delivery", attrs: `data-part="schedule"`, badge: s.scheduled ? { label: `Logistics &middot; ${D_ORDER.logistics}`, variant: "information" } : null, items: s.scheduled ? [
          TU.fetchedInfo({ items: [["When", `${D_DAYS.find(d => d[0] === s.day)[1]} ${D_DAYS.find(d => d[0] === s.day)[2]}, ${D_SLOTS.find(x => x[0] === s.slot)[1]}`], ["Where", D_ORDER.address[1]], ["Logistics task", `${D_ORDER.logistics} &middot; created`]], cols: 3 }),
          TU.info(ready ? "Logistics picks the car up from the hub and hands it over. Their handover marks the delivery done and captures the actual delivery date." : "Logistics picks the car up once Refurb GFD clears, then hands it over. Their handover marks the delivery done.", { state: "brand" }),
          `<div class="tu-btns"><span class="sp"></span>${TU.link("Simulate: logistics marks it handed over", { attrs: `data-d="handed"` })}</div>`]
        : [TU.addressCard({ title: D_ORDER.address[0], lines: D_ORDER.address[1], tag: "On the order", action: TU.link("Change") }),
          TU.dateSlots(`data-d="day"`, D_DAYS.map(([v, l, d, off]) => ({ value: v, label: l, sub: d, disabled: !!off })), s.day),
          TU.timeSlots(`data-d="slot"`, D_SLOTS.map(([v, l]) => ({ value: v, label: l })), s.slot)] })
      : TU.sectionCard({ title: "Hand over at the hub", subtitle: "Keys, the documents and a walk round the car; then mark it delivered.", attrs: `data-part="handover"`, items: [
          `<div class="tu-row2">${TU.textInput({ label: "Actual delivery date", type: "date", value: s.date, id: "dv-date", required: true, attrs: `data-d-f="date"` })}${TU.textInput({ label: "Time", type: "time", value: s.time, id: "dv-time", required: true, attrs: `data-d-f="time"` })}</div>`] });
    // what still blocks the final action
    const blocks = [bal > 0 && "collect the balance", out && "regenerate the tax invoice", !s.signed && "get the contract signed", !home && !ready && "the car isn't ready: switch to home delivery", home && !s.scheduled && (!s.day || !s.slot) && "pick a day and a slot"].filter(Boolean);
    const main = home ? (s.scheduled ? { act: "none", label: "With logistics", ok: false, icon: "truck" } : { act: "schedule", label: "Schedule home delivery", ok: !blocks.length, icon: "calendar-check" })
      : { act: "deliver", label: "Mark car delivered", ok: !blocks.length, icon: "check" };
    return { desc: "Collect anything owed, confirm how the car goes, then hand it over.", right: TU.badge(bal > 0 ? `${money(bal)} to collect` : bal < 0 ? `${money(-bal)} refund` : "Settled", { variant: bal > 0 ? "warning" : "success", attrs: `data-part="bal-badge"` }),
      body: pay + mode + hand, hint: s.scheduled ? "Waiting for the logistics handover" : blocks.length ? `To go: ${blocks.join(", ")}` : home ? "Ready to schedule" : "Ready to hand over",
      main, cards: ready ? [["Handover", "key-round", "<p>Walk the customer round the car, hand over both keys and the documents, then mark it delivered.</p>"]]
        : [["Say this", "message-square", "<p>&ldquo;Your car needs a small touch-up before it's perfect. We'll deliver it to your home tomorrow, free of charge.&rdquo;</p>"]] };
  },
};

// the free delivery exception: a warning the delivery associate confirms
function dModal(s) {
  return TU.modal({ title: "Give free home delivery?", closeAttrs: `data-d="modal-x"`, attrs: `data-part="free-modal"`, body: `
    ${TU.info(`You're waiving the <b>${money(D_FEE.home)}</b> home delivery fee for ${PEOPLE[D_T].name}.`, { state: "warning", icon: "caution-outline" })}
    <p>It is recorded on the order as a free delivery exception under your name, and your manager sees it in the day's exceptions.</p>
    <div class="tu-btns"><span class="sp"></span>${TU.button("Cancel", { variant: "tertiary", size: "medium", attrs: `data-d="modal-x"` })}${TU.button("OK, give free delivery", { variant: "primary", size: "medium", attrs: `data-d="free-ok"` })}</div>` });
}

// ---------------------------------------------------------------- the spec beside the screen
const D_SPEC = {
  D1: { purpose: "Before anything changes, check the car is ready. Every value here belongs to another team (FinOps, the RM, Registration, Refurb, VAS operations) and comes live from their HubSpot pipelines, so it is read-only.",
    data: ["HubSpot tickets: 01a Finance, 02 Sales contracts, 05 Refurb Pre-GFD (RWC, refurb), 05b VAS Operations, 06 Registration", "Deal properties behind the four gates; OMS gate isDeliveryBookingAllowed", "Registration fields: registration_number, check_digit, registration_expiry_date, registration_fees_charged, tac_charge"],
    rules: ["Four delivery gates: Finance GFD, Contract signed, Registered, Refurb GFD", "All four clear: the car can be handed over at the hub", "Not ready on the day: the hub handover is blocked; offer free home delivery at D7", "Nothing on this page can be edited; ask the ticket's owner"],
    exits: ["D2: changes, only if the customer asks"] },
  D2: { purpose: "The customer adds a product, or drops one, before handover.",
    data: ["VAS catalogue (B2C admin, VAS Sales): plan type, plan, price", "05b VAS Operations tickets per installable product"],
    rules: ["The base warranty can't be removed; an installed product can't be removed", "Adding a tint or a coating opens a 05b ticket; VAS never blocks the delivery slot, anything not fitted moves to Post delivery - Schmick", "The DAP and the balance move straight away; the tax invoice at D5"],
    exits: ["D3"] },
  D3: { purpose: "Change the registration term: 3, 6 or 12 months.",
    data: ["06_Registration ticket: months registered, fees charged, TAC charge", "The state's fee table (placeholder rates here)"],
    rules: ["The difference in rego and CTP goes on the balance", "Already registered: the Registration team gets a task to extend or shorten it; the plates stay", "Booked term (3 months) is the default"],
    exits: ["D4"] },
  D4: { purpose: "Add or remove a discount at handover, often to make good a problem found on the day.",
    data: ["B2C admin: discount codes", "Order: discount type, value, reason, approver"],
    rules: ["Flat or a percent of the car price, always with a reason", `Up to ${money(D_LIMIT)} applies now; above it waits for the sales manager and the balance doesn't move until approved`, "A removed discount goes back on the balance"],
    exits: ["D5"] },
  D5: { purpose: "Every money change lands on one new tax invoice, booked against now, line by line.",
    data: ["OMS: the order's price breakup at booking and now", "Document workflow: POST /api/admin/order/{id}/documents/INVOICE/regenerate (and CONTRACT)", "DocuSign envelope status"],
    rules: ["Continue stays off while the invoice is outdated", "A new DAP re-sends the contract of sale on DocuSign; Contract signed opens again until the customer signs, and the car can't go until then", "Nothing changed: the booking's documents stand"],
    exits: ["D6"] },
  D6: { purpose: "The customer gets the updated booking confirmation: what they get, the price, what's paid and what's left.",
    data: ["Notification engine: email, SMS, WhatsApp templates", "OMS: the order summary"],
    rules: ["Must go out when anything changed; otherwise it was sent at booking and resending is optional"],
    exits: ["D7"] },
  D7: { purpose: "Collect any balance, confirm how the car goes, and hand it over.",
    data: ["Payments: a payment link (Stripe, confirmed by webhook) or a bank transfer receipt", "OMS: delivery mode, slot, actual delivery date, order status", "Logistics: the home delivery task and its handover"],
    rules: ["Balance due: collect it before handover. Refund due: a FinOps refund task is created with the delivery", "Booked mode is changeable. Home delivery costs the fee, unless it is the free delivery exception, which needs the warning confirmed", "Pick-up: the car must be ready (four gates), the invoice current and the contract signed; then mark it delivered with the actual date", "Home delivery: pick a day and a slot; a logistics task is created; their handover marks the delivery done and captures the actual date"],
    exits: ["DELIVERED: the task closes", "HOME DELIVERY SCHEDULED, then DELIVERED at the logistics handover"] },
};
const D_OPEN = ["The UAE: the same persona on the UAE delivery service, with emirates and RTA rules?", "Free delivery exceptions: a monthly cap per associate, or a manager's approval above one?", "Refunds: at delivery, or once FinOps confirms the change?", "Removing VAS after the cooling-off period: allowed, and who approves?"];
function dSpec(s) {
  const [id, , title] = D_STEPS[s.step], sp = D_SPEC[id];
  const list = (h, icon, items) => `<div class="sp-sec"><h4>${icon ? ic(icon) : ""}${h}</h4><ul class="sp-list">${items.map(x => `<li>${ic("chevron-right")}<span>${x}</span></li>`).join("")}</ul></div>`;
  return `<div class="sp-eyebrow">D &middot; Delivery <span class="trk" style="background:var(--lv-soft); color:var(--lv-soft-ink);">${s.scen === "notready" ? "Car not ready" : "Car ready"}</span><span class="trk" style="background:var(--surface-2);">Australia</span></div>
    <div class="sp-title"><span class="sid">${id}</span><h2>${title}</h2></div>
    <p class="sp-purpose">${sp.purpose}</p>
    <div class="sp-meta"><span>${ic("user")}Delivery associate</span><span>${ic("monitor")}Leadverse web</span><span>${ic("layers")}Turbo UI</span></div>
    ${list("Data", "database", sp.data)}${list("Rules", "scale", sp.rules)}${list("Exits", "log-out", sp.exits)}${list("Open decisions", "circle-help", D_OPEN)}`;
}

// ---------------------------------------------------------------- the page
function dRail(s) {
  return `<div class="pv-group"><div class="pv-ghead"><span class="pv-gl">D</span><div class="pv-gt"><b>Delivery</b><span>After the final payment</span></div></div>
    ${D_STEPS.map(([id, , title], i) => `<button class="pv-item${i === s.step ? " on" : ""}" data-d-step="${i}"><span class="sid">${id}</span><span class="snm">${title}</span>${ic("monitor")}</button>`).join("")}</div>
    <div class="pv-legend"><div>${ic("info")}Steps 2 to 4 are optional: only what the customer asks to change.</div><div>${ic("rotate-ccw")}<button class="linklike" data-d="reset">Start over</button></div></div>`;
}
function dRender() {
  const s = DS;
  $d("#dv-rail").innerHTML = dRail(s);
  $d("#dv-stagehead").innerHTML = `<span class="pv-devchip">${ic("monitor")}Leadverse web</span><span class="pv-scrname">${D_STEPS[s.step][0]} &middot; Delivery task &rsaquo; ${D_STEPS[s.step][2]}</span>`;
  $d("#dv-stage").innerHTML = `<div class="dev dev-desktop" data-kind="desktop"><div class="urlbar">${ic("lock")}<span class="u">c24-lead-verse-ui.cars24.team/tasks/${D_ORDER.task}/delivery</span></div><div class="viewport"><div class="scr">${dScreen(s)}</div></div></div>`;
  $d("#dv-stagefoot").innerHTML = `<button class="pv-navbtn" data-d-step="${s.step - 1}"${s.step ? "" : " disabled"}>${ic("chevron-left")}${s.step ? D_STEPS[s.step - 1][0] : "Back"}</button><span class="pos">Step ${s.step + 1} of 7</span><button class="pv-navbtn" data-d-step="${s.step + 1}"${s.step < 6 ? "" : " disabled"}>${s.step < 6 ? D_STEPS[s.step + 1][0] : "Next"}${ic("chevron-right")}</button>`;
  $d("#dv-spec").innerHTML = dSpec(s);
  document.querySelectorAll("#dv-scen button").forEach(b => b.classList.toggle("on", b.dataset.scen === s.scen));
  const h = `#${s.scen === "notready" ? "notready-" : ""}${D_STEPS[s.step][0]}`;
  if (location.hash !== h) history.replaceState(null, "", h);
  if (window.lucide) lucide.createIcons();
  dFit();
  dMount();
}
// keep the action area's scroll when the same step draws again
function dRedraw() {
  const sc = $d("#dv-stage .v2-content"), top = sc ? sc.scrollTop : 0, step = DS.step;
  dRender();
  const sc2 = $d("#dv-stage .v2-content");
  if (sc2 && DS.step === step) sc2.scrollTop = top;
}
function dFit() {
  const stage = $d("#dv-stage"), dev = stage.querySelector(".dev");
  if (!dev) return;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  let k = (stage.clientWidth - 38) / 1180;
  if (!narrow) k = Math.min(k, (stage.clientHeight - 44) / 760);
  k = Math.max(0.18, Math.min(1, k));
  const vp = dev.querySelector(".viewport");
  vp.style.width = Math.round(1180 * k) + "px";
  vp.style.height = Math.round(760 * k) + "px";
  dev.querySelector(".scr").style.transform = `scale(${k})`;
}

// every action changes the state, then the page draws again; typing only updates the state
function dAct(a, el) {
  const s = DS, v = el.dataset.v;
  switch (a) {
    case "next": s.step = Math.min(6, s.step + 1); break;
    case "prev": s.step = Math.max(0, s.step - 1); break;
    case "reset": DS = dNew(s.scen); break;
    case "vas-rm": s.vas = s.vas.filter(x => x.name !== v); break;
    case "vas-add": {
      const [name, price] = D_CATALOG[s.addType].find(([n]) => n === s.addPlan);
      s.vas.push({ name, type: s.addType, price, state: /TINTING|COATING/.test(s.addType) ? "To install" : "Active" });
      s.addType = ""; s.addPlan = ""; break;
    }
    case "disc-add": {
      const f = s.dForm, n = +String(f.value).replace(/[^0-9.]/g, "");
      const amount = f.type === "flat" ? Math.round(n) : Math.round(PCARS[D_CAR].price * n / 100);
      if (!n) s.dErr = "Enter an amount";
      else if (f.type === "pct" && n > 20) s.dErr = "20% at most";
      else if (!f.reason) s.dErr = "Pick a reason too";
      else { s.disc = { type: f.type, value: n, amount, reason: f.reason, status: amount > D_LIMIT ? "Awaiting approval" : "Applied" }; s.dErr = ""; }
      break;
    }
    case "disc-ok": s.disc.status = "Applied"; break;
    case "disc-rm": s.disc = null; s.dForm = { type: "flat", value: "", reason: "" }; break;
    case "regen": {
      const p = dPrice(s);
      s.inv += 1; s.invAt = "today"; s.invKey = dKey(s);
      if (p.dap !== s.contractDap) { s.contractV += 1; s.contractDap = p.dap; s.signed = false; }
      break;
    }
    case "sign": s.signed = true; break;
    case "conf": if (s.confKey !== dKey(s)) s.sent = []; if (!s.sent.includes(v)) s.sent.push(v); s.confKey = dKey(s); break;
    case "paylink": s.linkSent = true; break;
    case "payref": s.payChecked = true; if (s.linkSent && dBalance(s) > 0) { s.collected += dBalance(s); s.linkSent = false; } break;
    case "receipt": { const n = +String(s.amount).replace(/[^0-9]/g, ""), due = dBalance(s); if (n >= due) { s.collected += n; s.amount = ""; s.amtErr = ""; } else s.amtErr = `At least ${money(due)}, the balance`; break; }
    case "free": if (s.free) s.free = false; else s.modal = "free"; break;
    case "free-ok": s.free = true; s.modal = ""; break;
    case "modal-x": s.modal = ""; break;
    case "day": s.day = v; break;
    case "slot": s.slot = v; break;
    case "schedule": s.scheduled = true; break;
    case "handed": s.handed = true; s.delivered = true; break;
    case "deliver": s.delivered = true; break;
    default: return;
  }
  dRedraw();
}
function dMount() {
  const scr = $d("#dv-stage .scr");
  scr.querySelectorAll("[data-d-f]").forEach(f => {
    const k = f.dataset.dF;
    const set = () => { if (k === "dval") DS.dForm.value = f.value; else if (k === "reason") DS.dForm.reason = f.value; else DS[k] = f.value; };
    if (f.tagName === "SELECT") f.addEventListener("change", () => { set(); if (k === "addType") DS.addPlan = ""; dRedraw(); });
    else f.addEventListener("input", set);
  });
}
function dBoot() {
  const m = location.hash.match(/^#(notready-)?(D[1-7])$/);
  if (m) { DS = dNew(m[1] ? "notready" : "ready"); DS.step = D_STEPS.findIndex(x => x[0] === m[2]); }
  document.addEventListener("click", (e) => {
    // the folded CarGPT strip opens its tips; a click elsewhere closes them
    const menu = e.target.closest("#dv-stage [data-menu]");
    document.querySelectorAll("#dv-stage .v2-menu").forEach(m => { if (!menu || m !== menu.nextElementSibling) m.hidden = true; });
    if (menu) { const pop = menu.nextElementSibling; if (pop) pop.hidden = !pop.hidden; return; }
    const step = e.target.closest("[data-d-step]");
    if (step && !step.disabled) { DS.step = Math.max(0, Math.min(6, +step.dataset.dStep)); dRender(); return; }
    const sc = e.target.closest("#dv-scen [data-scen]");
    if (sc) { const at = DS.step; DS = dNew(sc.dataset.scen); DS.step = at; dRender(); return; }
    const ch = e.target.closest("#dv-stage [data-choice]");
    if (ch) { const g = ch.dataset.choice; if (g === "d-months") DS.months = +ch.dataset.value; else if (g === "d-mode") { DS.mode = ch.dataset.value; if (DS.mode === "pickup") DS.free = false; } dRedraw(); return; }
    const tab = e.target.closest("#dv-stage [data-tu-tabs] [data-tab]");
    if (tab) { const g = tab.closest("[data-tu-tabs]").dataset.tuTabs; if (g === "d-dtype") DS.dForm.type = tab.dataset.tab; else if (g === "d-payvia") DS.payVia = tab.dataset.tab; dRedraw(); return; }
    const a = e.target.closest("#dv-stage [data-d], #dv-rail [data-d]");
    if (a && !a.disabled) { e.preventDefault(); dAct(a.dataset.d, a); }
  });
  window.addEventListener("resize", dFit);
  dRender();
}
dBoot();
