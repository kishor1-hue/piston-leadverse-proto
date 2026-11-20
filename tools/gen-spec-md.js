// Builds the complete PISTON spec as Markdown from the prototype's own spec files.
// usage: node tools/gen-spec-md.js . PISTON-spec.md
const fs = require("fs"), vm = require("vm"), path = require("path");
const [repo, out] = process.argv.slice(2);
const read = (f) => fs.readFileSync(path.join(repo, f), "utf8");

// ---------------------------------------------------------------- load the spec
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(read("piston-data.js") + "\n" + read("piston-anatomy.js") + `
this.X = { TRACKS, MARKETS, CHECKIN_WAYS, CTX, FLOWS, PHASES, STEPS, PRE_FROM, pick, ctxResolve, stepById, stepsForTrack,
  applyMarket, anatomyFor, MK, PREQ, PEOPLE, PSTAFF, PDAS, PAY_MODES, P360, MARKET_CONFIG, COPY, money };`, ctx);
const X = ctx.X;

// the What changed view: run renderChanges() against a stub DOM and keep its HTML
const pj = read("piston.js");
const from = pj.indexOf("function stepLink("), to = pj.indexOf("// ================================================================== render + events");
const captured = {};
const ctx2 = { console, captured };
vm.createContext(ctx2);
vm.runInContext(read("piston-data.js") + "\n" + `
const $ = (sel) => ({ set innerHTML(v) { captured[sel] = v; } });
const icon = () => "";
` + pj.slice(from, to) + "\nrenderChanges();", ctx2);
const changesHtml = captured["#pv-changes"];

