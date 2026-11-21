/* global document, history, location, window */
// The phone menu is a native disclosure. Escape and a click outside close it.
(function () {
  var menu = document.querySelector(".ins-menu");
  if (!menu) return;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !menu.open) return;
    menu.open = false;
    var summary = menu.querySelector("summary");
    if (summary) summary.focus();
  });
  document.addEventListener("click", function (e) {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
})();

// Progressive enhancement: filter the archive in place. Without JS, the filter
// links go to the static /insights/<filter>/ pages, which show the same list.
(function () {
  var nav = document.querySelector(".filters");
  var list = document.getElementById("insights-list");
  if (!nav || !list) return;
  var empty = document.querySelector(".empty");
  function apply(key, link) {
    var shown = 0;
    list.querySelectorAll(".card").forEach(function (c) {
      var on = key === "all" || c.getAttribute("data-group") === key;
      c.hidden = !on;
      if (on) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    nav.querySelectorAll("a").forEach(function (a) {
      if (a === link) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-filter]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    apply(a.getAttribute("data-filter"), a);
    history.pushState({ filter: a.getAttribute("data-filter") }, "", a.getAttribute("href"));
  });
  window.addEventListener("popstate", function () {
    var a = nav.querySelector('a[href="' + location.pathname + '"]') || nav.querySelector("a");
    apply(a.getAttribute("data-filter"), a);
  });
})();
