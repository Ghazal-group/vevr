import { WorkspaceNav, destinations, pageIcon } from "./WorkspaceNav";
import { OverviewLead, Signals } from "./OverviewLead";
import { Attachment } from "./Files";
import { Button } from "./components/ui/button";
import React, { useState, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  ShoppingBag,
  ArrowLeftRight,
  Wallet,
  Boxes,
  ScanLine,
  UsersRound,
  Files,
  Landmark,
  ChartColumn,
  Calculator,
  Activity,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  ChevronDown,
  ChevronsUpDown,
  ArrowRight,
  Plus,
  LogOut,
  Menu,
  X,
  CalendarDays,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Printer,
  Check,
  Building2,
  Clock3,
  ClipboardList,
} from "lucide-react";
import Editor, { Dialog } from "./Editor";
import { Brief, Grid, Assistant, POS, Reports, estimated } from "./Modules";
import { Cards, Chart } from "./Analytics";
import { api, day, fmt, totals, sum, pdf, inflow } from "./tools";
import "./workspace.css";
const names = destinations.map((v: any) => v[1]);
function sectionFromHash() {
  try {
    const s = decodeURIComponent(location.hash.slice(1));
    return names.includes(s) ? s : "Overview";
  } catch {
    return "Overview";
  }
}
const subs: any = {
  Overview: "Your cash flow, sales and daily operations in one place.",
  "AI Assistant": "Answers grounded in your business records.",
  Sales: "Record income, review receipts, and manage sales.",
  Transactions: "A single ledger for every movement of money.",
  Expenses: "Understand where your business money goes.",
  Inventory: "Manage products, stock levels, and purchase costs.",
  "Point of Sale": "Build a basket and record a completed payment.",
  Customers: "Keep customer details and purchase history together.",
  "Invoices & Quotes": "Create documents, accept quotes, and track payments.",
  "Banking & Payments":
    "Track and reconcile your recorded cash and bank activity.",
  Reports: "Explore and export your business performance.",
  "Tax Centre": "Track estimated sales tax and recorded payments.",
  "Financial Health": "Understand the strengths and gaps in your records.",
  Settings: "Manage your business profile and review the activity trail.",
};
const primary: any = {
  Sales: "Sale",
  Expenses: "Expense",
  Inventory: "Product",
  Customers: "Customer",
  "Invoices & Quotes": "Invoice",
  "Banking & Payments": "Account",
  "Tax Centre": "Tax payment",
  Settings: "Business settings",
};
const calcDate = (days: number) => day(Date.now() - days * 86400000);
const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
export default function Workspace(props: any) {
  return (
    <QueryClientProvider client={qc}>
      <Shell {...props} />
    </QueryClientProvider>
  );
}
function Shell({ me, nav, Capture }: any) {
  const [biz, B] = useState(me.businesses[0].id),
    [bizs, BS] = useState(me.businesses),
    [name, N] = useState(me.name),
    [mobile, Mob] = useState(false),
    [section, S] = useState(sectionFromHash);
  const [popup, Pop] = useState(""),
    [toast, Toast] = useState("");
  const query = useQuery({
    queryKey: ["state", me.id, biz],
    queryFn: () => api("b/" + biz + "/state"),
  });
  useEffect(() => {
    const fn = () => {
      const v = sectionFromHash();
      S(names.includes(v) ? v : "Overview");
      Pop("");
      Mob(false);
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  function jump(p: string) {
    S(p);
    location.hash = encodeURIComponent(p);
    Pop("");
    Mob(false);
  }
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => Toast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const [editor, Edit] = useState<any>(null);
  const open = (mode: string, seed: any = {}) => {
    Edit({ mode, seed });
    Pop("");
  };
  const state = query.data;
  const client = useQueryClient();
  const pendingKey = React.useRef<any>(null);
  async function save(op: string, d: any) {
    let r;
    if (op === "business") {
      r = await api("business", d);
      BS([...bizs, { id: r[0].id, name: d.name }]);
      B(r[0].id);
      jump("Overview");
    } else {
      const sig = JSON.stringify([biz, op, d]);
      if (pendingKey.current?.sig !== sig)
        pendingKey.current = { sig, key: crypto.randomUUID() };
      r = await api("b/" + biz + "/action/" + op, {
        ...d,
        _key: pendingKey.current.key,
      });
      pendingKey.current = null;
      await client.invalidateQueries({ queryKey: ["state", me.id, biz] });
      if (op === "settings")
        BS(bizs.map((b: any) => (b.id === biz ? { ...b, name: d.name } : b)));
      if (op === "profile") N(d.name);
    }
    Toast(
      (
        {
          checkout: "Sale recorded",
          pay: "Invoice payment recorded",
          reverse: "Entry reversed",
          adjust: "Stock adjusted",
          reconcile: "Reconciliation updated",
          business: "Business created",
          correct: "Expense corrected",
        } as any
      )[op] || "Changes saved",
    );
    return r;
  }
  async function logout() {
    await api("logout", {});
    client.clear();
    nav("/");
  }
  return (
    <div className="desk">
      <WorkspaceNav
        businesses={bizs}
        biz={biz}
        change={(id: number) => {
          B(id);
          Edit(null);
          Pop("");
          Mob(false);
        }}
        name={name}
        section={section}
        jump={jump}
        pop={Pop}
        directory={mobile}
        showDirectory={Mob}
        alerts={
          state
            ? state.products.filter((p: any) => p.stock <= p.minimum).length +
              state.docs.filter(
                (d: any) => d.status === "Unpaid" && day(d.due) < day(),
              ).length
            : 0
        }
      />
      <div className="stage">
        {query.isPending ? (
          <div className="loadstage" role="status">
            <span>Loading workspace…</span>
            <i />
            <i />
            <i />
          </div>
        ) : query.isError ? (
          <section className="surface">
            <h3>Workspace could not load</h3>
            <button onClick={() => query.refetch()}>Try again</button>
          </section>
        ) : (
          <Content
            key={biz}
            {...{ s: state, section, jump, name, open, save, Capture }}
          />
        )}
      </div>
      {editor && state && (
        <Editor
          {...editor}
          state={state}
          save={save}
          close={() => Edit(null)}
        />
      )}{" "}
      {popup && (
        <Dialog title={popup} close={() => Pop("")}>
          {popup === "Profile" ? (
            <>
              <p>
                {name}
                <br />
                {me.email}
              </p>
              <div className="stack">
                <button onClick={() => open("Profile", { name })}>
                  Edit display name
                </button>
                <button onClick={() => open("New business")}>
                  Create another business
                </button>
                <button onClick={logout}>Log out</button>
              </div>
            </>
          ) : popup === "Search" ? (
            <Finder state={state} jump={jump} />
          ) : (
            <div>
              {state?.products
                .filter((p: any) => p.stock <= p.minimum)
                .map((p: any) => (
                  <div className="notice" key={p.id}>
                    <Boxes size={16} />
                    {p.name}: {p.stock} units left
                  </div>
                ))}
              {state?.docs
                .filter((d: any) => d.status === "Unpaid" && day(d.due) < day())
                .map((d: any) => (
                  <div className="notice" key={d.id}>
                    <Clock3 size={16} /> Invoice #{d.id} is overdue
                  </div>
                ))}
              {!state?.products.some((p: any) => p.stock <= p.minimum) &&
                !state?.docs.some(
                  (d: any) => d.status === "Unpaid" && day(d.due) < day(),
                ) && <p>No stock or overdue invoice alerts.</p>}
            </div>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Finder({ state, jump }: any) {
  const [q, Q] = useState("");
  const opts = [
    ...names.map((n: string) => [n, n]),
    ...(state?.products || []).map((p: any) => [p.name, "Inventory"]),
    ...(state?.customers || []).map((p: any) => [p.name, "Customers"]),
  ]
    .filter(([n]) => n.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 12);
  return (
    <>
      <input
        aria-label="Search pages, products and customers"
        autoFocus
        placeholder="Search pages, products, customers…"
        value={q}
        onChange={(e) => Q(e.target.value)}
      />
      <div className="stack">
        {opts.map(([n, k], i) => (
          <button key={i} onClick={() => jump(k)}>
            {n}
            <small>{k}</small>
          </button>
        ))}
        {!opts.length && <p>No matches</p>}
      </div>
    </>
  );
}
function Content({ s, section, jump, name, open, save, Capture }: any) {
  const reduce = useReducedMotion();
  const cache = useQueryClient();
  const refreshMedia = () =>
    cache.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === "state" && q.queryKey[2] === s.business.id,
    });
  const [range, R] = useState("Last 30 days"),
    [start, A] = useState(calcDate(29)),
    [end, Z] = useState(day()),
    [text, T] = useState(""),
    [info, I] = useState<any>(null),
    [filter, F] = useState("All"),
    [err, E] = useState("");
  useEffect(() => {
    T("");
    I(null);
    F("All");
    E("");
  }, [section]);
  function dates(r: string) {
    R(r);
    if (r !== "Custom") {
      A(
        r === "All dates"
          ? "1970-01-01"
          : calcDate(r === "Today" ? 0 : parseInt(r.slice(5)) - 1),
      );
      Z(day());
    }
  }
  const rows = React.useMemo(
      () =>
        s.entries.filter(
          (e: any) => day(e.created) >= start && day(e.created) <= end,
        ),
      [s.entries, start, end],
    ),
    valid = rows.filter((e: any) => !e.reversed),
    find = (v: any) => String(v).toLowerCase().includes(text.toLowerCase()),
    current = totals(rows, s.docs);
  const from = +new Date(start),
    duration = +new Date(end) - from + 86400000;
  const prior = s.entries.filter(
    (e: any) =>
      +new Date(e.created) >= from - duration && +new Date(e.created) < from,
  );
  const customer = (id: any) =>
    s.customers.find((c: any) => c.id === id)?.name || "Walk-in customer";
  const fieldAct = (label: string, fn: any) => (
    <button className="mini" onClick={fn}>
      {label}
    </button>
  );
  const btn = (mode: string, label?: string, seed: any = {}) =>
    fieldAct(label || mode, () => open(mode, seed));
  const hasDate = [
    "Overview",
    "Sales",
    "Expenses",
    "Transactions",
    "Reports",
    "Tax Centre",
    "Financial Health",
    "Banking & Payments",
  ].includes(section);
  const withSearch = [
    "Sales",
    "Expenses",
    "Transactions",
    "Inventory",
    "Point of Sale",
    "Customers",
    "Invoices & Quotes",
    "Banking & Payments",
  ].includes(section);
  const tax = estimated(s, valid),
    taxpaid = sum(
      valid.filter((e: any) => e.kind === "Tax payment"),
      (e) => e.amount,
    ),
    unpaid = s.docs.filter(
      (d: any) => d.kind === "Invoice" && d.status === "Unpaid",
    );
  function ledger(a: any[]) {
    return (
      <Grid
        empty={
          text || filter !== "All"
            ? "No matching records"
            : section === "Expenses"
              ? "No expenses in this period"
              : section === "Sales"
                ? "No sales in this period"
                : "No activity in this period"
        }
        hint={
          text || filter !== "All"
            ? "Try a different search or category."
            : "Record a transaction or choose a wider reporting period."
        }
        heads={["Record", "Date", "Type", "Amount", "Status", ""]}
        rows={a.map((e) => [
          e.description,
          day(e.created),
          e.kind,
          fmt(e.amount),
          <span className={"badge " + (e.reversed ? "muted" : "")}>
            {e.reversed ? "Reversed" : e.reconciled ? "Reconciled" : "Recorded"}
          </span>,
          fieldAct("View", () => I({ entry: e })),
        ])}
      />
    );
  }
  function accountBal(a: any) {
    return (
      Number(a.opening) +
      sum(
        s.entries.filter((e: any) => e.account === a.id && !e.reversed),
        (e) => (inflow(e) ? Number(e.amount) : -Number(e.amount)),
      )
    );
  }
  const dueStatus = (d: any) =>
    d.status === "Unpaid" && day(d.due) < day() ? "Overdue" : d.status;
  const Icon = pageIcon(section);
  const low = s.products.filter((p: any) => p.stock <= p.minimum);
  return (
    <motion.main
      transition={{ duration: 0.16 }}
      key={section}
      className={
        "canvas " + (section === "Overview" ? "overviewcanvas" : "modulecanvas")
      }
      id="workspace-content"
      tabIndex={-1}
      initial={reduce ? false : { opacity: 0.96, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="workheading">
        <div>
          <small className="kicker">
            <span className="dot" /> {s.business.name}{" "}
            <span className="eyediv">/</span>{" "}
            {section === "Overview"
              ? "WORKSPACE OVERVIEW"
              : "BUSINESS WORKSPACE"}
          </small>
          <h1>
            {section !== "Overview" && (
              <span className="moduleicon">
                <Icon size={23} />
              </span>
            )}
            {section === "Overview"
              ? `Welcome, ${name.split(" ")[0]}`
              : section}
          </h1>
          <p>{subs[section]}</p>
        </div>
        {primary[section] && (
          <button
            className="primary"
            onClick={() =>
              open(primary[section], section === "Settings" ? s.business : {})
            }
          >
            <Plus size={16} />
            {
              (
                {
                  Sales: "Record sale",
                  Expenses: "Add expense",
                  Inventory: "Add product",
                  Customers: "Add customer",
                  "Invoices & Quotes": "Create invoice",
                  "Banking & Payments": "Add account",
                  "Tax Centre": "Record payment",
                  Settings: "Edit business",
                } as any
              )[section]
            }
          </button>
        )}
      </div>
      {(withSearch || hasDate) && (
        <div className="toolbar">
          {section === "Overview" && (
            <span className="periodlabel">
              <CalendarDays size={15} /> Reporting period
            </span>
          )}
          {withSearch && (
            <div className="searchfield">
              <Search size={15} />
              <input
                aria-label="Search records"
                accessKey="s"
                placeholder={
                  "Search " +
                  (section === "Point of Sale"
                    ? "products"
                    : section.toLowerCase()) +
                  "…"
                }
                value={text}
                onChange={(e) => T(e.target.value)}
              />
            </div>
          )}
          {hasDate && (
            <div className="datefield">
              <CalendarDays size={15} />
              <select
                aria-label="Date range"
                value={range}
                onChange={(e) => dates(e.target.value)}
              >
                {[
                  "Today",
                  "Last 7 days",
                  "Last 30 days",
                  "Last 90 days",
                  "All dates",
                  "Custom",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          )}
          {hasDate && range === "Custom" && (
            <>
              <input
                aria-label="From date"
                type="date"
                max={end}
                value={start}
                onChange={(e) => e.target.value && A(e.target.value)}
              />
              <input
                aria-label="To date"
                type="date"
                min={start}
                value={end}
                onChange={(e) => e.target.value && Z(e.target.value)}
              />
            </>
          )}
          {section === "Inventory" && btn("Adjust stock")}
          {section === "Invoices & Quotes" && btn("Quote", "Create quote")}
          {section === "Banking & Payments" && (
            <>
              {btn("Money in")}
              {btn("Money out")}
            </>
          )}
        </div>
      )}
      {section === "Overview" && (
        <>
          <OverviewLead
            {...{ current, valid, open, jump, prior, docs: s.docs }}
          />
          <Cards rows={rows} docs={s.docs} previous={prior} compact />
          <div className="dashboardpair">
            <Chart rows={rows} docs={s.docs} start={start} end={end} />
            <Signals {...{ valid, low, unpaid, jump }} />
          </div>
          <Capture
            products={s.products}
            apply={(mode: string, description: any, amount: string) =>
              open(
                mode,
                typeof description === "object"
                  ? description
                  : { description, amount },
              )
            }
          />
          <section className="surface">
            <div className="boxhead">
              <h3>Recent transactions</h3>
              {fieldAct("View ledger", () => jump("Transactions"))}
            </div>
            {ledger(rows.slice(0, 5))}
          </section>
        </>
      )}
      {section === "AI Assistant" && <Assistant bid={s.business.id} />}{" "}
      {section === "Point of Sale" && <POS {...{ s, save, find, open }} />}
      {["Sales", "Expenses", "Transactions"].includes(section) && (
        <section className="surface">
          <div className="boxhead">
            <h3>
              {section === "Transactions"
                ? "Business ledger"
                : section + " history"}
            </h3>
            <select
              aria-label="Category filter"
              value={filter}
              onChange={(e) => F(e.target.value)}
            >
              {["All", ...new Set(rows.map((e: any) => e.category))].map(
                (v: any) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </div>
          {ledger(
            rows.filter(
              (e: any) =>
                (section === "Sales"
                  ? e.kind === "Sale"
                  : section === "Expenses"
                    ? e.kind === "Expense"
                    : true) &&
                find(e.description + " " + e.kind) &&
                (filter === "All" || e.category === filter),
            ),
          )}
        </section>
      )}
      {section === "Inventory" && (
        <>
          <Brief
            items={[
              ["Products", s.products.length],
              [
                "Inventory at cost",
                fmt(sum(s.products, (p) => p.cost * p.stock)),
              ],
              ["Low-stock products", low.length],
            ]}
          />
          <section className="surface">
            <div className="boxhead">
              <h3>Product directory</h3>
              <select
                aria-label="Inventory filter"
                value={filter}
                onChange={(e) => F(e.target.value)}
              >
                <option>All</option>
                <option>Low stock</option>
              </select>
            </div>
            <Grid
              empty="No matching products"
              hint="Add a product or adjust your inventory filters."
              heads={["Product", "SKU", "Available", "Selling price", ""]}
              rows={s.products
                .filter(
                  (p: any) =>
                    find(p.name + " " + p.sku + " " + p.category) &&
                    (filter === "All" || p.stock <= p.minimum),
                )
                .map((p: any) => [
                  p.name,
                  p.sku || "—",
                  <span
                    className={
                      "badge " +
                      (p.stock === 0
                        ? "danger"
                        : p.stock <= p.minimum
                          ? "warn"
                          : "")
                    }
                  >
                    {p.stock} ·{" "}
                    {p.stock === 0
                      ? "Out of stock"
                      : p.stock <= p.minimum
                        ? "Low stock"
                        : "In stock"}
                  </span>,
                  fmt(p.price),
                  fieldAct("View", () => I({ product: p })),
                ])}
            />
          </section>
          <section className="surface">
            <h3>Stock movements</h3>
            <Grid
              empty="No stock movements"
              hint="Opening stock, adjustments and product sales appear here."
              heads={["Product", "Change", "Reason", "Date"]}
              rows={s.moves.map((m: any) => [
                s.products.find((p: any) => p.id === m.product)?.name,
                m.qty,
                m.reason,
                day(m.created),
              ])}
            />
          </section>
        </>
      )}
      {section === "Customers" && (
        <section className="surface">
          <h3>Customer directory</h3>
          <Grid
            empty="No customers to show"
            hint="Add a customer to track purchases, invoices and balances."
            heads={["Name", "Contact", "Total spending", "Outstanding", ""]}
            rows={s.customers
              .filter((c: any) => find(c.name + " " + c.email + " " + c.phone))
              .map((c: any) => [
                c.name,
                c.email || c.phone || "—",
                fmt(
                  sum(
                    s.entries.filter(
                      (e: any) =>
                        e.kind === "Sale" && !e.reversed && e.customer === c.id,
                    ),
                    (e) => e.amount,
                  ),
                ),
                fmt(
                  sum(
                    unpaid.filter((e: any) => e.customer === c.id),
                    (e) => e.total,
                  ),
                ),
                fieldAct("View", () => I({ customer: c })),
              ])}
          />
        </section>
      )}
      {section === "Invoices & Quotes" && (
        <section className="surface">
          <div className="boxhead">
            <h3>Documents</h3>
            <select
              aria-label="Document status"
              value={filter}
              onChange={(e) => F(e.target.value)}
            >
              {["All", "Open", "Converted", "Paid", "Unpaid", "Overdue"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </div>
          <Grid
            empty="No documents to show"
            hint="Create an invoice or quote for a customer, or adjust your filters."
            heads={["Document", "Customer", "Due", "Status", "Total", ""]}
            rows={s.docs
              .filter(
                (d: any) =>
                  find(d.kind + " " + d.id + " " + customer(d.customer)) &&
                  (filter === "All" || filter === dueStatus(d)),
              )
              .map((d: any) => [
                d.kind + " #" + d.id,
                customer(d.customer),
                day(d.due),
                <span
                  className={
                    "badge " +
                    (dueStatus(d) === "Overdue"
                      ? "danger"
                      : d.status === "Unpaid"
                        ? "warn"
                        : "")
                  }
                >
                  {dueStatus(d)}
                </span>,
                fmt(d.total),
                fieldAct("View", () => I({ doc: d })),
              ])}
          />
        </section>
      )}
      {section === "Banking & Payments" && (
        <>
          <div className="infoflag">
            <ShieldCheck size={16} />
            Bookkeeping accounts only. No live bank feeds or money transfers.
          </div>
          <section className="surface">
            <h3>Financial accounts</h3>
            <Grid
              empty="No accounts to show"
              hint="Register a cash or bank account to start tracking activity."
              heads={["Account", "Type", "Opening balance", "Current balance"]}
              rows={s.accounts
                .filter((a: any) => find(a.name))
                .map((a: any) => [
                  a.name,
                  a.type,
                  fmt(a.opening),
                  fmt(accountBal(a)),
                ])}
            />
          </section>
          <section className="surface">
            <h3>Account activity</h3>
            {ledger(rows.filter((e: any) => e.account && find(e.description)))}
          </section>
        </>
      )}
      {section === "Reports" && <Reports s={s} rows={rows} />}
      {section === "Tax Centre" && (
        <>
          <div className="infoflag">
            <Calculator size={16} />
            Planning estimates only. Rates are configured by you, not supplied
            as Nigerian tax law.
          </div>
          <Brief
            items={[
              ["Estimated sales tax", fmt(tax)],
              ["Payments recorded", fmt(taxpaid)],
              ["Estimate less payments", fmt(tax - taxpaid)],
            ]}
          />
          <section className="surface">
            <div className="boxhead">
              <div>
                <small className="kicker">CONFIGURATION</small>
                <h3>Sales tax estimate · {s.business.taxrate}%</h3>
              </div>
              {btn("Business settings", "Configure rate", s.business)}
            </div>
            <p>
              For taxable sales, the estimate applies the rate saved at entry
              time. Paid invoices contribute their explicit tax amount. This is
              not a tax filing or a calculation of all business taxes.
            </p>
          </section>
          <section className="surface">
            <h3>Tax records</h3>
            {ledger(
              rows.filter(
                (e: any) => e.taxable || e.document || e.kind === "Tax payment",
              ),
            )}
          </section>
        </>
      )}
      {section === "Financial Health" && (
        <>
          <div className="infoflag">
            <Activity size={16} />
            Bookkeeping indicators, not a credit score, loan offer, or lending
            decision.
          </div>
          <Cards rows={rows} docs={s.docs} previous={prior} />
          <section className="surface">
            <h3>Business indicators</h3>
            <Grid
              heads={["Indicator", "Result", "What it means"]}
              rows={[
                [
                  "Operating margin",
                  current.sales
                    ? ((100 * current.profit) / current.sales).toFixed(1) + "%"
                    : "Not enough data",
                  "Operating profit divided by recorded revenue.",
                ],
                [
                  "Expense ratio",
                  current.sales
                    ? ((100 * current.expenses) / current.sales).toFixed(1) +
                      "%"
                    : "Not enough data",
                  "Operating expenses as a share of sales.",
                ],
                [
                  "Outstanding invoices",
                  fmt(sum(unpaid, (d) => d.total)),
                  "Unpaid invoice balances across all dates.",
                ],
                [
                  "Stock alerts",
                  low.length,
                  low.length
                    ? "Review low-stock products before checkout."
                    : "No products below their configured threshold.",
                ],
                [
                  "Cash flow",
                  !valid.length
                    ? "No records"
                    : current.cash >= 0
                      ? "Non-negative"
                      : "Negative",
                  current.cash < 0
                    ? "Review outgoing payments and unpaid invoices."
                    : "Recorded inflows less outflows.",
                ],
              ]}
            />
          </section>
        </>
      )}
      {section === "Financial Health" && <Funding s={s} open={open} />}{" "}
      {section === "Settings" && (
        <>
          <section className="surface">
            <small className="kicker">BUSINESS PROFILE</small>
            <h3>{s.business.name}</h3>
            <Brief
              items={[
                ["Category", s.business.category],
                ["Business type", s.business.business_type],
                ["Currency", "NGN · Nigerian naira"],
                ["Contact", s.business.contact || "Not set"],
              ]}
            />
            <div className="inlineacts">
              {btn("New business", "Create business")}
              {btn("Profile", "Edit profile", { name })}
            </div>
          </section>
          <section className="surface">
            <h3>Activity trail</h3>
            <Grid
              empty="No activity logged yet"
              hint="Changes to this business will appear here automatically."
              heads={["Action", "Recorded at"]}
              rows={s.audit.map((a: any) => [
                a.action,
                new Date(a.created).toLocaleString(),
              ])}
            />
          </section>
        </>
      )}
      {info && (
        <Dialog
          title={
            info.entry
              ? "Transaction #" + info.entry.id
              : info.doc
                ? info.doc.kind + " #" + info.doc.id
                : info.product
                  ? info.product.name
                  : info.customer.name
          }
          close={() => {
            I(null);
            E("");
          }}
        >
          {info.entry &&
            (() => {
              const e = info.entry,
                lines = s.lines.filter((l: any) => l.entry === e.id);
              return (
                <>
                  <p>{e.description}</p>
                  <Brief
                    items={[
                      ["Amount", fmt(e.amount)],
                      ["Method", e.method],
                      ["Status", e.reversed ? "Reversed" : "Recorded"],
                    ]}
                  />
                  <p>
                    {day(e.created)} · {e.category} · {customer(e.customer)}
                  </p>
                  {e.kind === "Expense" && (
                    <Attachment
                      onSaved={refreshMedia}
                      bid={s.business.id}
                      id={e.id}
                      kind="receipt"
                      present={s.media.some(
                        (m: any) =>
                          m.kind === "receipt" && m.record_id === e.id,
                      )}
                    />
                  )}{" "}
                  {lines.map((l: any) => (
                    <p key={l.id}>
                      {l.name} × {l.qty} · {fmt(l.price * l.qty)}
                    </p>
                  ))}
                  <div className="inlineacts">
                    {e.kind === "Expense" &&
                      !e.reversed &&
                      fieldAct("Correct expense", () => {
                        open("Correct expense", {
                          ...e,
                          amount: Number(e.amount) / 100,
                          date: day(e.created),
                        });
                        I(null);
                      })}
                    {e.kind === "Sale" &&
                      fieldAct("Download receipt", () =>
                        pdf(s.business, "Receipt " + e.id, [
                          day(e.created),
                          customer(e.customer),
                          e.description,
                          ...lines.map(
                            (l: any) =>
                              l.name + " × " + l.qty + " at " + fmt(l.price),
                          ),
                          "Payment: " + e.method,
                          "Total: " + fmt(e.amount),
                          e.reversed ? "REVERSED" : "Recorded",
                        ]),
                      )}
                    {!e.reversed &&
                      fieldAct("Reverse entry", () => {
                        I(null);
                        open("Reverse entry", { id: e.id });
                      })}
                    {!e.reversed &&
                      e.account &&
                      fieldAct(
                        e.reconciled
                          ? "Undo reconciliation"
                          : "Mark reconciled",
                        async () => {
                          try {
                            await save("reconcile", { id: e.id });
                            I(null);
                          } catch (ex: any) {
                            E(ex.message);
                          }
                        },
                      )}
                  </div>
                </>
              );
            })()}
          {info.doc &&
            (() => {
              const d = info.doc;
              const lines = d.lines.map(
                (l: any) =>
                  `${l.name} × ${l.qty} at ${fmt(l.price)} — ${fmt(l.price * l.qty)}`,
              );
              return (
                <>
                  <p>
                    {customer(d.customer)} · {dueStatus(d)} · Due {day(d.due)}
                  </p>
                  <div className="docpreview">
                    <div className="docbrand">
                      <Files size={18} />
                      {s.business.name}
                    </div>
                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            {["Item", "Qty", "Unit price", "Line total"].map(
                              (h) => (
                                <th key={h} scope="col">
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {d.lines.map((l: any, j: number) => (
                            <tr key={j}>
                              <td>{l.name}</td>
                              <td>{l.qty}</td>
                              <td data-money>{fmt(l.price)}</td>
                              <td data-money>{fmt(l.price * l.qty)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Brief
                    items={[
                      ["Subtotal", fmt(d.subtotal)],
                      ["Tax", fmt(d.tax)],
                      ["Total", fmt(d.total)],
                    ]}
                  />
                  <div className="inlineacts">
                    {fieldAct("Download PDF", () =>
                      pdf(s.business, d.kind + " " + d.id, [
                        "Bill to: " + customer(d.customer),
                        "Due: " + day(d.due),
                        ...lines,
                        "Subtotal: " + fmt(d.subtotal),
                        "Tax: " + fmt(d.tax),
                        "Total: " + fmt(d.total),
                        "Status: " + dueStatus(d),
                      ]),
                    )}
                    <button className="mini" onClick={() => window.print()}>
                      <Printer size={15} />
                      Print
                    </button>
                    {d.status === "Open" &&
                      fieldAct("Accept & convert", () => {
                        I(null);
                        open("Convert quote", { id: d.id });
                      })}
                    {d.status === "Unpaid" &&
                      fieldAct("Record payment", () => {
                        I(null);
                        open("Record payment", { id: d.id });
                      })}
                  </div>
                </>
              );
            })()}
          {info.product && (
            <>
              <p>
                {info.product.category} · {info.product.sku || "No SKU"}
              </p>
              <Brief
                items={[
                  ["Available", info.product.stock],
                  ["Selling price", fmt(info.product.price)],
                  ["Purchase cost", fmt(info.product.cost)],
                ]}
              />
              {fieldAct("Edit product", () => {
                const p = info.product;
                open("Product", {
                  ...p,
                  price: p.price / 100,
                  cost: p.cost / 100,
                });
                I(null);
              })}
              <Attachment
                onSaved={refreshMedia}
                bid={s.business.id}
                id={info.product.id}
                kind="product"
                present={s.media.some(
                  (m: any) =>
                    m.kind === "product" && m.record_id === info.product.id,
                )}
              />
            </>
          )}
          {info.customer && (
            <>
              <p>
                {[
                  info.customer.phone,
                  info.customer.email,
                  info.customer.address,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No contact details recorded."}
              </p>
              {fieldAct("Edit customer", () => {
                open("Customer", info.customer);
                I(null);
              })}
              <h3>Purchase history</h3>
              {ledger(
                s.entries.filter(
                  (e: any) =>
                    e.customer === info.customer.id && e.kind === "Sale",
                ),
              )}
            </>
          )}
          {err && <p role="alert">{err}</p>}
        </Dialog>
      )}
    </motion.main>
  );
}

function Funding({ s, open }: any) {
  const entries = s.entries.filter((e: any) => !e.reversed),
    activeDays = new Set(entries.map((e: any) => day(e.created))).size,
    accounts = s.accounts.length;
  const stats = totals(entries, s.docs);
  return (
    <section className="surface">
      <div className="boxhead">
        <div>
          <small className="kicker">CREDIT READINESS</small>
          <h3>Your lender file</h3>
        </div>
        <Button size="sm" onClick={() => open("Funding file")}>
          Prepare file
          <Plus size={14} />
        </Button>
      </div>
      <p>
        Prepare a business summary for a lender you choose. VEVR does not
        forward applications, verify creditworthiness, or guarantee approval.
      </p>
      <Brief
        items={[
          ["Days with records", activeDays],
          ["Financial accounts", accounts],
          [
            "Reconciled entries",
            entries.filter((e: any) => e.reconciled).length,
          ],
        ]}
      />
      <Grid
        heads={["Lender", "Requested amount", "Tracking status", "Actions"]}
        rows={s.applications.map((v: any) => [
          v.lender,
          fmt(v.amount),
          v.status,
          <div className="inlineacts">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                pdf(s.business, "Business funding file " + v.id, [
                  "Prepared for: " + v.lender,
                  "Business: " + s.business.name,
                  "Purpose: " + v.purpose,
                  "Requested amount: " + fmt(v.amount),
                  "Sales recorded: " + fmt(stats.sales),
                  "Expenses recorded: " + fmt(stats.expenses),
                  "Operating profit: " + fmt(stats.profit),
                  "Net cash flow: " + fmt(stats.cash),
                  "Days with records: " + activeDays,
                  "Self-reported bookkeeping summary. Not a verified credit score or lending decision.",
                ])
              }
            >
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => open("Funding status", v)}
            >
              Update
            </Button>
          </div>,
        ])}
      />
    </section>
  );
}

import "./system.css";
