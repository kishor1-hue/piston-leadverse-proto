// ---- PISTON v2: one level deeper ----
// Every step of the ideal test-drive journey with its source, screen, entry and exit conditions,
// per track (booked hub TD, walk-in hub TD, video TD), per market (UAE, Australia) and per check-in way
// (by staff, or by the customer from the QR on their seat). Mock people and numbers are examples only.
//
// A field can be a plain value, or an object keyed by track { booked, walkin, vtd, hub, all },
// by market { ae, au } or by check-in way { staff, qr }, nested in any order. "hub" covers booked + walk-in.
// pick() resolves all three for the active context.

const TRACKS = {
  booked: { key: "booked", label: "Booked hub TD", short: "Booked", who: "Fatima Al Suwaidi" },
  walkin: { key: "walkin", label: "Walk-in hub TD", short: "Walk-in", who: "Ahmed Saleh" },
  vtd:    { key: "vtd",    label: "Video TD", short: "VTD", who: "Khalid Al Jaberi" },
};

// ---------------------------------------------------------------- markets and check-in ways
// One journey, configured per market. Welcome and check-in are one gesture: checking in is the arrival.
// Both ways to check in exist in every market, with the same form; the market only sets the default.
//   staff: a receptionist or DA fills the check-in form with the customer
//   qr:    the customer scans the QR on their seat and fills the same form on their own phone
const MARKETS = {
  ae: { key: "ae", label: "UAE", checkin: "staff", tenant: "cars24-ae" },
  au: { key: "au", label: "Australia", checkin: "qr", tenant: "cars24-au" },
};
const CHECKIN_WAYS = {
  staff: { key: "staff", label: "By staff", phrase: "by staff", icon: "user-check" },
  qr: { key: "qr", label: "Seat QR", phrase: "from the seat QR", icon: "qr-code" },
};

// the context keyed values resolve against; the viewer sets it
const CTX = { market: "ae", mode: "staff" };
const MODE_KEYS = ["staff", "qr"], MARKET_KEYS = ["ae", "au"], TRACK_KEYS = ["all", "booked", "walkin", "vtd", "hub"];

// resolves check-in-way and market keys only (the check-in way applies to hub tracks; video TD always uses staff)
function ctxResolve(val, track) {
  while (val && typeof val === "object" && !Array.isArray(val)) {
    if (MODE_KEYS.some(k => k in val)) { const m = track === "vtd" ? "staff" : CTX.mode; val = m in val ? val[m] : val.staff; continue; }
    if (MARKET_KEYS.some(k => k in val)) { val = CTX.market in val ? val[CTX.market] : val.ae; continue; }
    break;
  }
  return val;
}

function pick(val, track) {
  val = ctxResolve(val, track);
  if (val == null || typeof val !== "object" || Array.isArray(val)) return val;
  if (!TRACK_KEYS.some(k => k in val)) return val;
  if (track in val) return pick(val[track], track);
  if (track !== "vtd" && "hub" in val) return pick(val.hub, track);
  return pick(val.all, track);
}

// ---------------------------------------------------------------- flow level
const FLOWS = {
  booked: {
    source: ["Leads from the consumer app or website", "Chatbot", "Ads and missed calls", "Self-serve booking in the app, which skips the call"],
    entry: ["A lead with a mobile number, booked on the TD booking call", "On the day: customer arrives at the booked hub"],
    exit: [
      ["good", "TOKEN PAID", "handed to the delivery journey"],
      ["warn", "FOLLOW-UP SCHEDULED", "date agreed, shortlist shared"],
      ["warn", "NEW TD BOOKED", "another car, restarts at Plan"],
      ["bad", "DROPPED", "reason recorded"],
      ["warn", "No-show", "back to the callback queue (P9)"],
    ],
  },
  walkin: {
    source: ["Drive-by", "Referral", "Social or search ad", "Radio and outdoor"],
    entry: ["Customer at the hub without a booking", "A valid licence is needed to drive; car finding works without one"],
    exit: [
      ["good", "TOKEN PAID", "handed to the delivery journey"],
      ["warn", "FOLLOW-UP SCHEDULED", "includes browse-only visits"],
      ["warn", "NEW TD BOOKED", "another day or another car"],
      ["bad", "DROPPED", "reason recorded"],
    ],
  },
  vtd: {
    source: ["Leads from the consumer app or website", "Chatbot", "Ads and missed calls", "Self-serve booking in the app, which skips the call"],
    entry: ["A lead with a mobile number, booked on a video TD", "On the day: customer joins the video link within 15 min of the slot"],
    exit: [
      ["good", "TOKEN PAID", "by payment link"],
      ["warn", "NEW TD BOOKED", "a hub TD after the video"],
      ["warn", "FOLLOW-UP SCHEDULED", "date agreed"],
      ["bad", "DROPPED", "reason recorded"],
    ],
  },
};

// ---------------------------------------------------------------- phase level
const PHASES = [
  { id: "P", name: "Plan", when: "Before arrival", owner: "Calling team, then the system",
    entry: "A lead with a mobile number. Self-serve app bookings skip the call and start at P8", exit: "Order booked and the calling task closed, then ready for the visit" },
  { id: "I", name: "Introduce", when: "First 3 minutes: welcome and check-in in one gesture",
    owner: { hub: { staff: "Receptionist or DA, with the customer", qr: "Customer, from the QR on their seat" }, vtd: "VTD operator" },
    entry: { hub: "Customer walks in and sits down", vtd: "Customer opens the video link" },
    exit: { hub: "CHECKED IN, with a token on the ground TV. No handshake yet", vtd: "VTD CHECKED IN" } },
  { id: "S", name: "Set up", when: "While the customer waits", owner: "System, then the Yardie",
    entry: "CHECKED IN", exit: { booked: "DA ASSIGNED, and the booked car at the hub", walkin: "DA ASSIGNED", vtd: "Not used: the operator is set at booking" } },
  { id: "T", name: "Tailor", when: { hub: "Handshake, then car finding", vtd: "Car finding over screen share" }, owner: { hub: "DA, from the handshake to the close", vtd: "VTD operator" },
    entry: { hub: "DA ASSIGNED", vtd: "VTD CHECKED IN" }, exit: { hub: "Cars confirmed for today and prep raised, or a follow-up", vtd: "Car confirmed for the video walkaround" } },
  { id: "O", name: "On the road", when: "Car to the hub, then Start TD, consent, DL, walkaround, drive", owner: { hub: "Yardie, then the DA", vtd: "VTD operator" },
    entry: { hub: "Cars confirmed, yard prep raised", vtd: "Car on camera" }, exit: { hub: "TD CONDUCTED for every car", vtd: "VTD CONDUCTED" } },
  { id: "N", name: "Next step", when: "No visit ends without one", owner: "DA, then RM",
    entry: "TD conducted, or a visit with no drive", exit: "TOKEN PAID, FOLLOW-UP SCHEDULED, NEW TD BOOKED or DROPPED" },
  { id: "M", name: "Oversight", when: "All day", owner: "Manager (DATL)",
    entry: "Manager role", exit: "Late steps caught and reassigned" },
];

