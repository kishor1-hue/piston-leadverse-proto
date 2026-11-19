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
  // "sep" draws the dashed separator. showShadow off when the card sits inside another card
  paymentDetails(items, { showShadow = true, attrs = "" } = {}) {
    return `<div class="tu-pay${showShadow ? " shadow" : ""}"${attrs ? " " + attrs : ""}>${items.map(x => x === "sep" ? `<div class="sep"></div>` : `<div class="it${x.highlight ? " hl" : ""}"><span>${x.label}</span><span class="v">${x.valueAction ? `<button type="button" class="va" aria-label="${x.valueAction.ariaLabel}"${x.valueAction.attrs ? " " + x.valueAction.attrs : ""}>${tui(x.valueAction.icon, "sm")}</button>` : ""}${x.value}</span></div>`).join("")}</div>`;
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
  // LinkButton, tone brand, size sm
  link(text, { icon, attrs = "" } = {}) {
    return `<button type="button" class="tu-link"${attrs ? " " + attrs : ""}>${icon ? tui(icon, "sm") : ""}${text}</button>`;
  },
};
