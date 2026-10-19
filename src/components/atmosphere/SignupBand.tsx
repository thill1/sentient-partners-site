import { useState } from "react";
import { isEmail, subscribe } from "../../lib/newsletter";
import "../../../insights/signup-band.css";

type State = "idle" | "sending" | "done" | "error" | "invalid";

/** Newsletter signup band, shown just above the footer. */
export default function SignupBand() {
  const [email, setEmail] = useState("");
  const [honey, setHoney] = useState("");
  const [state, setState] = useState<State>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email.trim())) return setState("invalid");
    setState("sending");
    setState((await subscribe(email, honey)) ? "done" : "error");
  };

  return (
    <section className="signup-band" aria-labelledby="signup-title">
      <div className="signup-inner">
        <div>
          <p className="signup-eyebrow">Insights</p>
          <h2 id="signup-title" className="signup-title">
            A short, practical note for local business owners, every other week.
          </h2>
          {__INSIGHTS_LIVE__ && (
            <a className="signup-latest" href="/insights/">
              Read recent issues →
            </a>
          )}
        </div>
        {state === "done" ? (
          <p className="signup-status" role="status">
            Thank you. You're on the list.
          </p>
        ) : (
          <form className="signup-form" onSubmit={submit} noValidate>
            <label htmlFor="signup-email" className="signup-label">
              Email address
            </label>
            <div className="signup-row">
              <input
                id="signup-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                required
                value={email}
                aria-invalid={state === "invalid"}
                aria-describedby="signup-msg"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="text"
                name="_honey"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="signup-honey"
                value={honey}
                onChange={(e) => setHoney(e.target.value)}
              />
              <button type="submit" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Subscribe"}
              </button>
            </div>
            <p id="signup-msg" className="signup-msg" role="alert">
              {state === "invalid" && "Please enter a valid email address."}
              {state === "error" && (
                <>
                  Something went wrong. Please email{" "}
                  <a href="mailto:hello@sentientpartners.ai">hello@sentientpartners.ai</a>.
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
