import React, { useState } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ChartNoAxesCombined,
  ArrowRight,
  ChartLine,
} from "lucide-react";
import { totals, fmt, day, inflow, sum } from "./tools";
function Sparkline({ values, label }: any) {
  if (values.length < 2) return null;
  const min = Math.min(...values),
    max = Math.max(...values);
  const points = values
    .map(
      (v: number, i: number) =>
        `${2 + (i * 76) / (values.length - 1)},${26 - ((v - min) * 22) / (max - min || 1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 80 30"
      role="img"
      aria-label={label}
      className="sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Cards({ rows, docs, previous, compact = false }: any) {
  const t = totals(rows, docs),
    p = totals(previous || [], docs);
  const history = React.useMemo(() => {
    const days: Record<string, any[]> = {};
    rows
      .filter((r: any) => !r.reversed)
      .forEach((r: any) => (days[day(r.created)] ??= []).push(r));
    return Object.keys(days)
      .sort()
      .slice(-30)
      .map((k) => totals(days[k], docs));
  }, [rows, docs]);
  return (
    <div className={"metricgrid " + (compact ? "metricstrip" : "")}>
      {[
        ["Total sales", "sales", ArrowDownLeft],
        ["Total expenses", "expenses", ArrowUpRight],
        ["Operating profit", "profit", ChartNoAxesCombined],
        ["Net cash flow", "cash", Wallet],
      ]
        .filter(([, k]) => !(compact && k === "cash"))
        .map(([name, key, I]: any, idx: number) => {
          const change = p[key]
            ? (100 * (t[key] - p[key])) / Math.abs(p[key])
            : null;
          const positive = change === null || change === 0
            ? null
            : change > 0 === (key !== "expenses");
          return (
            <article
              key={key}
              className={
                !compact && idx === 2 ? "metricfeatured tone-" + key : "tone-" + key
              }
            >
              <div>
                <span>
                  <I size={15} />
                  {name}
                </span>
                <Sparkline
                  label={name + " over the last recorded days in this period"}
                  values={history.map((v) => v[key])}
                />
              </div>
              <strong>{fmt(t[key])}</strong>
              <small className={positive === null ? "" : positive ? "up" : "down"}>
                {change === null
                  ? "No prior comparison"
                  : (change > 0 ? "+" : "") +
                    change.toFixed(1) +
                    "% vs prior period"}
              </small>
            </article>
          );
        })}
    </div>
  );
}
function ChartTip({ active, payload, label, series }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="charttip">
      <small>{label}</small>
      {series.map(([key, name, color]: any) => {
        const row = payload.find((p: any) => p.dataKey === key);
        if (!row) return null;
        return (
          <span key={key}>
            <i style={{ background: color }} />
            {name}
            <b>{fmt(Number(row.value) * 100)}</b>
          </span>
        );
      })}
    </div>
  );
}
export function Chart({ rows, docs, start, end }: any) {
  const [tab, T] = useState("Revenue"),
    [unit, U] = useState("Daily");
  const series =
    tab === "Revenue"
      ? [
          ["sales", "Sales", "#0c784d"],
          ["expenses", "Expenses", "#c79348"],
          ["profit", "Profit", "#69986b"],
        ]
      : [
          ["incoming", "Money in", "#0c784d"],
          ["outgoing", "Money out", "#c79348"],
          ["cash", "Net", "#69986b"],
        ];
  const data = React.useMemo(() => {
    let b: any = {};
    function bucket(date: string) {
      let d = new Date(date + "T00:00:00Z");
      if (unit === "Weekly")
        d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return day(d).slice(0, unit === "Monthly" ? 7 : 10);
    }
    if (start && end && start <= end) {
      let d = new Date(
        Math.max(+new Date(start), +new Date(end) - 729 * 86400000),
      );
      for (
        let n = 0;
        n < 730 && day(d) <= end;
        n++, d.setUTCDate(d.getUTCDate() + 1)
      )
        b[bucket(day(d))] = [];
    }
    rows
      .filter((e: any) => !e.reversed)
      .forEach((e: any) => (b[bucket(day(e.created))] ??= []).push(e));
    return Object.keys(b)
      .sort()
      .map((k) => {
        const t = totals(b[k], docs);
        return {
          date: k,
          ...Object.fromEntries(
            Object.entries(t).map(([a, v]) => [a, Number(v) / 100]),
          ),
          incoming: sum(b[k].filter(inflow), (e) => e.amount) / 100,
          outgoing:
            sum(
              b[k].filter((e: any) => !inflow(e)),
              (e) => e.amount,
            ) / 100,
        };
      });
  }, [unit, rows, docs, start, end]);
  const periodTotals = React.useMemo(() => {
    const t = totals(
      rows.filter((e: any) => !e.reversed),
      docs,
    );
    return Object.fromEntries(
      series.map(([key]: any) => [
        key,
        key === "incoming"
          ? sum(rows.filter(inflow), (e: any) => e.amount)
          : key === "outgoing"
            ? sum(
                rows.filter((e: any) => !inflow(e)),
                (e: any) => e.amount,
              )
            : (t as any)[key],
      ]),
    );
  }, [rows, docs, tab]);
  return (
    <section
      className="surface chartpanel"
      aria-label={
        tab + " chart in Nigerian naira, " + unit + ", " + start + " to " + end
      }
    >
      <div className="boxhead">
        <div>
          <small className="kicker">PERFORMANCE</small>
          <h3>Financial activity</h3>
        </div>
        <select
          aria-label="Chart interval"
          value={unit}
          onChange={(e) => U(e.target.value)}
        >
          {["Daily", "Weekly", "Monthly"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="segmented">
        {["Revenue", "Cash flow"].map((x) => (
          <button
            key={x}
            aria-pressed={tab === x}
            className={tab === x ? "sel" : ""}
            onClick={() => T(x)}
          >
            {x}
          </button>
        ))}
      </div>
      {rows.some((e: any) => !e.reversed) ? (
        <ResponsiveContainer height={215} width="100%">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
          >
            <defs>
              {series.map(([key, , color]) => (
                <linearGradient
                  key={key}
                  id={"fill-" + key}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              stroke="#e8eee7"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={25}
              axisLine={{ stroke: "#e2e9e1" }}
              tickLine={false}
            />
            <YAxis
              width={45}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                Intl.NumberFormat("en", { notation: "compact" }).format(v)
              }
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTip series={series} />}
              cursor={{ stroke: "#759980", strokeDasharray: "3 4" }}
            />
            {series.map(([key, name, color]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={name}
                stroke={color}
                strokeWidth={2}
                fill={`url(#fill-${key})`}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="chartempty">
          <ChartLine />
          <b>No activity in this period</b>
          <small>Record a sale or expense, or choose another period.</small>
        </div>
      )}
      <div className="legend">
        {series.map(([key, s, c]) => (
          <span key={s}>
            <i style={{ background: c }} />
            {s}
            <b>{fmt((periodTotals as any)[key] || 0)}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
