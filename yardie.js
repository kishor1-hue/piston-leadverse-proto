// ---- The Yardie persona: a booked car from the yard to the SA, in two stages ----
// Stage 1, collect and prep (the day before the TD): pick the car up from its yard spot, prep it, park it in the
// ready row with the key back in the key box. Stage 2, drop and key handover (when the customer checks in): collect
// the key, drive the car to the hub, park it at a bay, hand the key to the SA with the code on the SA's tablet.
// Every tap updates properties on the yard tasks, the car, the key, the TD order, the ground TV and the SA's task;
// the spec beside the screen shows them live, and the Properties view lists them all.
// The page: a step rail | the screen, on the Yardie's phone (Leadverse mobile) or on Leadverse web | the step's spec.
// Reuses the PISTON data (PEOPLE, PCARS, PSTAFF, PDAS, TOKEN, MK in either market) and the shell (piston-screens.js,
// dls.js); the action area is on Turbo UI.

const $y = (q) => document.querySelector(q);
const Y_T = "booked";
const YV = { market: "ae", dev: "phone", view: "walk" };

const Y_STAGES = [
  { name: "Collect and prep", when: "The day before the TD", icon: "wrench" },
  { name: "Drop and key handover", when: "When the customer checks in", icon: "key-round" },
];
// the steps: id, stage, the short label, the title, the tap that finishes it
const Y_STEPS = [
  { id: "Y1", stage: 0, short: "Pick up", title: "Pick up from the yard", tap: "Picked up" },
  { id: "Y2", stage: 0, short: "Prep", title: "Prep the car", tap: "Prep done" },
  { id: "Y3", stage: 0, short: "Park ready", title: "Park it ready", tap: "Parked, ready" },
  { id: "Y4", stage: 1, short: "Drive over", title: "Bring it to the hub", tap: "Picked up, driving over" },
  { id: "Y5", stage: 1, short: "Park at hub", title: "Park at the hub", tap: "Parked at the bay" },
  { id: "Y6", stage: 1, short: "Key handover", title: "Hand the key to the SA", tap: "Key handed" },
];
Y_STEPS.forEach((x, i) => { x.idx = i; });

const Y_KEY = { tag: "KT-0412", slot: "14" };
const Y_TASK = { prep: "YT-5521", bring: "YT-5534" };
const Y_YARD = "Yard &middot; row C, spot 14";
const Y_CODE = "4821";
const Y_REFURB = "RF-2291";
const Y_TIME = { picked: "4:05 PM", prepped: "4:38 PM", ready: "4:41 PM", reported: "4:30 PM", enroute: "2:28 PM", hub: "2:31 PM", handed: "2:33 PM" };
const Y_FUEL = [["0", "E"], ["1", "&frac14;"], ["2", "&frac12;"], ["3", "&frac34;"], ["4", "F"]];
const Y_PHOTOS = ["Front", "Rear", "Left", "Right"];
const Y_CHECKS = [["wash", "Quick wash outside", ""], ["inside", "Vacuum and wipe inside", ""], ["fuel", "Fuel at least half", "Fill up if it's under half"],
  ["tyres", "Tyre pressure", "To the sticker on the door"], ["dash", "No warning lights on the dash", ""], ["docs", "Logbook and the TD sign in the car", ""]];
const Y_ISSUES = ["Damage on the body", "Flat battery", "Warning light on", "Tyre problem", "Mechanical", "Other"];
const Y_SPOTS = [["R-1", "Taken"], ["R-2"], ["R-3"], ["R-4", "Taken"], ["R-5"], ["R-6"]];
const Y_BAYS = [["Bay 1"], ["Bay 2"], ["Bay 3"], ["Bay 4", "Taken"], ["Bay 5"], ["Bay 6", "Taken"]];

