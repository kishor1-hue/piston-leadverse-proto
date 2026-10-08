// Theme: white by default, dark only when the viewer picks it with the toggle.
// The choice lives in this browser only. The OS dark mode does not switch the page.
// Any button with data-theme-toggle flips it; the attribute is data-lv-theme on <html>.
(function () {
  var KEY = "lv-theme";
  var current = "light";
  try { if (localStorage.getItem(KEY) === "dark") current = "dark"; } catch (e) { /* storage blocked: stay light */ }

  function paint() {
    document.documentElement.setAttribute("data-lv-theme", current);
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute("aria-pressed", current === "dark" ? "true" : "false");
      b.setAttribute("title", current === "dark" ? "Switch to the white theme" : "Switch to the dark theme");
      b.innerHTML = '<i data-lucide="' + (current === "dark" ? "sun" : "moon") + '" class="icon"></i><span>' + (current === "dark" ? "Light" : "Dark") + "</span>";
    }
    if (window.lucide) window.lucide.createIcons();
  }

  window.lvTheme = {
    get: function () { return current; },
    set: function (t) {
      current = t === "dark" ? "dark" : "light";
      try { localStorage.setItem(KEY, current); } catch (e) { /* not saved, still applied */ }
      paint();
    },
    toggle: function () { this.set(current === "dark" ? "light" : "dark"); },
  };

  document.documentElement.setAttribute("data-lv-theme", current);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-theme-toggle]") : null;
    if (b) { e.preventDefault(); window.lvTheme.toggle(); }
  });
})();
