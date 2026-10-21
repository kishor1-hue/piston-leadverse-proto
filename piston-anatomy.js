// ---- PISTON: one level deeper than the screen ----
// For every step: the numbered parts of its screen (pins on the screen), the fields it captures,
// the actions it fires, and the states it can be in. Part keys match data-part="key" in piston-screens.js.
// An entry can be keyed like the step spec: by track { hub, booked, walkin, vtd, all }, market { ae, au }
// or check-in way { staff, qr }.
// API names marked "DAP today" exist in DAP; "Proposed" ones do not exist yet.

const SHARED_PARTS = {
  lead: ["Lead pane", "LEFT_PANE", "Status pill, AI summary, contact actions (call, WhatsApp, chat, email), finance and documents. The same pane on every step"],
  stages: ["Stage bar", "STAGE_STEPPER", "Done stages in green, the current one in violet; the second line shows progress"],
  gpt: ["CarGPT", "CARGPT_PANEL", "Suggestions for this step, chat with / to mention a record, and live transcription from Start TD"],
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
      staff: {
        parts: [["table", "Today's visits", "TABLE", "Bookings and walk-ins at this hub today, with each token. Check in is the row action; there is no Mark arrived"],
          ["check-in", "Check in", "ROW_ACTION", "Opens the check-in form for this booking"], ["details", "Check-in form", "MODAL_FORM", "The same form the seat QR opens"],
          ["booking", "Booking found", "INFO", "Found by mobile in today's bookings, licence already on file"], ["consent", "Recording consent", "TOGGLE", "Switches AI notes and transcription on or off for the visit"],
          ["otp", "OTP", "OTP_INPUT", "Shown after Send OTP"], ["token", "Checked in", "SUCCESS", "Tells the customer where to sit and that their DA is coming"],
          ["token-card", "Token", "TOKEN_CARD", "B for bookings, W for walk-ins, numbered in order; on the TV and on WhatsApp"]],
        fields: [["Accompanied by", "Select", "No", "Asked", "Alone, spouse, family, friend"], ["Paying by", "Select", "No", "Asked", "Cash, loan EMI, not sure"], ["Area", "Select", "No", "Booking (prefilled)", "Emirate and area"],
          ["Recording consent", "Toggle", "Yes", "Asked", "No turns AI notes off for this visit"], ["OTP", "6 digits", "Yes", "User auth", "3 tries; resend after 30 s"], ["Token", "Text", "Read only", "Token service, at check-in", "Hub queue, in order"]],
        actions: [["Check in", "Opens the form", "Form"], ["Send OTP", "User auth: OTP to the booked mobile", "OTP step"],
          ["Verify OTP", "Proposed: visit.checked_in with channel = staff; token issued; DA auto-assignment and the Yardie's task start. DAP today: POST /customer-check-in/{customerId}", "CHECKED IN; I2"]],
        states: [["Expected", "Booked for today, not checked in"], ["Wrong OTP", "Tries left shown; after 3, an Emirates ID check"], ["Checked in", "Token shown, also on the TV and WhatsApp"]],
      },
      qr: {
        parts: [["table", "Today's visits, live", "TABLE", "The row moves from Expected to Checking in by QR to Checked in, with the token"],
          ["live-checkin", "Live check-in", "SIDE_PANEL", "Who is checking in from which seat; each answer lands here as it is given"],
          ["ph-scan", "Seat QR", "QR_STICKER", "One code per hub, on every seat; it opens the check-in page"],
          ["ph-mobile", "Mobile and OTP", "PUBLIC_FORM", "The QR is the same for everyone, so the mobile proves who is checking in"],
          ["ph-today", "About today", "PUBLIC_FORM", "Booking found, then accompanied by, paying by and area. The same form schema as the staff form"],
          ["ph-consent", "Licence and consent", "PUBLIC_FORM", "Licence on file; recording consent with no default; the market's privacy wording"],
          ["ph-token", "Your token", "TOKEN_PAGE", "Token, live status, DA and car: the same page as I2"]],
        fields: [["Mobile", "Phone", "Yes", "Typed", "Today's booking is looked up by it"], ["OTP", "6 digits", "Yes", "SMS, autofilled", "3 tries"], ["Accompanied by", "Chips", "No", "Customer", "Just me, partner, family, a friend"],
          ["Paying by", "Chips", "No", "Customer", "Cash, finance, not sure yet"], ["Area", "Text", "No", "Booking, prefilled", "Emirate and area"], ["Recording consent", "Yes or no", "Yes", "Customer", "No default; no turns AI notes off"],
          ["Token", "Text", "Read only", "Token service", "Shown at the end, and on the TV"]],
        actions: [["Scan the seat QR", "Opens the hub's check-in page. Proposed: checkin.started", "Mobile step"], ["Verify and continue", "User auth verify; today's booking found by the mobile", "About today"],
          ["Next", "Proposed: checkin.section_saved, autosaved", "The side panel updates"], ["Check in", "Proposed: visit.checked_in with channel = qr; token issued", "CHECKED IN; I2"],
          ["Finish it for them", "Opens the staff form with what the customer already filled", "I1 by staff"]],
        states: [["Scanning", "The row shows Checking in by QR"], ["Stuck", "No answer for 3 min: the receptionist gets a nudge"], ["Checked in", "The row turns green with the token"]],
      },
    },
    walkin: {
      staff: {
        parts: [["table", "Today's visits", "TABLE", "The new walk-in sits at the top"], ["check-in", "Check in", "ROW_ACTION", "Opens the form for a new walk-in"],
          ["details", "Check-in form", "MODAL_FORM", "Name, mobile and email first (this is Add lead), then the same questions"], ["purpose", "Purpose of visit", "CHIPS", "Only buy or test drive goes on to a DA"],
          ["consent", "Recording consent", "TOGGLE", "Switches AI notes on or off"], ["otp", "OTP", "OTP_INPUT", "Shown after Send OTP"], ["token", "Checked in", "SUCCESS", "Where to sit; a DA is being assigned"],
          ["token-card", "Token", "TOKEN_CARD", "W for walk-ins, numbered in order"]],
        fields: [["First name", "Text", "Yes", "Typed", ""], ["Last name", "Text", "Yes", "Typed", ""], ["Mobile", "Phone", "Yes", "Typed", "UAE mobile; checked for an existing lead first"], ["Email", "Email", "No", "Typed", "Valid format"],
          ["Purpose of visit", "Chips", "Yes", "Asked", "Only buy or test drive continues to a DA"], ["Accompanied by", "Select", "No", "Asked", ""], ["Paying by", "Select", "No", "Asked", "Cash, loan EMI, not sure"],
          ["Area", "Select", "No", "Asked", "Emirate and area"], ["Recording consent", "Toggle", "Yes", "Asked", ""], ["OTP", "6 digits", "Yes", "User auth", "3 tries"], ["Token", "Text", "Read only", "Token service", "Hub queue, in order"]],
        actions: [["Check in", "Opens the form", "Form"], ["Send OTP", "User auth: OTP to the mobile just typed", "OTP step"], ["Verify OTP", "Lead service: create the lead (dedupe on mobile); visit created; token issued", "CHECKED IN; I2"]],
        states: [["Duplicate", "The mobile already has a lead: that lead is used"], ["Other purpose", "Drop-off, pickup, service or selling: routed to that desk"], ["Wrong OTP", "Tries left shown"]],
      },
      qr: {
        parts: [["table", "Today's visits, live", "TABLE", "A new row appears as the walk-in scans the seat QR"], ["live-checkin", "Live check-in", "SIDE_PANEL", "Name, purpose and the rest land here as they are given"],
          ["ph-scan", "Seat QR", "QR_STICKER", "The same code on every seat"], ["ph-mobile", "Mobile and OTP", "PUBLIC_FORM", "No booking found on this mobile, so the walk-in questions follow"],
          ["ph-you", "About you", "PUBLIC_FORM", "Name, email and the purpose of the visit: this creates the lead"], ["ph-today", "About today", "PUBLIC_FORM", "Accompanied by, paying by, area"],
          ["ph-consent", "Licence and consent", "PUBLIC_FORM", "Licence photos are optional here; recording consent with no default"], ["ph-token", "Your token", "TOKEN_PAGE", "The same page as I2"]],
        fields: [["Mobile", "Phone", "Yes", "Typed", "Checked for an existing lead"], ["OTP", "6 digits", "Yes", "SMS, autofilled", "3 tries"], ["First name", "Text", "Yes", "Customer", ""], ["Last name", "Text", "Yes", "Customer", ""],
          ["Email", "Email", "No", "Customer", "Valid format"], ["Purpose of visit", "Option cards", "Yes", "Customer", "Only buy or test drive continues to a DA"], ["Accompanied by", "Chips", "No", "Customer", ""],
          ["Paying by", "Chips", "No", "Customer", ""], ["Area", "Text", "No", "Customer", "Emirate and area"], ["Licence front and back", "Image", "No", "Phone camera, saved to Docs", "Or shown to the DA at the car"],
          ["Recording consent", "Yes or no", "Yes", "Customer", "No default"], ["Token", "Text", "Read only", "Token service", ""]],
        actions: [["Scan the seat QR", "Opens the hub's check-in page", "Mobile step"], ["Verify and continue", "User auth verify; no booking found", "About you"],
          ["Next (About you)", "Lead service: create the lead (dedupe on mobile); visit created", "About today"], ["Check in", "Proposed: visit.checked_in with channel = qr; token issued", "CHECKED IN; I2"],
          ["Finish it for them", "Opens the staff form with what was filled", "I1 by staff"]],
        states: [["Other purpose", "The page points them to that desk"], ["Stuck", "No answer for 3 min: the receptionist gets a nudge"]],
      },
    },
    vtd: {
      parts: [["video"], ["stages"], ["waiting", "Waiting room", "CARD", "Booking details while the customer joins"], ["otp", "OTP", "OTP_INPUT", "Read out on the call"], ["consent", "Recording consent", "TOGGLE", "Asked on camera"], ["foot"]],
      fields: [["OTP", "6 digits", "Yes", "User auth", "3 tries"], ["Recording consent", "Toggle", "Yes", "Asked", "No turns AI notes off"]],
      actions: [["Admit, then Verify OTP", "Video provider: admit; user auth verify. DAP today: CUSTOMER_JOINED_CALL", "VTD CHECKED IN; T2"]],
      states: [["Not joined", "10 min after the slot: callback (P9)"], ["Wrong OTP", "Tries left shown"]],
    },
  },
  I2: {
    parts: [["tv", "Ground TV", "HUB_BOARD", "Full-screen board for everyone in the hub; read-only"], ["tv-row", "This customer's token", "BOARD_ROW", "Status, DA, car and wait time. Each changes only when staff act"],
      ["tv-qr", "Check-in QR", "QR", "For anyone who missed the one on their seat"], ["tv-legend", "What the statuses mean", "LEGEND", "Waiting, DA coming, with your DA, car ready, on test drive"],
      ["ph-token", "Token page", "TOKEN_PAGE", "The same token on the customer's phone, with their DA and car. Opened from the check-in, or the WhatsApp link"]],
    fields: [["Token", "Text", "Read only", "Token service", "B for bookings, W for walk-ins, in order per hub and day"], ["Name", "Text", "Read only", "Visit", "First name and initial only"],
      ["Status", "Chip", "Read only", "State events", "Waiting, DA coming, with your DA, car ready, on test drive, wrapping up"], ["DA", "Text", "Read only", "Assignment (S1)", "First name"],
      ["Car", "Text", "Read only", "Yard tasks (S2, O1)", "In the yard, being prepped, on its way, at the hub, on the road"], ["Waiting", "Minutes", "Read only", "Since check-in", "Until the handshake; amber past 5 min"]],
    actions: [["None on the TV or the page", "Both are read-only. Staff actions move them: DA auto-assigned (S1), Yardie picks up and parks the car (S2, O1), handshake (T1), car chosen (T5), Start TD (O2)", ""]],
    states: [["Late", "Wait time turns amber past the target"], ["Off the board", "5 min after the visit ends"], ["Several cars", "The car cell shows the next car to drive"]],
  },
  S1: {
    parts: [["lead"], ["stages", null, null, "Car finding shows Assigning DA"], ["state", "State", "SEGMENTED", "Prototype only: the automatic case and the every-DA-busy case"],
      ["auto", "Auto-assigned DA", "ASSIGNMENT_CARD", "Who, when and why; Change DA reopens the pick list"], ["rule", "The rule", "INFO_LIST", "Free now, under today's cap, a free slot for the next hour, then pre-assignment or language"],
      ["tv-note", "TV and push", "INFO", "The TV and the DA's tablet update on assignment"], ["busy", "Every DA busy", "ALERT", "Queue position and the expected wait"],
      ["pick", "Pick a DA", "ASSIGN_LIST", "ManualAssignmentModal; DAs at their cap or on a break can't be picked"], ["gpt"], ["foot"]],
    fields: [["DA", "Single select", "Yes", "The rule, or the receptionist when every DA is busy", "At-cap and on-break DAs disabled"], ["Daily load", "Count", "Read only", "DA roster", "For example 6/10 today"],
      ["Queue position", "Number", "Read only", "Token order", "Bookings at their slot time first, then tokens in order"]],
    actions: [["Auto-assign (system)", "Proposed: on visit.checked_in, pick by the rule; Leadverse assign-direct; push to the DA", "DA ASSIGNED"],
      ["Pick a DA, when every DA is busy", "Leadverse: POST .../tasks/{taskId}/assign-direct. DAP today: PUT work-order/assign-da", "DA ASSIGNED"], ["Change DA", "Reopens the pick list", "DA ASSIGNED"]],
    states: [["Auto-assigned", "Nobody had to do anything"], ["Every DA busy", "The token waits in line; the receptionist can pick the next free DA"], ["Nobody in 10 min", "Manager alerted (M1)"]],
  },
  S2: {
    parts: [["tv", "Ground TV", "HUB_BOARD", "Its car column follows the Yardie's taps"], ["tv-row", "This customer's token", "BOARD_ROW", "Car: in the yard, on its way, at the hub"],
      ["yard-task", "Yard task", "TASK_CARD", "Bring to the hub: car, plate, from the yard spot to a bay, with the token and the DA"]],
    fields: [["Task", "Type", "Read only", "Created at check-in", "Bring to the hub"], ["Car and plate", "Text", "Read only", "Order", ""], ["From", "Yard spot", "Read only", "Yard map", ""],
      ["To", "Bay", "Read only", "Hub bays", "A free bay"], ["Picked up", "Time", "Yes", "Yardie's tap", ""], ["At the hub", "Time", "Yes", "Yardie's tap", "Tells the DA and updates the TV"]],
    actions: [["Picked up, driving over", "Proposed: yard.car_picked_up", "TV: on its way"], ["Parked at the hub", "Proposed: yard.car_at_hub; push to the DA", "CAR AT HUB"]],
    states: [["Waiting for the Yardie", "The task sits in To do"], ["On its way", "About 3 min from the yard"], ["At the hub", "The bay is shown to the DA and on the TV"], ["Can't be used", "The DA is told to offer another car"]],
  },

  // ------------------------------------------------------------ T · Tailor
  T1: {
    parts: [["wait-card", "Waiting customer", "CARD", "Who, which seat and token, booking or walk-in, where the car is, AI context"], ["met", "I've met the customer", "BUTTON", "The handshake, at the customer's seat"],
      ["later", "Later today", "TABLE", "The DA's other visits"], ["alert-note", "The rule", "INFO", "Only after assignment, never at check-in. 5 minutes, then the receptionist and the manager are alerted"]],
    fields: [["Waiting", "Timer", "Read only", "Since DA assigned", "Red at 5 min"]],
    actions: [["I've met the customer", "DAP today: work order to MET_CUSTOMER; the TV shows them together", "MET CUSTOMER; T2"]],
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
      states: [["Booked car pinned", "Booked tag on the booked car"], ["Liked while waiting", "Tag on cars liked from the token page while waiting (I2)"], ["Busy", "A car in another TD shows when it is free"]],
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
      parts: [["lead"], ["stages"], ["drives", "Today's drives", "CAR_LIST", "In driving order"], ["prep", "Where the car is", "STATUS_CHIP", "The booked car is at the hub; an added car gets a yard task"], ["summary", "Summary", "KEY_VALUES", "Customer, licence, order"], ["gpt"], ["foot"]],
      actions: [["Confirm and request prep", "OMS: add the second TD to the visit; yard task for the added car", "O1"], ["Car is taken: pick again", "None", "T3"]],
    },
    walkin: {
      parts: [["lead"], ["stages"], ["drives", "Today's drive", "CAR_LIST", "The new order ID appears on the car"], ["prep", "Yard prep", "STATUS_CHIP", "Yard task raised for the Yardie"], ["summary", "Summary", "KEY_VALUES", "Customer, licence, new order"], ["gpt"], ["foot"]],
      actions: [["Create order and request prep", "OMS booking-initiate, then booking-confirm; yard task to the Yardie", "ORDER BOOKED; O1"], ["Car is in another TD: pick again", "None", "T3"]],
    },
    vtd: {
      parts: [["video"], ["stages"], ["drives", "Car on camera", "KEY_VALUES", "Car, studio, yard helper, order"], ["foot"]],
      actions: [["Start the walkaround", "None", "O5"]],
    },
    all: {
      fields: [["Today's drives", "Ordered list", "Yes", "Ticked in T3", "Order of driving"], ["Licence", "Status", "Read only", "O4", "Checked at the car, after Start TD and the consent"]],
      states: [["Car taken", "Back to T3"], ["Yard busy", "The ETA from the Yardie shows on the car"]],
    },
  },

  // ------------------------------------------------------------ O · On the road
  O1: {
    parts: [["tv", "Ground TV", "HUB_BOARD", "Its car column follows the Yardie's taps"], ["tv-row", "This customer's token", "BOARD_ROW", "Car: being prepped, prepped, on its way, at the hub"],
      ["yard-task", "Yard task", "TASK_CARD", "Prep and bring: a quick checklist, then the drive over. The customer waits on their token meanwhile"]],
    fields: [["Checklist", "Ticks", "Yes", "Yardie", "Wash, inside wipe, fuel at least half, tyres"], ["Prep done", "Time", "Yes", "Yardie's tap", ""], ["Picked up", "Time", "Yes", "Yardie's tap", ""],
      ["At the hub", "Time", "Yes", "Yardie's tap", "Tells the DA and updates the TV"]],
    actions: [["Prep done", "Proposed: yard.prep_done", "TV: prepped"], ["Picked up, driving over", "Proposed: yard.car_picked_up", "TV and token page: car in about 3 min"], ["Parked at the hub", "Proposed: yard.car_at_hub; the DA is told to go back to the customer", "CAR AT HUB; O2"]],
    states: [["Prep found a problem", "The DA is told to pick another car (T3)"], ["Late", "Past 15 min: the DA sees the ETA and can swap"]],
  },
  O2: {
    walkin: { parts: [["lead"], ["stages", null, null, "TD live starts here: Starting, recording"], ["meet-again", "Back to the customer", "CARD", "The car reached the hub, so the DA was told to go back: who, which seat and token, where the car is"],
      ["summary", "Car and driver", "KEY_VALUES", "The TD record's subject"], ["odo", "Odometer and fuel", "DYNAMIC_FORM", "Start reading"], ["route", "Route", "CHIPS", "City or highway loop"],
      ["recording", "Recording", "TOGGLE", "Starts with the TD, on the consent given at check-in"], ["gpt"], ["foot"]] },
    booked: { parts: [["lead"], ["stages", null, null, "TD live starts here: Starting, recording"], ["meet-again", "Customer and car", "CARD", "The booked car has been at the hub since check-in"],
      ["summary", "Car and driver", "KEY_VALUES", "The TD record's subject"], ["odo", "Odometer and fuel", "DYNAMIC_FORM", "Start reading"], ["route", "Route", "CHIPS", "City or highway loop"],
      ["recording", "Recording", "TOGGLE", "Starts with the TD, on the consent given at check-in"], ["gpt"], ["foot"]] },
    all: {
      fields: [["Odometer at start", "Number (km)", "Yes", "Typed or photo", "Not lower than the last reading"], ["Fuel", "Single select", "Yes", "DA", "1/4, 1/2, 3/4, full"], ["Route", "Single select", "No", "DA", "City or highway loop"],
        ["Recording", "Toggle", "Read only", "Recording consent from check-in", "Off if the customer said no; then only the tags are kept"]],
      actions: [["Start TD and recording", "DAP today: test-drive-status START_TEST_DRIVE. Proposed: recording and live transcription start; the TV shows On test drive", "TD STARTED; O3"]],
      states: [["Car not at the hub", "Start disabled until CAR AT HUB"], ["Car busy", "A car in another active TD blocks the start"], ["Customer said no to recording", "The drive starts without it"]],
    },
  },
  O3: {
    parts: [["details", "TD details", "KEY_VALUES", "Driver, car, plate, start time, odometer"], ["terms", "Terms", "TERMS", "Example terms for the prototype"], ["signature", "Signature", "SIGNATURE_PAD", "Signed with a finger"],
      ["agree", "I agree", "CHECKBOX", "Required with the signature"], ["foot", "Customer actions", "SHELL_CTAS", "Sign and continue stays disabled until signed and ticked"]],
    fields: [["Signature", "Drawing", "Yes", "Customer", "Not empty"], ["I agree", "Checkbox", "Yes", "Customer", ""]],
    actions: [["Sign and continue", "Proposed: e-sign service saves the signed PDF to Docs; td.consent_signed event", "TD CONSENT SIGNED; O4"], ["Customer declines", "DAP today: CANCEL_TEST_DRIVE with a reason", "N1"]],
    states: [["Unsigned", "Primary button disabled"], ["Signed", "On to the licence check"]],
  },
  O4: {
    parts: [["lead"], ["stages", null, null, "TD live shows DL check"], ["upload", "Licence images", "UPLOAD", "From before the visit, from the seat QR form, or scanned now"],
      ["ocr", "Read from the licence", "OCR_RESULT", "Name, number, expiry, issuer"], ["checks", "Checks", "CHECKLIST", "Name match and expiry are automatic; the photo match is the DA's"], ["gpt"], ["foot"]],
    fields: [["DL front", "Image", "Yes", "Pre-visit upload, seat QR form, or scan", "JPG or PNG under 5 MB"], ["DL back", "Image", "Yes", "Same", ""], ["Licence number", "Text", "Read only", "OCR", "Editable if OCR fails"],
      ["Expiry", "Date", "Read only", "OCR", "Must be after today"], ["Name match", "Check", "Yes", "OCR against the Emirates ID", "Fuzzy match"], ["Photo match", "Check", "Yes", "DA", ""],
      ["Home-country DL", "Text", "No", "Typed", "For visitors; acceptance is an open decision"]],
    actions: [["Verified: on to the walkaround", "Proposed: dl.verified event; licence saved to Docs", "DL VERIFIED; O5"], ["No valid DL: cancel the drive", "DAP today: CANCEL_TEST_DRIVE with the reason; book a drive for later", "N6"]],
    states: [["Uploaded before the visit", "Images and OCR prefilled; one tap to verify"], ["OCR failed", "Fields become editable"], ["Expired", "Verify disabled; the drive is cancelled and rebooked"]],
  },
  O5: {
    hub: { parts: [["lead"], ["stages"], ["zones", "Walkaround zones", "CHECKLIST", "Exterior, interior, bonnet, boot, with talking points"], ["gpt"], ["foot"]] },
    vtd: { parts: [["video", null, null, "The yard helper's camera on the car"], ["stages"], ["zones", "Walkaround zones", "CHECKLIST", "Tick as each is shown"], ["foot"]] },
    all: {
      fields: [["Zones covered", "Checklist", "No", "DA", "Exterior, interior, bonnet, boot"]],
      actions: [["Start driving (hub)", "None", "O6"], ["Play drive clip and wrap up (VTD)", "None", "O7"]],
      states: [["Covered", "Zones turn green"]],
    },
  },
  O6: {
    parts: [["lead"], ["stages"], ["live-car", "Live car", "CAR_ROW", "LIVE badge, as in the TD Journey file"], ["transcript", "Live note and transcription", "LIVE_TRANSCRIPTION", "Timer and the conversation, time-stamped, since Start TD"],
      ["objections", "Objection tags", "TAG_BUTTONS", "One tap each, stamped into the transcript"], ["gpt"], ["foot"]],
    fields: [["Objection tags", "Multi select", "No", "DA", "Price, mileage, condition, features, finance, other"]],
    actions: [["Back at the hub: end drive", "None", "O7"], ["Report an incident", "Proposed: incident flow", "Outside this journey"]],
    states: [["Transcription off", "If recording consent was no, only the tags are saved"]],
  },
  O7: {
    booked: { parts: [["lead"], ["stages", null, null, "TD live shows 1/2 done"], ["done-car", "Done car", "CAR_ROW", "TD done badge"], ["end-form", "End reading", "DYNAMIC_FORM", "Odometer and duration"], ["reaction", "Customer's reaction", "CHIPS", ""], ["next-car", "Next car", "STATUS_CHIP", "Drive 2 ready at the hub"], ["gpt"], ["foot"]] },
    walkin: { parts: [["lead"], ["stages"], ["done-car", "Done car", "CAR_ROW", "TD done badge"], ["end-form", "End reading", "DYNAMIC_FORM", "Odometer and duration"], ["reaction", "Customer's reaction", "CHIPS", ""], ["gpt"], ["foot"]] },
    vtd: { parts: [["video"], ["stages"], ["end-form", "Wrap-up", "CHIPS", "Reaction, and whether a real drive is wanted"], ["foot"]] },
    all: {
      fields: [["Odometer at end", "Number (km)", "Yes", "Typed", "Higher than the start"], ["Duration", "Minutes", "Read only", "Start and end times", ""], ["Customer reaction", "Single select", "No", "Asked", "Loved it, OK, not for me"]],
      actions: [["Done driving: debrief", "DAP today: COMPLETE_TEST_DRIVE; the recording stops", "TD CONDUCTED; N1"], ["Start drive 2", "None", "O2, with its own start and consent; the licence is already verified"]],
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
      ["by-qr", "Checked in by seat QR", "KPI_CARD", "How many check-ins came from the seat QR; where the QR is the default, most do"],
      ["funnel", "State funnel", "FUNNEL", "Every hexagon on the board, with time from the last state"], ["outcomes", "Outcomes", "CHIPS", "How visits ended"]],
    fields: [["State counts", "Number", "Read only", "State events", ""], ["Time between states", "Minutes", "Read only", "Event timestamps", "Median"]],
    actions: [["Reassign DA", "Assign DA modal", "S3"]],
    states: [["Breach", "Shown in red with the target"]],
  },
};

// resolve one step's anatomy for a track: merges the track entry with "all" and expands shared parts
function anatomyFor(stepId, track) {
  const raw = ctxResolve(ANATOMY[stepId], track);
  if (!raw) return { parts: [], fields: [], actions: [], states: [] };
  const keyed = TRACK_KEYS.some(k => k in raw);
  let a = raw;
  if (keyed) {
    const specific = ctxResolve(raw[track] || (track !== "vtd" ? raw.hub : null) || {}, track);
    a = { ...ctxResolve(raw.all || {}, track), ...specific };
  }
  a = { parts: pick(a.parts, track), fields: pick(a.fields, track), actions: pick(a.actions, track), states: pick(a.states, track) };
  const parts = (a.parts || []).map(([key, label, widget, note]) => {
    const s = SHARED_PARTS[key] || [];
    return { key, label: label || s[0] || key, widget: widget || s[1] || "", note: note || s[2] || "" };
  });
  return { parts, fields: a.fields || [], actions: a.actions || [], states: a.states || [] };
}
