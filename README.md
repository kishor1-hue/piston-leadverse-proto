# PISTON: the ideal test drive journey on Leadverse

A screen spec for CARS24's ideal test-drive journey in the UAE and Australia, drawn in the Leadverse TD Journey design. PISTON stands for its six phases: **P**lan, **I**ntroduce, **S**ign-in, **T**ailor, **O**n the road, **N**ext step.

Every step has its **source**, its **screen**, its **entry conditions** and its **exit conditions**, for three tracks: booked hub TD, walk-in hub TD and video TD. One level below that, every screen has its **anatomy**: numbered parts (shown as pins on the screen), the fields it captures, the actions it fires and the states it can be in.

## Markets and the two ways to check in

The journey is built once and configured per market. Switch **UAE** or **Australia** at the top: people, cars, money, documents, hub and copy follow the market.

After Mark arrived, the customer checks in one of two ways, in any market:

- **At the desk**: the receptionist fills the check-in with the customer on the desk tablet. Default in the UAE (and India).
- **By link**: Mark arrived sends a one-time link on WhatsApp and email. It opens a form-only page on the customer's own phone, with no Leadverse and no login. Each answer syncs to the visit as it is given, and submitting checks the customer in. Default in Australia.

On S1 by link, the stage shows the receptionist's panel and the customer's phone side by side. Fill the form on the phone and watch the answers land in the panel. **Screen only** shows both larger. The *What changed* view lists what is set per market and the decisions still open.

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

Deep links: `#booked-S1`, `#walkin-T2`, `#vtd-O2`, `#blueprint`, `#fields`, `#changes`. Prefix `au-` for Australia (`#au-booked-S1`), and add `-desk` or `-link` when the check-in way differs from the market default (`#booked-S1-link`).

## Files

- `index.html`: the page.
- `piston-data.js`: the spec. Tracks, markets, check-in ways, flows, phases and the 33 steps, plus mock people and cars per market and the copy layer for Australia.
- `piston-anatomy.js`: parts, fields, actions and states for every screen.
- `piston-screens.js`: one Leadverse screen per step, plus the customer's phone page for check-in by link.
- `piston.js`: the viewer.
- `piston.css`: the viewer and the TD Journey components.
- `style.css`: shared Leadverse tokens and base styles, also used by the Test Drive Console.
- `theme.js`: the Light / Dark toggle.
- `artifact-entry.html`: the same page without the document wrapper, for publishing as a Claude artifact.
- `board-v2.mmd`: Mermaid source of the PISTON v2 diagram on the FigJam board. Step IDs on the board match the IDs here.

## Theme

The page opens in the white theme, which is what Leadverse uses. The Light / Dark button in the header switches the theme for your browser and remembers the choice. The OS dark mode never switches it.

## Related

- [Test Drive Console](https://github.com/kishor1-hue/test-drive-console): the first Leadverse prototype of the DAP test drive journey.
- History up to this split lives in [da-panel-leadverse-proto](https://github.com/kishor1-hue/da-panel-leadverse-proto), where PISTON was the `piston/` folder.
