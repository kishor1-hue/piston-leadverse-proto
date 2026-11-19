// Turbo UI, the CARS24 DLS (CSPL-CARS24/turbo-ui), as plain markup. Each helper mirrors one @cspl component: the
// same structure, states and props by the same names, styled by dls.css. A screen moved onto the DLS builds from
// these inside an element with class "dls"; the rest of the prototype keeps the Leadverse look.

// an icon from the DLS icon font, by its DLS name (getIconClass(name, size))
const tui = (name, size = "base") => `<i class="tui tui-${name} icon-${size}" aria-hidden="true"></i>`;
// the prototype's icon names (lucide) for the DLS ones, where a shared part (the footer, the call bar) draws them
const TUI_OF = { "arrow-left": "arrow-left-outline", "calendar": "calendar-line", "phone-forwarded": "call-outgoing-outline", "check": "check-outline",
  "landmark": "bank-outline", "phone-off": "call-decline-filled", "chevron-down": "chevron-down-small-outline", "phone-call": "call-filled",
  "mic-off": "microphone-off-outline", "pause": "pause-outline", "message-square": "quote-outline", "list-checks": "info-outline", "lightbulb": "lightbulb-outline" };
const tuiOf = (n, size) => tui(TUI_OF[n] || n, size);

const TU = {
  // Stepper, variant inline. steps: [{ label, description, status: default | active | completed }]
  stepper(steps, attrs = "") {
    return `<ol class="tu-stepper" aria-label="Progress steps"${attrs ? " " + attrs : ""}>${steps.map((s, i) => `<li class="tu-step ${s.status || "default"}" data-status="${s.status || "default"}"${s.status === "active" ? ` aria-current="step"` : ""}>
      <span class="mk">${tui("check-outline", "base")}</span><span class="tx"><b>${s.label}</b>${s.description ? `<small>${s.description}</small>` : ""}</span>${i < steps.length - 1 ? `<span class="cn" aria-hidden="true"></span>` : ""}</li>`).join("")}</ol>`;
  },
  // VerticalStepper, vertical with a border. steps: [{ title, description, content, status: inactive | active | completed, attrs }]
  verticalStepper(steps, attrs = "") {
    return `<div class="tu-vstep" role="list" aria-label="Progress steps"${attrs ? " " + attrs : ""}>${steps.map((s, i) => `<div class="tu-vrow ${s.status || "inactive"}" role="listitem" data-status="${s.status || "inactive"}"${s.attrs ? " " + s.attrs : ""}>
      <div class="ind"><span class="dot"><i></i></span>${i < steps.length - 1 ? `<span class="rail" aria-hidden="true"></span>` : ""}</div>
      <div class="body"><p class="tt">${s.title}</p>${s.description ? `<p class="ds">${s.description}</p>` : ""}${s.content ? `<div class="ct">${s.content}</div>` : ""}</div></div>`).join("")}</div>`;
  },
  // Badge, appearance subtle. variant: neutral | information | success | warning | error; size xs (default) or s
  badge(text, { variant = "neutral", size = "xs", icon, attrs = "" } = {}) {
    return `<span class="tu-badge ${variant}${size === "s" ? " s" : ""}"${attrs ? " " + attrs : ""}>${icon ? tui(icon, "xs") : ""}${text}</span>`;
  },
  // PaymentDetailsCard breakup rows. items: [{ label, value, valueAction: { icon, ariaLabel, attrs } }]; "sep" draws the dashed separator
  paymentDetails(items, attrs = "") {
    return `<div class="tu-pay"${attrs ? " " + attrs : ""}>${items.map(x => x === "sep" ? `<div class="sep"></div>` : `<div class="it${x.highlight ? " hl" : ""}"><span>${x.label}</span><span class="v">${x.valueAction ? `<button type="button" class="va" aria-label="${x.valueAction.ariaLabel}"${x.valueAction.attrs ? " " + x.valueAction.attrs : ""}>${tui(x.valueAction.icon, "sm")}</button>` : ""}${x.value}</span></div>`).join("")}</div>`;
  },
  // Chip, size default, rounded. active uses chipTheme Green; trailing shows only while active
  chip(label, { leadingIcon, active, trailing, attrs = "" } = {}) {
    return `<button type="button" class="tu-chip${active ? " on" : ""}"${attrs ? " " + attrs : ""}>${leadingIcon ? tui(leadingIcon, "sm") : ""}${label}${trailing ? `<span class="ok">${trailing}</span>` : ""}</button>`;
  },
  // FileUploadCard, one item. The upload button is pending until a file lands, then shows the document preview
  fileUploadCard({ title, description, badge = "", cta = "", accept = "image/*,.pdf", attrs = "", buttonAttrs = "", previewLabel = "File" }) {
    return `<div class="tu-fuc"${attrs ? " " + attrs : ""}><div class="row">
      <div class="tx"><div class="tt"><b>${title}</b>${badge}</div><p data-fuc-desc>${description}</p>${cta}</div>
      <label class="up" aria-label="Upload ${title}"${buttonAttrs ? " " + buttonAttrs : ""}><input type="file" accept="${accept}" hidden>
        <span class="in">${tui("arrow-out-of-box-upload-share-outline", "xl")}<span>Upload</span></span>
        <span class="doc">${tui("file-text-outline", "xl")}<span data-fuc-type>${previewLabel}</span></span>
        <span class="corner">${tui("edit-outline", "sm")}</span></label></div></div>`;
  },
  // CarContextCard: media (the car's colour), title, subtitle, and whatever sits on the right
  carContext({ title, subtitle, color, right = "", attrs = "" }) {
    return `<div class="tu-ccc"${attrs ? " " + attrs : ""}><span class="md" style="background:${color}">${tui("car-outline", "2xl")}</span><div class="cx"><b>${title}</b><small>${subtitle}</small></div>${right}</div>`;
  },
  // Dropdown, size medium, as a native select so the screen's change handlers keep working
  dropdown({ id, label, options, value, attrs = "" }) {
    return `<div class="tu-dd"><label for="${id}">${label}</label><div class="trig"><select id="${id}"${attrs ? " " + attrs : ""}>${options.map(o => `<option${o === value ? " selected" : ""}>${o}</option>`).join("")}</select>${tui("chevron-down-small-outline")}</div></div>`;
  },
  // InformationMessage. state: general | brand | positive | negative | warning; background adds the state's surface
  info(text, { state = "general", icon = "info-outline", background, title, attrs = "" } = {}) {
    return `<div class="tu-info ${state}${background ? " bg" : ""}"${attrs ? " " + attrs : ""}>${icon ? tui(icon) : ""}<p>${title ? `<span class="k">${title}</span>` : ""}${text}</p></div>`;
  },
  // LinkButton, tone brand, size sm
  link(text, { icon, attrs = "" } = {}) {
    return `<button type="button" class="tu-link"${attrs ? " " + attrs : ""}>${icon ? tui(icon, "sm") : ""}${text}</button>`;
  },
};
