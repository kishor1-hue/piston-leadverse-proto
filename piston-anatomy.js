// ---- PISTON: one level deeper than the screen ----
// For every step: the numbered parts of its screen (pins on the screen), the fields it captures,
// the actions it fires, and the states it can be in. Part keys match data-part="key" in piston-screens.js.
// An entry can be keyed by track like the step spec: { hub, booked, walkin, vtd, all }.
// API names marked "DAP today" exist in DAP; "Proposed" ones do not exist yet.

const SHARED_PARTS = {
  lead: ["Lead pane", "LEFT_PANE", "Status pill, AI summary, contact actions (call, WhatsApp, chat, email), finance and documents. The same pane on every step"],
  stages: ["Stage bar", "STAGE_STEPPER", "Done stages in green, the current one in violet; the second line shows progress"],
  gpt: ["CarGPT", "CARGPT_PANEL", "Suggestions for this step, chat with / to mention a record, and live transcription since check-in"],
  foot: ["Footer actions", "SHELL_CTAS", "Previous, then the step's exits. The primary one fires the main exit and refetches the journey"],
  call: ["Call bar", "TELEPHONY", "Live call with recording, mute, hold and end. Click-to-call through the telephony provider"],
  video: ["Video panel", "IFRAME_RENDERER", "The video call, recorded and transcribed"],
};

