/* global document, fetch */
// Newsletter signup for static Insights pages (keep in sync with src/lib/newsletter.ts).
(function () {
  var CONFIG_URL = "/insights-newsletter.json";
  var FORMSUBMIT_URL = "https://formsubmit.co/ajax/hello@sentientpartners.ai";
  var PLACEHOLDER = /REPLACE_WITH_GHL|PLACEHOLDER/i;
  var configCache = null;

  function ghlReady(cfg) {
    return (
      cfg.provider === "ghl-webhook" &&
      cfg.ghlWebhookUrl.indexOf("https://") === 0 &&
      !PLACEHOLDER.test(cfg.ghlWebhookUrl)
    );
  }

  function loadConfig() {
    if (configCache) return Promise.resolve(configCache);
    return fetch(CONFIG_URL, { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .catch(function () {
        return null;
      })
      .then(function (data) {
        configCache = data
          ? {
              provider: data.provider === "ghl-webhook" ? "ghl-webhook" : "formsubmit",
              ghlWebhookUrl: String(data.ghlWebhookUrl || ""),
            }
          : { provider: "formsubmit", ghlWebhookUrl: "" };
        return configCache;
      });
  }

  function postFormSubmit(email, honeyVal) {
    return fetch(FORMSUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "Newsletter signup - " + email,
        _captcha: "false",
        _template: "table",
        _honey: honeyVal,
        email: email,
        source: "Insights signup",
      }),
    }).then(function (r) {
      return r.json().then(function (d) {
        return r.ok && String(d.success) === "true";
      });
    });
  }

  function postGhl(url, email) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email, source: "insights-signup" }),
    }).then(function (r) {
      return r.ok;
    });
  }

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
    var honeyVal = honey ? honey.value : "";
    if (honeyVal.trim()) {
      var quiet = document.createElement("p");
      quiet.className = "signup-status";
      quiet.setAttribute("role", "status");
      quiet.textContent = "Thank you. You're on the list.";
      form.replaceWith(quiet);
      return;
    }
    button.disabled = true;
    button.textContent = "Sending…";
    loadConfig()
      .then(function (cfg) {
        return ghlReady(cfg) ? postGhl(cfg.ghlWebhookUrl, email) : postFormSubmit(email, honeyVal);
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