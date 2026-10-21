# PISTON: the ideal test drive journey on Leadverse

A screen spec for CARS24's ideal test-drive journey in the UAE and Australia, drawn in the Leadverse TD Journey design. PISTON stands for its six phases: **P**lan, **I**ntroduce, **S**ign-in, **T**ailor, **O**n the road, **N**ext step.

Every step has its **source**, its **screen**, its **entry conditions** and its **exit conditions**, for three tracks: booked hub TD, walk-in hub TD and video TD. One level below that, every screen has its **anatomy**: numbered parts (shown as pins on the screen), the fields it captures, the actions it fires and the states it can be in.

## The TD booking call

- **P1 queue** with tabs: All, Queue, Callbacks, Closed today, Today missed TD.
- **P2 lead view** opens on the customer's orders and cars (appointment IDs). With a mobile and an email, an order exists: confirm it and move on. Without both, the cars of interest sit on the contact; picking them (after adding the email in the left pane) creates one order per car.
- The opening line and the CARS24 pitch are in CarGPT, not steps. Contact details are edited in the left pane.
- **P3 Discovery** (only when unsure): stepper pills of filters, then matching cars with a link to each car's page.
- **P4 TD type per car**, then **P5 hub slot** and/or **P6 video slot** depending on the mix, then **P7 book**.

Every screen uses the standard footer: Previous and Next, with the other exits (including a customer dropping off) under the arrow next to Next.

## Markets and the ground journey

The journey is built once and configured per market. Switch **UAE** or **Australia** at the top: people, cars, money, documents, hub and copy follow the market.

On the ground:

- **Check-in asks "Do you need financing after the test drive?"** and the token page shows the next step with a QR: the 2-minute pre-approval, a check against the customer's own lender, or take a seat and browse the cars.
- **Welcome and check-in are one gesture (I1).** Checking in is the arrival; there is no separate Mark arrived. The customer scans the **QR on their seat** and fills a form-only page on their own phone, or a **receptionist or DA** fills the same form with them. Booked and walk-in customers use the same form. Australia defaults to the seat QR; the UAE (and India) default to staff.
- **A token on the ground TV (I2).** Hospital logic: every check-in gets a token (B for bookings, W for walk-ins). The TV and the customer's phone show each token's status, DA and car, and change only when staff act. Use **Play the staff actions** on I2 to watch both update.
- **DA assigned automatically (S1)**, by availability and today's slots; staff assign by hand only when every DA is busy. The **handshake (T1)** comes after that, at the customer's seat.
- **The Yardie.** Cars wait in a yard about 500 m away. A booked car is prepped before the day and brought over when the customer checks in (S2). A walk-in's car is prepped once it is chosen, then brought over (O1). Each tap updates the TV.
- **Start TD (O2) is when the DA meets the customer at the car** and turns the recording on. Then the TD consent (O3), the licence check (O4), the walkaround, the drive and the end. A walk-in waits on their token while the Yardie preps the car; the DA comes back when it reaches the hub.

Steps with two devices (I1 by seat QR, I2, S2, O1) show them side by side. **Screen only** shows them larger. The *What changed* view lists what is set per market and the decisions still open.

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

Deep links: `#booked-I1`, `#walkin-T2`, `#vtd-O5`, `#blueprint`, `#fields`, `#changes`. Prefix `au-` for Australia (`#au-booked-I1`), and add `-staff` or `-qr` when the check-in way differs from the market default (`#booked-I1-qr`).

## Files

- `index.html`: the page.
- `piston-data.js`: the spec. Tracks, markets, check-in ways, flows, phases and the 33 steps, plus mock people and cars per market and the copy layer for Australia.
- `piston-anatomy.js`: parts, fields, actions and states for every screen.
- `piston-screens.js`: one Leadverse screen per step, the ground TV board, and the phone screens: the seat QR check-in, the customer's token page and the Yardie's task list.
- `piston.js`: the viewer.
- `piston.css`: the viewer and the TD Journey components.
- `style.css`: shared Leadverse tokens and base styles, also used by the Test Drive Console.
- `theme.js`: the Light / Dark toggle.
- `artifact-entry.html`: the same page without the document wrapper, for publishing as a Claude artifact.
- `board-v2.mmd`: Mermaid source of the PISTON v2 diagram on the FigJam board. The board predates later reviews, so its Plan, Introduce, Sign-in and On the road steps differ from the IDs here.

## Theme

The page opens in the white theme, which is what Leadverse uses. The Light / Dark button in the header switches the theme for your browser and remembers the choice. The OS dark mode never switches it.

## Related

- [Test Drive Console](https://github.com/kishor1-hue/test-drive-console): the first Leadverse prototype of the DAP test drive journey.
- History up to this split lives in [da-panel-leadverse-proto](https://github.com/kishor1-hue/da-panel-leadverse-proto), where PISTON was the `piston/` folder.
