import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ShoppingBag,
  Boxes,
  Sparkles,
  ScanLine,
  ArrowRight,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { fmt, sum, inflow, totals, day } from "./tools";
function Engraving() {
  return (
    <svg
      className="engraving"
      aria-hidden="true"
      viewBox="0 0 350 230"
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.1">
        {Array.from({ length: 45 }, (_, i) => (
          <path
            key={i}
            d={`M ${-40 + i * 4},260 C ${235 + i * 1.4},${170 - i * 2.1} ${24 + i * 3},${105 - i * 2} ${265 + i * 3},${-50 + i * 1.2}`}
          />
        ))}
      </g>
    </svg>
  );
}
function CashTrend({ valid, docs }: any) {
  const history = React.useMemo(() => {
    const days: Record<string, any[]> = {};
    valid.forEach((r: any) => (days[day(r.created)] ??= []).push(r));
    return Object.keys(days)
      .sort()
      .slice(-14)
      .map((k) => totals(days[k], docs).cash);
  }, [valid, docs]);
  if (history.length < 2) return null;
  const min = Math.min(...history, 0),
    max = Math.max(...history, 0);
  const span = max - min || 1;
  const pts = history.map(
    (v: number, i: number) =>
      `${(i * 100) / (history.length - 1)},${32 - ((v - min) / span) * 30}`,
  );
  const line = pts.map((p, i) => (i ? "L" + p : "M" + p)).join(" ");
  const area = `M0,32 ${pts.map((p) => "L" + p).join(" ")} L100,32 Z`;
  return (
    <svg
      className="cashtrend"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill="url(#cashtrendfill)" stroke="none" />
      <path d={line} fill="none" stroke="#bfe6a1" strokeWidth="1.6" />
      <defs>
        <linearGradient id="cashtrendfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe6a1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#bfe6a1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
export function OverviewLead({ current, valid, open, jump, prior, docs }: any) {
  const previous = totals(prior, docs).cash;
  const change = previous
    ? ((current.cash - previous) / Math.abs(previous)) * 100
    : null;
  const up = change === null ? true : change >= 0;
  return (
    <div className="leadgrid">
      <section className="cashpanel">
        <Engraving />
        <div className="cashtop">
          <span>
            <Wallet size={16} />
            Cash position
          </span>
          <small>NGN</small>
        </div>
        <div className="cashfigure">
          <small>Net cash flow</small>
          <strong>{fmt(current.cash)}</strong>
          <span className={"cashpill " + (up ? "up" : "down")}>
            {change === null ? (
              "No prior comparison"
            ) : (
              <>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {(up ? "+" : "") + change.toFixed(1)}% vs prior period
              </>
            )}
          </span>
        </div>
        <CashTrend valid={valid} docs={docs} />
        <div className="cashfoot">
          <span>
            <ArrowDownLeft size={16} />
            Money in{" "}
            <b>{fmt(sum(valid.filter(inflow), (e: any) => e.amount))}</b>
          </span>
          <span>
            <ArrowUpRight size={16} />
            Money out{" "}
            <b>
              {fmt(
                sum(
                  valid.filter((e: any) => !inflow(e)),
                  (e: any) => e.amount,
                ),
              )}
            </b>
          </span>
        </div>
      </section>
      <section className="actionpanel">
        <div className="actionhead">
          <small className="kicker">WORKSPACE TOOLS</small>
          <h3>Quick actions</h3>
        </div>
        <div className="actiontiles">
          {[
            [ShoppingBag, "Record sale", "Sale"],
            [Wallet, "Add expense", "Expense"],
            [Boxes, "Add product", "Product"],
            [Sparkles, "Ask VEVR AI", "AI"],
          ].map(([Icon, label, k]: any) => (
            <button
              key={k}
              onClick={() => (k === "AI" ? jump("AI Assistant") : open(k))}
            >
              <span>
                <Icon size={18} />
              </span>
              {label}
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
export function Signals({ valid, low, unpaid, jump }: any) {
  const rows = [
    [
      Activity,
      "Recorded activity",
      valid.length,
      "Transactions",
      "In this period",
      "neutral",
    ],
    [
      Boxes,
      "Low-stock items",
      low.length,
      "Inventory",
      "Current stock levels",
      low.length ? "warn" : "neutral",
    ],
    [
      Wallet,
      "Unpaid invoices",
      unpaid.length,
      "Invoices & Quotes",
      "Across all dates",
      unpaid.length ? "warn" : "neutral",
    ],
  ] as any;
  return (
    <section className="signalpanel">
      <div className="boxhead">
        <div>
          <small className="kicker">VEVR INTELLIGENCE</small>
          <h3>Business pulse</h3>
        </div>
        <Sparkles size={19} />
      </div>
      <div className="signalrows">
        {rows.map(([Icon, label, count, target, hint, tone]: any) => (
          <button key={label} onClick={() => jump(target)}>
            <span className={"sicon " + (tone === "warn" ? "sicon-warn" : "")}>
              <Icon size={16} />
            </span>
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
            <strong className={tone === "warn" ? "warnfigure" : ""}>
              {count}
            </strong>
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
      <button className="asklink" onClick={() => jump("AI Assistant")}>
        <Sparkles size={16} />
        Ask about your numbers
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
