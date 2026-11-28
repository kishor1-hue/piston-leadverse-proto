# PISTON: the ideal test drive journey on Leadverse

A screen spec for CARS24's ideal test-drive journey in the UAE and Australia, drawn in the Leadverse TD Journey design. PISTON stands for its six phases: **P**lan, **I**ntroduce, **S**ign-in, **T**ailor, **O**n the road, **N**ext step.

Every step has its **source**, its **screen**, its **entry conditions** and its **exit conditions**, for three tracks: booked hub TD, walk-in hub TD and video TD. One level below that, every screen has its **anatomy**: numbered parts (shown as pins on the screen), the fields it captures, the actions it fires and the states it can be in.

## The TD booking call

- **P1 queue** with tabs: All, Queue, Callbacks, Closed today, Today missed TD.
- **P2 lead view** is the customer's whole picture: context tiles (orders, finance, wishlist, viewed), then tabs for orders, cars and finance (pre-approval, amount, repayment). With a mobile and an email, an order exists: confirm it and move on. Without both, the cars of interest sit on the contact; picking them (after adding the email in the left pane) creates one order per car.
- The opening line and the CARS24 pitch are in CarGPT, not steps. Contact details are edited in the left pane.
- **Discovery** (only when unsure) works like the website: **P3 Car listing** (search by appointment ID, filter pills, car cards with a Compare tick), **P3a Car details** (the website's car page, with the customer's context for the car) and **P3b Compare** (2 or 3 cars in columns, on the same page as the listing).
- **P4 TD type per car**, with the payment mode (Cash, In-house finance, BYOF) and Trade-in opted (Yes or No), then **P5 hub slot** and/or **P6 video slot** depending on the mix, then **P7 book**.
- **Or a deposit (P7d).** Once a car is picked, the arrow next to Next offers Customer wants to pay a deposit. One page, three numbered sub-steps: the delivery details; the deposit, by a payment link (payment mode, then WhatsApp, email or SMS, and Refresh payment status) or confirmed by hand from the receipt amount and the receipt; then the car to Reserved with the payment transactions and the payment breakup. Complete closes it; the order goes to delivery.
- **A finance pre-approval at any point (P7f).** The payment mode sits in the left pane: Cash, In-house finance or BYOF (bring your own finance); TD type (P4) asks it again with Trade-in opted. With either finance mode, the arrow next to Next offers Run a finance pre-approval on every call step. It is skippable and returns to the step it came from. Fetch the credit score (a soft check), then the questions as the customer is asked them: **Partial**, on the fly, gives a cohort and a rate range; **Full** also gives the amount they can borrow. The questions come from the market (AECB and Emirates ID in the UAE, Equifax and the Australian set in Australia). A run updates the lead pane and every call screen.

Every screen uses the standard footer: Previous and Next, with the other exits (including a customer dropping off) under the arrow next to Next.

## Markets and the ground journey

The journey is built once and configured per market. Switch **UAE** or **Australia** at the top: people, cars, money, documents, hub and copy follow the market.

On the ground:

