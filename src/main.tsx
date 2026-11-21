import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { Dialog } from "./Dialog";
import { api } from "./tools";
import Recovery from "./Recovery";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  ChevronDown,
  Check,
  CheckCheck,
  ShieldCheck,
  Mic,
  AudioLines,
  ChartNoAxesCombined,
  Boxes,
  Sparkles,
  Wallet,
  BookOpen,
  Menu,
  X,
  Plus,
  LogOut,
  Eye,
  EyeOff,
  Building2,
  LayoutDashboard,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  LockKeyhole,
  Globe,
  Play,
  Pause,
  Package,
  SlidersHorizontal,
  Layers3,
} from "lucide-react";
import "./style.css";
import "./public.css";
const Workspace = React.lazy(() => import("./Workspace"));
const slides = [
  [
    "Business finance,",
    "brought together.",
    "Record sales, track inventory, and understand your money. One intelligent workspace for the way you do business.",
    "Business overview",
  ],
  [
    "Your inventory,",
    "in focus.",
    "Keep products, prices, and stock in one place. Every product sale updates your inventory automatically.",
    "Inventory management",
  ],
  [
    "Your numbers,",
    "made clearer.",
    "See what came in, what went out, and what is left. Understand your business with records you control.",
    "Financial insights",
  ],
];
const features = [
  [
    AudioLines,
    "Intelligent capture",
    "Turn everyday sales and expenses into organised business records.",
  ],
  [
    Boxes,
    "Inventory control",
    "Keep tabs on your products, pricing, and available stock.",
  ],
  [
    ChartNoAxesCombined,
    "Financial insights",
    "See your income, expenses, and cash flow in one place.",
  ],
];
function Logo() {
  return <img className="logo" src="/logo.png" alt="vevr" />;
}
function App() {
  const page = useLocation().pathname,
    go = useNavigate(),
    [me, user] = useState<any>(null);
  function nav(p: string) {
    go(p);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    if (page !== "/workspace") user(null);
    if (page === "/workspace")
      api("me")
        .then(user)
        .catch(() => nav("/login"));
  }, [page]);
  return page === "/recover" ||
    (page === "/login" && location.hash.startsWith("#reset=")) ? (
    <Recovery nav={nav} />
  ) : page === "/workspace" ? (
    me ? (
      <React.Suspense
        fallback={
          <main className="loading" role="status">
            <img src="/mark.png" alt="Loading workspace" />
          </main>
        }
      >
        <Workspace me={me} nav={nav} Capture={Capture} />
      </React.Suspense>
    ) : (
      <main className="loading">
        <img src="/mark.png" alt="Loading VEVR" />
      </main>
    )
  ) : page === "/signup" || page === "/login" ? (
    <Auth key={page} signup={page === "/signup"} nav={nav} />
  ) : (
    <Welcome nav={nav} />
  );
}
function Welcome({ nav }: any) {
  const reduce = useReducedMotion();
  const [i, S] = useState(0),
    [play, P] = useState(
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [menu, M] = useState(""),
    [detail, D] = useState(-1);
  useEffect(() => {
    if (play) {
      let t = setInterval(() => S((n) => (n + 1) % 3), 7000);
      return () => clearInterval(t);
    }
  }, [play]);
  const slide = slides[i];
  return (
    <div className="publicsite">
      <header>
        <div
          className="wrap top"
          onKeyDown={(e) => {
            if (e.key === "Escape") M("");
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) M("");
          }}
        >
          <Logo />
          <nav>
            <button
              aria-expanded={!!menu}
              onClick={() => M(menu ? "" : "platform")}
            >
              Platform <ChevronDown size={14} />
            </button>
            <a href="#capabilities">Capabilities</a>
            <button onClick={() => D(3)}>Why VEVR?</button>
          </nav>
          <div className="authlinks">
            <button className="login" onClick={() => nav("/login")}>
              Log in
            </button>
            <button className="light" onClick={() => nav("/signup")}>
              Get started <ArrowUpRight size={16} />
            </button>
          </div>
          {menu && (
            <div className="dropdown">
              {slides.map((s, j) => (
                <button
                  key={j}
                  onClick={() => {
                    P(false);
                    S(j);
                    M("");
                  }}
                >
                  {s[3]} <ArrowRight size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <main>
        <section
          className="hero"
          aria-label="Introducing VEVR"
          aria-roledescription="carousel"
        >
          <div className="wrap herogrid">
            <div className="copy">
              <span className="pill">
                <Sparkles size={13} /> BUSINESS INTELLIGENCE SUITE
              </span>
              <motion.div
                key={i}
                initial={reduce ? false : { opacity: 0.92, y: 4 }}
                transition={{ duration: 0.2 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1>
                  {slide[0]}
                  <br />
                  <em>{slide[1]}</em>
                </h1>
                <p>{slide[2]}</p>
              </motion.div>
              <div className="actions">
                <button className="primary" onClick={() => nav("/signup")}>
                  Create an account <ArrowRight size={17} />
                </button>
                <a className="secondary" href="#capabilities">
                  Explore platform <ChevronDown size={16} />
                </a>
              </div>
              <div className="trust">
                <ShieldCheck size={15} /> Private by design <span />{" "}
                <Globe size={15} /> Built for Nigeria
              </div>
            </div>
            <div className="visual">
              <div className="photo">
                <img
                  width="1152"
                  height="928"
                  fetchPriority="high"
                  src="/merchant.jpg"
                  alt="A business owner reviewing her records on a tablet"
                />
              </div>
              <div className="tag">
                <i /> MERCHANT EDITION
              </div>
              <div className="voice">
                <div className="mic">
                  <Mic size={18} />
                </div>
                <div>
                  <small>VEVR INTELLIGENCE</small>
                  <strong>
                    {
                      [
                        "Voice capture",
                        "Inventory control",
                        "Financial insights",
                      ][i]
                    }
                  </strong>
                </div>
                <div className="wave">
                  {Array.from({ length: 14 }, (_, n) => (
                    <b
                      key={n}
                      style={{ height: 6 + Math.abs(Math.sin(n * 1.4)) * 21 }}
                    />
                  ))}
                </div>
              </div>
              <div className="logged">
                <span>
                  <CheckCheck size={18} />
                </span>
                <div>
                  <small>WORKSPACE TOOLS</small>
                  <strong>
                    {["Sales ledger", "Stock tracking", "Business reports"][i]}
                  </strong>
                </div>
              </div>
              <div className="corner">FIG. 0{i + 1} / VEVR STUDIO</div>
            </div>
          </div>
          <div className="wrap controls">
            <div>
              <b>0{i + 1}</b>
              <span className="dash" />
              <small>03</small>
              <span className="divider" />
              {slide[3]}
            </div>
            <div>
              <button
                aria-label={play ? "Pause slideshow" : "Play slideshow"}
                onClick={() => P(!play)}
              >
                {play ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                aria-label="Previous slide"
                onClick={() => {
                  P(false);
                  S((i + 2) % 3);
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                aria-label="Next slide"
                onClick={() => {
                  P(false);
                  S((i + 1) % 3);
                }}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
        <section className="features wrap" id="capabilities">
          <div className="eyebrow">
            <span /> THE PLATFORM
          </div>
          <div className="sectionhead">
            <h2>
              One workspace. <em>Every angle.</em>
            </h2>
            <p>A connected toolkit for your everyday business.</p>
          </div>
          <div className="cards">
            {features.map(([I, title, body]: any, j) => (
              <button key={title} onClick={() => D(j)}>
                <div className="cardtop">
                  <span>
                    <I size={22} />
                  </span>
                  <small>0{j + 1} / CAPABILITY</small>
                </div>
                <h3>
                  {title} <ArrowUpRight size={16} />
                </h3>
                <p>{body}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className="wrap">
        VEVR <span>One business. One clearer picture.</span>
      </footer>
      {detail >= 0 && (
        <Dialog
          title={
            detail === 3
              ? "One clearer picture."
              : (features[detail][1] as string)
          }
          close={() => D(-1)}
        >
          <p>
            {
              [
                "Record a sale or expense and keep its description alongside the amount. Your workspace totals update from saved entries.",
                "Create products with a price and stock count. Record a product sale to update the available quantity in the same transaction.",
                "Track recorded sales, expenses, and net cash flow. Each new business starts with a clean ledger.",
                "VEVR brings your daily business records into a private workspace, so you can understand your money without switching between spreadsheets.",
              ][detail]
            }
          </p>
          <button className="primary" onClick={() => nav("/signup")}>
            Create an account <ArrowRight size={16} />
          </button>
        </Dialog>
      )}
    </div>
  );
}
function Auth({ signup, nav }: any) {
  const [err, E] = useState(""),
    [busy, B] = useState(false),
    [show, S] = useState(false);
  return (
    <div className="authpage">
      <aside>
        <Logo />
        <div className="eyebrow">VEVR WORKSPACE</div>
        <h1>
          One business.
          <br />
          <em>One clearer picture.</em>
        </h1>
        <p>Business finance, brought together.</p>
      </aside>
      <section>
        <button className="back" onClick={() => nav("/")}>
          <ArrowLeft size={16} /> Back to VEVR
        </button>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            B(true);
            E("");
            try {
              await api(
                signup ? "signup" : "login",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
              nav("/workspace");
            } catch (x: any) {
              E(x.message);
            } finally {
              B(false);
            }
          }}
        >
          <div className="eyebrow">YOUR BUSINESS WORKSPACE</div>
          <h2>{signup ? "Create your account" : "Welcome back"}</h2>
          <p>
            {signup
              ? "Start with a clean slate for your business."
              : "Log in to continue to your workspace."}
          </p>
          {(signup
            ? [
                ["Full name", "name"],
                ["Business name", "business"],
              ]
            : []
          )
            .concat([
              ["Email address", "email"],
              ["Password", "password"],
            ])
            .map(([label, n]) => (
              <label key={n}>
                {label}
                <div className="inputbox">
                  <input
                    autoComplete={
                      (
                        {
                          password: signup
                            ? "new-password"
                            : "current-password",
                          name: "name",
                          business: "organization",
                          email: "email",
                        } as any
                      )[n]
                    }
                    name={n}
                    type={
                      n === "password" && !show
                        ? "password"
                        : n === "email"
                          ? "email"
                          : "text"
                    }
                    required
                    minLength={n === "password" ? 8 : 1}
                    placeholder={
                      n === "password" ? "At least 8 characters" : label
                    }
                  />
                  {n === "password" && (
                    <button
                      type="button"
                      aria-pressed={show}
                      aria-label="Toggle password visibility"
                      onClick={() => S(!show)}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  )}
                </div>
              </label>
            ))}
          {signup && (
            <details className="onboardextra">
              <summary>Business details (optional)</summary>
              <label>
                Business category
                <select name="category">
                  {[
                    "General",
                    "Retail",
                    "Wholesale",
                    "Services",
                    "Food & beverage",
                    "Manufacturing",
                    "Agriculture",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Business type
                <select name="business_type">
                  {[
                    "Sole proprietorship",
                    "Partnership",
                    "Limited company",
                    "Other",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Contact number
                <input type="tel" name="contact" />
              </label>
              <small>Workspace currency: NGN (Nigerian naira).</small>
            </details>
          )}
          {!signup && (
            <button
              type="button"
              className="link"
              onClick={() => nav("/recover")}
            >
              Forgot password?
            </button>
          )}
          {err && <p role="alert">{err}</p>}
          <button disabled={busy} className="primary">
            {busy ? "Please wait…" : signup ? "Create account" : "Log in"}{" "}
            <ArrowRight size={16} />
          </button>
          <p>
            {signup ? "Already have an account?" : "New to VEVR?"}{" "}
            <button
              type="button"
              className="link"
              onClick={() => nav(signup ? "/login" : "/signup")}
            >
              {signup ? "Log in" : "Create account"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
const naira = (n: number) =>
  "₦" + (n / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
function Capture({ apply, products = [] }: any) {
  const [text, U] = useState(""),
    [status, H] = useState("");
  const ref = React.useRef<any>(null);
  useEffect(() => () => ref.current?.abort(), []);
  return (
    <div className="capture">
      <div className="eyebrow">
        <AudioLines size={15} /> QUICK CAPTURE
      </div>
      <h3>Record it in your own words</h3>
      <p>
        Type or dictate a sale, an expense, or “Restock 5 units of” followed by
        a saved product name. Review before saving.
      </p>
      <div className="captureline">
        <input
          value={text}
          onChange={(e) => U(e.target.value)}
          aria-label="Describe a sale, expense or stock adjustment"
          placeholder="Describe a sale or expense…"
        />
        <button
          aria-label="Dictate entry"
          onClick={() => {
            const w: any = window;
            const R = w.SpeechRecognition || w.webkitSpeechRecognition;
            if (!R)
              return H(
                "Dictation is unavailable in this browser. Type your entry instead.",
              );
            ref.current?.abort();
            const r = new R();
            ref.current = r;
            r.lang = "en-NG";
            r.onresult = (e: any) => {
              U(e.results[0][0].transcript);
              H("Review your dictation, then select Prepare.");
            };
            r.onerror = () =>
              H("Microphone unavailable. Type your entry instead.");
            try {
              r.start();
              H("Listening…");
            } catch {
              H("Unable to start dictation.");
            }
          }}
        >
          <Mic size={18} />
        </button>
        <button
          className="primary"
          onClick={() => {
            const stock = text
              .trim()
              .match(/^(?:add|restock)\s+(\d+)\s+(?:units?\s+of\s+)?(.+)$/i);
            if (stock) {
              const p = products.find(
                (p: any) =>
                  p.name.toLowerCase() === stock[2].trim().toLowerCase(),
              );
              if (!p)
                return H(
                  "Use the exact name of a saved product for stock adjustments.",
                );
              return apply("Adjust stock", {
                product: p.id,
                change: Number(stock[1]),
                reason: "Stock received",
              });
            }
            const sold = text
              .trim()
              .match(/^sold\s+(\d+)\s+(.+?)(?:\s+for\s+.*)?$/i);
            if (sold) {
              const p = products.find((p: any) =>
                [p.name.toLowerCase(), p.name.toLowerCase() + "s"].includes(
                  sold[2].trim().toLowerCase(),
                ),
              );
              if (p)
                return apply("Sale", { product: p.id, qty: Number(sold[1]) });
            }
            const k = /\b(sold|sale|received)\b/i.test(text)
              ? "Sale"
              : /\b(spent|paid|expense|bought)\b/i.test(text)
                ? "Expense"
                : "";
            const m =
              text.match(
                /(?:₦|NGN|naira|for|spent|paid|received)\s*([\d,]+(?:\.\d{1,2})?)/i,
              ) || text.match(/([\d,]+(?:\.\d{1,2})?)\s*naira/i);
            if (!k || !m)
              return H("Include sold or spent and an amount, such as ₦500.");
            apply(k, text, m[1].replace(/,/g, ""));
          }}
        >
          Prepare
        </button>
      </div>
      <small role="status">
        {status ||
          "Rule-based capture · Dictation uses your browser’s speech service."}
      </small>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </BrowserRouter>,
);