const yCar = () => PCARS[PEOPLE[Y_T].car];
const yFirst = () => PEOPLE[Y_T].name.split(" ")[0];
const ySA = (s) => PDAS.find(d => d.id === s.handTo) || PDAS[0];
const yNum = (v) => { const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10); return isNaN(n) ? null : n; };
const yKm = (n) => n === null || n === undefined ? "&mdash;" : `${n.toLocaleString("en-US")} km`;
const yLast = () => yNum(yCar().km);
const yFuel = (v) => (Y_FUEL.find(f => f[0] === v) || [])[1] || "";
const yNorm = (v) => String(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
const yPlateOk = (s) => { const a = yNorm(s.plate); return a.length >= 5 && yNorm(yCar().plate).endsWith(a); };
const ySlot = () => PEOPLE[Y_T].slot.replace(/^Today, /, "");

// ---------------------------------------------------------------- state
function yNew() {
  return { step: 0, done: 0,
    keyScan: false, plate: "", odoOut: "", fuelOut: "", photos: [],
    checks: [], fuelPrep: "", issue: "no", issueType: "", issueNote: "", reported: false,
    spot: "", keySlot: Y_KEY.slot,
    keyScan2: false,
    bay: yCar().bay, odoIn: "", marks: "no", marksNote: "",
    handTo: PDAS[0].id, code: "", spare: true };
}
// jumping ahead fills the earlier steps with sample answers, so every step opens on a believable state
function yFill(s, n) {
  for (let k = s.done; k < n; k++) {
    if (k === 0) Object.assign(s, { keyScan: true, odoOut: String(yLast() + 2), fuelOut: "1", photos: [...Y_PHOTOS] });
    if (k === 1) Object.assign(s, { checks: Y_CHECKS.map(c => c[0]), fuelPrep: "3", issue: "no", reported: false });
    if (k === 2) Object.assign(s, { spot: "R-2", keySlot: Y_KEY.slot });
    if (k === 3) s.keyScan2 = true;
    if (k === 4) Object.assign(s, { bay: yCar().bay, odoIn: String((yNum(s.odoOut) || yLast()) + 1), marks: "no" });
    if (k === 5) s.code = Y_CODE;
  }
  s.done = Math.max(s.done, n);
}
let YS = yNew();

// what the form still lacks, and what is wrong in it (shown once enough is typed)
function yErr(s) {
  const e = {}, last = yLast(), o = yNum(s.odoOut), i = yNum(s.odoIn);
  if (yNorm(s.plate).length >= 6 && !yPlateOk(s)) e.plate = `Doesn't match this car (${yCar().plate})`;
  if (o !== null && String(o).length >= String(last).length && o < last) e.odoOut = `At least ${yKm(last)}, the last reading`;
  if (o !== null && o > last + 1000) e.odoOut = "Over 1,000 km more than the last reading: check it";
  if (s.fuelPrep !== "" && +s.fuelPrep < 2) e.fuelPrep = "At least half a tank for a TD: fill it up";
  if (i !== null && o !== null && String(i).length >= String(o).length && i < o) e.odoIn = `At least ${yKm(o)}, the reading at pick-up`;
  if (s.code.length === 4 && s.code !== Y_CODE) e.code = "Doesn't match the code on the SA's tablet";
  return e;
}
function yHint(s, k) {
  const o = yNum(s.odoOut), i = yNum(s.odoIn);
  return { plate: yPlateOk(s) ? `Matches ${yCar().plate}` : "The number on the plate", odoOut: `Last reading ${yKm(yLast())}`, keySlot: `Key ${Y_KEY.tag}`,
    odoIn: i !== null && o !== null && i > o + 5 ? "More than 5 km since pick-up: tell the yard lead" : `At pick-up ${yKm(o)}`,
    marksNote: "Where and what, for example a scuff on the rear bumper", issueNote: "What and where", code: "4 digits" }[k] || "";
}
function yTodo(s, step) {
  const e = yErr(s);
  const odoOk = (v) => yNum(v) !== null && String(yNum(v)).length >= 4;
  return [
    [!(s.keyScan || yPlateOk(s)) && "scan the key tag", !(odoOk(s.odoOut) && !e.odoOut) && "the odometer", !s.fuelOut && "the fuel", s.photos.length < 4 && `${4 - s.photos.length} photo${4 - s.photos.length > 1 ? "s" : ""}`],
    s.issue === "yes" ? [!s.issueType && "the issue type"] : [s.checks.length < Y_CHECKS.length && `${Y_CHECKS.length - s.checks.length} checklist item${Y_CHECKS.length - s.checks.length > 1 ? "s" : ""}`, (s.fuelPrep === "" || e.fuelPrep) && "fuel at least half"],
    [!s.spot && "a ready-row spot", !s.keySlot.trim() && "the key box slot"],
    [!s.keyScan2 && "scan the key tag"],
    [!s.bay && "a bay", !(odoOk(s.odoIn) && !e.odoIn) && "the odometer", s.marks === "yes" && !s.marksNote.trim() && "what the new marks are"],
    [s.code !== Y_CODE && "the handover code"],
  ][step].filter(Boolean);
}

// ---------------------------------------------------------------- the properties each tap updates
// { obj, key, label, at: the step whose tap sets it, before, after } ; after is the form's value until the tap
const Y_OBJ = {
  prep: ["Yard task &middot; prep", "clipboard-list"], bring: ["Yard task &middot; bring", "clipboard-list"], car: ["Car", "car"],
  key: ["Key", "key-round"], order: ["TD order (OMS)", "file-text"], tv: ["Ground TV and tracker", "tv"], sa: ["SA's task", "user"],
};
function yProps(s) {
  const c = yCar(), y = PSTAFF.prep.name, sa = ySA(s), sa1 = sa.name.split(" ")[0], last = yLast();
  const spot = s.spot ? `Yard &middot; ready row, ${s.spot}` : "", bay = s.bay ? `Hub &middot; ${s.bay}` : "", slot = s.keySlot.trim() ? `Key box &middot; slot ${s.keySlot.trim()}` : "";
  const fo = yFuel(s.fuelOut), fp = yFuel(s.fuelPrep), o = yNum(s.odoOut), i = yNum(s.odoIn), issue = s.issue === "yes";
  const P = (at, obj, key, label, before, after) => ({ at, obj, key, label, before, after });
  return [
    P(0, "prep", "status", "Status", "ASSIGNED", "PICKED_UP"),
    P(0, "prep", "picked_up_at", "Picked up at", "&mdash;", Y_TIME.picked),
    P(0, "car", "location", "Location", Y_YARD, `With ${y}`),
    P(0, "key", "holder", "Key holder", `Key box &middot; slot ${Y_KEY.slot}`, y),
    P(0, "car", "odometer_km", "Odometer", `${yKm(last)}, last reading`, o !== null ? yKm(o) : ""),
    P(0, "car", "fuel_level", "Fuel", "&frac12;, last known", fo),
    P(0, "car", "photos_pickup", "Photos at pick-up", "0 of 4", `${s.photos.length} of 4`),
    P(0, "car", "prep_status", "Prep status", "NOT_PREPPED", "IN_PREP"),
    P(1, "car", "prep_checklist", "Prep checklist", "0 of 6", `${s.checks.length} of 6`),
    P(1, "car", "fuel_level", "Fuel", fo || "&mdash;", fp),
    P(1, "car", "issue", "Issue", "None", issue ? s.issueType || "" : "None"),
    P(1, "car", "prep_status", "Prep status", "IN_PREP", issue ? "ON_HOLD" : "PREPPED"),
    P(1, "prep", "status", "Status", "PICKED_UP", issue ? "ISSUE_RAISED" : "PREPPED"),
    P(1, "prep", "prepped_at", "Prepped at", "&mdash;", issue ? "&mdash;" : Y_TIME.prepped),
    P(2, "car", "location", "Location", `With ${y}`, spot),
    P(2, "key", "holder", "Key holder", y, slot),
    P(2, "prep", "status", "Status", "PREPPED", "DONE"),
    P(2, "prep", "completed_at", "Completed at", "&mdash;", Y_TIME.ready),
    P(2, "order", "readiness.car", "Readiness: car", "To prep (amber)", "Prepped (green)"),
    P(3, "bring", "status", "Status", "ASSIGNED", "EN_ROUTE"),
    P(3, "bring", "en_route_at", "On the way at", "&mdash;", Y_TIME.enroute),
    P(3, "key", "holder", "Key holder", slot || `Key box &middot; slot ${Y_KEY.slot}`, y),
    P(3, "car", "location", "Location", spot || "Yard &middot; ready row", "On the way to the hub"),
    P(3, "tv", "car", "TV: car", "In the yard, prepped", "On its way, about 3 min"),
    P(4, "car", "location", "Location", "On the way to the hub", bay),
    P(4, "car", "hub_bay", "Hub bay", `Target ${c.bay}`, s.bay),
    P(4, "car", "odometer_km", "Odometer", o !== null ? yKm(o) : "&mdash;", i !== null ? yKm(i) : ""),
    P(4, "car", "condition_at_drop", "Condition at drop", "&mdash;", s.marks === "yes" ? (s.marksNote.trim() ? `New marks: ${s.marksNote.trim()}` : "") : "No new marks"),
    P(4, "bring", "status", "Status", "EN_ROUTE", "AT_HUB"),
    P(4, "bring", "arrived_at", "Arrived at", "&mdash;", Y_TIME.hub),
    P(4, "order", "state", "Order state", "SA ASSIGNED", "CAR AT HUB"),
    P(4, "tv", "car", "TV: car", "On its way, about 3 min", s.bay ? `At the hub, ${s.bay}` : ""),
    P(4, "tv", "status", "TV: status", `${sa1} assigned &middot; car coming`, `Car ready &middot; ${sa1} is coming`),
    P(4, "sa", "car", "SA's task: car", "Yardie bringing it", s.bay ? `At the hub &middot; ${s.bay}` : ""),
    P(5, "key", "holder", "Key holder", y, `${sa.name} (SA)`),
    P(5, "key", "handover_to", "Handed to", "&mdash;", sa.name),
    P(5, "key", "handover_at", "Handed over at", "&mdash;", Y_TIME.handed),
    P(5, "key", "handover_verified", "Handover code", "&mdash;", s.code === Y_CODE ? "Matched" : ""),
    P(5, "key", "spare_location", "Spare key", `Key box &middot; slot ${Y_KEY.slot}`, s.spare ? `Key box &middot; slot ${Y_KEY.slot}` : `With ${sa1}`),
    P(5, "bring", "status", "Status", "AT_HUB", "COMPLETED"),
    P(5, "bring", "completed_at", "Completed at", "&mdash;", Y_TIME.handed),
    P(5, "sa", "car", "SA's task: car", s.bay ? `At the hub &middot; ${s.bay}` : "At the hub", `${s.bay || c.bay} &middot; key with ${sa1}`),
  ];
}
// updated: its tap is done; now: this step's tap sets it; later: a later step
const yPSt = (s, p) => p.at < s.done ? "upd" : p.at === s.step ? "now" : "later";
// the car's location now, from the last location its taps set
function yWhere(s) {
  const l = yProps(s).filter(p => p.obj === "car" && p.key === "location" && p.at < s.done).pop();
  return l ? l.after : Y_YARD;
}

// ---------------------------------------------------------------- the steps: the action area of each
const yPhotoTiles = (on, act) => `<div class="yd-photos">${Y_PHOTOS.map(k => { const t = on.includes(k);
  return `<button type="button" class="yd-photo${t ? " on" : ""}" data-y="${act}" data-v="${k}">${tui(t ? "check-outline" : "camera-picture-image-outline", "xl")}<b>${k}</b><small>${t ? "Taken" : "Tap to take"}</small></button>`; }).join("")}</div>`;
const yCarCard = (badge) => { const c = yCar(); return TU.carContext({ title: c.title, subtitle: `${c.plate} &middot; key ${Y_KEY.tag}`, color: c.color, right: badge, attrs: `data-part="car"` }); };
const yMain = (s, label, icon, act = "next") => ({ act, label, icon, ok: !yTodo(s, s.step).length });
const yHintOf = (s, done) => { const t = yTodo(s, s.step); return t.length ? `To go: ${t.join(", ")}` : done; };

const Y_VIEWS = {
  Y1(s) {
    const c = yCar(), p = PEOPLE[Y_T], e = yErr(s), ok = s.keyScan || yPlateOk(s);
    const task = TU.fetchedInfo({ items: [["Task", `${Y_TASK.prep} &middot; prep`], ["Why", `TD tomorrow, ${ySlot()}`], ["Booking", `${p.id} &middot; ${yFirst()}`], ["From", Y_YARD], ["To", "Prep bay"], ["Due", "Today, 6:00 PM"]], cols: 3, attrs: `data-part="task"` });
    const find = TU.sectionCard({ title: "Find the car", subtitle: "Scan the key tag, or type the plate.", badge: ok ? { label: "Matched", variant: "success" } : null, attrs: `data-part="find"`, items: [
      s.keyScan ? TU.info(`Key tag ${Y_KEY.tag} scanned: it matches ${c.plate}.`, { state: "positive", icon: "check-outline" })
        : `<div class="tu-btns">${TU.button("Scan the key tag", { variant: "primary", size: "medium", icon: "qr-code", attrs: `data-y="scan"` })}</div>
          ${TU.textInput({ label: "Or type the plate", value: s.plate, id: "y-plate", placeholder: c.plate, hint: yHint(s, "plate"), error: e.plate, attrs: `data-y-f="plate" autocomplete="off"` })}`] });
    const read = TU.sectionCard({ title: "Readings at pick-up", attrs: `data-part="readings"`, items: [
      TU.textInput({ label: "Odometer (km)", value: s.odoOut, id: "y-odo-out", required: true, placeholder: String(yLast()), hint: yHint(s, "odoOut"), error: e.odoOut, attrs: `data-y-f="odoOut" inputmode="numeric" autocomplete="off"` }),
      TU.radios({ label: "Fuel", items: Y_FUEL, value: s.fuelOut, required: true, attrs: `data-y-r="fuelOut"` })] });
    const photos = TU.sectionCard({ title: "Photos, one each side", subtitle: "To compare at the drop-off.", badge: { label: `${s.photos.length} of 4`, variant: s.photos.length === 4 ? "success" : "neutral" }, attrs: `data-part="photos"`, items: [yPhotoTiles(s.photos, "photo")] });
    return { desc: `${p.name}'s TD is tomorrow at ${ySlot()}. Get the car from its spot and into prep.`, right: TU.badge("Prep task", { variant: "information" }),
      body: yCarCard(TU.badge("In the yard", { variant: "neutral" })) + task + find + read + photos,
      hint: yHintOf(s, "Ready: tap Picked up"), main: yMain(s, "Picked up", "key-round"),
      cards: [["Tip", "lightbulb", "<p>Take the photos before you move the car, so any mark is on record from the yard.</p>"]] };
  },
  Y2(s) {
    const e = yErr(s), n = s.checks.length, issue = s.issue === "yes";
    const list = TU.sectionCard({ title: "Prep checklist", subtitle: "Tick each one as it's done.", badge: { label: `${n} of ${Y_CHECKS.length}`, variant: n === Y_CHECKS.length ? "success" : "neutral" }, attrs: `data-part="checklist"`,
      items: [`<div class="yd-checks">${Y_CHECKS.map(([k, l, sub]) => TU.checkbox(l, { checked: s.checks.includes(k), sub, attrs: `data-y="check" data-v="${k}"` })).join("")}</div>`] });
    const fuel = TU.sectionCard({ title: "Fuel after prep", attrs: `data-part="fuel"`, items: [TU.radios({ label: "Fuel", items: Y_FUEL, value: s.fuelPrep, required: true, attrs: `data-y-r="fuelPrep"` }),
      e.fuelPrep ? TU.info(e.fuelPrep, { state: "warning", icon: "caution-outline" }) : `<small class="dv-dim">At pick-up: ${yFuel(s.fuelOut) || "&mdash;"}. At least half a tank for a TD.</small>`] });
    const prob = TU.sectionCard({ title: "Anything wrong with the car?", attrs: `data-part="issue"`, badge: s.reported ? { label: "Reported", variant: "error" } : null, items: s.reported ? [
        TU.info(`<b>Reported at ${Y_TIME.reported}.</b> Refurb ticket ${Y_REFURB} for &ldquo;${s.issueType}&rdquo;. The car is on hold, and the RM and the SA are told to offer ${yFirst()} another car or another day (N6).`, { state: "negative", icon: "caution-outline",
          cta: TU.link("Simulate: Refurb fixed it", { attrs: `data-y="fixed"` }) })]
      : [TU.radios({ label: "Issue", items: [["no", "No, it's fine"], ["yes", "Yes, report it"]], value: s.issue, attrs: `data-y-r="issue"` }),
        ...(issue ? [TU.dropdown({ id: "y-issue", label: "What's wrong", options: Y_ISSUES, value: s.issueType, placeholder: "Select the issue", required: true, attrs: `data-y-f="issueType"` }),
          TU.textInput({ label: "Note", value: s.issueNote, id: "y-issue-note", hint: yHint(s, "issueNote"), attrs: `data-y-f="issueNote" autocomplete="off"` }),
          TU.info(`It can't go on a TD. Reporting it opens a Refurb ticket, puts the car on hold and tells the RM and the SA to offer ${yFirst()} another car or another day.`, { state: "warning", icon: "caution-outline" })] : [])] });
    const main = s.reported ? { act: "none", label: "On hold: with Refurb", icon: "pause", ok: false }
      : issue ? { act: "report", label: "Report the issue", icon: "triangle-alert", ok: !!s.issueType } : yMain(s, "Prep done", "check");
    return { desc: "Get it ready for a test drive. Nothing goes to the customer unchecked.", right: TU.badge(s.reported ? "On hold" : `${n} of ${Y_CHECKS.length} done`, { variant: s.reported ? "error" : n === Y_CHECKS.length ? "success" : "neutral" }),
      body: yCarCard(TU.badge(s.reported ? "On hold" : "In prep", { variant: s.reported ? "error" : "information" })) + (s.reported ? prob + list + fuel : list + fuel + prob),
      hint: s.reported ? `Refurb ticket ${Y_REFURB} is open` : issue ? (s.issueType ? "Ready: report the issue" : "To go: the issue type") : yHintOf(s, "Ready: tap Prep done"), main,
      cards: [["Rule", "shield-check", "<p>Anything that would worry a customer (a warning light, a flat, a dent) is an issue. Report it; don't prep around it.</p>"]] };
  },
  Y3(s) {
    const e = yErr(s), p = PEOPLE[Y_T];
    const spots = TU.sectionCard({ title: "Park in the ready row", subtitle: "Cars ready for a TD wait here, closest to the gate.", badge: s.spot ? { label: s.spot, variant: "success" } : null, attrs: `data-part="spot"`,
      items: [TU.timeSlots(`data-y="spot"`, Y_SPOTS.map(([v, taken]) => ({ value: v, label: v, sub: taken || "Free", disabled: !!taken })), s.spot)] });
    const key = TU.sectionCard({ title: "Key back in the key box", attrs: `data-part="keybox"`, items: [TU.textInput({ label: "Key box slot", value: s.keySlot, id: "y-slot", required: true, hint: yHint(s, "keySlot"), error: e.keySlot, attrs: `data-y-f="keySlot" inputmode="numeric" autocomplete="off"` })] });
    const nxt = TU.info(`${p.id} shows <b>Car prepped</b> on the Test Drives queue. When ${yFirst()} checks in tomorrow, you get a Bring task.`, { state: "brand", attrs: `data-part="next"` });
    return { desc: "Park it where the next Yardie can find it, and put the key away.", right: TU.badge("Prepped", { variant: "success", icon: "check-outline" }),
      body: yCarCard(TU.badge("Prepped", { variant: "success" })) + spots + key + nxt, hint: yHintOf(s, "Ready: tap Parked, ready"), main: yMain(s, "Parked, ready", "square-parking"),
      cards: [["Why", "info", "<p>The ready row and the key slot are what the Bring task shows tomorrow. Get them right and the car reaches the hub in minutes.</p>"]] };
  },
  Y4(s) {
    const c = yCar(), sa = ySA(s), tk = TOKEN[Y_T];
    const top = TU.info(`<b>${yFirst()} checked in at ${tk.at}</b> &middot; token ${tk.no} &middot; SA ${sa.name}. Bring the car to the hub.`, { state: "brand", attrs: `data-part="trigger"` });
    const route = TU.fetchedInfo({ title: "Route", items: [["From", `Yard &middot; ready row, ${s.spot || "R-2"}`], ["To", `Hub &middot; ${c.bay}`], ["Distance", "About 500 m, 3 min"], ["Task", `${Y_TASK.bring} &middot; bring`], ["Customer", `${yFirst()} &middot; ${tk.seat}`], ["TD slot", `Today, ${ySlot()}`]], cols: 3, attrs: `data-part="route"` });
    const key = TU.sectionCard({ title: "Collect the key", subtitle: `Key box slot ${s.keySlot || Y_KEY.slot}, tag ${Y_KEY.tag}.`, badge: s.keyScan2 ? { label: "Scanned", variant: "success" } : null, attrs: `data-part="key"`,
      items: [s.keyScan2 ? TU.info(`Key tag ${Y_KEY.tag} scanned: it matches ${c.plate}.`, { state: "positive", icon: "check-outline" }) : `<div class="tu-btns">${TU.button("Scan the key tag", { variant: "primary", size: "medium", icon: "qr-code", attrs: `data-y="scan2"` })}</div>`] });
    const tv = TU.info("Tapping Picked up tells the ground TV and the customer's tracker the car is on its way.");
    return { desc: "The customer is in. Get the car to the hub before the SA meets them.", right: TU.badge(`Token ${tk.no}`, { variant: "warning" }),
      body: top + yCarCard(TU.badge("Ready row", { variant: "neutral" })) + route + key + tv, hint: yHintOf(s, "Ready: tap Picked up, driving over"), main: yMain(s, "Picked up, driving over", "navigation"),
      cards: [["Tip", "lightbulb", `<p>${sa.name.split(" ")[0]} meets ${yFirst()} in about 2 min. Aim to park before then.</p>`]] };
  },
  Y5(s) {
    const c = yCar(), sa1 = ySA(s).name.split(" ")[0], e = yErr(s);
    const bays = TU.sectionCard({ title: "Park at a bay", subtitle: `${sa1} expects it at ${c.bay}.`, badge: s.bay ? { label: s.bay, variant: s.bay === c.bay ? "success" : "warning" } : null, attrs: `data-part="bay"`, items: [
      TU.timeSlots(`data-y="bay"`, Y_BAYS.map(([v, taken]) => ({ value: v, label: v, sub: taken || (v === c.bay ? "Target" : "Free"), disabled: !!taken })), s.bay),
      s.bay && s.bay !== c.bay ? TU.info(`Not the target bay: ${sa1} and the TV get ${s.bay} instead.`, { state: "warning", icon: "caution-outline" }) : ""] });
    const check = TU.sectionCard({ title: "Drop-off check", attrs: `data-part="dropcheck"`, items: [
      TU.textInput({ label: "Odometer (km)", value: s.odoIn, id: "y-odo-in", required: true, placeholder: s.odoOut, hint: yHint(s, "odoIn"), error: e.odoIn, attrs: `data-y-f="odoIn" inputmode="numeric" autocomplete="off"` }),
      TU.radios({ label: "Any new marks since pick-up?", items: [["no", "No"], ["yes", "Yes"]], value: s.marks, attrs: `data-y-r="marks"` }),
      s.marks === "yes" ? TU.textInput({ label: "What are they?", value: s.marksNote, id: "y-marks", required: true, hint: yHint(s, "marksNote"), attrs: `data-y-f="marksNote" autocomplete="off"` }) + TU.info("The note goes on the car with the pick-up photos; Refurb and the SA see it.", { state: "warning", icon: "caution-outline" }) : ""] });
    return { desc: "Park it, check it, and tell the SA where it is.", right: TU.badge("At the hub", { variant: "information" }),
      body: yCarCard(TU.badge("On the way", { variant: "warning" })) + bays + check, hint: yHintOf(s, `Ready: tap Parked at ${s.bay}`), main: yMain(s, `Parked at ${s.bay || c.bay}`, "map-pin"),
      cards: [["Say this", "message-square", `<p>Nothing to say yet: the TV tells ${yFirst()} the car is ready, and ${sa1} gets a push.</p>`]] };
  },
  Y6(s) {
    const c = yCar(), sa = ySA(s), sa1 = sa.name.split(" ")[0], e = yErr(s), bay = s.bay || c.bay;
    if (s.done >= 6) {
      const body = TU.successHeader({ title: `Car at ${bay}, key with ${sa1}`, sub: `Handed over at ${Y_TIME.handed} &middot; ${Y_TASK.bring} closed` })
        + TU.fetchedInfo({ title: "Recorded", items: [["Car", `Hub &middot; ${bay}`], ["Odometer", yKm(yNum(s.odoIn))], ["Fuel", yFuel(s.fuelPrep) || "&mdash;"], ["Key", `${sa.name} (SA)`], ["Spare key", s.spare ? `Key box, slot ${Y_KEY.slot}` : `With ${sa1}`], ["Order state", "CAR AT HUB"]], cols: 3, attrs: `data-part="recorded"` })
        + TU.info(`${sa1}'s task shows the car ready, key in hand. ${sa1} hands the key to ${yFirst()} at the start of the TD (O1).`, { state: "brand" })
        + TU.sectionCard({ title: "Next on your list", attrs: `data-part="queue"`, items: [TU.dataTable({ columns: [{ key: "task", label: "Task" }, { key: "car", label: "Car", subTextKey: "plate" }, { key: "when", label: "When" }],
          rows: [{ task: "Back to the yard", car: c.title, plate: c.plate, when: "After the TD" }, { task: "Prep for tomorrow", car: PCARS.c2.title, plate: PCARS.c2.plate, when: "10:00 AM booking" }] })] });
      return { desc: "The task is closed.", right: TU.badge("Done", { variant: "success", icon: "check-outline" }), body, hint: "Task closed", main: { act: "none", label: "Task complete", icon: "check", ok: false } };
    }
    const avail = PDAS.filter(d => d.status === "AVAILABLE");
    const who = TU.sectionCard({ title: "Hand the key to the SA", subtitle: `Assigned at check-in. ${sa1} meets ${yFirst()} at ${TOKEN[Y_T].seat}.`, attrs: `data-part="who"`, items: [
      TU.dropdown({ id: "y-sa", label: "Hand to", options: avail.map(d => [d.id, `${d.name}${d.id === PDAS[0].id ? " &middot; assigned" : ""}`]), value: s.handTo, required: true, attrs: `data-y-f="handTo"` }),
      TU.fetchedInfo({ items: [["Key", `Main key &middot; ${Y_KEY.tag}`], ["Car", `${c.plate} &middot; ${bay}`]], cols: 2 })] });
    const code = TU.sectionCard({ title: "Confirm with the handover code", subtitle: `${sa1}'s tablet shows a 4-digit code on the car's card. Type it here.`, badge: s.code === Y_CODE ? { label: "Matched", variant: "success" } : null, attrs: `data-part="code"`, items: [
      TU.textInput({ label: "Handover code", value: s.code, id: "y-code", required: true, placeholder: "0000", hint: yHint(s, "code"), error: e.code, attrs: `data-y-f="code" inputmode="numeric" maxlength="4" autocomplete="off"` }),
      `<div class="tu-btns"><span class="sp"></span>${TU.link(`Simulate: ${sa1} reads out ${Y_CODE}`, { attrs: `data-y="simcode"` })}</div>`,
      TU.checkbox("The spare key stays in the key box", { checked: s.spare, sub: `Slot ${Y_KEY.slot}`, attrs: `data-y="spare"` })] });
    return { desc: "The key goes hand to hand; the code proves it reached the right SA.", right: TU.badge(`Key with ${PSTAFF.prep.name.split(" ")[0]}`, { variant: "warning" }),
      body: yCarCard(TU.badge(`At ${bay}`, { variant: "success" })) + who + code, hint: yHintOf(s, `Ready: hand the key to ${sa1}`), main: yMain(s, `Key handed to ${sa1}`, "key-round"),
      cards: [["Rule", "shield-check", "<p>Never leave a key in a parked car. Until the code matches, the key is on your name.</p>"]] };
  },
};
const yView = (s) => Y_VIEWS[Y_STEPS[s.step].id](s);

// ---------------------------------------------------------------- the two frames: the Yardie's phone and Leadverse web
const yStageState = (s, i) => {
  const steps = Y_STEPS.filter(x => x.stage === i), dn = steps.filter(x => x.idx < s.done).length;
  return { steps, dn, st: dn === steps.length ? "done" : Y_STEPS[s.step].stage === i ? "cur" : "todo" };
};
function yPhone(s, v) {
  const st = Y_STEPS[s.step], y = PSTAFF.prep, m = v.main;
  const bar = `<div class="ydm-stg" data-part="stages">${Y_STAGES.map((g, i) => { const { steps, dn, st: k } = yStageState(s, i);
    return `<button type="button" class="s ${k}" data-y-step="${steps[0].idx}"><span class="n">${dn === steps.length ? ic("check") : i + 1}</span><span class="t"><b>${g.name}</b><span class="dots">${steps.map(x => `<i class="${x.idx < s.done ? "done" : ""}${x.idx === s.step ? " on" : ""}"></i>`).join("")}</span></span></button>`; }).join("")}</div>`;
  const pos = Y_STEPS.filter(x => x.stage === st.stage).findIndex(x => x.idx === s.step) + 1;
  return `<div class="ph"><div class="ph-scr yd ydm">${phStatus(st.stage ? "2:28" : "4:05")}
    <div class="yd-bar"><span class="v2-logo sm">${ic("layers")}</span><div><b>Yard tasks</b><small>${y.name} &middot; Yardie &middot; ${MK.hub}</small></div><span class="v2-av staff">${y.init}</span></div>
    ${bar}
    <div class="ydm-body dls" data-y-scroll><div class="ydm-h">${s.step ? `<button type="button" class="ydm-back" data-y="prev" aria-label="Back">${ic("chevron-left")}</button>` : ""}<div><small>Step ${pos} of 3 &middot; ${st.short}</small><h3>${st.title}</h3><p>${v.desc}</p></div></div>
      <div class="tu-stack">${v.body}</div></div>
    <div class="ydm-foot"><small class="ydm-hint" data-y-hint>${v.hint}</small><button type="button" class="ph-btn" data-y="${m.act}" data-y-main${m.ok ? "" : " disabled"}>${ic(m.icon)}${m.label}</button></div>
  </div></div>`;
}
function yPane(s) {
  const c = yCar(), p = PEOPLE[Y_T], two = Y_STEPS[s.step].stage === 1, sa = ySA(s);
  const [tone, label] = s.done >= 6 ? ["green", "Key with the SA"] : s.reported ? ["red", "On hold"] : s.done >= 5 ? ["green", "At the hub"] : s.done >= 4 ? ["amber", "On the way"] : s.done >= 2 ? ["green", "Prepped"] : s.done >= 1 ? ["violet", "In prep"] : ["grey", "In the yard"];
  const f = (k, val) => `<div class="v2-f"><div><small>${k}</small><b>${val}</b></div></div>`;
  return `<aside class="v2-lead" data-part="pane">
    <div class="v2-lh"><span class="v2-av lg yd-carav" style="background:${c.color}">${ic("car-front")}</span><div><b>${c.title}</b><span class="v2-pill ${tone}">${label}</span></div><div class="v2-lh-ic">${ic("menu")}</div></div>
    <div class="v2-ltabs"><span class="on">${ic("clipboard-list")}Task</span><span>${ic("car")}Car</span><span>${ic("history")}Activity</span></div>
    <div class="v2-lscroll">
      <div class="v2-sec">Task</div>
      <div class="v2-group">${f("Task ID", two ? Y_TASK.bring : Y_TASK.prep)}${f("Type", two ? "Bring to the hub" : "Prep")}${f("Yardie", PSTAFF.prep.name)}${f("Due", two ? "Now: the customer is in" : "Today, 6:00 PM")}</div>
      <div class="v2-sec">Car</div>
      <div class="v2-group">${f("Plate", c.plate)}${f("Appt ID", c.appt)}${f("Key tag", Y_KEY.tag)}${f("Where now", yWhere(s))}</div>
      <div class="v2-sec">Booking</div>
      <div class="v2-group">${f("Order ID", p.id)}${f("Customer", p.name)}${f("TD slot", `${two ? "Today" : "Tomorrow"}, ${ySlot()}`)}${two ? f("SA", sa.name) + f("Token", `${TOKEN[Y_T].no} &middot; ${TOKEN[Y_T].seat}`) : ""}</div>
    </div>
  </aside>`;
}
function yDesk(s, v) {
  const st = Y_STEPS[s.step], c = yCar(), m = v.main;
  const stages = `<div class="v2-stages" data-part="stages">${Y_STAGES.map((g, i) => { const { steps, dn, st: k } = yStageState(s, i);
    return `<div class="v2-stg ${k} yd-stgd" data-y-step="${steps[0].idx}"><span class="c">${ic(dn === steps.length ? "check" : g.icon)}</span><b>${i + 1}. ${g.name}</b><span>${dn === steps.length ? "Done" : `${dn} of ${steps.length} &middot; ${g.when}`}</span></div>`; }).join("")}</div>`;
  const sub = Y_STEPS.filter(x => x.stage === st.stage);
  const stepper = TU.stepper(sub.map((x, i) => ({ label: x.short, number: i + 1, status: x.idx === s.step ? "active" : x.idx < s.done ? "completed" : "default", attrs: `data-y-step="${x.idx}"` })), `data-part="substeps"`);
  const foot = `<div class="v2-foot" data-part="foot"><button class="v2-btn" ${s.step ? `data-y="prev"` : "disabled"}>${ic("arrow-left")}Previous</button>
    <span class="v2-hint" data-y-hint>${v.hint}</span>
    <div class="v2-split"><button class="v2-btn primary" data-y="${m.act}" data-y-main${m.ok ? "" : " disabled"}>${ic(m.icon)}${m.label}</button></div></div>`;
  const body = `<div class="v2-body">${yPane(s)}<section class="v2-center">${stages}<div class="v2-content scrolls dls" data-y-scroll>${head2(st.title, v.desc, v.right || "")}<div class="tu-stack">${stepper}${v.body}</div></div>${foot}</section>${gptMini(v.cards || [])}</div>`;
  return shell({ active: "tasks", who: "prep", crumb: crumbOf("Tasks", "Yard", `${c.title} - ${st.stage ? Y_TASK.bring : Y_TASK.prep}`), body });
}

// ---------------------------------------------------------------- the spec beside the screen
const Y_SPEC = {
  Y1: { purpose: "The prep task arrives the day before the TD (P8). The Yardie finds the car, proves it's the right one, and records how it left the yard.",
    data: ["Yard task (prep): car, plate, yard spot, why, due", "Key register: the key tag and its key box slot", "Car: the last odometer reading and fuel level", "Camera: four photos, one each side"],
    rules: ["The key tag scan (or the plate typed) must match the car on the task", "Odometer: at least the last reading; over 1,000 km more is flagged", "Fuel level and all four photos are required", "Picked up starts the prep: the car is with the Yardie"],
    exits: ["Y2 Prep the car"] },
  Y2: { purpose: "Get the car ready for a test drive, or report what stops it.",
    data: ["Prep checklist (six items, set per hub)", "Fuel after prep", "Refurb: a ticket for an issue"],
    rules: ["All six items ticked and fuel at least half, then Prep done", "An issue (damage, flat battery, a warning light) can't be prepped around: report it", "Reporting puts the car on hold, opens a Refurb ticket and tells the RM and the SA to offer another car or another day (N6)"],
    exits: ["Y3 Park it ready", "Issue: ON HOLD, Refurb, then back here once it's fixed"] },
  Y3: { purpose: "Park the car where the Bring task will look for it, and put the key away.",
    data: ["Yard map: the ready row and its free spots", "Key register: the key box slot"],
    rules: ["A free ready-row spot and the key box slot are required", "Parked, ready closes the prep task and turns the booking's car readiness green on the Test Drives queue (P8)"],
    exits: ["Stage 2: the Bring task arrives when the customer checks in (I2)"] },
  Y4: { purpose: "The customer checked in: the Bring task arrives with the route, the token and the SA.",
    data: ["Check-in: the token, the seat, the time (I2)", "SA assignment (S1)", "Yard task (bring): from the ready-row spot to the target bay"],
    rules: ["Scan the key tag from the key box; it must match the car", "Picked up tells the ground TV and the customer's tracker: on its way, about 3 min"],
    exits: ["Y5 Park at the hub"] },
  Y5: { purpose: "Park at a bay, check the car against the pick-up, and tell the SA where it is.",
    data: ["Hub bays and which are free", "The pick-up odometer and photos"],
    rules: ["The target bay is preselected; another free bay is fine and the SA and the TV get it", "Odometer: at least the pick-up reading; more than 5 km more is flagged", "New marks need a note; it goes on the car with the photos", "Parked sets the order to CAR AT HUB, the TV to Car ready, and pushes the SA (S2)"],
    exits: ["Y6 Hand the key to the SA"] },
  Y6: { purpose: "The key goes from the Yardie to the SA, hand to hand, proved by the code on the SA's tablet.",
    data: ["SA roster: the assigned SA, and who else is available", "The SA's task: a 4-digit handover code on the car's card"],
    rules: ["The code must match; until then the key is on the Yardie's name", "The spare key stays in the key box unless ticked off", "Key handed closes the Bring task; the SA hands the key to the customer when the TD starts (O1)"],
    exits: ["COMPLETED: the task closes; the car is ready for the TD (T1, then O1)"] },
};
const Y_OPEN = ["The key handover: a 4-digit code on the SA's tablet, or the SA scans the key tag?", "The prep checklist: the same six items at every hub, or set per hub?", "Fuel: always at least half, or a full tank for a long-route TD?", "A walk-in (prep now, then bring): skip Park ready and drive straight over?"];
function yPropRows(s, rows) {
  return rows.map(p => { const st = yPSt(s, p), after = p.after || "&mdash;";
    return `<div class="yp-row ${st}"><div class="yp-k"><span class="yp-obj">${ic(Y_OBJ[p.obj][1])}${Y_OBJ[p.obj][0]}</span><b>${p.label}</b><code>${p.obj}.${p.key}</code></div>
      <div class="yp-v"><span class="b">${p.before}</span>${ic("arrow-right")}<span class="a">${after}</span><em>${st === "upd" ? "Updated" : st === "now" ? "On the tap" : "Later"}</em></div></div>`; }).join("");
}
function ySpec(s) {
  const st = Y_STEPS[s.step], sp = Y_SPEC[st.id], rows = yProps(s).filter(p => p.at === s.step);
  const list = (h, icon, items) => `<div class="sp-sec"><h4>${ic(icon)}${h}</h4><ul class="sp-list">${items.map(x => `<li>${ic("chevron-right")}<span>${x}</span></li>`).join("")}</ul></div>`;
  return `<div class="sp-eyebrow">Y &middot; Yardie <span class="trk" style="background:var(--lv-soft); color:var(--lv-soft-ink);">Stage ${st.stage + 1} &middot; ${Y_STAGES[st.stage].name}</span><span class="trk" style="background:var(--surface-2);">${YV.market === "au" ? "Australia" : "UAE"}</span></div>
    <div class="sp-title"><span class="sid">${st.id}</span><h2>${st.title}</h2></div>
    <p class="sp-purpose">${sp.purpose}</p>
    <div class="sp-meta"><span>${ic("user")}Yardie</span><span>${ic(YV.dev === "phone" ? "smartphone" : "monitor")}${YV.dev === "phone" ? "Leadverse mobile" : "Leadverse web"}</span><span>${ic("layers")}Turbo UI</span></div>
    <div class="sp-sec yp-sec" data-part="props"><h4>${ic("database")}Properties the tap &ldquo;${st.tap}&rdquo; updates<span class="yp-n">${rows.length}</span></h4>
      <div class="yp-list">${yPropRows(s, rows)}</div>
      <button class="linklike yp-all" data-yv="props">All ${yProps(s).length} properties, both stages &rarr;</button></div>
    ${list("Data", "file-text", sp.data)}${list("Rules", "scale", sp.rules)}${list("Exits", "log-out", sp.exits)}${list("Open decisions", "circle-help", Y_OPEN)}`;
}

// ---------------------------------------------------------------- the Properties view: every property, by object
function yPropsDoc(s) {
  const all = yProps(s), upd = all.filter(p => yPSt(s, p) === "upd").length;
  const by = Object.keys(Y_OBJ).map(o => [o, all.filter(p => p.obj === o)]);
  const ref = { prep: Y_TASK.prep, bring: Y_TASK.bring, car: `${yCar().plate} &middot; appt ${yCar().appt}`, key: Y_KEY.tag, order: PEOPLE[Y_T].id, tv: `Token ${TOKEN[Y_T].no}`, sa: ySA(s).name };
  const who = (o) => ["order", "tv", "sa"].includes(o) ? "System, on the Yardie's tap" : "The Yardie's tap";
  return `<div class="wrap">
    <h1 class="doc-h">Every property the Yardie updates</h1>
    <p class="doc-sub">${all.length} property changes across the two stages, on ${by.length} objects. Each one is set by a tap on the Yardie's task: the ones in the TD order, on the ground TV and in the SA's task are set by the system on that tap. ${upd} are updated so far in this walkthrough; the rest show the value the form would send. Click a row to open its step.</p>
    ${by.map(([o, rows]) => `<div class="bp-phase"><div class="bp-phead"><span class="pv-gl">${ic(Y_OBJ[o][1])}</span><b>${Y_OBJ[o][0]}</b><span class="po">${ref[o]} &middot; ${rows.length} changes &middot; ${who(o)}</span></div>
      <div class="bp-scroll"><table class="bp yp-tbl"><thead><tr><th style="width:200px;">Property</th><th style="width:190px;">Set at</th><th>Before</th><th>After</th><th style="width:110px;">Status</th></tr></thead>
      <tbody>${rows.map(p => { const st = yPSt(s, p), x = Y_STEPS[p.at];
        return `<tr data-y-goto="${p.at}" class="${st}"><td><b>${p.label}</b><br><code>${o}.${p.key}</code></td><td><span class="sid">${x.id}</span> <span class="nm">${x.title}</span><br><span class="own">On &ldquo;${x.tap}&rdquo; &middot; stage ${x.stage + 1}</span></td><td>${p.before}</td><td><b>${p.after || "&mdash;"}</b></td>
          <td>${st === "upd" ? `<span class="yp-st upd">Updated</span>` : st === "now" ? `<span class="yp-st now">This step</span>` : `<span class="yp-st later">Later</span>`}</td></tr>`; }).join("")}</tbody></table></div></div>`).join("")}
  </div>`;
}

// ---------------------------------------------------------------- the page
function yRail(s) {
  return Y_STAGES.map((g, gi) => `<div class="pv-group"><div class="pv-ghead"><span class="pv-gl">${gi + 1}</span><div class="pv-gt"><b>${g.name}</b><span>${g.when}</span></div></div>
    ${Y_STEPS.filter(x => x.stage === gi).map(x => `<button class="pv-item${x.idx === s.step ? " on" : ""}" data-y-step="${x.idx}"><span class="sid">${x.id}</span><span class="snm">${x.title}</span>${ic(x.idx < s.done ? "circle-check" : YV.dev === "phone" ? "smartphone" : "monitor")}</button>`).join("")}</div>`).join("")
    + `<div class="pv-legend"><div>${ic("info")}Each tap updates the properties shown in the spec. The Properties view lists them all.</div><div>${ic("rotate-ccw")}<button class="linklike" data-y="reset">Start over</button></div></div>`;
}
function yHash() {
  const h = `#${YV.market}-${YV.view === "props" ? "props" : `${YV.dev}-${Y_STEPS[YS.step].id}`}`;
  try { if (location.hash !== h) history.replaceState(null, "", h); } catch (e) { /* sandboxed viewers may refuse */ }
}
function yRender() {
  const s = YS, walk = YV.view === "walk";
  document.querySelectorAll("#yd-markets [data-market]").forEach(b => b.classList.toggle("on", b.dataset.market === YV.market));
  document.querySelectorAll("#yd-devs [data-dev]").forEach(b => { b.classList.toggle("on", b.dataset.dev === YV.dev); b.disabled = !walk; });
  document.querySelectorAll("#yd-views [data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === YV.view));
  $y("#yd-walk").classList.toggle("on", walk);
  $y("#yd-propsview").classList.toggle("on", !walk);
  const back = $y(".dv-back");
  if (back) back.href = `./#${YV.market === "au" ? "au-" : ""}booked-S2`;
  if (!walk) {
    $y("#yd-props").innerHTML = yPropsDoc(s);
  } else {
    const st = Y_STEPS[s.step], v = yView(s), ph = YV.dev === "phone";
    $y("#yd-rail").innerHTML = yRail(s);
    $y("#yd-stagehead").innerHTML = `<span class="pv-devchip">${ic(ph ? "smartphone" : "monitor")}${ph ? "Yardie's phone &middot; Leadverse mobile" : "Leadverse web"}</span><span class="pv-scrname">${st.id} &middot; Yard task &rsaquo; ${st.title}</span>`;
    $y("#yd-stage").innerHTML = ph
      ? `<div class="dev dev-phone" data-kind="phone"><div class="viewport"><div class="scr scr-ph">${yPhone(s, v)}</div></div></div>`
      : `<div class="dev dev-desktop" data-kind="desktop"><div class="urlbar">${ic("lock")}<span class="u">c24-lead-verse-ui.cars24.team/yard/tasks/${st.stage ? Y_TASK.bring : Y_TASK.prep}</span></div><div class="viewport"><div class="scr">${yDesk(s, v)}</div></div></div>`;
    $y("#yd-stagefoot").innerHTML = `<button class="pv-navbtn" data-y-step="${s.step - 1}"${s.step ? "" : " disabled"}>${ic("chevron-left")}${s.step ? Y_STEPS[s.step - 1].id : "Back"}</button><span class="pos">Step ${s.step + 1} of 6 &middot; stage ${st.stage + 1}</span><button class="pv-navbtn" data-y-step="${s.step + 1}"${s.step < 5 ? "" : " disabled"}>${s.step < 5 ? Y_STEPS[s.step + 1].id : "Next"}${ic("chevron-right")}</button>`;
    $y("#yd-spec").innerHTML = ySpec(s);
  }
  yHash();
  if (window.lucide) lucide.createIcons();
  if (walk) { yFit(); yMount(); }
}
// keep the action area's scroll when the same step draws again
function yRedraw() {
  const sc = $y("#yd-stage [data-y-scroll]"), top = sc ? sc.scrollTop : 0, step = YS.step;
  yRender();
  const sc2 = $y("#yd-stage [data-y-scroll]");
  if (sc2 && YS.step === step) sc2.scrollTop = top;
}
function yFit() {
  const stage = $y("#yd-stage"), dev = stage && stage.querySelector(".dev");
  if (!dev) return;
  const ph = dev.dataset.kind === "phone", narrow = window.matchMedia("(max-width: 760px)").matches;
  const W = ph ? 360 : 1180, H = ph ? 740 : 760, bw = ph ? 20 : 2, bh = ph ? 20 : 32;
  let k = (stage.clientWidth - 36 - bw) / W;
  if (!narrow) k = Math.min(k, (stage.clientHeight - 12 - bh) / H);
  k = Math.max(ph ? 0.5 : 0.18, Math.min(1, k));
  const vp = dev.querySelector(".viewport");
  vp.style.width = Math.round(W * k) + "px";
  vp.style.height = Math.round(H * k) + "px";
  dev.querySelector(".scr").style.transform = `scale(${k})`;
}
// typing only updates the state, the errors, the main button and the spec, so a tap right after still lands
function ySync() {
  const s = YS, v = yView(s), e = yErr(s);
  document.querySelectorAll("#yd-stage [data-y-f]").forEach(f => {
    const box = f.closest(".tu-ti"), k = f.dataset.yF;
    if (!box) return;
    const hl = box.querySelector(".hl");
    box.classList.toggle("err", !!e[k]);
    if (hl) hl.innerHTML = e[k] || yHint(s, k);
  });
  const m = $y("#yd-stage [data-y-main]");
  if (m) m.disabled = !v.main.ok;
  const h = $y("#yd-stage [data-y-hint]");
  if (h) h.innerHTML = v.hint;
  $y("#yd-spec").innerHTML = ySpec(s);
  if (window.lucide) lucide.createIcons({ root: $y("#yd-spec") });
}
function yMount() {
  document.querySelectorAll("#yd-stage [data-y-f]").forEach(f => {
    const k = f.dataset.yF;
    if (f.tagName === "SELECT") f.addEventListener("change", () => { YS[k] = f.value; yRedraw(); });
    else f.addEventListener("input", () => {
      if (k === "code") { const d = f.value.replace(/\D/g, "").slice(0, 4); if (d !== f.value) f.value = d; }
      YS[k] = f.value; ySync();
    });
  });
}
function yGo(i) {
  i = Math.max(0, Math.min(5, i));
  if (i > YS.done) yFill(YS, i);
  YS.step = i;
  YV.view = "walk";
  yRender();
}
function yMarket(m) {
  applyMarket(m);
  STAFF_AV.prep = PSTAFF.prep.init;
  YV.market = m;
}
// every tap changes the state, then the page draws again
function yAct(a, el) {
  const s = YS, v = el.dataset.v;
  const flip = (list, x) => list.includes(x) ? list.filter(y => y !== x) : [...list, x];
  switch (a) {
    case "next": if (!yView(s).main.ok) return; s.done = Math.max(s.done, s.step + 1); if (s.step < 5) s.step += 1; break;
    case "prev": s.step = Math.max(0, s.step - 1); break;
    case "scan": s.keyScan = true; break;
    case "scan2": s.keyScan2 = true; break;
    case "photo": s.photos = flip(s.photos, v); break;
    case "check": s.checks = flip(s.checks, v); break;
    case "report": s.reported = true; break;
    case "fixed": Object.assign(s, { issue: "no", issueType: "", issueNote: "", reported: false }); break;
    case "spot": s.spot = v; break;
    case "bay": s.bay = v; break;
    case "simcode": s.code = Y_CODE; break;
    case "spare": s.spare = !s.spare; break;
    case "reset": YS = yNew(); break;
    default: return;
  }
  yRedraw();
}
function yBoot() {
  const h = (location.hash || "").replace(/^#/, "");
  const m = h.match(/^(ae|au)(?:-(props)|-(phone|desktop)-(Y[1-6]))?$/);
  yMarket(m ? m[1] : "ae");
  YS = yNew();
  if (m && m[2]) YV.view = "props";
  if (m && m[3]) { YV.dev = m[3]; const i = Y_STEPS.findIndex(x => x.id === m[4]); yFill(YS, i); YS.step = i; }
  if (!m && window.matchMedia("(max-width: 760px)").matches) YV.dev = "phone";
  document.addEventListener("click", (e) => {
    // the folded CarGPT strip opens its tips; a click elsewhere closes them
    const menu = e.target.closest("#yd-stage [data-menu]");
    document.querySelectorAll("#yd-stage .v2-menu").forEach(x => { if (!menu || x !== menu.nextElementSibling) x.hidden = true; });
    if (menu) { const pop = menu.nextElementSibling; if (pop) pop.hidden = !pop.hidden; return; }
    const mk = e.target.closest("#yd-markets [data-market]");
    if (mk) { const at = YS.step, done = YS.done; yMarket(mk.dataset.market); YS = yNew(); yFill(YS, Math.max(at, done)); YS.step = at; yRender(); return; }
    const dv = e.target.closest("#yd-devs [data-dev]");
    if (dv && !dv.disabled) { YV.dev = dv.dataset.dev; yRender(); return; }
    const vw = e.target.closest("#yd-views [data-view], [data-yv]");
    if (vw) { YV.view = vw.dataset.view || vw.dataset.yv; yRender(); window.scrollTo(0, 0); return; }
    const gt = e.target.closest("[data-y-goto]");
    if (gt) { yGo(+gt.dataset.yGoto); return; }
    const step = e.target.closest("[data-y-step]");
    if (step && !step.disabled) { yGo(+step.dataset.yStep); return; }
    const r = e.target.closest("#yd-stage [data-y-r]");
    if (r) { const k = r.dataset.yR; YS[k] = r.dataset.v; if (k === "issue" && r.dataset.v === "no") { YS.issueType = ""; YS.issueNote = ""; } if (k === "marks" && r.dataset.v === "no") YS.marksNote = ""; yRedraw(); return; }
    const a = e.target.closest("#yd-stage [data-y], #yd-rail [data-y]");
    if (a && !a.disabled) { e.preventDefault(); yAct(a.dataset.y, a); }
  });
  window.addEventListener("resize", yFit);
  yRender();
}
yBoot();