const ANATOMY = {
  // ------------------------------------------------------------ P · Plan
  P1: {
    parts: [["queue", "Call queue", "TABLE", "One row per lead task: source, car of interest, waiting time, attempts. Rows sort by waiting time"],
      ["call-now", "Call now", "ROW_ACTION", "Opens the task journey at Welcome and dials through click-to-call"]],
    fields: [["Lead", "Name and email", "Read only", "Lead service", "Mobile only when no name yet"], ["Source", "Chip", "Read only", "Lead service", "App, website, chatbot, ad, missed call"],
      ["Car of interest", "Text", "Read only", "CDP", "Last car viewed, if any"], ["Waiting", "Duration", "Read only", "Task created time", "Amber after the first-call target"], ["Attempts", "Count", "Read only", "Task", "3, then closed as dropped"]],
    actions: [["Call now", "Proposed: task to IN_PROGRESS, click-to-call", "P2"]],
    states: [["Empty", "No leads waiting. New ones arrive in real time"], ["Late", "Waiting time turns amber past the target"], ["Callback due", "Moves from Callbacks to the top of the queue"]],
  },
  P2: {
    parts: [["call"], ["stages", null, null, "The call's own six steps: Welcome, Contact, Pitch, Discovery, Finalize, Book"], ["script", "Call script", "CALL_SCRIPT", "Opening line with the customer's name and the car they looked at"],
      ["name", "Name", "DYNAMIC_FORM", "Prefilled when the lead already has it"], ["lang", "Language", "CHIPS", "Used later to match a DA"], ["gpt"], ["foot"]],
    fields: [["Name", "Text", "Yes", "Lead or app profile", "Letters and spaces, 2 to 60 characters"], ["Language", "Single select", "No", "Asked", "Arabic, English, Hindi, Urdu, other"]],
    actions: [["Name confirmed", "Saves the name on the lead", "P3"], ["No answer or call back", "Proposed: task back to the queue with a callback time", "P9"], ["Wrong number", "Closes the task with that reason", "N7"]],
    states: [["Ringing", "Call bar shows Calling; the form waits"], ["Connected", "Script and name form"], ["Call dropped", "Task stays open; retry offered"]],
  },
  P3: {
    parts: [["call"], ["stages"], ["mobile", "Mobile", "READ_ONLY_FIELD", "From the lead; no OTP on a call"], ["whatsapp", "Same on WhatsApp?", "CHIPS", "If no, ask for the WhatsApp number"],
      ["email", "Email", "DYNAMIC_FORM", "Prefilled from the app profile when there is one"], ["wa-consent", "Booking updates on WhatsApp", "TOGGLE", "Stored as the customer's consent"],
      ["order-note", "Order note", "INFO", "Says what the submit does: the order is created here"], ["foot"]],
    fields: [["Mobile", "Phone", "Read only", "Lead", "UAE mobile, 05X XXX XXXX"], ["Same on WhatsApp", "Yes or no", "Yes", "Asked", "No asks for a second number"],
      ["Email", "Email", "Yes", "App profile or typed", "Valid email format"], ["Updates on WhatsApp", "Toggle", "Yes", "Asked", "Customer's choice"]],
    actions: [["Create order and continue", "OMS booking-initiate with the customer and the car of interest", "BOOKING INITIATED, then P4"]],
    states: [["Order created", "BOOKING INITIATED chip with the order ID in the header"], ["OMS error", "Inline error; the task stays on Contact"], ["No car of interest", "Order creation waits for P6"]],
  },
  P4: {
    parts: [["call"], ["stages"], ["order-chip", "Order chip", "STATUS_CHIP", "The order exists from here on"], ["pitch-points", "Pitch points", "CHECKLIST", "Tick each point as it is covered"],
      ["reaction", "Customer reaction", "CHIPS", "Decides the next exit"], ["objections", "Objections", "CHIPS", "Carried into the debrief later"], ["gpt"], ["foot"]],
    fields: [["Points covered", "Checklist", "No", "Pitch points (CMS)", "Any order"], ["Customer reaction", "Single select", "Yes", "Agent", "Interested, has questions, not now, not interested"],
      ["Objections", "Multi select", "No", "Agent", "Price, trust, finance, already bought"]],
    actions: [["Interested: show cars", "Saves the reaction", "P5"], ["Not now: call back", "Callback time on the task", "P9"], ["Not interested", "Closes with a reason", "N7"]],
    states: [["Covered", "Points turn green as they are ticked"], ["Objection raised", "CarGPT suggests an answer"]],
  },
  P5: {
    parts: [["call"], ["stages"], ["filters", "Filters", "FILTER_CHIPS", "Prefilled from app browsing or the chat"], ["car-rows", "Car rows", "CAR_LIST", "Live stock with Like and Dislike per car"],
      ["send", "Send liked cars", "BUTTON", "Shares the liked cars on WhatsApp"], ["foot"]],
    fields: [["Filters", "Chips", "No", "CDP browsing", "Budget, body type, transmission"], ["Verdict per car", "Like or dislike", "No", "The customer's answer", "A dislike removes similar cars from the next set"]],
    actions: [["Like or Dislike", "Proposed: preference saved on the lead", "Next cars adapt"], ["Send liked cars on WhatsApp", "Notification engine", "Customer gets the shortlist"], ["Next: finalize", "None", "P6"]],
    states: [["Nothing matches", "Widen the filters, or alert on new arrivals"], ["Car reserved", "Row greys out with Reserved"]],
  },
  P6: {
    parts: [["call"], ["stages"], ["final-car", "Final car", "RADIO_LIST", "From the liked cars"], ["td-type", "Test drive type", "SEGMENTED", "Hub or video"], ["order-update", "Order update", "STATUS", "The order's car is set here"], ["foot"]],
    fields: [["Final car", "Single select", "Yes", "Liked cars from P5", "One car per order"], ["Test drive type", "Hub or video", "Yes", "Asked", "Video only if the car can be shown on video"]],
    actions: [["Next: pick a slot", "OMS: set the final car on the order if it changed", "P7"]],
    states: [["Car changed", "Order ID stays the same; the car is updated"], ["Video not possible", "Video option disabled, with the reason"]],
  },
  P7: {
    parts: [["call"], ["stages"], ["day", "Day", "CHIPS", "Today plus the next three days"], ["slots", "Slots", "SLOT_GRID", "Only slots with a free DA (or operator) and a free car"], ["foot"]],
    fields: [["Day", "Date", "Yes", "Slot planner", "Next 4 days"], ["Slot", "Time", "Yes", "Slot planner capacity", "Full slots disabled; 1 left in amber"]],
    actions: [["Book test drive", "OMS booking-confirm; slot held in the slot planner", "ORDER BOOKED or VTD BOOKED; task closed; P8"], ["No slot works", "Callback on the task", "P9"]],
    states: [["Full", "Slot disabled"], ["Low", "1 left in amber"], ["Booked", "Confirmation on WhatsApp and SMS; the task closes"]],
  },
  P8: {
    parts: [["open", "Open today's arrivals", "BUTTON", "Switches to the Today view (I1)"], ["table", "Upcoming visits", "TABLE", "Visits in the next 24 hours"],
      ["readiness", "Readiness", "STATUS_ICONS", "DL, car prep, DA, reminder. Amber means a task for someone"], ["row-action", "Row action", "ROW_ACTION", "The fix for the first amber item"]],
    fields: [["DL", "Status", "Read only", "Docs", "Uploaded, or link sent"], ["Car prep", "Status", "Read only", "Prep task", "Ready at a bay"], ["DA", "Status", "Read only", "DA roster", "Pre-assigned by capacity"], ["Reminder", "Status", "Read only", "Notification engine", "T-24h and T-2h sent"]],
    actions: [["Raise prep", "Proposed: prep task for the yard", "Prep turns green when done"], ["Resend DL link", "Notification engine", "DL turns green on upload"], ["Assign DA", "Assign DA modal", "DA turns green"]],
    states: [["All green", "Ready for the visit"], ["No-show", "30 min after the slot it moves to callbacks (P9)"]],
  },
  P9: {
    parts: [["table", "Callbacks", "TABLE", "Leads to call back, with the reason and attempts"], ["resume", "Resumes at", "TEXT", "The step where the last call stopped"],
      ["reschedule", "Move the callback", "CHIPS", "New callback time agreed with the customer"], ["call-now", "Call now", "BUTTON", "Dials and reopens the task at the saved step"]],
    fields: [["Callback time", "Date and time", "Yes", "Agreed on the call", "Within working hours"], ["Attempts", "Count", "Read only", "Task", "3, then closed as dropped"], ["Resumes at", "Step", "Read only", "Task journey", "Last step reached"]],
    actions: [["Call now", "Click-to-call; the task reopens", "Resumes at the saved step (P2 shown)"], ["No answer: try later", "Attempt count +1, callback moved", "Stays in P9"], ["Not interested", "Closed with a reason", "N7"]],
    states: [["Due now", "Row moves to the top"], ["Last attempt", "Amber attempt chip"], ["Closed", "Dropped with reason No response"]],
  },

  // ------------------------------------------------------------ I · Introduce
  I1: {
    booked: {
      parts: [["table", "Today's visits", "TABLE", "Bookings and walk-ins at this hub today"], ["mark-arrived", "Mark arrived", "ROW_ACTION", "Logs the arrival time"]],
      fields: [["Status", "Chip", "Read only", "Visit", "Expected, arrived, checked in, TD conducted, token paid"]],
      actions: [["Mark arrived", "Proposed: visit.arrived event; the pre-assigned DA gets a heads-up", "I2"]],
      states: [["Early", "Arrived before the slot shows Early"], ["Late", "15 min past the slot without arrival shows Late"]],
    },
    walkin: {
      parts: [["add-lead-btn", "New walk-in", "BUTTON", "Opens the Add lead drawer"], ["add-lead", "Add lead information", "DRAWER_FORM", "First name, last name, email, mobile. From the TD Journey file"], ["table", "Today's visits", "TABLE", "The new walk-in appears at the top"]],
      fields: [["First name", "Text", "Yes", "Typed", ""], ["Last name", "Text", "Yes", "Typed", ""], ["Email ID", "Email", "No", "Typed", "Valid format"], ["Mobile number", "Phone", "Yes", "Typed", "UAE mobile; checked for an existing lead first"]],
      actions: [["Add lead", "Lead service: create the lead (dedupe on mobile); visit created", "I2"]],
      states: [["Duplicate", "Mobile already exists: open that lead instead"]],
    },
    vtd: {
      parts: [["video"], ["stages"], ["waiting", "Waiting room", "CARD", "Booking details while the customer waits"], ["foot"]],
      fields: [],
      actions: [["Admit and start the call", "Video provider: admit; DAP today: CUSTOMER_JOINED_CALL", "I2"]],
      states: [["Not joined", "10 min after the slot: callback (P9)"]],
    },
  },
  I2: { parts: [], fields: [], actions: [], states: [["No screen", "A human moment. The arrival time from I1 starts the clock"]] },

  // ------------------------------------------------------------ S · Sign-in
  S1: {
    booked: {
      parts: [["lead"], ["stages", null, null, "Check-in is the current stage"], ["empty", "Not checked in yet", "EMPTY_STATE", "Shows until check-in is done; Start check-in opens the modal"],
        ["details", "Check-in details", "MODAL_FORM", "Hub, accompanied by, financial interest, area; prefilled from the booking"], ["consent", "Recording consent", "TOGGLE", "Switches AI notes and transcription on or off for the visit"],
        ["otp", "OTP", "OTP_INPUT", "Shown after Send OTP"], ["checked", "You're all checked in", "SUCCESS", "Tells the customer their DA is coming"],
        ["qr", "Browse QR", "QR", "Customer browses cars while waiting; liked cars show up in T3"], ["gpt"], ["foot"]],
      fields: [["Visit purpose", "Select", "Yes", "Booking (prefilled)", "Buy or test drive"], ["Hub", "Select", "Yes", "Booking (prefilled)", "Hubs in the customer's emirate"],
        ["Accompanied by", "Select", "No", "Asked", "Alone, spouse, family, friend"], ["Financial interest", "Select", "No", "Asked", "Cash, loan EMI, not sure"],
        ["Area", "Select", "No", "Asked", "Emirate and area; replaces the pincode in the Figma"], ["Recording consent", "Toggle", "Yes", "Asked", "No turns AI notes off for this visit"], ["OTP", "6 digits", "Yes", "User auth", "3 tries; resend after 30 s"]],
      actions: [["Send OTP", "User auth: OTP to the booked mobile", "OTP step"], ["Verify OTP", "User auth verify; DAP today: POST /customer-check-in/{customerId}", "CHECKED IN; checked-in step with the QR"], ["Continue to DL verify", "None", "S2"]],
      states: [["Not checked in", "Empty state with Start check-in"], ["Wrong OTP", "Tries left shown; after 3, an Emirates ID check"], ["Checked in", "Success with the browse QR"]],
    },
    walkin: {
      parts: [["lead"], ["stages"], ["empty", "Not checked in yet", "EMPTY_STATE", "Start check-in opens the modal"], ["details", "Check-in details", "MODAL_FORM", "Hub, accompanied by, financial interest, area"],
        ["consent", "Recording consent", "TOGGLE", "Switches AI notes and transcription on or off"], ["otp", "OTP", "OTP_INPUT", "Shown after Send OTP"], ["checked", "You're all checked in", "SUCCESS", "With the browse QR"],
        ["qr", "Browse QR", "QR", "Liked cars show up for the DA"], ["purpose", "Purpose of visit", "OPTION_CARDS", "From the TD Journey file's onboarding questions"], ["gpt"], ["foot"]],
      fields: [["Hub", "Select", "Yes", "Logged-in hub", ""], ["Accompanied by", "Select", "No", "Asked", ""], ["Financial interest", "Select", "No", "Asked", "Cash, loan EMI, not sure"], ["Area", "Select", "No", "Asked", "Emirate and area"],
        ["Recording consent", "Toggle", "Yes", "Asked", ""], ["OTP", "6 digits", "Yes", "User auth", "3 tries"], ["Purpose of visit", "Option cards", "Yes", "Asked", "Only Buy / Test drive continues; others go to their desk"]],
      actions: [["Send OTP", "User auth: OTP to the lead's mobile", "OTP step"], ["Verify OTP", "User auth verify; check-in recorded", "CHECKED IN"], ["Continue to DL verify", "Purpose saved on the visit", "S2"]],
      states: [["Other purpose", "Drop-off, pickup, service or selling: routed to that desk"], ["Wrong OTP", "Tries left shown"]],
    },
    vtd: {
      parts: [["video"], ["stages"], ["otp", "OTP", "OTP_INPUT", "The customer reads the code out on the call"], ["consent", "Recording consent", "TOGGLE", "Asked on camera"], ["foot"]],
      fields: [["OTP", "6 digits", "Yes", "User auth", "3 tries"], ["Recording consent", "Toggle", "Yes", "Asked", "No turns AI notes off"]],
      actions: [["Verify OTP", "User auth verify", "VTD CHECKED IN"], ["Check in and start car finding", "None", "T2"]],
      states: [["Wrong OTP", "Tries left shown"]],
    },
  },
  S2: {
    parts: [["lead"], ["stages", null, null, "DL verify is its own stage, as in the TD Journey file"], ["upload", "Licence images", "UPLOAD", "Front and back, uploaded before the visit or scanned now"],
      ["ocr", "Read from the licence", "OCR_RESULT", "Name, number, expiry, issuer"], ["checks", "Checks", "CHECKLIST", "Name match and expiry are automatic; the photo match is the receptionist's"], ["gpt"], ["foot"]],
    fields: [["DL front", "Image", "Yes", "Pre-visit upload or scan", "JPG or PNG under 5 MB"], ["DL back", "Image", "Yes", "Same", ""], ["Licence number", "Text", "Read only", "OCR", "Editable if OCR fails"],
      ["Expiry", "Date", "Read only", "OCR", "Must be after today"], ["Name match", "Check", "Yes", "OCR against the Emirates ID", "Fuzzy match"], ["Photo match", "Check", "Yes", "Receptionist", ""],
      ["Home-country DL", "Text", "No", "Typed", "For visitors; acceptance is an open decision"]],
    actions: [["Verify and continue", "Proposed: dl.verified event; licence saved to Docs", "DL VERIFIED; S3"], ["No valid DL: browse only", "Flag on the visit; the drive is blocked", "S3"]],
    states: [["Uploaded before the visit", "Images and OCR prefilled; one tap to verify"], ["OCR failed", "Fields become editable"], ["Expired", "Verify disabled; browse only offered"]],
  },
  S3: {
    parts: [["lead"], ["stages", null, null, "Car finding starts as Assigning DA"], ["modal", "Assign DA", "ASSIGN_MODAL", "Leadverse's ManualAssignmentModal"], ["da-row", "DA row", "LIST_ITEM", "Status dot, language, score"],
      ["cap", "Daily load", "CAPACITY_BAR", "At the daily cap, the row cannot be picked"], ["foot"]],
    fields: [["DA", "Single select", "Yes", "DA roster", "Ranked by status, load and language; at-cap and on-break DAs disabled"], ["Daily load", "Count", "Read only", "DA roster", "For example 6/10 today"]],
    actions: [["Assign and notify", "Leadverse: POST .../tasks/{taskId}/assign-direct; DAP today: PUT work-order/assign-da", "DA ASSIGNED; push to the DA; T1"]],
    states: [["Pre-assigned", "Omar preselected with a Pre-assigned tag"], ["Nobody free", "Manager alerted after 10 min"], ["At cap", "Row disabled with At daily cap"]],
  },

  // ------------------------------------------------------------ T · Tailor
  T1: {
    parts: [["wait-card", "Waiting customer", "CARD", "Who, where, booking or walk-in, DL status, language, AI context"], ["met", "I've met the customer", "BUTTON", "The handshake"],
      ["later", "Later today", "TABLE", "The DA's other visits"], ["alert-note", "Escalation rule", "INFO", "5 minutes, then the receptionist and the manager are alerted"]],
    fields: [["Waiting", "Timer", "Read only", "Since DA assigned", "Red at 5 min"]],
    actions: [["I've met the customer", "DAP today: work order to MET_CUSTOMER", "MET CUSTOMER; T2"]],
    states: [["Waiting", "Card with a running timer"], ["Late", "At 5 min the receptionist and the manager are alerted"]],
  },
  T2: {
    hub: {
      parts: [["lead"], ["stages"], ["prefill", "Prefill tag", "TAG", "Booked customers start with answers from the booking"], ["needs", "Needs", "DYNAMIC_FORM", "Chips, so the DA can fill it while talking"], ["gpt"], ["foot"]],
    },
    vtd: {
      parts: [["video", null, null, "The operator shares the screen while asking"], ["stages"], ["prefill", "Prefill tag", "TAG", "Answers from the booking"], ["needs", "Needs", "DYNAMIC_FORM", "Chips"], ["foot"]],
    },
    all: {
      fields: [["Budget", "Single select", "Yes", "Booking or CDP (prefilled for booked)", "AED bands"], ["Body type", "Multi select", "Yes", "Same", "Sedan, SUV, hatchback, pickup"], ["Transmission", "Single select", "No", "Same", ""],
        ["Drive", "Single select", "No", "Asked", "2WD, 4WD"], ["Mostly for", "Multi select", "No", "Asked", ""], ["Must-haves", "Multi select", "No", "Asked", ""], ["Paying by", "Single select", "No", "Asked", "Cash, finance, not sure"]],
      actions: [["Show matching cars", "Recommendation model with these needs", "T3"], ["Set on the booked car: skip (booked)", "None", "T4"]],
      states: [["Prefilled", "Booked customers start from the booking"], ["Missing", "Show matching cars stays disabled until budget and body type are set"]],
    },
  },
  T3: {
    hub: {
      parts: [["lead"], ["stages"], ["car-rows", "Car rows", "CAR_LIST", "Like the TD Journey booked list: order ID, title, price, match reason; tick to drive today"],
        ["add-cars", "Add cars", "DRAWER", "Search live stock by order ID or car name; from the TD Journey file"], ["compare", "Compare", "COMPARE_MODAL", "Side by side for the ticked cars"], ["gpt"], ["foot"]],
    },
    vtd: {
      parts: [["video", null, null, "Shown to the customer over screen share"], ["stages"], ["car-rows", "Car rows", "CAR_LIST", "Booked car and matches"], ["compare", "Compare", "COMPARE_MODAL", "Side by side"], ["foot"]],
    },
    all: {
      fields: [["Drive today", "Tick per car", "Yes, at least one", "DA", "Up to 3 cars per visit (example)"], ["Match", "Percent", "Read only", "Recommendation model", "With the reason"]],
      actions: [["Add cars", "Opens the drawer; adds cars to the list", "Stays on T3"], ["Compare", "Compare modal", "Stays on T3"], ["Next: why this car", "None", "T4"], ["Nothing fits: share shortlist", "Notification engine", "N4"]],
      states: [["Booked car pinned", "Booked tag on the booked car"], ["Liked while waiting", "Tag on cars liked from the check-in QR"], ["Busy", "A car in another TD shows when it is free"]],
    },
  },
  T4: {
    hub: {
      parts: [["inspection", "Inspection summary", "INFO_LIST", "This car's own inspection"], ["promise", "Why CARS24", "INFO_CARDS", "Inspected, warranty, return window, finance estimate"], ["foot", "Customer actions", "SHELL_CTAS", "Large buttons for the customer"]],
    },
    vtd: {
      parts: [["video", null, null, "Shared on screen"], ["stages"], ["promise", "Why CARS24", "INFO_CARDS", "Inspected, warranty, return window, finance"], ["foot"]],
    },
    all: {
      fields: [],
      actions: [["Let's drive it", "None", "T5"], ["I need to think", "None", "N4"]],
      states: [["Customer view", "Large type; the DA hands the tablet over"]],
    },
  },
  T5: {
    booked: {
      parts: [["lead"], ["stages"], ["drives", "Today's drives", "CAR_LIST", "In driving order"], ["prep", "Prep status", "STATUS_CHIP", "Prep task raised for each car"], ["summary", "Summary", "KEY_VALUES", "Customer, licence, order"], ["gpt"], ["foot"]],
      actions: [["Confirm and request prep", "OMS: add the second TD to the visit; prep tasks to the yard", "O1"], ["Car is taken: pick again", "None", "T3"]],
    },
    walkin: {
      parts: [["lead"], ["stages"], ["drives", "Today's drive", "CAR_LIST", "The new order ID appears on the car"], ["prep", "Prep status", "STATUS_CHIP", "Prep task raised"], ["summary", "Summary", "KEY_VALUES", "Customer, licence, new order"], ["gpt"], ["foot"]],
      actions: [["Create order and request prep", "OMS booking-initiate, then booking-confirm; prep task to the yard", "ORDER BOOKED; O1"], ["No valid DL: book later", "None", "N6"]],
    },
    vtd: {
      parts: [["video"], ["stages"], ["drives", "Car on camera", "KEY_VALUES", "Car, studio, yard helper, order"], ["foot"]],
      actions: [["Start the walkaround", "None", "O2"]],
    },
    all: {
      fields: [["Today's drives", "Ordered list", "Yes", "Ticked in T3", "Order of driving"], ["Licence", "Status", "Read only", "S2", "A valid DL is needed to drive"]],
      states: [["No valid DL", "Confirm disabled; book a later drive instead"], ["Car taken", "Back to T3"]],
    },
  },

  // ------------------------------------------------------------ O · On the road
  O1: {
    booked: { parts: [["lead"], ["stages", null, null, "TD live shows 0/2 done"], ["bays", "Bay map", "BAY_MAP", "Where each car is and whether it is ready"], ["next-car", "Next car", "STATUS_CHIP", "Drive 2 getting ready"], ["gpt"], ["foot"]] },
    walkin: { parts: [["lead"], ["stages", null, null, "TD live shows 0/1 done"], ["bays", "Bay map", "BAY_MAP", "Where the car is and whether it is ready"], ["gpt"], ["foot"]] },
    all: {
    fields: [["Bay", "Text", "Read only", "Prep task", ""], ["Prep status", "Status", "Read only", "Prep task", "Ready, or getting ready with an ETA"]],
    actions: [["We're at the car", "None", "O2"], ["Car not ready: swap", "None", "T3"]],
    states: [["Getting ready", "Amber with an ETA"], ["Ready", "Green, with who marked it and when"]],
    },
  },
  O2: {
    hub: { parts: [["lead"], ["stages"], ["zones", "Walkaround zones", "CHECKLIST", "Exterior, interior, bonnet, boot, with talking points"], ["gpt"], ["foot"]] },
    vtd: { parts: [["video", null, null, "The yard helper's camera on the car"], ["stages"], ["zones", "Walkaround zones", "CHECKLIST", "Tick as each is shown"], ["foot"]] },
    all: {
      fields: [["Zones covered", "Checklist", "No", "DA", "Exterior, interior, bonnet, boot"]],
      actions: [["Start test drive (hub)", "None", "O3"], ["Play drive clip and wrap up (VTD)", "None", "O6"]],
      states: [["Covered", "Zones turn green"]],
    },
  },
  O3: {
    parts: [["lead"], ["stages"], ["summary", "Car and driver", "KEY_VALUES", "The TD record's subject"], ["odo", "Odometer and fuel", "DYNAMIC_FORM", "Start reading"], ["route", "Route", "CHIPS", "City or highway loop"],
      ["note", "Consent next", "INFO", "Tells the DA the consent comes before the car moves"], ["gpt"], ["foot"]],
    fields: [["Odometer at start", "Number (km)", "Yes", "Typed or photo", "Not lower than the last reading"], ["Fuel", "Single select", "Yes", "DA", "1/4, 1/2, 3/4, full"], ["Route", "Single select", "No", "DA", "City or highway loop"]],
    actions: [["Start test drive", "DAP today: test-drive-status START_TEST_DRIVE", "TD STARTED; O4"]],
    states: [["Car busy", "A car in another active TD blocks the start"]],
  },
  O4: {
    parts: [["details", "TD details", "KEY_VALUES", "Driver, car, plate, start time, odometer"], ["terms", "Terms", "TERMS", "Example terms for the prototype"], ["signature", "Signature", "SIGNATURE_PAD", "Signed with a finger"],
      ["agree", "I agree", "CHECKBOX", "Required with the signature"], ["foot", "Customer actions", "SHELL_CTAS", "Sign and start driving stays disabled until signed and ticked"]],
    fields: [["Signature", "Drawing", "Yes", "Customer", "Not empty"], ["I agree", "Checkbox", "Yes", "Customer", ""]],
    actions: [["Sign and start driving", "Proposed: e-sign service saves the signed PDF to Docs; td.consent_signed event", "TD CONSENT SIGNED; O5"], ["Customer declines", "DAP today: CANCEL_TEST_DRIVE with a reason", "N1"]],
    states: [["Unsigned", "Primary button disabled"], ["Signed", "The drive is unlocked"]],
  },
  O5: {
    parts: [["lead"], ["stages"], ["live-car", "Live car", "CAR_ROW", "LIVE badge, as in the TD Journey file"], ["transcript", "Live note and transcription", "LIVE_TRANSCRIPTION", "Timer and the conversation, time-stamped"],
      ["objections", "Objection tags", "TAG_BUTTONS", "One tap each, stamped into the transcript"], ["gpt"], ["foot"]],
    fields: [["Objection tags", "Multi select", "No", "DA", "Price, mileage, condition, features, finance, other"]],
    actions: [["Back at the hub: end drive", "None", "O6"], ["Report an incident", "Proposed: incident flow", "Outside this journey"]],
    states: [["Transcription off", "If recording consent was no, only the tags are saved"]],
  },
  O6: {
    booked: { parts: [["lead"], ["stages", null, null, "TD live shows 1/2 done"], ["done-car", "Done car", "CAR_ROW", "TD done badge"], ["end-form", "End reading", "DYNAMIC_FORM", "Odometer and duration"], ["reaction", "Customer's reaction", "CHIPS", ""], ["next-car", "Next car", "STATUS_CHIP", "Drive 2 queued"], ["gpt"], ["foot"]] },
    walkin: { parts: [["lead"], ["stages"], ["done-car", "Done car", "CAR_ROW", "TD done badge"], ["end-form", "End reading", "DYNAMIC_FORM", "Odometer and duration"], ["reaction", "Customer's reaction", "CHIPS", ""], ["gpt"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["end-form", "Wrap-up", "CHIPS", "Reaction, and whether a real drive is wanted"], ["foot"]] },
    all: {
      fields: [["Odometer at end", "Number (km)", "Yes", "Typed", "Higher than the start"], ["Duration", "Minutes", "Read only", "Start and end times", ""], ["Customer reaction", "Single select", "No", "Asked", "Loved it, OK, not for me"]],
      actions: [["Done driving: debrief", "DAP today: COMPLETE_TEST_DRIVE", "TD CONDUCTED; N1"], ["Start drive 2", "None", "O1, with a new start and consent"]],
      states: [["More cars", "The stage bar shows 1/2 done"]],
    },
  },

  // ------------------------------------------------------------ N · Next step
  N1: {
    hub: { parts: [["lead"], ["stages"], ["outcome", "Outcome", "ACCORDION_RADIO", "From the TD Journey disposition form"], ["objection", "Primary objection", "ACCORDION_SELECT", "Suggested by CarGPT"],
      ["notes", "Agent notes", "TEXTAREA", "Drafted by CarGPT from the transcript"], ["finance", "Finance pre-check", "DYNAMIC_FORM", "Salary and existing EMI"], ["decision", "What happens next", "DECISION_CARDS", "Each card is an exit"], ["gpt"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["outcome", "Outcome", "ACCORDION_RADIO", ""], ["objection", "Primary objection", "ACCORDION_SELECT", ""], ["notes", "Agent notes", "TEXTAREA", "Drafted by CarGPT"], ["decision", "What happens next", "DECISION_CARDS", ""], ["foot"]] },
    all: {
      fields: [["Outcome", "Single select", "Yes", "DA", "Conducted and interested, conducted and not interested, not conducted"], ["Primary objection", "Single select", "No", "CarGPT suggestion", "Price, mileage, condition, features, finance, other"],
        ["Agent notes", "Text", "No", "CarGPT draft", "Editable"], ["Monthly salary", "Currency", "No", "Asked", "For the finance pre-check"], ["Existing EMI", "Currency", "No", "Asked", ""], ["Next step", "Single select", "Yes", "DA", "Ready to buy, needs time, another car, not interested"]],
      actions: [["Save disposition", "DAP today: POST checkout/work-order/{id}/feedback", "N2, N4, N6 or N7"]],
      states: [["AI draft", "Fields tagged AI until the DA edits them"], ["Not conducted", "Reason required"]],
    },
  },
  N2: {
    hub: { parts: [["lead"], ["stages"], ["pay-tabs", "Payment method", "SEGMENTED", "QR, bank transfer or payment link"], ["pay-method", "QR code", "QR", "Customer scans with their banking app"], ["gateway", "Gateway status", "STATUS", "Changes by itself on the webhook"], ["gpt"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["pay-tabs", "Payment method", "SEGMENTED", "Payment link by default on a call"], ["pay-method", "Payment link", "KEY_VALUES", "Sent by WhatsApp and SMS"], ["gateway", "Gateway status", "STATUS", "Changes on the webhook"], ["foot"]] },
    all: {
      fields: [["Method", "Single select", "Yes", "DA", "QR, bank transfer, payment link"], ["Amount", "Currency", "Read only", "OMS", "Token amount for the order"]],
      actions: [["Generate QR or send link", "Payment service creates a payment request", "Waiting for the gateway"], ["Gateway confirms", "Payment webhook; OMS order to token paid", "TOKEN PAID; N3"], ["Pays later", "Link stays live", "N4"]],
      states: [["Waiting", "Spinner; no manual Mark as paid"], ["Expired", "QR expires after 15 min (example); regenerate"], ["Failed", "Error with retry"]],
    },
  },
  N3: {
    hub: { parts: [["lead"], ["stages", null, null, "Every stage done"], ["paid", "Token paid", "STATUS_CHIP", ""], ["tasks", "Delivery tasks", "TIMELINE", "Created in existing Order personas"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["paid", "Token paid", "STATUS_CHIP", ""], ["tasks", "Delivery tasks", "TIMELINE", "Created in existing Order personas"], ["foot"]] },
    all: { fields: [], actions: [["Back to my queue", "None", "T1"]], states: [["Handed off", "Each task links to its Order persona in Tasks"]] },
  },
  N4: {
    hub: { parts: [["lead"], ["stages"], ["when", "Day and time", "CHIPS", "Agreed with the customer"], ["channel", "Channel", "CHIPS", "Call or WhatsApp"], ["shortlist", "Shortlist", "CHIPS", "Sent on WhatsApp"], ["note", "Note for the RM", "TEXT", ""], ["gpt"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["when", "Day and time", "CHIPS", ""], ["channel", "Channel", "CHIPS", ""], ["shortlist", "Shortlist", "CHIPS", ""], ["note", "Note for the RM", "TEXT", ""], ["foot"]] },
    all: {
      fields: [["Day", "Date", "Yes", "Agreed", ""], ["Time", "Part of day", "Yes", "Agreed", ""], ["Channel", "Call or WhatsApp", "Yes", "Asked", ""], ["Shortlist", "Multi select", "No", "Cars from T3", "Sent on WhatsApp"], ["Note for the RM", "Text", "No", "DA", ""]],
      actions: [["Schedule and send shortlist", "Proposed: Tasks entry for the RM; WhatsApp shortlist", "FOLLOW-UP SCHEDULED; N5"]],
      states: [["Scheduled", "The visit closes with a next step"]],
    },
  },
  N5: {
    parts: [["lead"], ["summary", "Last visit", "INFO", "Summary from CarGPT"], ["shortlist", "Shortlist today", "CAR_LIST", "Live availability and price changes"], ["outcome", "Call outcome", "RADIO_CARDS", ""], ["gpt"], ["foot"]],
    fields: [["Call outcome", "Single select", "Yes", "RM", "Ready, another drive, no answer, not interested"]],
    actions: [["Send payment link", "Payment link", "N2"], ["Book another drive", "None", "N6"], ["Not interested", "None", "N7"]],
    states: [["Price drop", "Highlighted on the shortlist"], ["Attempts", "Attempt count in the header"]],
  },
  N6: {
    hub: { parts: [["lead"], ["stages"], ["slots", "Slots", "SLOT_GRID", "Same slot picker as P7"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["slots", "Slots", "SLOT_GRID", "A hub slot after the video"], ["foot"]] },
    all: { fields: [["Day", "Date", "Yes", "Slot planner", ""], ["Slot", "Time", "Yes", "Slot planner", "Free DA and car"]], actions: [["Confirm booking", "OMS booking-confirm", "NEW TD BOOKED; P8"]], states: [["Full", "Slot disabled"]] },
  },
  N7: {
    hub: { parts: [["lead"], ["stages"], ["reason", "Reason", "CHIPS", "Follows CRUISE's drop reasons"], ["detail", "Detail", "CHIPS", ""], ["note", "Note", "TEXT", ""], ["keep-in-touch", "Stay in touch", "TOGGLE", "Marketing consent"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["reason", "Reason", "CHIPS", ""], ["detail", "Detail", "CHIPS", ""], ["note", "Note", "TEXT", ""], ["keep-in-touch", "Stay in touch", "TOGGLE", ""], ["foot"]] },
    all: {
      fields: [["Reason", "Single select", "Yes", "DA or RM", "Mechanical, non-mechanical, pricing, assortment, no response, other"], ["Detail", "Single select", "No", "", ""], ["Note", "Text", "No", "", ""], ["Stay in touch", "Toggle", "Yes", "Asked", "Marketing consent"]],
      actions: [["Close visit", "DAP today: checkout feedback with a drop-off category", "DROPPED"]],
      states: [["Closed", "The visit ends with a reason"]],
    },
  },

  // ------------------------------------------------------------ M · Oversight
  M1: {
    parts: [["alert", "Live alert", "ALERT", "A step past its target, with the fix"], ["kpis", "Headline numbers", "KPI_CARDS", "Visits, token paid, conversion, arrival to handshake"],
      ["funnel", "State funnel", "FUNNEL", "Every hexagon on the board, with time from the last state"], ["outcomes", "Outcomes", "CHIPS", "How visits ended"]],
    fields: [["State counts", "Number", "Read only", "State events", ""], ["Time between states", "Minutes", "Read only", "Event timestamps", "Median"]],
    actions: [["Reassign DA", "Assign DA modal", "S3"]],
    states: [["Breach", "Shown in red with the target"]],
  },
};

// resolve one step's anatomy for a track: merges the track entry with "all" and expands shared parts
function anatomyFor(stepId, track) {
  const raw = ANATOMY[stepId];
  if (!raw) return { parts: [], fields: [], actions: [], states: [] };
  const keyed = ["all", "booked", "walkin", "vtd", "hub"].some(k => k in raw);
  let a = raw;
  if (keyed) {
    const specific = raw[track] || (track !== "vtd" ? raw.hub : null) || {};
    a = { ...(raw.all || {}), ...specific };
  }
  const parts = (a.parts || []).map(([key, label, widget, note]) => {
    const s = SHARED_PARTS[key] || [];
    return { key, label: label || s[0] || key, widget: widget || s[1] || "", note: note || s[2] || "" };
  });
  return { parts, fields: a.fields || [], actions: a.actions || [], states: a.states || [] };
}