// ---------------------------------------------------------------- text helpers
const ENT = { rsaquo: "›", lsaquo: "‹", rarr: "→", larr: "←", middot: "·", mdash: "—", ndash: "–", hellip: "…", amp: "&", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", nbsp: " ", quot: '"', lt: "<", gt: ">", times: "×", check: "✓" };
const decode = (s) => s.replace(/&([a-z]+);/g, (m, e) => ENT[e] ?? m);
// inline HTML to Markdown
function md(s) {
  if (s == null) return "";
  s = String(s)
    .replace(/<button[^>]*>(.*?)<\/button>/g, "$1")
    .replace(/<\/?(b|strong)>/g, "**").replace(/<\/?em>/g, "*")
    .replace(/<br\s*\/?>/g, " ").replace(/<small>/g, " (").replace(/<\/small>/g, ")")
    .replace(/<[^>]+>/g, "");
  return decode(s).replace(/\s+/g, " ").trim();
}
const cell = (s) => md(s).replace(/\|/g, "\\|") || "—";
const table = (head, rows) => rows.length ? `| ${head.join(" | ")} |\n| ${head.map(() => "---").join(" | ")} |\n${rows.map(r => `| ${r.map(cell).join(" | ")} |`).join("\n")}\n` : "";
const list = (items) => (items || []).map(x => `- ${md(x)}`).join("\n");
const slug = (s) => md(s).toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-");

// ---------------------------------------------------------------- variants
// A value can differ by track, check-in way (hub tracks only) and market. Resolve it for every combination
// a step is in, group equal results, and name each group as briefly as possible.
const TR = { booked: "Booked", walkin: "Walk-in", vtd: "Video TD" };
const WAY = { staff: "by staff", qr: "seat QR" };
const MKT = { ae: "UAE", au: "Australia" };
const modesFor = (t) => t === "vtd" ? ["staff"] : ["staff", "qr"];
function combos(tracks) {
  const c = [];
  for (const t of tracks) for (const mode of modesFor(t)) for (const market of ["ae", "au"]) c.push({ t, mode, market });
  return c;
}
function withCtx({ market, mode }, fn) {
  X.applyMarket(market);
  X.CTX.mode = mode;
  return fn();
}
function variants(tracks, fn) {
  const groups = new Map();
  for (const c of combos(tracks)) {
    const v = withCtx(c, () => fn(c.t));
    const key = JSON.stringify(v ?? null);
    if (!groups.has(key)) groups.set(key, { v, cs: [] });
    groups.get(key).cs.push(c);
  }
  X.applyMarket("ae"); X.CTX.mode = "staff";
  return [...groups.values()];
}
function label(cs, tracks) {
  const all = combos(tracks);
  if (cs.length === all.length) return "";
  // per track, the qualifiers it is covered with: "" (fully), ", by staff", " (UAE)", ", seat QR (Australia)"
  const quals = [];
  for (const t of tracks) {
    const mine = cs.filter(c => c.t === t);
    if (!mine.length) continue;
    const modes = modesFor(t);
    const byMode = modes.map(m => mine.filter(c => c.mode === m).map(c => c.market));
    const fullMode = (ms) => ms.length === 2;
    let q;
    if (byMode.every(fullMode)) q = [""];
    else if (byMode.every(ms => ms.length && ms.join() === byMode[0].join())) q = [` (${byMode[0].map(m => MKT[m]).join(", ")})`];
    else q = modes.map((m, i) => byMode[i].length ? `${t === "vtd" ? "" : ", " + WAY[m]}${fullMode(byMode[i]) ? "" : ` (${byMode[i].map(x => MKT[x]).join(", ")})`}` : null).filter(x => x != null);
    quals.push([t, q]);
  }
  // tracks with the same qualifiers read as one: "Booked and walk-in, by staff"
  const groups = new Map();
  quals.forEach(([t, q]) => { const k = JSON.stringify(q); if (!groups.has(k)) groups.set(k, { ts: [], q }); groups.get(k).ts.push(t); });
  const parts = [];
  for (const { ts, q } of groups.values()) {
    const who = ts.map((t, i) => i ? TR[t].toLowerCase() : TR[t]).join(" and ");
    q.forEach(x => parts.push(who + x));
  }
  return parts.join("; ");
}
// renders a field that may vary: one block if it doesn't, a labelled block per group if it does
function varied(tracks, fn, render) {
  const vs = variants(tracks, fn).filter(g => g.v != null && !(Array.isArray(g.v) && !g.v.length));
  if (!vs.length) return "";
  if (vs.length === 1 && !label(vs[0].cs, tracks)) return render(vs[0].v);
  return vs.map(g => { const l = label(g.cs, tracks); return `${l ? `*${l}:*\n\n` : ""}${render(g.v)}`; }).join("\n\n");
}

// a one-line value: inline when the same everywhere, a nested list of variants when not
function inline(tracks, fn) {
  const vs = variants(tracks, fn).filter(g => g.v != null && g.v !== "");
  if (!vs.length) return "";
  if (vs.length === 1 && !label(vs[0].cs, tracks)) return md(vs[0].v);
  return "\n" + vs.map(g => `  - *${label(g.cs, tracks) || "Everywhere else"}:* ${md(g.v)}`).join("\n");
}
const DEVICE = { desktop: "Leadverse web", tablet: "Leadverse on the SA's tablet", customer: "SA's tablet, turned to the customer", video: "Leadverse web with a video panel", pair: "Customer's phone + Leadverse web", tvpair: "Ground TV + the customer's phone", phone: "Phone", none: "No screen, a human moment" };

// ---------------------------------------------------------------- document
const L = [];
const P = (...s) => s.forEach(x => L.push(x, ""));
const stepName = (s, t) => md(X.pick(s.name, t || s.tracks[0]));
const names = (s) => { const ns = [...new Set(s.tracks.map(t => stepName(s, t)))]; return ns.join(" / "); };

P(`# PISTON v2: the ideal test-drive journey`,
  `The complete spec behind the PISTON prototype, for the UAE and Australia, on the Leadverse design. It covers every step of the booked, walk-in and video test drive, with the logic that moves a customer from one step to the next: entry and exit conditions, states, screens, fields, actions and the decisions still open.`,
  `- **Prototype:** https://claude.ai/artifact/TWiP1PVT2sEx7vsug4dbH5\n- **Code:** https://github.com/kishor1-hue/piston-leadverse-proto\n- **Source:** generated from the spec files (\`piston-data.js\`, \`piston-anatomy.js\`, \`piston.js\`) by \`tools/gen-spec-md.js\`; rerun it after any spec change\n- **Steps:** ${X.STEPS.length}, in ${X.PHASES.length} phases (P, I, S, T, O, N, M), across 3 tracks, 2 markets and 2 check-in ways`,
  `Examples use the UAE people and cars (Fatima, Ahmed, Khalid, Omar). Australia runs the same journey with its own people, places and copy (Emily, Jack, Liam, Josh): see [Markets](#9-markets-configured-not-rebuilt).`);

P(`## Contents`, [
  "1. [How to read this](#1-how-to-read-this)",
  "2. [The three flows](#2-the-three-flows)",
  "3. [Phases](#3-phases)",
  "4. [Journey maps](#4-journey-maps)",
  "5. [States](#5-states)",
  "6. [Core logic](#6-core-logic)",
  "7. [Finance pre-approval question sets](#7-finance-pre-approval-question-sets)",
  "8. [Every step](#8-every-step)",
  "9. [Markets: configured, not rebuilt](#9-markets-configured-not-rebuilt)",
  "10. [What changed after review](#10-what-changed-after-review)",
].join("\n"));

// ---------------------------------------------------------------- 1
P(`## 1. How to read this`);
P(`**Tracks.** Every step belongs to one or more tracks.`,
  table(["Track", "Example customer", "What it is"], [
    ["Booked hub TD", "Fatima Al Suwaidi", "Booked on the TD booking call (or self-serve in the app), drives at the hub"],
    ["Walk-in hub TD", "Ahmed Saleh", "Arrives at the hub with no booking"],
    ["Video TD", "Khalid Al Jaberi", "A walkaround over video with an operator; can lead to a hub TD"],
  ]));
P(`**Check-in ways.** Hub customers check in one of two ways, with the same form. The market sets the default; both work everywhere.`,
  table(["Way", "Who fills the form", "Default in"], [
    ["By staff", "A receptionist or SA, with the customer", "UAE (and India)"],
    ["Seat QR", "The customer, on their own phone, from the QR on their seat", "Australia"],
  ]));
P(`**Markets.** ${Object.values(X.MARKETS).map(m => `${m.label} (tenant \`${m.tenant}\`)`).join(" and ")}. One build; the market changes defaults, documents and copy.`,
  `**Variants.** Where a value differs by track, check-in way or market, it is shown once per variant, labelled in italics (for example *Walk-in, seat QR:*). No label means it is the same everywhere.`,
  `**States** are written in capitals (CHECKED IN, TD STARTED). **Branch** steps are side trips off the main path. **Build** says whether a screen reuses, extends or is new to Leadverse.`);

// ---------------------------------------------------------------- 2
P(`## 2. The three flows`);
for (const k of ["booked", "walkin", "vtd"]) {
  const f = X.FLOWS[k];
  const path = X.stepsForTrack(k).filter(s => !s.branch && s.phase !== "M").map(s => s.id).join(" → ");
  P(`### ${X.TRACKS[k].label}`,
    `**Sources**\n\n${list(f.source)}`,
    `**Entry conditions**\n\n${list(f.entry)}`,
    `**How it can end**\n\n${table(["Outcome", "Meaning"], f.exit.map(([, st, txt]) => [st, txt]))}`,
    `**Main path:** ${path}`);
}

// ---------------------------------------------------------------- 3
P(`## 3. Phases`);
for (const ph of X.PHASES) {
  const tracks = ["booked", "walkin", "vtd"].filter(t => X.stepsForTrack(t).some(s => s.phase === ph.id));
  const steps = X.STEPS.filter(s => s.phase === ph.id).map(s => `${s.id} ${names(s)}`).join(", ");
  const one = (key) => inline(tracks, (t) => X.pick(ph[key], t));
  P(`### ${ph.id} · ${ph.name}`,
    [`- **When:** ${one("when")}`, `- **Owner:** ${one("owner")}`, `- **Entry:** ${one("entry")}`, `- **Exit:** ${one("exit")}`, `- **Steps:** ${steps}`].join("\n"));
}

// ---------------------------------------------------------------- 4
P(`## 4. Journey maps`,
  `Each map shows every step on the track and every exit between them, by staff for hub check-in (the seat QR exits are listed under I1 in [Every step](#8-every-step)). Edge labels name the state reached, or a short form of the condition.`);
const mlabel = (s) => md(s).replace(/["[\]{}()|<>#;]/g, "").replace(/\s+/g, " ").trim();
const short = (x) => { const w = mlabel(x.state || X.pick(x.when, "booked")); return w.length > 42 ? w.slice(0, 40).replace(/\s\S*$/, "") + "…" : w; };
for (const t of ["booked", "walkin", "vtd"]) {
  const steps = X.stepsForTrack(t), ids = steps.map(s => s.id);
  const lines = ["flowchart TD"];
  withCtx({ market: "ae", mode: "staff" }, () => {
    steps.forEach(s => lines.push(`  ${s.id}["${s.id} ${mlabel(stepName(s, t))}"]`));
    let ends = 0;
    steps.forEach(s => (X.pick(s.exits, t) || []).forEach(x => {
      const lab = short({ ...x, when: X.pick(x.when, t) });
      if (!x.to) { ends++; lines.push(`  ${s.id} -->|${lab}| END${ends}(("end"))`); }
      else if (!ids.includes(x.to)) lines.push(`  ${s.id} -.->|${lab}| ${x.to}["${x.to} on another track"]`);
      else lines.push(`  ${s.id} -->|${lab}| ${x.to}`);
    }));
  });
  X.applyMarket("ae");
  P(`### ${X.TRACKS[t].label}`, "```mermaid\n" + lines.join("\n") + "\n```");
}

// ---------------------------------------------------------------- 5
P(`## 5. States`,
  `A state is set by one exit of one step. Statuses on the ground TV and the token page are derived from these, never typed.`);
const states = new Map();
for (const s of X.STEPS) for (const t of s.tracks) for (const mode of modesFor(t)) withCtx({ market: "ae", mode }, () => {
  (X.pick(s.exits, t) || []).forEach(x => {
    if (!x.state) return;
    const k = x.state;
    if (!states.has(k)) states.set(k, new Map());
    const row = `${s.id}|${md(X.pick(x.when, t))}`;
    if (!states.get(k).has(row)) states.get(k).set(row, new Set());
    states.get(k).get(row).add(TR[t]);
  });
});
X.applyMarket("ae"); X.CTX.mode = "staff";
const srows = [];
for (const [st, m] of states) for (const [row, trs] of m) { const [id, when] = row.split("|"); srows.push([st, `${id} ${names(X.stepById(id))}`, when, [...trs].join(", ")]); }
P(table(["State", "Set at", "When", "Tracks"], srows));

// ---------------------------------------------------------------- 6 (hand-written: the rules that cut across steps)
const payModes = X.PAY_MODES.map(([, l]) => l).join(", ");
P(`## 6. Core logic`,
  `The rules that span several steps. Each step's own entry and exit conditions are in [Every step](#8-every-step).`);

P(`### 6.1 The TD booking call (P1 to P9)`,
  [
    `- **A task, not a lead page.** Every enquiry with a mobile number becomes a task in the TD booking call persona (\`b2c-lead-td-booking-by-cc\`). Queue tabs: All, Queue, Callbacks, Closed today, Today missed TD.`,
    `- **Order or contact.** A mobile and an email means an order already exists (booked track): the agent confirms it. A mobile only means the cars of interest sit on the contact by appointment ID; picking cars creates one order per car once the email is added in the lead pane.`,
    `- **Discovery is a branch.** P3 listing (search by appointment ID, market filters), P3a car page, P3b compare (2 or 3 cars). Pick for TD sends the cars on to P4.`,
    `- **TD type per car (P4).** Each car is hub or video. All hub: P5 hub slot. All video: P6 video slot. Mixed: P5, then P6, then one read-back at P7 that books both. Australia: an interstate car is video only.`,
    `- **Payment mode and trade-in on P4.** Payment mode (${payModes}) and Trade-in opted (Yes / No). The payment mode is one value shared with the lead pane select; it starts from what the customer said in the app or chatbot. Trade-in opted starts from the same source and shows on the lead view's Trade-in tile.`,
    `- **Booking closes the task (P7).** Booked: ORDER BOOKED. Video or mixed: VTD BOOKED. Then P8 pre-arrival readiness: reminders at T-24h and T-2h with a licence upload link, yard prep, SA pre-assigned by capacity.`,
    `- **Callbacks (P9).** No slot works, no answer, or busy: the task moves to Callbacks and resumes where the call stopped. After 3 attempts it closes as dropped. A missed TD shows in Today missed TD.`,
    `- **The pitch decides, not a fixed path.** Each Next posts the step's answers to the journey's next-step API; the response names the next step and the stages to show. That is how the call branches to a TD or a deposit.`,
  ].join("\n"));

P(`### 6.2 Deposit instead of a TD (P7d)`,
  [
    `- Offered from the Next menu (*Customer wants to pay a deposit*) on P2, P3a and P3b, only once a car is picked. The call's stages switch to Interest, Discovery, Deposit, Reserved.`,
    `- Three blocks, one gate: send the bank details from the CRM (WhatsApp, email or SMS, order as the reference); the customer pays and emails a screenshot; the agent uploads it as the confirmation. Only then can the car be set to Reserved.`,
    `- Exits: confirmation uploaded and car reserved → N3, CAR RESERVED. Not paid yet → P9. Changes their mind → P4 (book a TD).`,
  ].join("\n"));

P(`### 6.3 Finance pre-approval on the call (P7f)`,
  [
    `- **Gate:** the payment mode. With ${X.PAY_MODES.filter(([k]) => k !== "cash").map(([, l]) => l).join(" or ")}, the Next menu on every call step (${X.PRE_FROM.join(", ")}) offers *Run a finance pre-approval*. With Cash it is off.`,
    `- **A side trip, not a stage.** The stage bar stays on the step it was opened from (marked Pre-approval open). Next reads Skip until it runs, then Done; both return to that step.`,
    `- **Score first.** Result tiles on top: status, cohort, credit score (a soft check on name, date of birth and the ID number or address), expiry.`,
    `- **Two forms, one goal.** *Partial* asks the listing page's quick questions and returns a cohort and an interest-rate range. *Full* adds loan, employment and personal details plus the consent, and returns the amount they can borrow and the repayment. Run stays off for Full until the consent is ticked.`,
    `- **Kept on the lead.** The latest run (partial or full) lives on the lead, so the call, the hub and delivery read the same one. Question sets are market config from the finance service (see [section 7](#7-finance-pre-approval-question-sets)).`,
  ].join("\n"));

P(`### 6.4 Check-in (I1): welcome and check-in in one gesture`,
  `Checking in is the arrival: there is no Mark arrived. The seat QR page and the staff form are the same form, so either way gives the same answers.`,
  [
    `1. **Mobile, purpose and OTP (one screen).** Mobile number with the market's dial code (+971, +61). Purpose of visit: buy or test drive, drop off a car, pick up a car, a booked service, sell my car, something else. Only buy or test drive goes on to an SA; the rest are routed to that desk. Send code → the code appears under the form → Verify. 3 tries; resend after 30 s. After 3 failures a receptionist checks ID by hand (Emirates ID in the UAE, photo ID in Australia) and finishes the check-in.`,
    `2. **Existing order? Yes or No.**`,
    `   - **Yes, order found** (by the mobile): today's order shows with *Checked in*, at once. CHECKED IN.`,
    `   - **Yes, nothing found:** the page says nothing is booked on that mobile today and offers the details form.`,
    `   - **No:** the basic details form: phone (already verified), email, first and last name, post code (UAE: emirate and area), *Do you need financing after the test drive?*, *Where did you hear about us?* (market list), and the driving licence photos, front and back, optional. Check in creates the lead (dedupe on mobile) and the visit. CHECKED IN.`,
    `3. **The last screen: the token with the SA.** Token number, seat and the SA's name (*Your sales associate (SA)*), on the phone and in the staff form.`,
  ].join("\n"),
  `**What one check-in fires:** a queue token, SA auto-assignment (S1), the Yardie's task for a booked car (S2), the token on the ground TV, and the token page link on WhatsApp.`,
  `**The visit's UUID.** Check-in gives the visit a UUID. The SA's task finds the lead by it, with every order the lead has today (T1).`,
  `**No recording question at check-in.** The SA asks for the recording consent at the key handover (O1), when the TD starts and the recording would.`,
  `**Seat QR specifics:** the QR is the same on every seat, so the mobile and OTP prove who is checking in. The receptionist's Today list shows the check-in live, with each answer landing in a side panel. No answer for 3 min: the receptionist gets a nudge. *Finish it for them* opens the staff form with what was already filled. Each part autosaves.`,
  `**Video TD:** check-in is an OTP read out on the call, in the same step as the welcome. Not joined 10 min after the slot → P9.`);

P(`### 6.5 Finance next step after check-in`,
  `The financing answer on the details form, plus the pre-approval status, picks one card with a QR on the token page and the staff form:`,
  table(["Financing answer", "Pre-approved?", "Card shown"], [
    ["I might need finance from CARS24", "No", "The 2-minute pre-approval"],
    ["I might need finance from CARS24", "Yes", "You're already pre-approved: take a seat, browse our cars"],
    ["I have already arranged my own loan", "Either", "The 2-minute beat-your-lender check"],
    ["I don't need finance", "Either", "Take a seat, browse our cars"],
  ]));

P(`### 6.6 The token and the ground TV (I2)`,
  [
    `- **One token per check-in:** hub, day, B for bookings or W for walk-ins, and a number (B-07, W-12). Bookings are served at their slot time, then tokens in order. Not the payment token (TOKEN PAID).`,
    `- **The ground TV** shows token, first name and initial, status, SA, car and waiting time. A QR on the TV catches anyone who missed the one on their seat.`,
    `- **Statuses:** Waiting for an SA, SA coming to you, With your SA, Car ready, On test drive. They change only on staff actions, never typed.`,
    `- **The customer's token page** shows the same token, the SA, the car and live progress, and updates by itself.`,
    `- **What moves them.** Booked: Yardie picks up the car → car parked at the hub → SA meets the customer, the SA's task opens → key handover, On test drive. Walk-in: SA meets the customer → cars picked, Yardie preps them → car parked at the hub → key handover, the TD starts.`,
  ].join("\n"));

P(`### 6.7 SA assignment (S1)`,
  [
    `- **Automatic, at check-in.** That is why the last check-in screen can name the SA.`,
    `- **Rule, in order:** free now (not on a drive or a break), under today's cap, a free slot for the next hour. Then, for a booking, the booking's pre-assigned SA first; for a walk-in, the best language match. Ties go to the fewest drives today.`,
    `- **Every SA busy or at cap:** the receptionist picks the next free SA by hand. Still no SA after 10 min: the manager is alerted.`,
    `- **The SA meets the customer after assignment,** at their seat, never at check-in, and the SA's task opens (T1). Not met within 5 min: the receptionist and the manager are alerted, and the SA can be reassigned.`,
  ].join("\n"));

P(`### 6.8 The Yardie and the car (S2, T3)`,
  [
    `- Cars wait in the yard, about 500 m from the hub. The Yardie works a mobile task list.`,
    `- **Booked:** the car was prepped before the day (P8). Check-in calls it to the hub: Picked up, driving over → Parked at the hub. CAR AT HUB tells the SA and moves the TV.`,
    `- **Walk-in, or a car added on the day:** each car picked in Discover more cars (T3) is an order for now, and the Yardie preps it (quick wash, wipe the inside, fuel at least half, tyre pressure), then brings it. At the hub, the SA's section for that order shows Car ready.`,
    `- Prep finds a problem: the SA is told to pick another car.`,
  ].join("\n"));

P(`### 6.9 The SA's task (T1 to N2, booked and walk-in)`,
  `One Leadverse task for the whole visit. The lead is found by the check-in UUID, and every order the lead has today runs in it: a booking can carry two or three TDs. Five pages, each built from DLS components in the action area:`,
  [
    `1. **T1 Interest.** Tabs, Check-in first: the check-in details (UUID, lead, token and seat, time and way, purpose, mobile, SA, today's TDs). Then Today's TD, Finance, Wishlist, Trade-in, Coupons (code, value, validity) and Notes.`,
    `2. **T2 DL.** Once for the visit, before any drive: both sides (from the booking, the seat QR, or taken now), what was read off it, and three checks (name, expiry, photo). No valid licence: no drive today (N6).`,
    `3. **T3 Cars.** Two tabs: today's orders, kept by default, or Discover more cars. A car picked in Discover joins the visit as an order for now; the Yardie preps it. About 95% of bookings go ahead with today's orders.`,
    `4. **O1 Test drives.** One section per order, each with a stepper: Walkthrough → Key handover (TD consent for this car, recording consent, odometer and fuel; START_TEST_DRIVE) → TD done (COMPLETE_TEST_DRIVE) → Disposition → Checkout. The disposition is per car: Pay deposit, Needs time, Another car, Not interested.`,
    `5. **N2 Checkout, one car.** A stepper inside the page: Delivery (the address and pick up or home delivery) → VAS → Discount (the customer's coupons, then any extra; a manager approves above the market's limit) → Sales promise → Payment mode (Cash, In-house finance, BYOF) → Pre-approval (In-house finance only: prefilled when on file, or send the link by SMS or email, or fill it now) → Deposit (bank transfer with the receipt uploaded, or a Stripe link confirmed by the webhook) → Booking confirmed. The order summary beside it moves with every choice. Another TD'd car is checked out the same way, back from O1.`,
  ].join("\n"),
  `**Walk-in:** the same task with no TD booked today: Today's TD is empty and Cars opens on Discover.`,
  `**Recording consent, at the key handover.** Yes: live notes and transcription run until TD done. No: the drive goes ahead and only the objection tags are kept.`,
  `**Video TD** keeps its own steps: the walkaround on camera (O5), the wrap-up (O7), the debrief (N1) and the token by payment link (N2).`);

P(`### 6.10 Next step (O1, N2 to N7)`,
  `No visit ends without one. At the hub, each TD'd car gets its disposition in its section on O1; on a video TD, the operator records it at N1:`,
  table(["Disposition", "Goes to", "Result"], [
    ["Pay deposit", "N2 Checkout (hub) or Collect token (video)", "Deposit paid → BOOKING CONFIRMED (hub) or TOKEN PAID (video) → N3 handoff to delivery (RM assigned)"],
    ["Needs time", "N4 Schedule follow-up", "FOLLOW-UP SCHEDULED, then N5 follow-up call"],
    ["Another car", "T3 Discover more cars (same visit), or N6 another day", "One more order in the visit, or NEW TD BOOKED"],
    ["Not interested", "N7 Close as dropped", "DROPPED, with the reason"],
  ]),
  `A customer who leaves before paying keeps a live payment link and gets a follow-up (N4). A Stripe payment is confirmed by its webhook only; a bank transfer by the receipt, checked by finance.`);

P(`### 6.11 Oversight (M1)`,
  `The manager (SATL) sees a live funnel all day: one row per state (checked in, SA assigned, met, DL verified, TD started, TD conducted, booking confirmed), with time between states. Late steps are caught and reassigned.`);

P(`### 6.12 Example people, per market`,
  table(["Role", "UAE", "Australia"], (() => {
    const get = (m) => { X.applyMarket(m); const r = { ...Object.fromEntries(Object.entries(X.PEOPLE).map(([k, v]) => [`Customer, ${TR[k] || k}`, v.name])), ...Object.fromEntries(Object.entries(X.PSTAFF).map(([k, v]) => [`Staff, ${v.role}`, v.name])) }; return r; };
    const ae = get("ae"), au = get("au"); X.applyMarket("ae");
    return Object.keys(ae).map(k => [k, ae[k], au[k] || "—"]);
  })()));

// ---------------------------------------------------------------- 7
P(`## 7. Finance pre-approval question sets`,
  `From the finance service's market config (\`PREQ\`). Both forms lead to the same goal: a pre-approval kept on the lead.`);
function preqItems(items) {
  const out = [];
  const one = (it) => {
    const name = md(it.label || it.q || it.text || "");
    const opts = it.opts ? `: ${it.opts.map(md).join(" / ")}` : "";
    const hint = it.hint ? `. ${md(it.hint)}` : "";
    switch (it.k) {
      case "pair": it.items.forEach(one); break;
      case "sec": out.push(`\n**${name}**\n`); break;
      case "hint": out.push(`- *${name}*`); break;
      case "consent": out.push(`- Consent: ${name}`); break;
      case "check": out.push(`- Checkbox: ${name}`); break;
      case "reveal": out.push(`- Shown when relevant: ${name}`); break;
      default: {
        const type = { in: it.num ? "number" : "text", sel: "select", date: "date", month: "month and year", pills: "choice", slider: `slider ${it.min ?? ""}–${it.max ?? ""}`, freq: "amount and how often" }[it.k] || it.k;
        out.push(`- ${name} *(${type}${opts})*${hint}`);
      }
    }
  };
  items.forEach(one);
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
for (const m of ["ae", "au"]) {
  X.applyMarket(m);
  const q = X.PREQ;
  P(`### ${MKT[m]}`,
    `Credit bureau: **${md(q.bureau)}**. Example results: cohort ${md(q.cohort)}, partial rate ${md(q.rate)}, full rate ${md(q.rateFull)}, expires ${md(q.expires)}.`,
    `**Identity, for the soft check**\n\n${preqItems(q.idFields)}\n\n${md(q.fetchNote)}`,
    `**Partial (cohort and rate range)**\n\n${preqItems(q.partial)}`,
    `**Full (amount they can borrow)**\n\n${preqItems(q.full)}`);
}
X.applyMarket("ae");

// ---------------------------------------------------------------- 8
P(`## 8. Every step`,
  `Grouped by phase. Each step lists its tracks, owner and device, purpose, trigger and data, entry conditions, exits, state, screen, what DAP does today, what changed, and its anatomy: the screen's numbered parts, the fields it captures, the actions it fires and the states it can be in.`);
const BUILD = { reuse: "Reuse", extend: "Extend", new: "New", none: "No build" };
for (const ph of X.PHASES) {
  const steps = X.STEPS.filter(s => s.phase === ph.id);
  if (!steps.length) continue;
  P(`### Phase ${ph.id} · ${ph.name}`);
  for (const s of steps) {
    const T = s.tracks;
    const txt = (fn) => varied(T, fn, (v) => md(v));
    const lst = (fn) => varied(T, fn, (v) => list(v));
    P(`#### ${s.id} · ${names(s)}`,
      [`- **Tracks:** ${T.map(t => TR[t]).join(", ")}${s.branch ? " (a branch off the main path)" : ""}`, `- **Owner:** ${inline(T, (t) => X.pick(s.owner, t))}`, `- **Device:** ${inline(T, (t) => DEVICE[X.pick(s.device, t)] || X.pick(s.device, t))}`].join("\n"));
    P(`**Purpose**`, txt((t) => X.pick(s.purpose, t)));
    P(`**Trigger:** ${inline(T, (t) => X.pick(s.source.trigger, t))}`);
    const data = lst((t) => X.pick(s.source.data, t));
    if (data) P(`**Data it reads and writes**`, data);
    const entry = lst((t) => (X.pick(s.entry, t) || []).map(e => X.pick(e, t)));
    if (entry) P(`**Entry conditions**`, entry);
    P(`**Exits**`, varied(T, (t) => (X.pick(s.exits, t) || []).map(x => [X.pick(x.when, t), x.to ? `${x.to} ${stepName(X.stepById(x.to), T.includes(t) && X.stepById(x.to).tracks.includes(t) ? t : undefined)}${x.mode ? ` (${X.CHECKIN_WAYS[x.mode].label.toLowerCase()})` : ""}` : "End", x.state || ""]),
      (v) => table(["When", "Goes to", "State"], v)));
    const st = inline(T, (t) => X.pick(s.state, t));
    if (st) P(`**State reached:** ${st}`);
    const sc = s.screen, code = (v) => v ? "`" + md(v) + "`" : v;
    const scr = [["Screen", (t) => X.pick(sc.name, t)], ["Build", (t) => BUILD[X.pick(sc.build, t)] || X.pick(sc.build, t)], ["Pattern", (t) => X.pick(sc.pattern, t)],
      ["Route", (t) => code(X.pick(sc.route, t))], ["Customer's phone", (t) => code(X.pick(sc.phone, t))]]
      .map(([k, fn]) => [k, inline(T, fn)]).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
    P(`**Screen**`, scr);
    if (s.dap) { const d = inline(T, (t) => X.pick(s.dap, t)); if (d) P(`**DAP today:** ${d}`); }
    if (s.changed) { const c = inline(T, (t) => X.pick(s.changed, t)); if (c) P(`**What changed:** ${c}`); }
    // anatomy
    const an = (key, head, map) => varied(T, (t) => X.anatomyFor(s.id, t)[key].map(map), (v) => table(head, v));
    const parts = an("parts", ["Part", "Widget", "What it does"], (p) => [p.label, p.widget, p.note]);
    const fields = an("fields", ["Field", "Type", "Required", "Source", "Rule"], (f) => f);
    const actions = an("actions", ["Action", "Calls / event", "Result"], (a) => a);
    const sts = an("states", ["State", "Meaning"], (x) => x);
    if (parts || fields || actions || sts) {
      P(`**Anatomy**`);
      if (parts) P(`*Parts of the screen*`, parts);
      if (fields) P(`*Fields*`, fields);
      if (actions) P(`*Actions*`, actions);
      if (sts) P(`*Screen states*`, sts);
    }
  }
}

// ---------------------------------------------------------------- 9
P(`## 9. Markets: configured, not rebuilt`,
  `One journey, one check-in form, one set of states. A market changes defaults, documents and copy, not the build. In the build these are tenant settings (\`cars24-ae\`, \`cars24-au\`). India is listed to settle its row; the prototype shows the UAE and Australia.`,
  table(["Setting", "UAE", "India", "Australia"], X.MARKET_CONFIG));
const mkA = (m) => { X.applyMarket(m); return JSON.parse(JSON.stringify(X.MK)); };
const ae = mkA("ae"), au = mkA("au"); X.applyMarket("ae");
const MKL = { hub: "Hub", hubCode: "Hub code (seat QR URL)", site: "Website", credit: "Credit score", idDoc: "Identity document", area: "Area field", dial: "Dial code", postcode: "Address field on check-in", heard: "Where did you hear about us? options", langs: "Languages", budgets: "Budget bands", token: "Deposit / token amount", privacy: "Privacy wording", lenders: "Lenders line", videoOnly: "Video-only rule", stock: "Listing stock line", per: "Repayment period", priceNote: "Price note", filters: "Listing filters", inspect: "Inspection", safety: "Safety line", edge: "The CARS24 edge", assure: "Certified checks", cardTags: "Car card tags" };
P(`**Market values used by the screens**`,
  table(["Setting", "UAE", "Australia"], Object.keys(MKL).filter(k => k in ae).map(k => {
    const f = (v) => Array.isArray(v) ? (v.length ? v.join(", ") : "none") : k === "token" ? (v === ae.token ? `AED ${v.toLocaleString("en-US")}` : `$${v.toLocaleString("en-AU")}`) : String(v);
    return [MKL[k], f(ae[k]), f(au[k])];
  })),
  `**Copy layer.** Screens are written once with UAE copy; for Australia a copy table swaps people, places, documents and money in sentences (for example Fatima Al Suwaidi → Emily Carter, Al Quoz → the Melbourne hub, Emirates ID → photo ID, IBAN → BSB and account, EMI → repayments, UAE traffic laws → Victorian road rules). ${X.COPY.au.length} swaps in all.`);

// ---------------------------------------------------------------- 10: the What changed view, as Markdown
function changesToMd(html) {
  let h = html;
  h = h.replace(/<div style="display:flex; gap:12px; flex-wrap:wrap;">([\s\S]*?)<\/div>/g, (m, inner) => {
    const ls = [...inner.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(x => md(x[1]));
    return `\n\n*See:* ${ls.join(" · ")}\n\n`;
  });
  h = h.replace(/<div><button class="linklike"[^>]*>[\s\S]*?<\/button><\/div>/g, "");
  h = h.replace(/<div class="q">([\s\S]*?)<\/div><h4>([\s\S]*?)<\/h4>/g, (m, q, t) => `\n\n#### ${md(t)}\n\n> **Feedback:** ${md(q)}\n\n`);
  h = h.replace(/<div class="ba">([\s\S]*?)<\/div>/g, (m, inner) => {
    const ks = [...inner.matchAll(/<span class="k">([\s\S]*?)<\/span><span class="seq">([\s\S]*?)<\/span>/g)];
    return "\n\n" + ks.map(([, k, v]) => `- **${md(k)}:** ${md(v)}`).join("\n") + "\n\n";
  });
  h = h.replace(/<table[\s\S]*?<\/table>/g, (tb) => {
    const rows = [...tb.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)(?=<t[hd][\s>]|<\/tr>|$)/g)].map(c => c[1].replace(/<\/t[hd]>\s*$/, "")));
    if (!rows.length) return "";
    return "\n\n" + table(rows[0].map(md), rows.slice(1)) + "\n\n";
  });
  h = h.replace(/<div><b>([\s\S]*?)<\/b>([\s\S]*?)<\/div>/g, (m, b, t) => `\n- **${md(b)}${/[?.!]$/.test(md(b)) ? "" : "."}** ${md(t)}`);
  h = h.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, "");
  h = h.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, (m, t) => `\n\n### ${md(t)}\n\n`);
  h = h.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (m, t) => `\n\n${md(t)}\n\n`);
  h = h.replace(/<[^>]+>/g, "");
  h = decode(h);
  return h.split("\n").map(l => l.replace(/^\s+(?=[^\s|-])/, "").replace(/\s+$/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
P(`## 10. What changed after review`, changesToMd(changesHtml));

let doc = L.join("\n").replace(/\n{3,}/g, "\n\n");
// tight lists: no blank line between two bullets
while (/(\n- [^\n]*)\n\n(?=- )/.test(doc)) doc = doc.replace(/(\n- [^\n]*)\n\n(?=- )/g, "$1\n");
fs.writeFileSync(out, doc.trim() + "\n");
console.log("wrote", out, fs.statSync(out).size, "bytes");
