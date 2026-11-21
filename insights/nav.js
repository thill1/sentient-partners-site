/* global document */
// Header behaviour for the static Insights pages (markup from insights/chrome.mjs).
// Mirrors the React header: the Solutions panel and the full-height mobile menu
// each open from a button, close on Escape, and close when a link is followed.
(function () {
  var root = document.documentElement;

  // Desktop: the single-level Solutions panel.
  var solutions = document.querySelector(".ins-solutions");
  var solutionsButton = solutions && solutions.querySelector(".ins-solutions-button");
  var panel = solutions && solutions.querySelector(".ins-solutions-panel");
  function setPanel(open) {
    panel.hidden = !open;
    solutionsButton.setAttribute("aria-expanded", String(open));
  }
  if (solutions && solutionsButton && panel) {
    solutionsButton.addEventListener("click", function () {
      setPanel(panel.hidden);
    });
    solutionsButton.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown") return;
      e.preventDefault();
      setPanel(true);
      var first = panel.querySelector("a");
      if (first) first.focus();
    });
    // Outside click.
    document.addEventListener("pointerdown", function (e) {
      if (!panel.hidden && !solutions.contains(e.target)) setPanel(false);
    });
    // Focus moved somewhere outside the button and panel.
    solutions.addEventListener("focusout", function (e) {
      if (!solutions.contains(e.relatedTarget)) setPanel(false);
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setPanel(false);
    });
  }

  // Narrow screens: the full-height flat menu.
  var toggle = document.querySelector(".ins-menu-toggle");
  var menu = document.getElementById("mobile-navigation");
  function menuItems() {
    return [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll("a")));
  }
  function setMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    // Locks page scroll and pins the header bar above the menu (see insights.css).
    root.classList.toggle("ins-menu-open", open);
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.hidden;
      setMenu(open);
      if (open) {
        var first = menu.querySelector("a");
        if (first) first.focus();
      }
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (panel && !panel.hidden) {
        setPanel(false);
        solutionsButton.focus();
      }
      if (menu && !menu.hidden) {
        setMenu(false);
        toggle.focus();
      }
      return;
    }
    // Keep Tab inside the open menu: [toggle, ...menu links].
    if (e.key !== "Tab" || !menu || menu.hidden) return;
    var items = menuItems();
    var at = items.indexOf(document.activeElement);
    var next = at < 0 ? 0 : (at + (e.shiftKey ? -1 : 1) + items.length) % items.length;
    e.preventDefault();
    items[next].focus();
  });
})();
