/* global document, fetch */
// Newsletter signup for the static Insights pages (mirrors src/lib/newsletter.ts).
(function () {
  var form = document.querySelector(".signup-form");
  if (!form) return;
  var input = form.querySelector('input[type="email"]');
  var honey = form.querySelector('input[name="_honey"]');
  var button = form.querySelector("button");
  var msg = form.querySelector(".signup-msg");
  var fallback =
    'Something went wrong. Please email <a href="mailto:hello@sentientpartners.ai">hello@sentientpartners.ai</a>.';
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.setAttribute("aria-invalid", "true");
      msg.textContent = "Please enter a valid email address.";
      return;
    }
    input.removeAttribute("aria-invalid");
    msg.textContent = "";
    button.disabled = true;
    button.textContent = "Sending…";
    fetch("https://formsubmit.co/ajax/hello@sentientpartners.ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "Newsletter signup - " + email,
        _captcha: "false",
        _template: "table",
        _honey: honey ? honey.value : "",
        email: email,
        source: "Insights signup",
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return r.ok && String(d.success) === "true";
        });
      })
      .catch(function () {
        return false;
      })
      .then(function (ok) {
        if (ok) {
          var done = document.createElement("p");
          done.className = "signup-status";
          done.setAttribute("role", "status");
          done.textContent = "Thank you. You're on the list.";
          form.replaceWith(done);
        } else {
          button.disabled = false;
          button.textContent = "Subscribe";
          msg.innerHTML = fallback;
        }
      });
  });
})();
