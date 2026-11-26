// Turbo UI, the CARS24 DLS (CSPL-CARS24/turbo-ui), as plain markup. Each helper mirrors one @cspl component: the
// same structure, states and props by the same names, styled by dls.css. A screen's action area moves onto the DLS
// by building from these inside an element with class "dls"; the Leadverse shell around it keeps its own look.

// an icon from the DLS icon font, by its DLS name (getIconClass(name, size))
const tui = (name, size = "base") => `<i class="tui tui-${name} icon-${size}" aria-hidden="true"></i>`;

const TU = {
  // SectionCard, display card (framed) or plain. The badge sits right of the title, Badge subtle xs
  sectionCard({ title, subtitle, badge, items = [], framed = true, attrs = "" }) {
    return `<section class="tu-sec${framed ? " framed" : ""}"${attrs ? " " + attrs : ""}>
      <div class="hd"><div class="tx"><h4>${title}</h4>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${badge ? TU.badge(badge.label, { variant: badge.variant, attrs: badge.attrs }) : ""}</div>
      <div class="grid">${items.join("")}</div></section>`;
  },
  // DataTable (@cspl/table). columns: [{ key, label, align, isBadge, subTextKey }]; rows: plain objects, a badge cell
  // as { label, variant }; row.$cls and row.$attrs are this screen's own row renderers (totals, sub-rows)
  dataTable({ columns, rows, attrs = "" }) {
    const cell = (c, r) => {
      const v = r[c.key], sub = c.subTextKey ? r[c.subTextKey] : null, at = r.$cell && r.$cell[c.key] ? " " + r.$cell[c.key] : "";
      const inner = c.isBadge && v ? TU.badge(v.label, { variant: v.variant }) : `<span class="p">${v ?? "&mdash;"}</span>`;
      return `<td class="${c.align || "left"}"${at}>${inner}${sub != null ? `<span class="s">${sub}</span>` : ""}</td>`;
    };
    return `<div class="tu-table"${attrs ? " " + attrs : ""}><div class="shell"><table>
      <thead><tr>${columns.map(c => `<th class="${c.align || "left"}">${c.label}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr${r.$cls ? ` class="${r.$cls}"` : ""}${r.$attrs ? " " + r.$attrs : ""}>${columns.map(c => cell(c, r)).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  },
  // Badge, appearance subtle. variant: neutral | information | success | warning | error; size xs (default) or s
  badge(text, { variant = "neutral", size = "xs", icon, attrs = "" } = {}) {
    return `<span class="tu-badge ${variant}${size === "s" ? " s" : ""}"${attrs ? " " + attrs : ""}>${icon ? tui(icon, "xs") : ""}${text}</span>`;
  },
  // PaymentDetailsCard breakup rows. items: [{ label, value, highlight, valueAction: { icon, ariaLabel, attrs } }];
  // "sep" draws the dashed separator. heading sits on top over a hairline. showShadow off inside another card
  paymentDetails(items, { heading = "", showShadow = true, attrs = "" } = {}) {
    return `<div class="tu-pay${showShadow ? " shadow" : ""}"${attrs ? " " + attrs : ""}>${heading ? `<h5 class="hd">${heading}</h5>` : ""}${items.map(x => x === "sep" ? `<div class="sep"></div>` : `<div class="it${x.highlight ? " hl" : ""}"><span>${x.label}</span><span class="v">${x.valueAction ? `<button type="button" class="va" aria-label="${x.valueAction.ariaLabel}"${x.valueAction.attrs ? " " + x.valueAction.attrs : ""}>${tui(x.valueAction.icon, "sm")}</button>` : ""}${x.value}</span></div>`).join("")}</div>`;
  },
  // Chip, size default, rounded. Active is the brand tone, or chipTheme Green (green) for a done state; trailing shows only while active
  chip(label, { leadingIcon, active, trailing, green, attrs = "" } = {}) {
    return `<button type="button" class="tu-chip${green ? " green" : ""}${active ? " on" : ""}"${attrs ? " " + attrs : ""}>${leadingIcon ? tui(leadingIcon, "sm") : ""}${label}${trailing ? `<span class="ok">${trailing}</span>` : ""}</button>`;
  },
  // FileUploadCard, one item. The upload button is pending until a file lands, then shows the document preview
  fileUploadCard({ title, description, badge = "", cta = "", accept = "image/*,.pdf", attrs = "", buttonAttrs = "", previewLabel = "File", uploaded = false }) {
    return `<div class="tu-fuc"${attrs ? " " + attrs : ""}><div class="row">
      <div class="tx"><div class="tt"><b>${title}</b>${badge}</div><p data-fuc-desc>${description}</p>${cta}</div>
      <label class="up${uploaded ? " done" : ""}" aria-label="Upload ${title}"${buttonAttrs ? " " + buttonAttrs : ""}><input type="file" accept="${accept}" hidden>
        <span class="in">${tui("arrow-out-of-box-upload-share-outline", "xl")}<span>Upload</span></span>
        <span class="doc">${tui("file-text-outline", "xl")}<span data-fuc-type>${previewLabel}</span></span>
        <span class="corner">${tui("edit-outline", "sm")}</span></label></div></div>`;
  },
  // CarContextCard: media (the car's colour), title, subtitle, and whatever sits on the right
  carContext({ title, subtitle, color, right = "", attrs = "" }) {
    return `<div class="tu-ccc"${attrs ? " " + attrs : ""}><span class="md" style="background:${color}">${tui("car-outline", "2xl")}</span><div class="cx"><b>${title}</b><small>${subtitle}</small></div>${right}</div>`;
  },
  // Dropdown, size medium, as a native select so the screen's change handlers keep working. options: labels, or
  // [value, label] pairs. placeholder shows until a value is picked; required puts FieldLabel's red asterisk on the label
  dropdown({ id, label, options, value, placeholder, required, attrs = "" }) {
    const opt = (o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`; };
    return `<div class="tu-dd"><label for="${id}">${label}${required ? `<span class="rq">*</span>` : ""}</label><div class="trig"><select id="${id}"${placeholder && !value ? ` class="ph"` : ""}${attrs ? " " + attrs : ""}>${placeholder ? `<option value="" disabled${value ? "" : " selected"}>${placeholder}</option>` : ""}${options.map(opt).join("")}</select>${tui("chevron-down-small-outline")}</div></div>`;
  },
  // LinkButton, tone brand, size sm
  link(text, { icon, attrs = "" } = {}) {
    return `<button type="button" class="tu-link"${attrs ? " " + attrs : ""}>${icon ? tui(icon, "sm") : ""}${text}</button>`;
  },
  // NotchTabs: text tabs on a hairline, the active one with the brand bar under it. Panels pair by data-tab
  notchTabs(group, items, active, attrs = "") {
    return `<div class="tu-notch" role="tablist" data-tu-tabs="${group}"${attrs ? " " + attrs : ""}>${items.map(([k, label]) => `<button type="button" role="tab" class="${k === active ? "on" : ""}" data-tab="${k}">${label}</button>`).join("")}</div>`;
  },
  // SegmentTabs, light, md: a toggle on the slate track, the active segment on a white slider
  segmentTabs(group, items, active, attrs = "") {
    return `<div class="tu-seg" role="tablist" data-tu-tabs="${group}"${attrs ? " " + attrs : ""}>${items.map(([k, label]) => `<button type="button" role="tab" class="${k === active ? "on" : ""}" data-tab="${k}">${label}</button>`).join("")}</div>`;
  },
  tabPanel(group, key, active, html) {
    return `<div class="tu-panel" data-tab-panel="${group}:${key}"${key === active ? "" : " hidden"}>${html}</div>`;
  },
  // FetchedInfoCard: a header row, then label-over-value items (description, then label, as the DLS orders them)
  fetchedInfo({ title, description, items, cols = 2, right = "", attrs = "" }) {
    return `<div class="tu-fic"${attrs ? " " + attrs : ""}>${title ? `<div class="hd"><div><b>${title}</b>${description ? `<small>${description}</small>` : ""}</div>${right}</div>` : ""}
      <div class="items c${cols}">${items.map(([k, v, a]) => `<div class="it"${a ? " " + a : ""}><small>${k}</small><b>${v}</b></div>`).join("")}</div></div>`;
  },
  // Stepper, variant default: a 36px marker per step (an icon, a check once completed), the connector, the label and
  // description under it. steps: [{ label, description, icon, number, status: default | active | completed, attrs }]. A
  // numbered stepper gives each step its number: the marker shows the digit in the marker's own colours (the font's
  // number-1... glyphs are solid discs, a circle inside the circle), and the check once completed
  // A step with attrs is clickable (onStepClick with allowStepNavigation): a completed step to go back to
  stepper(steps, attrs = "") {
    return `<ol class="tu-stepper"${attrs ? " " + attrs : ""}>${steps.map((s, i) => `<li class="st ${s.status || "default"}${s.skip ? " skip" : ""}${s.attrs ? " nav" : ""}" data-status="${s.status || "default"}"${s.status === "active" ? ` aria-current="step"` : ""}${s.attrs ? " " + s.attrs : ""}>
      <span class="trk"><span class="mk">${s.status !== "completed" && s.number ? `<span class="num">${s.number}</span>` : tui(s.status === "completed" ? "check-outline" : s.icon || "edit-outline", "lg")}</span>${i < steps.length - 1 ? `<span class="cn"></span>` : ""}</span>
      <span class="tx"><b>${s.label}</b>${s.description ? `<small>${s.description}</small>` : ""}</span></li>`).join("")}</ol>`;
  },
  // ChoiceTile: a rounded tile, an inset ring once selected. One pick per group
  choiceTiles(group, items, selected, cols = items.length) {
    return `<div class="tu-tiles" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${items.map(x => `<button type="button" class="tu-tile${x.sub || x.icon ? "" : " lbl"}${x.value === selected ? " on" : ""}" data-choice="${group}" data-value="${x.value}"${x.attrs ? " " + x.attrs : ""}>
      ${x.icon ? tui(x.icon, "xl") : ""}<b>${x.label}</b>${x.sub ? `<small>${x.sub}</small>` : ""}</button>`).join("")}</div>`;
  },
  // Checkbox, size md, with its label (and a value on the right when given)
  checkbox(label, { checked, value = "", sub = "", attrs = "" } = {}) {
    return `<label class="tu-cb${checked ? " on" : ""}"${attrs ? " " + attrs : ""}><span class="box">${tui("check-outline", "sm")}</span><span class="lb">${label}${sub ? `<small>${sub}</small>` : ""}</span>${value ? `<span class="vl">${value}</span>` : ""}</label>`;
  },
  // TextInput: label over the field; helper text under it, red with the field's border in the error state
  textInput({ label, value = "", id, placeholder = "", required, hint = "", error = "", attrs = "" }) {
    return `<div class="tu-ti${error ? " err" : ""}"><label for="${id}">${label}${required ? `<span class="rq">*</span>` : ""}</label><input id="${id}" value="${value}" placeholder="${placeholder}"${attrs ? " " + attrs : ""}>${hint || error ? `<small class="hl" data-ti-hint="${hint}">${error || hint}</small>` : ""}</div>`;
  },
  // Coupon: the brand strip with the value, the card with the title, a dashed divider, the code and the validity
  coupon({ value, title, code, valid, action = "", attrs = "" }) {
    return `<div class="tu-coupon"${attrs ? " " + attrs : ""}><span class="dec"><span>${value}</span></span><div class="cd"><b>${title}</b><span class="dv"></span>
      <div class="ft"><span><small>Code</small><b>${code}</b></span><span><small>Valid till</small><b>${valid}</b></span>${action}</div></div></div>`;
  },
  // AddressCard: the address, its tag, and an action
  addressCard({ title, lines, tag, action = "", attrs = "" }) {
    return `<div class="tu-addr"${attrs ? " " + attrs : ""}><div class="tt">${tui("location-outline")}<b>${title}</b>${tag ? TU.badge(tag, { variant: "neutral" }) : ""}${action}</div><p>${lines}</p></div>`;
  },
  // PaymentTile: a logo square, the name and a subtitle, selected with a radio
  paymentTile({ name, sub, icon, value, group, selected, attrs = "" }) {
    return `<button type="button" class="tu-ptile${selected ? " on" : ""}" data-choice="${group}" data-value="${value}"${attrs ? " " + attrs : ""}><span class="lg">${tui(icon, "xl")}</span><span class="tx"><b>${name}</b><small>${sub}</small></span><span class="rd"></span></button>`;
  },
  // NoDataFound, presentation desktop-compact
  noData({ title, sub = "", cta = "" }) {
    return `<div class="tu-nodata">${tui("info-outline", "2xl")}<b>${title}</b>${sub ? `<small>${sub}</small>` : ""}${cta}</div>`;
  },
  // Button. variant: primary | secondary | tertiary; size: small | medium
  button(text, { variant = "primary", size = "small", icon, iconAfter, attrs = "" } = {}) {
    return `<button type="button" class="tu-btn ${variant} ${size}"${attrs ? " " + attrs : ""}>${icon ? tui(icon, "sm") : ""}${text}${iconAfter ? tui(iconAfter, "sm") : ""}</button>`;
  },
  // DoSuccessHeader's layout on a light surface: the badge, the title and the line under it
  successHeader({ title, sub }) {
    return `<div class="tu-success"><span class="bd">${tui("circle-check-filled", "2xl")}</span><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  },
  // DateSlot, desktop-compact: a row of days, the day over the date; TimeSlot, desktop-compact: a grid of times.
  // items: [{ value, label, sub, disabled }]; the picked one in the brand tone
  dateSlots(attrs, items, selected) {
    return `<div class="tu-dslots">${items.map(x => `<button type="button" class="tu-dslot${x.value === selected ? " on" : ""}"${x.disabled ? " disabled" : ""} ${attrs} data-v="${x.value}"><small>${x.label}</small><b>${x.sub}</b></button>`).join("")}</div>`;
  },
  timeSlots(attrs, items, selected) {
    return `<div class="tu-tslots">${items.map(x => `<button type="button" class="tu-tslot${x.value === selected ? " on" : ""}"${x.disabled ? " disabled" : ""} ${attrs} data-v="${x.value}">${x.label}${x.sub ? `<small>${x.sub}</small>` : ""}</button>`).join("")}</div>`;
  },
};