- **Check-in asks "Do you need financing after the test drive?"** and the token page shows the next step with a QR: the 2-minute pre-approval, a check against the customer's own lender, or take a seat and browse the cars.
- **Welcome and check-in are one gesture (I1).** Checking in is the arrival; there is no separate Mark arrived. The customer scans the **QR on their seat** and fills a form-only page on their own phone, or a **receptionist or SA** fills the same form with them. Booked and walk-in customers use the same form. Australia defaults to the seat QR; the UAE (and India) default to staff.
- **The check-in form asks for the mobile first.** Step 1: mobile number, purpose of visit, then send and verify the OTP. Step 2: Do you have an existing order? **Yes** shows today's order and checks the customer in at once. **No** opens the basic details form (email, first and last name, post code or area, financing after the TD, where they heard about us), which creates the lead, with the licence photos optional at the end. There is no recording question at check-in: the SA asks at Start TD. The last screen is the token with the SA's name, on the phone and in the staff form: the SA is auto-assigned the moment the customer checks in.
- **A token on the ground TV (I2).** Hospital logic: every check-in gets a token (B for bookings, W for walk-ins). The TV and the customer's phone show each token's status, SA and car, and change only when staff act. Use **Play the staff actions** on I2 to watch both update.
- **SA assigned automatically (S1)**, by availability and today's slots; staff assign by hand only when every SA is busy. The SA (sales associate) then meets the customer at their seat.
- **The SA's task: one task per visit (T1 to N2, booked and walk-in).** The lead is found by the check-in UUID, with every order it has today; a booking can carry two or three TDs and they all run in this task. Five pages, each built from DLS components:
  - **T1 Interest:** tabs, Check-in first, then Today's TD, Finance, Wishlist, Trade-in, Coupons (with validity) and Notes.
  - **T2 DL:** both sides, what was read off the licence and three checks, once for the visit.
  - **T3 Cars:** today's orders, or Discover more cars; a car picked joins the visit as an order for now.
  - **O1 Test drives:** a section per order with a stepper: walkthrough, key handover (TD consent, recording consent; the TD starts), TD done, disposition, checkout.
  - **N2 Checkout:** one car, a stepper inside: delivery, VAS, discount, sales promise, payment mode, the pre-approval for In-house finance (prefilled, or send the link), the deposit (bank transfer with the receipt, or a Stripe link), booking confirmed. BYOF in Australia asks first: the deposit they can pay ($500 up to the order total, on a slider), how the loan is organised (broker, direct lender, novated lease), the lender, and for a broker the name, rate and weekly repayment; a direct lender or novated lease gets the early-repayment nudge with a callback for CARS24 Finance, and the $500 outside-lender fee goes on the summary. The Deposit step then asks for that amount. Another TD'd car is checked out the same way.
- **A walk-in is the same,** with no TD booked today: Today's TD is empty and Cars opens on Discover.
- **The Yardie.** Cars wait in a yard about 500 m away. A booked car is prepped before the day and brought over when the customer checks in (S2). A car picked on the day is prepped, then brought over. Each tap updates the TV.
- **Video TD** keeps its own steps: needs, cars, the promise and the walkaround on camera, then the debrief and the token by payment link.

Steps with two devices (I1 by seat QR, I2, S2) show them side by side. **Screen only** shows them larger. The *What changed* view lists what is set per market and the decisions still open.

No build step. Plain HTML, CSS and JavaScript. All people, cars and numbers are mock data.

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Views

- **Walkthrough**: the journey rail, the Leadverse screen for the step, and its spec. The Spec tab shows source, screen, entry and exit; the Anatomy tab adds orange pins on the screen and lists each part, field, action and state. A screen's buttons are its exits, so clicking one moves to the next step.
- **Blueprint**: the same depth as a table, at flow, phase and step level.
- **Fields**: every field on every screen in one data dictionary.
- **What changed**: the review notes applied, what they do to the Test Drive Console, and the decisions still open.

Deep links: `#booked-I1`, `#booked-P3a`, `#walkin-T2`, `#vtd-O5`, `#blueprint`, `#fields`, `#changes`. Prefix `au-` for Australia (`#au-booked-I1`), and add `-staff` or `-qr` when the check-in way differs from the market default (`#booked-I1-qr`).

## Files

