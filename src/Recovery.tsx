import React, { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "./tools";
export default function Recovery({ nav }: any) {
  const token = location.hash.startsWith("#reset=")
      ? location.hash.slice(7)
      : "",
    [msg, M] = useState(""),
    [busy, B] = useState(false);
  return (
    <div className="authpage">
      <aside>
        <img className="logo" src="/logo.png" alt="vevr" />
        <div className="eyebrow">ACCOUNT SECURITY</div>
        <h1>
          Recover your <em>workspace.</em>
        </h1>
      </aside>
      <section>
        <button className="back" onClick={() => nav("/login")}>
          <ArrowLeft size={16} />
          Back to login
        </button>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            B(true);
            try {
              const data = Object.fromEntries(new FormData(e.currentTarget));
              await api(token ? "reset" : "recovery", { ...data, token });
              if (token) nav("/login");
              else
                M("If this account exists, check your email for a reset link.");
            } catch (x: any) {
              M(x.message);
            } finally {
              B(false);
            }
          }}
        >
          <small className="kicker">ACCOUNT RECOVERY</small>
          <h2>{token ? "Set a new password" : "Reset your password"}</h2>
          <label>
            {token ? "New password" : "Email address"}
            <input
              required
              autoComplete={token ? "new-password" : "email"}
              type={token ? "password" : "email"}
              name={token ? "password" : "email"}
              minLength={token ? 8 : 1}
            />
          </label>
          <button disabled={busy} className="primary">
            {busy
              ? "Please wait…"
              : token
                ? "Update password"
                : "Request reset link"}
            <ArrowRight size={15} />
          </button>
          <p role="status">{msg}</p>
        </form>
      </section>
    </div>
  );
}