// ---------------------------------------------------------------- step level
const STEPS = [
  // ============================== P · Plan: the TD booking call, a persona task of its own, then pre-arrival
  // No lead, no call: the calling team works a Tasks persona (b2c-lead-td-booking-by-cc) as a step-by-step journey.
  { id: "P1", phase: "P", name: "Lead in the call queue", tracks: ["booked", "vtd"],
    owner: "System, then the calling agent", device: "desktop",
    purpose: "A lead with a mobile number lands as a task in the TD booking call queue. No lead, no call.",
    source: { trigger: "A lead is created: consumer app, website, chatbot, ad or missed call",
      data: ["Lead: mobile, source, car of interest", "CDP: cars viewed, saved and searched", "Task allocation: queue, priority, agent load"] },
    entry: ["Lead has a mobile number", "No open TD booking for this lead"],
    exits: [{ when: "Agent picks the task and dials", to: "P2" }],
    state: null,
    screen: { name: "Tasks &rsaquo; Lead &rsaquo; TD booking call", build: "extend",
      pattern: "The existing Tasks queue with a new persona: b2c-lead-td-booking-by-cc", route: "/tasks?entity=lead&persona=td-booking-call" },
    changed: "New. Capture intent is now its own persona task, worked step by step on the call.",
  },
  { id: "P2", phase: "P", name: "Welcome and name", tracks: ["booked", "vtd"],
    owner: "Calling agent", device: "desktop",
    purpose: "Say who is calling, and capture or confirm the customer's name.",
    source: { trigger: "Call connected", data: ["Telephony: call status and recording", "Lead: the name, if already known"] },
    entry: ["Task picked", "Call connected"],
    exits: [
      { when: "Name confirmed", to: "P3" },
      { when: "No answer, busy, or call back later", to: "P9" },
      { when: "Wrong number or not interested", to: "N7", state: "DROPPED" },
    ],
    state: null,
    screen: { name: "TD booking call &rsaquo; Welcome", build: "new",
      pattern: "Task journey step: call script + DYNAMIC_FORM", route: { booked: "/tasks/TK-6120?step=welcome", vtd: "/tasks/TK-6127?step=welcome" } },
    changed: "New step in the TD booking call.",
  },
  { id: "P3", phase: "P", name: "Email and mobile", tracks: ["booked", "vtd"],
    owner: "Calling agent", device: "desktop",
    purpose: "Confirm the mobile, capture the email, and create the order from these basic details.",
    source: { trigger: "Name confirmed", data: ["Lead and CDP: email and mobile, if known", "OMS: create the order with the car of interest"] },
    entry: ["Name confirmed"],
    exits: [
      { when: "Email and mobile confirmed; OMS creates the order", to: "P4", state: "BOOKING INITIATED" },
      { when: "No car of interest yet: the order is created at P6 instead", to: "P4" },
    ],
    state: "BOOKING INITIATED",
    screen: { name: "TD booking call &rsaquo; Contact", build: "new",
      pattern: "DYNAMIC_FORM whose submit calls OMS", route: { booked: "/tasks/TK-6120?step=contact", vtd: "/tasks/TK-6127?step=contact" } },
    changed: "The order is created here, from name, mobile and email, before the pitch.",
  },
  { id: "P4", phase: "P", name: "Pitch", tracks: ["booked", "vtd"],
    owner: "Calling agent", device: "desktop",
    purpose: "Tell the customer why CARS24: inspected cars, warranty, return window, finance and choice.",
    source: { trigger: "Order created", data: ["Pitch points (CMS)", "Listing: live stock and price range"] },
    entry: ["BOOKING INITIATED"],
    exits: [
      { when: "Customer is interested", to: "P5" },
      { when: "Not now: call back later", to: "P9" },
      { when: "Not interested", to: "N7", state: "DROPPED" },
    ],
    state: null,
    screen: { name: "TD booking call &rsaquo; Pitch", build: "new",
      pattern: "Checklist of pitch points + objection tags", route: { booked: "/tasks/TK-6120?step=pitch", vtd: "/tasks/TK-6127?step=pitch" } },
    changed: "New step in the TD booking call.",
  },
  { id: "P5", phase: "P", name: "Car discovery", tracks: ["booked", "vtd"],
    owner: "Calling agent", device: "desktop",
    purpose: "Show cars and learn what the customer likes and doesn't, to narrow the inventory.",
    source: { trigger: "Customer is interested", data: ["Listing service: live inventory", "CDP: cars viewed", "Recommendation model"] },
    entry: ["Customer is interested"],
    exits: [
      { when: "Liked cars shortlisted", to: "P6" },
      { when: "Nothing fits: alert on new arrivals, call back", to: "P9" },
    ],
    state: null,
    screen: { name: "TD booking call &rsaquo; Discovery", build: "extend",
      pattern: "The Console's car cards with Like and Dislike", route: { booked: "/tasks/TK-6120?step=discovery", vtd: "/tasks/TK-6127?step=discovery" } },
    changed: "New step in the TD booking call.",
  },
  { id: "P6", phase: "P", name: "Finalize car and TD type", tracks: ["booked", "vtd"],
    owner: "Calling agent", device: "desktop",
    purpose: "Lock the car, and agree on a hub TD or a video TD.",
    source: { trigger: "Liked cars shortlisted", data: ["Shortlist from P5", "Listing: the car's hub and VTD eligibility", "OMS: set the final car on the order"] },
    entry: ["At least one liked car"],
    exits: [{ when: { booked: "Car final, customer wants a hub TD", vtd: "Car final, customer wants a video TD" }, to: "P7" }],
    state: null,
    screen: { name: "TD booking call &rsaquo; Finalize", build: "new",
      pattern: "Journey step: final car + TD type", route: { booked: "/tasks/TK-6120?step=finalize", vtd: "/tasks/TK-6127?step=finalize" } },
    changed: "New step in the TD booking call.",
  },
  { id: "P7", phase: "P", name: "Book slot", tracks: ["booked", "vtd"],
    owner: "Calling agent", device: "desktop",
    purpose: "Fetch slots for the car and the TD type, book one, and close the calling task.",
    source: { trigger: "Car and TD type final",
      data: ["Slot planner capacity (moving to the central Appointment Service)", "OMS: book the order", "Notification engine: confirmation and video link"] },
    entry: ["Car final", "TD type chosen"],
    exits: {
      booked: [{ when: "Hub slot booked; the calling task closes", to: "P8", state: "ORDER BOOKED" }, { when: "No slot works: call back", to: "P9" }],
      vtd: [{ when: "VTD slot booked, link sent, operator allocated; the calling task closes", to: "P8", state: "VTD BOOKED" }, { when: "No slot works: call back", to: "P9" }],
    },
    state: { booked: "ORDER BOOKED", vtd: "VTD BOOKED" },
    screen: { name: "TD booking call &rsaquo; Book", build: "new",
      pattern: "Slot picker step; reads capacity per hub and per DA", route: { booked: "/tasks/TK-6120?step=book", vtd: "/tasks/TK-6127?step=book" } },
    changed: "Booking the slot now closes the calling task.",
  },
  { id: "P8", phase: "P", name: "Pre-arrival readiness", tracks: ["booked", "vtd"],
    owner: "System; receptionist watches the list", device: "desktop",
    purpose: "Customer, car and DA are all ready before the slot starts.",
    source: { trigger: "Order booked for the next 24 hours",
      data: ["Notification engine: reminders at T-24h and T-2h, with a DL upload link", "Docs: DL uploaded by the customer", "Yard task: the Yardie preps the car and parks it in the yard, ready to bring over", "DA roster: pre-assigned by daily capacity"] },
    entry: [{ booked: "ORDER BOOKED", vtd: "VTD BOOKED" }, "Slot within the next 24 hours"],
    exits: {
      booked: [{ when: "Customer arrives and checks in", to: "I1" }, { when: "Customer reschedules", to: "P7" }, { when: "No-show 30 min after the slot", to: "P9" }],
      vtd: [{ when: "Customer opens the video link", to: "I1" }, { when: "Customer reschedules", to: "P7" }, { when: "Not joined 10 min after the slot", to: "P9" }],
    },
    state: null,
    screen: { name: "Test Drives &rsaquo; Upcoming", build: "extend",
      pattern: "Test Drives queue with readiness columns: DL, car prepped by the Yardie, DA, reminder", route: "/test-drives?view=upcoming" },
  },
  { id: "P9", phase: "P", name: "Callback and retry", tracks: ["booked", "vtd"], branch: true,
    owner: "Calling agent", device: "desktop",
    purpose: "Bring the customer back: a callback at an agreed time, or a retry after no answer or a no-show.",
    source: { trigger: "No answer, call back later, nothing fits, no slot, or a no-show",
      data: ["Tasks: the same TD booking call task, back in the queue", "Call history and attempt count"] },
    entry: ["Callback time reached, or a retry is due"],
    exits: [
      { when: "Customer picks up: the task resumes at the step where the last call stopped", to: "P2" },
      { when: "No answer: retry, up to 3 attempts", to: "P9" },
      { when: "3 attempts used, or not interested", to: "N7", state: "DROPPED" },
    ],
    state: null,
    screen: { name: "Tasks &rsaquo; TD booking call &rsaquo; Callbacks", build: "reuse",
      pattern: "The same task back in the queue, with a callback time and attempt count", route: "/tasks?entity=lead&persona=td-booking-call&view=callbacks" },
  },

  // ============================== I · Introduce: welcome and check-in, one gesture
  // Checking in is the arrival. The customer sits down and either scans the QR on the seat, or a receptionist or DA
  // fills the same form for them. Booked and walk-in use the same form; for a walk-in it also creates the lead.
  { id: "I1", phase: "I", name: "Welcome and check-in", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: { staff: "Receptionist or DA, filling the form with the customer", qr: "Customer, on their own phone, from the QR on the seat" }, vtd: "VTD operator" },
    device: { hub: { staff: "desktop", qr: "pair" }, vtd: "video" },
    purpose: {
      hub: "Welcome and check-in are one gesture: greet the customer, seat them, and check them in on the spot. They scan the QR on their seat, or a receptionist or DA fills the same form for them. Checking in is the arrival: it starts the clock, issues a token for the ground TV, and tells the DA roster and the Yardie.",
      vtd: "Admit the customer, welcome them on camera and check them in on the call, in one go.",
    },
    source: {
      trigger: { hub: { staff: "A receptionist or DA starts the check-in with the customer", qr: "Customer scans the QR on their seat" }, vtd: "Customer opens the video link" },
      data: {
        booked: {
          staff: ["Today's bookings (OMS + slot planner): found by name or mobile", "User auth: OTP to the booked mobile", "The check-in form: the same one the seat QR opens"],
          qr: ["Seat QR: one link per hub, the same for everyone", "User auth: mobile and OTP, then today's booking is found", "The check-in form, prefilled from the booking", "Optional: an I'm here link in the day-of reminder opens the same form, already signed in"],
        },
        walkin: {
          staff: ["The form starts with first name, last name, mobile and email: this is Add lead", "User auth: OTP", "Purpose of visit, accompanied by, paying by, area"],
          qr: ["Seat QR: the same hub link", "User auth: mobile and OTP; no booking found, so the form asks for name and email", "Purpose of visit, accompanied by, paying by, area"],
        },
        vtd: ["Video provider: join event", "OMS order, prefilled", "OTP read out on the call"],
      },
    },
    entry: { booked: ["ORDER BOOKED for today at this hub", "Customer at the hub"], walkin: ["None. Anyone can walk in"], vtd: ["VTD BOOKED", "Within 15 min of the slot"] },
    exits: {
      booked: {
        staff: [
          { when: "OTP verified, form complete: a token is issued, a DA is assigned and the Yardie is told to bring the booked car", to: "I2", state: "CHECKED IN" },
          { when: "OTP fails 3 times: the receptionist checks Emirates ID, then finishes the check-in", to: "I2", state: "CHECKED IN" },
        ],
        qr: [
          { when: "Customer submits: mobile verified, today's booking found, token issued", to: "I2", state: "CHECKED IN" },
          { when: "Customer is stuck or has no phone: a receptionist or DA finishes it for them, and what was filled carries over", to: "I1", mode: "staff" },
        ],
      },
      walkin: {
        staff: [
          { when: "OTP verified, purpose is buy or test drive: lead and visit created, token issued", to: "I2", state: "CHECKED IN" },
          { when: "Purpose is drop-off, pickup, service or selling: routed to that desk", to: null },
        ],
        qr: [
          { when: "Customer submits with purpose buy or test drive: lead and visit created, token issued", to: "I2", state: "CHECKED IN" },
          { when: "Purpose is drop-off, pickup, service or selling: the page points them to that desk", to: null },
          { when: "Customer is stuck or has no phone: a receptionist or DA finishes it for them", to: "I1", mode: "staff" },
        ],
      },
      vtd: [{ when: "OTP verified on the call, recording consent answered", to: "T2", state: "VTD CHECKED IN" }, { when: "Not joined 10 min after the slot", to: "P9" }],
    },
    state: { hub: "CHECKED IN", vtd: "VTD CHECKED IN" },
    screen: {
      name: { hub: { staff: "Test Drives &rsaquo; Today &rsaquo; Check-in", qr: "Seat QR check-in page + Test Drives &rsaquo; Today (live)" }, vtd: "VTD console &rsaquo; Welcome and check-in" },
      build: { hub: { staff: "extend", qr: "new" }, vtd: "extend" },
      pattern: {
        hub: {
          staff: "The Today list, where Check in is the row action (there is no separate Mark arrived). One form for booked and walk-in: details, OTP, then the token.",
          qr: "A public, form-only page opened from the seat QR: no Leadverse, no login. It renders the same form schema as the staff form. The Today list shows the check-in live, with the answers in a side panel.",
        },
        vtd: "Video panel + OTP widget + recording consent",
      },
      route: { booked: "/test-drives?view=today&visit=BK-88213", walkin: "/test-drives?view=today&visit=VS-2041", vtd: "/test-drives/BK-88190?stage=video&step=check-in" },
      phone: { hub: { qr: { ae: "cars24.ae/check-in/AQZ", au: "cars24.com.au/check-in/MEL" } } },
    },
    dap: {
      ae: { hub: "DAP has no arrival event and no self check-in. The receptionist checks the customer in; POST /customer-check-in creates the work order.", vtd: "VTD work orders already move ASSIGNED, then CUSTOMER_JOINED_CALL." },
      au: { hub: { qr: "Customers already check themselves in with a form today. Here that form opens from the seat QR, and its answers land on the visit.", staff: null }, vtd: null },
    },
    changed: {
      hub: "Arrival, welcome and check-in are now one step: checking in is the arrival, so there is no Mark arrived. The same form serves booked and walk-in customers, from the seat QR or filled by a receptionist or DA. It issues a token for the ground TV. No handshake here.",
      vtd: "Join, welcome and check-in are now one step on the call.",
    },
  },
  { id: "I2", phase: "I", name: "Token on the ground TV", tracks: ["booked", "walkin"],
    owner: "Customer, waiting. The screens change only when staff act", device: "tvpair",
    purpose: "Hospital logic. Every check-in gets a token. The ground TV and the customer's phone show where each token is: who the DA is, where the car is, what happens next. Nobody types a status. Each one comes from a staff action: the system assigns a DA, the Yardie moves the car, the DA meets the customer and starts the drive.",
    source: { trigger: "CHECKED IN (I1)",
      data: ["Token: one queue per hub and day, B for bookings and W for walk-ins, numbered in order", "State events from the DA, the Yardie and the system", "WhatsApp: the token and a live tracker link, for customers checked in by staff"] },
    entry: ["CHECKED IN", "Token issued"],
    exits: [{ when: "A DA is assigned, automatically", to: "S1" }],
    state: null,
    screen: { name: "Ground TV + the customer's token page", build: "new",
      pattern: "A full-screen hub board (token, name, status, DA, car, waiting) and the same token on the customer's phone. Both are read-only and live; they change when staff act",
      route: "/test-drives/board?view=tv",
      phone: { ae: "cars24.ae/t/7Kq2Xw", au: "cars24.com.au/t/7Kq2Xw" } },
    dap: "DAP has no token and no ground display.",
    changed: "New. A token for every check-in, on a ground TV and on the customer's phone. Every status on them comes from a staff action.",
  },

  // ============================== S · Set up: a DA, and for a booking the car, while the customer waits
  { id: "S1", phase: "S", name: "Assign DA", tracks: ["booked", "walkin"],
    owner: "System. The receptionist steps in only when every DA is busy", device: "desktop",
    purpose: "Give the customer one DA, automatically, the moment they check in. The rule picks a DA who is free now and has room in today's slots. Only when every DA is busy or at their cap does a person assign one.",
    source: { trigger: "CHECKED IN",
      data: {
        booked: ["Pre-assigned DA from P8, if still free", "DA roster: live status and today's slots", "Daily TD capacity per DA", "Token order: bookings at their slot time first, then tokens in order"],
        walkin: ["DA roster: live status and today's slots", "Daily TD capacity per DA", "Language match", "Token order"],
      } },
    entry: ["CHECKED IN", "Token issued"],
    exits: {
      booked: [
        { when: "A DA is free: assigned automatically, pushed to the DA, shown on the TV. Meanwhile the Yardie brings the car", to: "S2", state: "DA ASSIGNED" },
        { when: "Every DA is busy or at their cap: the receptionist picks the next free DA by hand", to: "S2", state: "DA ASSIGNED" },
        { when: "Still no DA after 10 min: manager alerted", to: "M1" },
      ],
      walkin: [
        { when: "A DA is free: assigned automatically, pushed to the DA, shown on the TV", to: "T1", state: "DA ASSIGNED" },
        { when: "Every DA is busy or at their cap: the receptionist picks the next free DA by hand", to: "T1", state: "DA ASSIGNED" },
        { when: "Still no DA after 10 min: manager alerted", to: "M1" },
      ],
    },
    state: "DA ASSIGNED",
    screen: { name: "Visit &rsaquo; DA assignment", build: "extend",
      pattern: "Auto-assignment card with the reason. When every DA is busy, a pick list (ManualAssignmentModal) with today's load and the queue position",
      route: { booked: "/test-drives/BK-88213?stage=assign-da", walkin: "/test-drives/VS-2041?stage=assign-da" } },
    dap: "Manual assignment with BI-advisory ranking. Nothing blocks a DA who is at capacity.",
    changed: "Now automatic, by availability and today's slots, straight after check-in. Manual only when every DA is busy. DL verify no longer comes first.",
  },
  { id: "S2", phase: "S", name: "Car to the hub", tracks: ["booked"],
    owner: "Yardie", device: "tvpair",
    purpose: "The booked car was prepped before the day and waits in the yard, about 500 m away. The moment the customer checks in, the Yardie gets a task to bring it to the hub, so it is there before the DA needs it. This runs alongside the handshake and car finding.",
    source: { trigger: "CHECKED IN (booked)", data: ["Yard task: car, plate, yard spot, target bay", "Prep done before the day (P8)", "Token and DA, for the TV and the push"] },
    entry: ["CHECKED IN", "Car prepped (P8)"],
    exits: [
      { when: "Car parked at the hub: the DA is told and the TV shows it. The visit carries on with the handshake", to: "T1", state: "CAR AT HUB" },
      { when: "The car can't be used (damage, flat battery): the DA is told to offer another", to: "T3" },
    ],
    state: "CAR AT HUB",
    screen: { name: "Yard tasks (Yardie's phone) + ground TV", build: "new",
      pattern: "A Leadverse mobile task list for the Yardie: Picked up, then At the hub. Each tap updates the TV's car column and notifies the DA",
      route: "/yard/tasks" },
    dap: "DAP has a prep user role for getting cars ready. Bringing a car from the yard, and its arrival at the hub, are not tracked.",
    changed: "New persona: the Yardie. For a booking, the car is called from the yard the moment the customer checks in.",
  },

  // ============================== T · Tailor (handshake, then car finding)
  { id: "T1", phase: "T", name: "Handshake", tracks: ["booked", "walkin"],
    owner: "DA", device: "tablet",
    purpose: "Only after a DA is assigned: the DA walks to the customer's seat, introduces themself and takes over. There is no handshake at check-in. Car finding starts here.",
    source: { trigger: "DA ASSIGNED push on the DA's tablet",
      data: ["Visit context: token, seat, booking, language, recording on", "CDP: cars viewed, call-centre notes", "Car location from the Yardie (booked)"] },
    entry: ["DA ASSIGNED", "DA status is Available"],
    exits: [
      { when: "DA taps Met customer; the TV shows them together", to: "T2", state: "MET CUSTOMER" },
      { when: "Not met within 5 min: receptionist and manager alerted, DA reassigned", to: "S1" },
    ],
    state: "MET CUSTOMER",
    screen: { name: "Test Drives &rsaquo; My queue (DA)", build: "extend",
      pattern: "DA's My queue with a waiting card (token, seat, car status) and a Met customer action", route: "/test-drives?view=my-queue" },
    dap: "Hub work orders already have MET_CUSTOMER (ASSIGNED, then MET_CUSTOMER).",
    changed: "Always after DA assignment, at the customer's seat. Never at check-in.",
  },
  { id: "T2", phase: "T", name: "Needs", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: "Understand what the customer needs before showing any car.",
    source: { trigger: "Handshake done",
      data: { booked: ["Prefilled from the booked car and app browsing (CDP)"], walkin: ["Asked in conversation. Nothing to prefill"], vtd: ["Prefilled from the booked car (CDP)"] } },
    entry: { hub: ["MET CUSTOMER"], vtd: ["VTD CHECKED IN"] },
    exits: {
      all: [{ when: "At least budget and body type captured", to: "T3" }],
      booked: [{ when: "At least budget and body type captured", to: "T3" }, { when: "Set on the booked car: skip to the promise", to: "T4" }],
    },
    state: null,
    screen: { name: "Car finding &rsaquo; Needs", build: "new",
      pattern: "Journey stage Car finding, step Needs: DYNAMIC_FORM with chips", route: { booked: "/test-drives/BK-88213?stage=car-finding&step=needs", walkin: "/test-drives/VS-2041?stage=car-finding&step=needs", vtd: "/test-drives/BK-88190?stage=video&step=needs" } },
    dap: "No needs capture in DAP. A walk-in's car is picked at the desk.",
    changed: { all: "Now run by the DA after the handshake.", booked: "Booked customers get car finding too, starting from their booking." },
  },
  { id: "T3", phase: "T", name: "Recommend and compare", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator, sharing their screen" }, device: { hub: "tablet", vtd: "video" },
    purpose: "Show the cars that fit, side by side, from stock at this hub.",
    source: { trigger: "Needs captured",
      data: ["Listing service: live stock at this hub, not reserved", "Recommendation model (BI)", "CDP: cars viewed", "Cars liked on the token page while waiting (I2)"] },
    entry: ["Needs captured, or the booked car is known"],
    exits: [
      { when: "One or more cars chosen to drive", to: "T4" },
      { when: "Nothing fits today: shortlist shared", to: "N4", state: "FOLLOW-UP SCHEDULED" },
    ],
    state: null,
    screen: { name: "Car finding &rsaquo; Cars", build: "extend",
      pattern: "Car rows with order ID and match reason, like the TD Journey booked list; + Add cars opens a search drawer", route: { booked: "/test-drives/BK-88213?stage=car-finding&step=cars", walkin: "/test-drives/VS-2041?stage=car-finding&step=cars", vtd: "/test-drives/BK-88190?stage=video&step=cars" } },
    dap: "DAP's compare-car tool, used at the desk.",
    changed: { all: "Now run by the DA after the handshake.", booked: "The booked car is pinned, with live alternatives next to it." },
  },
  { id: "T4", phase: "T", name: "Quality promise", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA, tablet turned to the customer", vtd: "VTD operator, sharing their screen" }, device: { hub: "customer", vtd: "video" },
    purpose: "Give the customer reasons to trust this car before the drive.",
    source: { trigger: "Car chosen", data: ["Inspection report of the chosen car", "Warranty and return policy settings", "Finance calculator"] },
    entry: ["At least one car chosen"],
    exits: [
      { when: { hub: "Customer wants to drive today", vtd: "Customer wants to see the car on video now" }, to: "T5" },
      { when: "Wants to think: shortlist shared", to: "N4", state: "FOLLOW-UP SCHEDULED" },
    ],
    state: null,
    screen: { name: "Car finding &rsaquo; Promise (customer view)", build: "new",
      pattern: "CMS page in customer mode: LINE_TITLE + info cards", route: { booked: "/test-drives/BK-88213?stage=car-finding&step=promise", walkin: "/test-drives/VS-2041?stage=car-finding&step=promise", vtd: "/test-drives/BK-88190?stage=video&step=promise" } },
  },
  { id: "T5", phase: "T", name: "Confirm cars", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: { walkin: "Create the order and send the car to the Yardie for prep.", booked: "Lock today's cars. The booked car is already at the hub; an added car goes to the Yardie.", vtd: "Confirm which car goes on camera." },
    source: { trigger: { hub: "Customer agrees to drive today", vtd: "Customer picks the car to see" },
      data: { walkin: ["OMS: create the order (car + customer)", "Yard task: prep the car and bring it to a bay", "Listing: hold the car for the TD window"], booked: ["OMS: keep or swap the booked car, add a second TD", "Yard task for an added car", "Listing: hold the cars"], vtd: ["OMS order", "Yard helper task: car on camera"] } },
    entry: { hub: ["Car chosen", "Customer wants to drive today"], vtd: ["Car chosen"] },
    exits: {
      walkin: [{ when: "Order created, yard prep raised; the customer waits on their token until the car is at the hub", to: "O1", state: "ORDER BOOKED" }, { when: "Car is in another TD", to: "T3" }],
      booked: [{ when: "A car was added: the Yardie preps it while the booked car's drive starts", to: "O1" }, { when: "Only the booked car, already at the hub: start its TD", to: "O2" }, { when: "Car is in another TD", to: "T3" }],
      vtd: [{ when: "Car confirmed, helper has it on camera", to: "O5" }],
    },
    state: { walkin: "ORDER BOOKED", booked: null, vtd: null },
    screen: { name: "Car finding &rsaquo; Confirm", build: { walkin: "new", booked: "extend", vtd: "extend" },
      pattern: { walkin: "Journey step with order summary; reuses booking-initiate and booking-confirm", booked: "Journey step with today's drive list and where each car is", vtd: "Journey step with the car on camera" },
      route: { booked: "/test-drives/BK-88213?stage=car-finding&step=confirm", walkin: "/test-drives/VS-2041?stage=car-finding&step=confirm", vtd: "/test-drives/BK-88190?stage=video&step=confirm" } },
    dap: { walkin: "booking-initiate, then booking-confirm on OMS, done by the receptionist before check-in.", booked: "The booked car is fixed. A second car means a new booking.", vtd: null },
    changed: { hub: "No licence check here any more: it moved to O4, after Start TD and the consent. Confirming a car now raises a yard task." },
  },

  // ============================== O · On the road: the car to the hub, then the TD: start, consent, DL, walkaround, drive
  // Start TD is the moment the DA meets the customer at the car and starts the recording. Consent and the licence follow.
  { id: "O1", phase: "O", name: "Yard prep and bring", tracks: ["booked", "walkin"],
    owner: "Yardie", device: "tvpair",
    purpose: { walkin: "A walk-in's car was not expected, so it needs a quick prep first: a wash, a wipe inside, fuel and tyres. Then the Yardie brings it from the yard to the hub. Meanwhile the customer waits on their token, with the car's ETA on the TV and their phone.", booked: "A car added today needs the same quick prep before it comes to the hub. The booked car is already here, so its drive can start." },
    source: { trigger: "Cars confirmed (T5)", data: ["Yard task: prep checklist, car, plate, yard spot, target bay", "Order from T5", "Token and DA, for the TV, the token page and the push"] },
    entry: ["Car chosen and held for today"],
    exits: [
      { when: "Prepped and parked at the hub: the DA is told to go back to the customer; the TV shows Car ready", to: "O2", state: "CAR AT HUB" },
      { when: "Prep finds a problem: the DA is told to pick another car", to: "T3" },
    ],
    state: "CAR AT HUB",
    screen: { name: "Yard tasks (Yardie's phone) + ground TV", build: "new",
      pattern: "The Yardie's task list: a prep checklist, then Picked up and At the hub. Each tap updates the TV's car column and wait time, and notifies the DA", route: "/yard/tasks" },
    changed: "New persona step: once a walk-in's car is chosen, the Yardie preps it and brings it to the hub while the customer waits on their token.",
  },
  { id: "O2", phase: "O", name: "Start TD", tracks: ["booked", "walkin"],
    owner: "DA", device: "tablet",
    purpose: { walkin: "The car is at the hub, so the DA goes back to the customer, meets them again and starts the test drive. Starting it creates the TD record and turns the recording on.", booked: "The car is at the hub, so the DA starts the test drive with the customer. Starting it creates the TD record and turns the recording on." },
    source: { trigger: { walkin: "CAR AT HUB push: the car is ready and the customer is waiting on their token", booked: "Cars confirmed and the car at the hub" },
      data: ["Test-drive service: START_TEST_DRIVE", "Car and bay from the yard task", "Odometer and fuel, entered by the DA", "Recording consent from check-in"] },
    entry: ["CAR AT HUB", "Car not in another active TD"],
    exits: [{ when: "TD record created and the recording on; the TV shows On test drive", to: "O3", state: "TD STARTED" }],
    state: "TD STARTED",
    screen: { name: "Test drive &rsaquo; Start", build: "extend",
      pattern: { walkin: "The waiting customer and the ready car, then the start form: odometer, fuel, route, recording", booked: "The ready car, then the start form: odometer, fuel, route, recording" },
      route: { booked: "/test-drives/BK-88213?stage=test-drive&step=start", walkin: "/test-drives/BK-89004?stage=test-drive&step=start" } },
    dap: "Start Test Drive sends START_TEST_DRIVE. DAP has no recording.",
    changed: "Start TD is now the moment the DA meets the customer at the car and starts the recording. It comes before the consent and the licence check.",
  },
  { id: "O3", phase: "O", name: "TD consent sign-off", tracks: ["booked", "walkin"],
    owner: "Customer, with the DA", device: "customer",
    purpose: "The customer signs the TD consent for this car, right after the drive is started and before the car moves.",
    source: { trigger: "TD STARTED", data: ["TD record from O2: car, plate, start time, odometer", "E-sign: signature pad, signed PDF saved to Docs"] },
    entry: ["TD STARTED", "Customer at the car"],
    exits: [
      { when: "Signed: on to the licence check", to: "O4", state: "TD CONSENT SIGNED" },
      { when: "Customer refuses: TD cancelled, reason logged", to: "N1" },
    ],
    state: "TD CONSENT SIGNED",
    screen: { name: "Test drive &rsaquo; Consent (customer view)", build: "new",
      pattern: "IFRAME_RENDERER e-sign micro-app (documentQcIframeBridge is the precedent)", route: { booked: "/test-drives/BK-88213?stage=test-drive&step=consent", walkin: "/test-drives/BK-89004?stage=test-drive&step=consent" } },
    dap: "The declaration e-sign unlocks after Start Test Drive but is only enforced at Mark Test Drive Complete, so today a customer can drive before signing. Here it gates the drive. VTD needs none.",
    changed: "Signed right after Start TD, then the licence. One consent per car.",
  },
  { id: "O4", phase: "O", name: "DL verify", tracks: ["booked", "walkin"],
    owner: "DA", device: "tablet",
    purpose: "Check the driving licence after the consent, before the car moves. Car finding and starting the TD don't need a licence; driving does.",
    source: { trigger: "TD consent signed",
      data: {
        booked: { staff: ["Docs: DL uploaded before the visit (P8)", "OCR: name, number, expiry", "Emirates ID name for the match"], qr: ["Docs: DL uploaded before the visit (P8), confirmed on the seat QR form", "OCR: name, number, expiry", "Emirates ID name for the match"] },
        walkin: { staff: ["DL scanned now by the DA, front and back", "OCR: name, number, expiry", "Home-country DL if needed"], qr: ["Docs: DL photos taken on the seat QR form, if added", "OCR: name, number, expiry", "Home-country DL if needed"] },
      } },
    entry: ["TD CONSENT SIGNED"],
    exits: [
      { when: "DL valid, name matches, not expired", to: "O5", state: "DL VERIFIED" },
      { when: "No valid DL: the TD is cancelled before the car moves; book a drive for later", to: "N6" },
      { when: "Name or photo mismatch: the DA checks Emirates ID by hand", to: "O5" },
    ],
    state: "DL VERIFIED",
    screen: { name: "Test drive &rsaquo; DL verify", build: "new",
      pattern: "Licence images (from the visit or scanned now) + OCR result + checks, on the DA's tablet", route: { booked: "/test-drives/BK-88213?stage=test-drive&step=dl-verify", walkin: "/test-drives/BK-89004?stage=test-drive&step=dl-verify" } },
    dap: "DAP uploads the DL inside the DA's test-drive checkout form, after the TD has started.",
    changed: "Now after Start TD and the consent, as the last check before the car moves. Done by the DA, at the car.",
  },
  { id: "O5", phase: "O", name: "Walkaround", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator, with a yard helper on camera" }, device: { hub: "tablet", vtd: "video" },
    purpose: { hub: "Show the car zone by zone before driving off. The recording is already on.", vtd: "Walk the customer round the car on video, then play a drive clip." },
    source: { trigger: { hub: "DL verified", vtd: "Car on camera" }, data: ["Inspection report", "Car features (Listing)", "Co-pilot talking points"] },
    entry: { hub: ["DL VERIFIED"], vtd: ["Car on camera"] },
    exits: {
      hub: [{ when: "Zones covered", to: "O6" }, { when: "Customer goes off the car: end this TD, try another", to: "T3" }],
      vtd: [{ when: "Walkaround and drive clip done", to: "O7" }],
    },
    state: null,
    screen: { name: { hub: "Test drive &rsaquo; Walkaround", vtd: "VTD console &rsaquo; Live walkaround" }, build: "new",
      pattern: { hub: "Zone checklist with talking points", vtd: "Video panel (IFRAME_RENDERER) + zone checklist" },
      route: { booked: "/test-drives/BK-88213?stage=test-drive&step=walkaround", walkin: "/test-drives/BK-89004?stage=test-drive&step=walkaround", vtd: "/test-drives/BK-88190?stage=video&step=walkaround" } },
  },
  { id: "O6", phase: "O", name: "Drive", tracks: ["booked", "walkin"],
    owner: "DA", device: "tablet",
    purpose: "Let the car sell itself while the DA answers questions.",
    source: { trigger: "Walkaround done", data: ["AI context engine: live notes from the recording", "Co-pilot: feature prompts for this car", "One-tap objection tags"] },
    entry: ["TD STARTED", "TD CONSENT SIGNED", "DL VERIFIED"],
    exits: [{ when: "Back at the hub", to: "O7" }],
    state: null,
    screen: { name: "Test drive &rsaquo; On the drive", build: "new",
      pattern: "Car row with a LIVE badge, live note and transcription with a timer, one-tap objection tags", route: { booked: "/test-drives/BK-88213?stage=test-drive&step=drive", walkin: "/test-drives/BK-89004?stage=test-drive&step=drive" } },
  },
  { id: "O7", phase: "O", name: "End TD", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: { hub: "Close the drive and stop the recording, then another car or the debrief.", vtd: "Close the video session." },
    source: { trigger: { hub: "Car back at the hub", vtd: "Walkaround done" }, data: { hub: ["Test-drive service: end time and odometer", "Customer's quick reaction"], vtd: ["Video provider: session end", "Customer's quick reaction"] } },
    entry: { hub: ["Car back at the hub"], vtd: ["Video walkaround done"] },
    exits: {
      booked: [{ when: "Another car is queued: start its TD, with its own consent. The licence is already verified", to: "O2", state: "TD CONDUCTED" }, { when: "Done driving", to: "N1", state: "TD CONDUCTED" }],
      walkin: [{ when: "Another car is queued: start its TD, with its own consent. The licence is already verified", to: "O2", state: "TD CONDUCTED" }, { when: "Done driving", to: "N1", state: "TD CONDUCTED" }],
      vtd: [{ when: "Call wrapped up", to: "N1", state: "VTD CONDUCTED" }],
    },
    state: { hub: "TD CONDUCTED", vtd: "VTD CONDUCTED" },
    screen: { name: "Test drive &rsaquo; End", build: "extend",
      pattern: "Car row turns TD done; the stage bar shows 1/2 done when a second car is queued. Maps to Mark Test Drive Complete", route: { booked: "/test-drives/BK-88213?stage=test-drive&step=end", walkin: "/test-drives/BK-89004?stage=test-drive&step=end", vtd: "/test-drives/BK-88190?stage=video&step=end" } },
    dap: { hub: "Mark Test Drive Complete sends COMPLETE_TEST_DRIVE with the checkout form.", vtd: "A VTD is complete once its slot is marked COMPLETED." },
  },

  // ============================== N · Next step
  { id: "N1", phase: "N", name: "Debrief and decision", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: "Agree what happens next. No visit ends without a next step.",
    source: { trigger: { hub: "TD CONDUCTED, or a visit with no drive", vtd: "VTD CONDUCTED" },
      data: ["AI context engine: summary of the recording since Start TD", "Objection tags from the drive", "Finance pre-check: salary, existing EMI"] },
    entry: { hub: ["TD CONDUCTED, consent refused, or no drive today"], vtd: ["VTD CONDUCTED"] },
    exits: [
      { when: "Ready to buy", to: "N2" },
      { when: "Needs time", to: "N4", state: "FOLLOW-UP SCHEDULED" },
      { when: { hub: "Wants another car", vtd: "Wants to drive it at a hub" }, to: "N6", state: "NEW TD BOOKED" },
      { when: "Not interested", to: "N7", state: "DROPPED" },
    ],
    state: null,
    screen: { name: "Next step &rsaquo; Debrief", build: "extend",
      pattern: "Disposition form from the TD Journey file: outcome, primary objection, agent notes; prefilled by CarGPT", route: { booked: "/test-drives/BK-88213?stage=next-step&step=debrief", walkin: "/test-drives/BK-89004?stage=next-step&step=debrief", vtd: "/test-drives/BK-88190?stage=next-step&step=debrief" } },
    dap: "The checkout form (payment mode, salary, EMI) and the checkout popup with a drop-off category.",
  },
  { id: "N2", phase: "N", name: "Collect token", tracks: ["booked", "walkin", "vtd"],
    owner: { hub: "DA", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: { hub: "Take the token while the customer is still here.", vtd: "Send a payment link while the customer is still on the call." },
    source: { trigger: "Decision: ready to buy", data: ["Payment service: Noon, DAPI, CBD UAE", "OMS: token amount for this order", "Notification engine: payment link"] },
    entry: ["Ready to buy", "Car still available"],
    exits: [
      { when: "Gateway confirms the payment", to: "N3", state: "TOKEN PAID" },
      { when: "Customer leaves before paying: link stays live, follow-up set", to: "N4" },
    ],
    state: "TOKEN PAID",
    screen: { name: "Next step &rsaquo; Token", build: "new",
      pattern: "QR, bank transfer or payment link. Status comes from the gateway, with no manual Mark as paid", route: { booked: "/test-drives/BK-88213?stage=next-step&step=token", walkin: "/test-drives/BK-89004?stage=next-step&step=token", vtd: "/test-drives/BK-88190?stage=next-step&step=token" } },
    dap: "Read-only. The customer pays in the consumer app and DAP shows TOKEN_PAYMENT_SUCCESS.",
  },
  { id: "N3", phase: "N", name: "Handoff to delivery", tracks: ["booked", "walkin", "vtd"],
    owner: "System, then RM", device: { hub: "tablet", vtd: "video" },
    purpose: "Start the delivery journey with nothing lost.",
    source: { trigger: "TOKEN PAID", data: ["Delivery service: documents, finance, VAS, agreement, registration, delivery", "Leadverse Order personas"] },
    entry: ["TOKEN PAID"],
    exits: [{ when: "Delivery tasks created, RM assigned. The TD journey closes", to: null, state: "CONVERTED" }],
    state: null,
    screen: { name: "Next step &rsaquo; Handoff", build: "reuse",
      pattern: "Existing Order personas: Delivery Schedule, FinOps, VAS Refurb, RM", route: { booked: "/test-drives/BK-88213?stage=next-step&step=handoff", walkin: "/test-drives/BK-89004?stage=next-step&step=handoff", vtd: "/test-drives/BK-88190?stage=next-step&step=handoff" } },
  },
  { id: "N4", phase: "N", name: "Schedule follow-up", tracks: ["booked", "walkin", "vtd"], branch: true,
    owner: { hub: "DA", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: "Agree a date and send the shortlist before the customer leaves.",
    source: { trigger: "Needs time, nothing fits today, or payment pending", data: ["Shortlist from T3", "RM calendar"] },
    entry: ["Needs time, nothing fits, or payment pending"],
    exits: [{ when: "Date agreed, shortlist sent, RM task created", to: "N5", state: "FOLLOW-UP SCHEDULED" }],
    state: "FOLLOW-UP SCHEDULED",
    screen: { name: "Next step &rsaquo; Follow-up", build: "extend",
      pattern: "Journey step that creates a Tasks entry for the RM", route: { booked: "/test-drives/BK-88213?stage=next-step&step=follow-up", walkin: "/test-drives/BK-89004?stage=next-step&step=follow-up", vtd: "/test-drives/BK-88190?stage=next-step&step=follow-up" } },
  },
  { id: "N5", phase: "N", name: "Follow-up call", tracks: ["booked", "walkin", "vtd"], branch: true,
    owner: "RM", device: "desktop",
    purpose: "Call on the agreed date and move the customer forward.",
    source: { trigger: "Follow-up date reached", data: ["Tasks: TD follow-up persona", "Visit summary from the co-pilot", "Listing: shortlist availability and price changes"] },
    entry: ["FOLLOW-UP SCHEDULED date reached"],
    exits: [
      { when: "Ready to buy: send a payment link", to: "N2" },
      { when: "Wants another drive", to: "N6" },
      { when: "No answer after 3 attempts, or not interested", to: "N7", state: "DROPPED" },
    ],
    state: null,
    screen: { name: "Tasks &rsaquo; TD follow-up", build: "reuse",
      pattern: "Tasks &rarr; Lead &rarr; TD follow-up persona", route: "/tasks/TK-5012" },
  },
  { id: "N6", phase: "N", name: "Book another TD", tracks: ["booked", "walkin", "vtd"], branch: true,
    owner: { hub: "DA or RM", vtd: "VTD operator" }, device: { hub: "tablet", vtd: "video" },
    purpose: { hub: "Book the next drive before the customer leaves.", vtd: "Turn the video viewing into a hub test drive." },
    source: { trigger: { hub: "Wants another car, or no valid DL today", vtd: "Wants to drive the car" }, data: ["Slot capacity", "OMS"] },
    entry: ["Decision: another car, or a hub TD"],
    exits: [{ when: "Slot confirmed", to: "P8", state: "NEW TD BOOKED" }],
    state: "NEW TD BOOKED",
    screen: { name: "Book test drive &rsaquo; Slot picker", build: "reuse",
      pattern: "The same slot picker as P7", route: { booked: "/test-drives/BK-88213?panel=book-td", walkin: "/test-drives/BK-89004?panel=book-td", vtd: "/test-drives/BK-88190?panel=book-td" } },
  },
  { id: "N7", phase: "N", name: "Close as dropped", tracks: ["booked", "walkin", "vtd"], branch: true,
    owner: "DA or RM", device: { hub: "tablet", vtd: "video" },
    purpose: "Record why the customer said no.",
    source: { trigger: "Not interested, or follow-up attempts used up", data: ["Drop reasons from CRUISE: mechanical, non-mechanical, pricing, assortment"] },
    entry: ["Not interested, or 3 follow-up attempts used"],
    exits: [{ when: "Reason saved", to: null, state: "DROPPED" }],
    state: "DROPPED",
    screen: { name: "Next step &rsaquo; Close", build: "extend",
      pattern: "Journey step with reason and sub-reason", route: { booked: "/test-drives/BK-88213?stage=next-step&step=close", walkin: "/test-drives/BK-89004?stage=next-step&step=close", vtd: "/test-drives/BK-88190?stage=next-step&step=close" } },
    dap: "The checkout popup asks for a drop-off category from a config list.",
  },

  // ============================== M · Oversight
  { id: "M1", phase: "M", name: "Live funnel", tracks: ["booked", "walkin", "vtd"],
    owner: "Manager (DATL)", device: "desktop",
    purpose: "See every visit by state, and step in when a step runs late.",
    source: { trigger: "Always on", data: ["Every state on this page, with timestamps"] },
    entry: ["Manager role"],
    exits: {
      hub: [{ when: "Customer waiting more than 5 min for a DA: reassign", to: "S1" }],
      vtd: [{ when: "Customer waiting in the video room more than 5 min: reassign the operator", to: "I1" }],
    },
    state: null,
    screen: { name: "Manager Oversight &rsaquo; TD funnel", build: "extend",
      pattern: "Manager Oversight + a funnel widget over the same state events", route: "/test-drives/oversight?view=funnel" },
  },
];

function stepById(id) { return STEPS.find(s => s.id === id); }
function stepsForTrack(track) { return STEPS.filter(s => s.tracks.includes(track)); }
function phaseById(id) { return PHASES.find(p => p.id === id); }

// ---------------------------------------------------------------- market tables
// The UAE values below are the base. applyMarket() swaps each registered table's contents in place, so every
// screen reads the active market without knowing about markets. In the build these come from tenant config.
const MARKET_TABLES = [];
function marketTable(table, byMarket) {
  MARKET_TABLES.push({ table, base: JSON.parse(JSON.stringify(table)), byMarket: byMarket || {} });
  return table;
}
function applyMarket(m) {
  CTX.market = m;
  MARKET_TABLES.forEach(({ table, base, byMarket }) => {
    const next = JSON.parse(JSON.stringify(byMarket[m] || base));
    if (Array.isArray(table)) { table.length = 0; next.forEach(x => table.push(x)); return; }
    Object.keys(table).forEach(k => delete table[k]);
    Object.assign(table, next);
  });
}

// ---------------------------------------------------------------- mock entities for the screens
const PCARS = marketTable({
  c1: { id: "c1", title: "2023 Nissan Altima SV", price: 62900, km: "18,400 km", body: "Sedan", drive: "2WD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#DCE3EA", url: "https://www.cars24.ae/buy-used-nissan-altima-cars-dubai/", plate: "Dubai P 48213", bay: "Bay 2" },
  c2: { id: "c2", title: "2022 Toyota Camry GLE", price: 71500, km: "24,100 km", body: "Sedan", drive: "2WD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#E5DED0", url: "https://www.cars24.ae/buy-used-toyota-camry-cars-dubai/", plate: "Dubai K 30190", bay: "Studio 1" },
  c3: { id: "c3", title: "2023 Hyundai Tucson", price: 68200, km: "12,900 km", body: "SUV", drive: "4WD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#D9E2DC", url: "https://www.cars24.ae/buy-used-hyundai-tucson-cars-dubai/", plate: "Dubai R 77105", bay: "Bay 4" },
  c4: { id: "c4", title: "2022 Kia Sportage", price: 59900, km: "31,200 km", body: "SUV", drive: "2WD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#E6D9D9", url: "https://www.cars24.ae/buy-used-kia-sportage-cars-dubai/", plate: "Dubai M 21877", bay: "Bay 1" },
}, { au: {
  c1: { id: "c1", title: "2021 Mazda3 G20 Evolve", price: 27990, km: "41,200 km", body: "Sedan", drive: "2WD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#DCE3EA", url: "https://www.cars24.com.au/", plate: "VIC 1QZ 4KT", bay: "Bay 2" },
  c2: { id: "c2", title: "2022 Toyota Camry Ascent Hybrid", price: 36490, km: "38,900 km", body: "Sedan", drive: "2WD", fuel: "Hybrid", trans: "Automatic", seats: 5, color: "#E5DED0", url: "https://www.cars24.com.au/", plate: "VIC 2BR 7LM", bay: "Studio 1" },
  c3: { id: "c3", title: "2022 Hyundai Tucson Elite", price: 34990, km: "29,500 km", body: "SUV", drive: "AWD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#D9E2DC", url: "https://www.cars24.com.au/", plate: "VIC 1TX 9PW", bay: "Bay 4" },
  c4: { id: "c4", title: "2022 Kia Sportage S", price: 31490, km: "33,800 km", body: "SUV", drive: "2WD", fuel: "Petrol", trans: "Automatic", seats: 5, color: "#E6D9D9", url: "https://www.cars24.com.au/", plate: "VIC 1KS 3RD", bay: "Bay 1" },
} });

const PEOPLE = marketTable({
  booked: { name: "Fatima Al Suwaidi", phone: "050 123 4567", email: "fatima.s@example.com", id: "BK-88213", visit: "BK-88213", nationality: "UAE", language: "Arabic", dl: "DXB-882134", source: "Consumer app", slot: "Today, 2:30 PM", car: "c1",
    needs: { budget: "AED 55k&ndash;70k", body: ["Sedan", "SUV"], fuel: "Petrol", trans: "Automatic", drive: "2WD", usage: ["City", "Family weekends"], must: ["Apple CarPlay"] },
    picks: [["c1", 94, "Booked car &middot; in budget &middot; CarPlay"], ["c3", 88, "SUV, more boot space &middot; in budget"], ["c2", 81, "Sedan &middot; AED 1,500 over budget"]] },
  walkin: { name: "Ahmed Saleh", phone: "058 330 4471", email: "ahmed.saleh@example.com", id: "BK-89004", visit: "VS-2041", nationality: "Egypt", language: "Arabic, English", dl: "DXB-1190245", homeDl: "EG-55120988 (Egypt)", source: "Drive-by", car: "c4",
    needs: { budget: "AED 55k&ndash;65k", body: ["SUV"], fuel: "Petrol", trans: "Automatic", drive: "2WD", usage: ["Family", "Long drives"], must: ["7 airbags", "Rear camera"] },
    picks: [["c4", 92, "SUV &middot; in budget &middot; rear camera"], ["c3", 86, "SUV, 4WD &middot; AED 3,200 over budget"], ["c1", 70, "Sedan &middot; in budget"]] },
  vtd: { name: "Khalid Al Jaberi", phone: "055 987 1230", email: "khalid.j@example.com", id: "BK-88190", visit: "BK-88190", nationality: "UAE", language: "English", dl: "AUH-190552", source: "Chatbot", slot: "Today, 3:00 PM", car: "c2",
    needs: { budget: "AED 65k&ndash;75k", body: ["Sedan"], fuel: "Petrol", trans: "Automatic", drive: "2WD", usage: ["Commute to Dubai"], must: ["Adaptive cruise"] },
    picks: [["c2", 93, "Booked car &middot; adaptive cruise"], ["c1", 84, "Sedan &middot; AED 8,600 cheaper"]] },
}, { au: {
  booked: { name: "Emily Carter", phone: "0412 345 678", email: "emily.c@example.com", id: "BK-88213", visit: "BK-88213", nationality: "Australia", language: "English", dl: "048 219 345 (VIC)", source: "Consumer app", slot: "Today, 2:30 PM", car: "c1",
    needs: { budget: "$25k&ndash;35k", body: ["Sedan", "SUV"], fuel: "Petrol", trans: "Automatic", drive: "2WD", usage: ["City", "Family weekends"], must: ["Apple CarPlay"] },
    picks: [["c1", 94, "Booked car &middot; in budget &middot; CarPlay"], ["c3", 88, "SUV, more boot space &middot; in budget"], ["c2", 81, "Sedan &middot; $1,490 over budget"]] },
  walkin: { name: "Jack Thompson", phone: "0433 210 987", email: "jack.t@example.com", id: "BK-89004", visit: "VS-2041", nationality: "Australia", language: "English", dl: "061 774 208 (VIC)", homeDl: null, source: "Drive-by", car: "c4",
    needs: { budget: "$27k&ndash;33k", body: ["SUV"], fuel: "Petrol", trans: "Automatic", drive: "2WD", usage: ["Family", "Long drives"], must: ["7 airbags", "Rear camera"] },
    picks: [["c4", 92, "SUV &middot; in budget &middot; rear camera"], ["c3", 86, "SUV, AWD &middot; $1,990 over budget"], ["c1", 70, "Sedan &middot; in budget"]] },
  vtd: { name: "Liam Walsh", phone: "0455 876 210", email: "liam.w@example.com", id: "BK-88190", visit: "BK-88190", nationality: "Australia", language: "English", dl: "773 1094 (ACT)", source: "Chatbot", slot: "Today, 3:00 PM", car: "c2",
    needs: { budget: "$32k&ndash;38k", body: ["Sedan"], fuel: "Hybrid", trans: "Automatic", drive: "2WD", usage: ["Commute to the city"], must: ["Adaptive cruise"] },
    picks: [["c2", 93, "Booked car &middot; adaptive cruise"], ["c1", 84, "Sedan &middot; $8,500 cheaper"]] },
} });

const PSTAFF = marketTable({
  receptionist: { name: "Kishor", init: "K", role: "RECEPTIONIST" },
  da: { name: "Omar Hassan", init: "OH", role: "COMMON_DA" },
  operator: { name: "Sara Ibrahim", init: "SI", role: "VIRTUAL_DA" },
  manager: { name: "Aaliya Patel", init: "AP", role: "DATL" },
  cc: { name: "Reem Khalifa", init: "RK", role: "Call centre" },
  rm: { name: "Rania Haddad", init: "RH", role: "RM" },
  prep: { name: "Bilal Raza", init: "BR", role: "PREP_USER" },
}, { au: {
  receptionist: { name: "Kishor", init: "K", role: "RECEPTIONIST" },
  da: { name: "Josh Miller", init: "JM", role: "COMMON_DA" },
  operator: { name: "Priya Sharma", init: "PS", role: "VIRTUAL_DA" },
  manager: { name: "Aaliya Patel", init: "AP", role: "DATL" },
  cc: { name: "Chloe Davis", init: "CD", role: "Call centre" },
  rm: { name: "Grace Lee", init: "GL", role: "RM" },
  prep: { name: "Tom Nguyen", init: "TN", role: "PREP_USER" },
} });

const PDAS = marketTable([
  { id: "da1", name: "Omar Hassan", role: "COMMON_DA", lang: "Arabic, English", status: "AVAILABLE", today: 6, max: 10, score: 92, pre: true },
  { id: "da2", name: "Layla Ahmed", role: "HUB_DA", lang: "English, Hindi", status: "AVAILABLE", today: 3, max: 10, score: 88 },
  { id: "da5", name: "Faisal Noor", role: "HUB_DA", lang: "Arabic, Urdu", status: "ON_BREAK", today: 5, max: 10, score: 84 },
  { id: "da4", name: "Yusuf Khan", role: "HOME_DA", lang: "English", status: "AVAILABLE", today: 10, max: 10, score: 75 },
], { au: [
  { id: "da1", name: "Josh Miller", role: "COMMON_DA", lang: "English", status: "AVAILABLE", today: 6, max: 10, score: 92, pre: true },
  { id: "da2", name: "Mia Wilson", role: "HUB_DA", lang: "English, Mandarin", status: "AVAILABLE", today: 3, max: 10, score: 88 },
  { id: "da5", name: "Ben Clarke", role: "HUB_DA", lang: "English, Hindi", status: "ON_BREAK", today: 5, max: 10, score: 84 },
  { id: "da4", name: "Sam Patel", role: "HOME_DA", lang: "English", status: "AVAILABLE", today: 10, max: 10, score: 75 },
] });

// market strings the screens read directly
const MK = marketTable({
  hub: "Al Quoz hub", hubFull: "Al Quoz hub, Dubai", hubCode: "AQZ", site: "cars24.ae", credit: "AECB score", idDoc: "Emirates ID", area: "Area",
  langs: ["Arabic", "English", "Hindi", "Urdu", "Other"],
  budgets: ["Under AED 55k", "AED 55k&ndash;65k", "AED 55k&ndash;70k", "AED 65k&ndash;75k", "AED 75k+"],
  usage: ["City", "Family", "Family weekends", "Long drives", "Commute to Dubai", "Off-road"],
  token: 5000, privacy: "privacy notice",
}, { au: {
  hub: "Melbourne hub", hubFull: "Melbourne hub, VIC", hubCode: "MEL", site: "cars24.com.au", credit: "Credit score", idDoc: "Licence state", area: "Suburb",
  langs: ["English", "Mandarin", "Vietnamese", "Hindi", "Other"],
  budgets: ["Under $25k", "$25k&ndash;35k", "$27k&ndash;33k", "$32k&ndash;38k", "$40k+"],
  usage: ["City", "Family", "Family weekends", "Long drives", "Commute to the city", "Off-road"],
  token: 1000, privacy: "privacy collection notice",
} });

function money(n) { return CTX.market === "au" ? "$" + n.toLocaleString("en-AU") : "AED " + n.toLocaleString("en-US"); }
function inits(name) { return (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase(); }

// ---------------------------------------------------------------- copy layer
// The screens are written once, with UAE copy. For another market, localize() swaps the copy that is not already
// data (people in sentences, places, documents, money in sentences). In the build this is tenant config, not a table.
const COPY = {
  au: [
    // places and rules
    ["Al Quoz hub, Dubai", "Melbourne hub, VIC"], ["at Al Quoz hub", "at the Melbourne hub"], ["Al Quoz &middot; today", "Melbourne hub &middot; today"], ["Al Quoz", "the Melbourne hub"],
    ["Dubai RTA (example)", "VicRoads (example)"], ["UAE traffic laws", "Victorian road rules"], ["traffic fines during this drive", "traffic fines and tolls during this drive"],
    ["CARS24 UAE", "CARS24 Australia"], ["Payment service: Noon, DAPI, CBD UAE", "Payment service: the Australian payment gateway"],
    ["IBAN", "BSB and account"], ["AE07 0331 0000 0123 4567 890", "000-000 &middot; 1234 5678 (example)"],
    // documents and formats
    ["Name matches the Emirates ID", "Name matches the booking"], ["checks Emirates ID by hand", "checks photo ID by hand"], ["checks Emirates ID", "checks photo ID"],
    ["Emirates ID name for the match", "Booking name for the match"], ["OCR against the Emirates ID", "OCR against the booking"], ["an Emirates ID check", "a photo ID check"], ["Emirates ID", "Photo ID"],
    ["UAE mobile, 05X XXX XXXX", "AU mobile, 04XX XXX XXX"], ["UAE mobile", "AU mobile"], ["Hubs in the customer's emirate", "Hubs in the customer's state"],
    ["Emirate and area", "Suburb and postcode"], ["Arabic, English, Hindi, Urdu, other", "English, Mandarin, Vietnamese, Hindi, other"], ["AED bands", "AUD bands"],
    // money and finance words in sentences
    ["Camry: AED 1,500 over budget", "Camry: $1,490 over budget"], ["AED 18,000", "$7,500"], ["AED 1,200", "$450"], ["AED 1,000", "$500"], ["AED 3,000 less", "$1,500 less"],
    ["Monthly salary", "Monthly income"], ["Existing EMI", "Existing repayments"], ["Loan EMI", "Car finance"], ["loan EMI", "car finance"], ["EMI, down payment", "repayments, deposit"],
    ["an EMI estimate", "a repayment estimate"], ["Wants EMI options", "Wants finance options"], ["salary, existing EMI", "income, existing repayments"],
    ["Salary and existing EMI", "Income and existing repayments"], ["payment mode, salary, EMI", "payment mode, income, repayments"],
    // cars named in sentences
    ["Nissan Altima SV", "Mazda3 G20 Evolve"], ["Nissan Altima", "Mazda3"], ["Altima", "Mazda3"], ["Camry GLE", "Camry Ascent Hybrid"], ["Tucson: 4WD for long drives", "Tucson: AWD for long drives"],
    // people named in sentences and lists
    ["Fatima Al Suwaidi", "Emily Carter"], ["Fatima", "Emily"], ["fatima.s@example.com", "emily.c@example.com"],
    ["Ahmed Saleh", "Jack Thompson"], ["Layla Ahmed", "Mia Wilson"], ["Ahmed", "Jack"], ["Saleh", "Thompson"],
    ["Khalid Al Jaberi", "Liam Walsh"], ["Khalid", "Liam"], ["khalid.j@example.com", "liam.w@example.com"],
    ["Omar Hassan", "Josh Miller"], ["Omar", "Josh"], ["Bilal Raza", "Tom Nguyen"], ["Bilal", "Tom"], ["Reem Khalifa", "Chloe Davis"], ["Reem", "Chloe"],
    ["Rania Haddad", "Grace Lee"], ["Sara Ibrahim", "Priya Sharma"], ["Sara", "Priya"], ["Faisal Noor", "Ben Clarke"], ["Yusuf Khan", "Sam Patel"],
    ["Hamad Al Ketbi", "Oliver Brown"], ["hamad.k@example.com", "oliver.b@example.com"], ["Sana Malik", "Sophie Martin"], ["Maryam Rashidi", "Ava Robinson"],
    ["Noora Al Shamsi", "Isla Thomas"], ["Hamdan Saeed", "Noah White"], ["Aisha Al Mazrouei", "Ruby Hall"], ["Rashid Al Falasi", "Ethan King"],
    ["050 123 4567", "0412 345 678"], ["055 987 1230", "0455 876 210"], ["052 445 9981", "0421 778 093"], ["050 774 2210", "0438 552 761"],
  ],
};
const COPY_RE = {};
function localize(html) {
  const pairs = COPY[CTX.market];
  if (!pairs || !html) return html;
  if (!COPY_RE[CTX.market]) {
    const keys = pairs.map(p => p[0]).sort((a, b) => b.length - a.length);
    COPY_RE[CTX.market] = { re: new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g"), map: Object.fromEntries(pairs) };
  }
  const { re, map } = COPY_RE[CTX.market];
  return html.replace(re, (m) => map[m]);
}

// ---------------------------------------------------------------- what is configured per market (for the docs view)
// [setting, UAE, India, Australia]. India is listed for the decision; the screens show the UAE and Australia.
const MARKET_CONFIG = [
  ["Check-in default", "By staff: a receptionist or DA fills the form with the customer", "By staff", "Seat QR: the customer checks in on their own phone"],
  ["The other way", "Seat QR, for any visit", "Seat QR, for any visit", "By staff, for any visit"],
  ["Proof of mobile", "OTP, both ways", "Same", "Same"],
  ["Token and live tracker sent on", "WhatsApp", "WhatsApp", "WhatsApp, or SMS (to decide)"],
  ["Identity document", "Emirates ID", "To confirm", "Driver licence; no national ID"],
  ["Credit check", "AECB", "CIBIL", "Credit bureau to confirm"],
  ["Currency", "AED", "INR", "AUD, shown as $"],
  ["Address on the form", "Emirate and area", "Pincode", "Suburb and postcode"],
  ["Mobile format", "05X XXX XXXX", "+91", "04XX XXX XXX"],
  ["Privacy wording", "Privacy notice", "To confirm", "Privacy collection notice"],
  ["Road rules on the TD consent", "UAE traffic laws", "To confirm", "State road rules, fines and tolls"],
  ["Hub in these screens", "Al Quoz, Dubai", "Not shown", "Melbourne, VIC"],
];