- `index.html`: the page.
- `piston-data.js`: the spec. Tracks, markets, check-in ways, flows, phases and the 33 steps, plus mock people and cars per market and the copy layer for Australia.
- `piston-anatomy.js`: parts, fields, actions and states for every screen.
- `PISTON-spec.md`: the whole spec as one Markdown file (flows, phases, journey maps, states, core logic, every step with its anatomy, markets, what changed). Built from the spec files by `node tools/gen-spec-md.js . PISTON-spec.md`; rerun it after a spec change.
- `piston-screens.js`: one Leadverse screen per step, the ground TV board, and the phone screens: the seat QR check-in, the customer's token page and the Yardie's task list.
- `piston.js`: the viewer.
- `piston.css`: the viewer and the TD Journey components.
- `dls.js`, `dls.css`, `fonts/turbo-ui-icons.woff2`: Turbo UI, the CARS24 DLS ([CSPL-CARS24/turbo-ui](https://github.com/CSPL-CARS24/turbo-ui)), as plain markup. Each helper in `dls.js` mirrors one `@cspl/*` component (SectionCard, DataTable, Badge, PaymentDetailsCard, Chip, FileUploadCard, CarContextCard, Dropdown, LinkButton, NotchTabs, SegmentTabs, FetchedInfoCard, Stepper, ChoiceTile, Checkbox, RadioButton, RangeSlider, TextInput, Coupon, AddressCard, PaymentTile, NoDataFound, Button, InformationMessage, Modal) with its tokens in `dls.css` and the DLS icon font. A screen's action area (between the stage bar and the footer) opts in with `dls: true` on `callTask` or `visit`; the Leadverse shell around it is unchanged. On it: P7d (the deposit, with the order's Payments and Price breakup tables) and the SA's task (T1, T2, T3, O1, N2). `tools/dls-icons.js` writes the icon rules from the turbo-ui checkout.
- `style.css`: shared Leadverse tokens and base styles, also used by the Test Drive Console.
- `theme.js`: the Light / Dark toggle.
- `artifact-entry.html`: the same page without the document wrapper, for publishing as a Claude artifact.
- `board-v2.mmd`: Mermaid source of the PISTON v2 diagram on the FigJam board. The board predates later reviews, so its Plan, Introduce, Sign-in and On the road steps differ from the IDs here.

## Theme

The page opens in the white theme, which is what Leadverse uses. The Light / Dark button in the header switches the theme for your browser and remembers the choice. The OS dark mode never switches it.

## Related

- [Test Drive Console](https://github.com/kishor1-hue/test-drive-console): the first Leadverse prototype of the DAP test drive journey.
- History up to this split lives in [da-panel-leadverse-proto](https://github.com/kishor1-hue/da-panel-leadverse-proto), where PISTON was the `piston/` folder.

## The Delivery persona (`delivery.html`, `/delivery`)

A second page, after the PISTON journey ends (N3, hand-off to delivery): the order is settled and the delivery is booked (Australia). Seven steps on the Leadverse task, the action area on Turbo UI:

- **D1 Car prep status**, read-only: the four delivery gates (Finance GFD, Contract signed, Registered, Refurb GFD), the HubSpot pipelines on the order, then RWC, Refurb and detail, VAS operations and Registration.
- **D2 VAS, D3 Rego (3, 6 or 12 months), D4 Discount**: only what the customer asks to change; the DAP and the balance move straight away.
- **D5 Invoice**: booked against now; one new tax invoice, and a re-signed contract when the DAP changed.
- **D6 Booking confirmation**: must go out when anything changed.
- **D7 Balance and handover**: collect the balance (payment link or receipt) or note the refund; pick-up is marked delivered with the actual date; home delivery (the fee, or the free delivery exception behind a warning popup) creates a logistics task whose handover closes it.

The top bar switches the scenario: Car ready, or Car not ready (QC rework, so Refurb GFD is open). Code: `delivery.js` (state, screens, spec), `delivery.css`; it reuses `piston-data.js`, `piston-screens.js` and `dls.js`.

## The Yardie persona (`yardie.html`, `/yardie`)

A third page, for the Yardie who brings a booked car from the yard to the SA (PISTON P8 and S2, in full). Two stages, six steps, in the UAE or Australia, on the Yardie's phone (Leadverse mobile) or on Leadverse web, the action area on Turbo UI:

- **Stage 1, collect and prep (the day before the TD).** Y1 Pick up: scan the key tag or type the plate, the odometer, the fuel, a photo of each side. Y2 Prep: a six-item checklist and the fuel at least half; or report an issue, which puts the car on hold with a Refurb ticket and tells the RM and the SA (N6). Y3 Park ready: a ready-row spot and the key box slot; the booking's car readiness turns green.
- **Stage 2, drop and key handover (when the customer checks in).** Y4 Drive over: the Bring task with the token and the SA, scan the key. Y5 Park at the hub: a bay (the target one preselected), the odometer and any new marks; the order goes to CAR AT HUB and the TV to Car ready. Y6 Key handover: to the SA, confirmed by the 4-digit code on the SA's tablet; the spare key stays in the key box.

The spec beside each screen lists the properties its tap updates (the yard tasks, the car, the key, the TD order, the ground TV, the SA's task), live from the form; the Properties view lists all of them. Code: `yardie.js` (state, screens, properties, spec), `yardie.css`; it reuses `piston-data.js`, `piston-screens.js` and `dls.js`.
