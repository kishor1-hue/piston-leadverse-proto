// Writes the DLS icon rules into dls.css, between the "icons:start" and "icons:end" markers, from a checkout of
// CSPL-CARS24/turbo-ui. Usage: node tools/dls-icons.js <turbo-ui repo>. Add a name to NAMES to use a new icon.
const fs = require("fs"), path = require("path");
const NAMES = ["check-outline", "whatsapp", "email-envelope-outline", "bubble-text-message-chat-outline", "copy", "arrow-out-of-box-upload-share-outline",
  "file-text-outline", "edit-outline", "wallet-3-outline", "car-outline", "car-check-outline", "chevron-down-small-outline", "key-outline", "flag-2-priority-outlined",
  "location-outline", "home-round-door-outline", "tag-sale-outlined", "checklist-list-outline", "credit-card-2-card-payment-outline", "bank-outline",
  "check-badge-outline", "shield-check-line", "package-block-delivery-outline", "clock-timer-outline", "eye-open-show-see-reveal-look-visible-outline",
  "receipt-check-outline", "link", "send-line", "notepad-notes-outline", "circle-check-filled", "info-outline", "arrow-right-outline", "arrow-left-outline",
  "plus-large-outline", "close-line", "calendar-check-outline", "sparkle-filled", "wishlist-outline", "arrow-right-left-sort1-switchhorizontal-outline",
  "coin-dollar-currency-money-outline", "money-hand-coins-pay-outline", "lock-private-outline", "people-circle-user-circle-avatar-profile-outline",
  "calendar-line", "camera-picture-image-outline", "microphone-outline"];
const css = fs.readFileSync(path.join(process.argv[2], "packages/theme/src/icons-generated.css"), "utf8");
const rules = NAMES.map(n => {
  const m = css.match(new RegExp(`--turbo-ui-icon-${n.replace(/[-]/g, "\\-")}:\\s*("[^"]+")`));
  if (!m) throw new Error(`no DLS icon ${n}`);
  return `.tui-${n}::before{content:${m[1]};}`;
});
const file = path.join(__dirname, "..", "dls.css"), s = fs.readFileSync(file, "utf8");
const a = s.indexOf("/* icons:start */"), b = s.indexOf("/* icons:end */");
fs.writeFileSync(file, s.slice(0, a) + "/* icons:start */\n" + rules.join("\n") + "\n" + s.slice(b));
console.log(`${rules.length} icons`);
