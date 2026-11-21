import React, { useState } from "react";
import {
  Bot,
  ReceiptText,
  UsersRound,
  Landmark,
  ClipboardList,
  LoaderCircle,
  CheckCheck,
  Tags,
  Sparkles,
  Send,
  Plus,
  Minus,
  ShoppingCart,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { day, fmt, sum, totals, api, csv, pdf, inflow } from "./tools";
import { Dialog } from "./Editor";
export function Grid({
  heads,
  rows,
  empty = "No records yet",
  hint = "New records will appear here.",
}: any) {
  const EmptyIcon =
    (
      {
        Record: ReceiptText,
        Name: UsersRound,
        Document: FileText,
        Account: Landmark,
        Action: ClipboardList,
      } as any
    )[heads[0]] || Boxes;
  const [pg, P] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 10)),
    n = Math.min(pg, pages - 1);
  return !rows.length ? (
    <div className="quiet">
      <span>
        <EmptyIcon size={21} />
      </span>
      <b>{empty}</b>
      <small>{hint}</small>
    </div>
  ) : (
    <>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {heads.map((h: string, i: number) => (
                <th scope="col" key={i}>
                  {h || <span className="srlabel">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(n * 10, n * 10 + 10).map((r: any[], i: number) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td
                    data-money={
                      (typeof v === "string" && v.startsWith("₦")) || undefined
                    }
                    key={j}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <button
            aria-label="Previous page"
            disabled={!n}
            onClick={() => P(n - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {n + 1} / {pages}
          <button
            aria-label="Next page"
            disabled={n === pages - 1}
            onClick={() => P(n + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
export function Brief({ items }: any) {
  return (
    <div className="brief">
      {items.map(([k, v]: any) => (
        <div key={k}>
          <small>{k}</small>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}
export function Assistant({ bid }: any) {
  const [history, H] = useState<any[]>([]),
    [text, T] = useState(""),
    [busy, B] = useState(false);
  const [pending, Pend] = useState("");
  async function send(question: string) {
    if (busy || !question.trim()) return;
    B(true);
    Pend(question);
    T("");
    try {
      const r = await api("b/" + bid + "/ask", { question });
      H((h) => [...h, { q: question, ...r }]);
    } catch (ex: any) {
      H((h) => [
        ...h,
        { q: question, answer: ex.message, mode: "Request failed" },
      ]);
    } finally {
      B(false);
    }
  }
  return (
    <section className="surface assistant">
      <div className="assistantintro">
        <span>
          <Sparkles />
        </span>
        <small className="kicker">BUSINESS INTELLIGENCE</small>
        <h2>
          Ask about <em>your numbers.</em>
        </h2>
        <p>
          Explore your own business records. Without a model connection, VEVR
          uses local calculations.
        </p>
      </div>
      <div className="suggestions">
        {[
          "How much did I make this month?",
          "What are my biggest expenses?",
          "Which products sell the most?",
          "Compare this month with last month.",
        ].map((q) => (
          <button key={q} disabled={busy} onClick={() => send(q)}>
            {q}
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
      <div role="log" aria-label="Conversation" aria-live="polite">
        {history.map((h, i) => (
          <article className="answer" key={i}>
            <b>{h.q}</b>
            <small>
              <Sparkles size={13} /> {h.mode}
            </small>
            <p>{h.answer}</p>
          </article>
        ))}
        {busy && (
          <div className="thinkstate" role="status">
            <LoaderCircle size={16} />
            <span>Checking your records for “{pending}”</span>
          </div>
        )}
      </div>
      <form
        className="askbox"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          required
          maxLength={400}
          aria-label="Question for VEVR"
          placeholder="Ask VEVR a question…"
          value={text}
          onChange={(e) => T(e.target.value)}
        />
        <button className="primary" disabled={busy}>
          {busy ? "Thinking…" : "Send"}
          <Send size={15} />
        </button>
      </form>
    </section>
  );
}
export function POS({ s, save, find, open }: any) {
  const [cart, C] = useState<any>({}),
    [discount, D] = useState("0"),
    [method, M] = useState("Cash"),
    [customer, U] = useState(""),
    [account, A] = useState(""),
    [tax, T] = useState(false),
    [err, E] = useState(""),
    [busy, B] = useState(false),
    [receipt, R] = useState<any>(null);
  const [category, Category] = useState("");
  const cats = Array.from(
    new Set(s.products.map((p: any) => p.category).filter(Boolean)),
  ) as string[];
  const catalogue = s.products.filter(
    (p: any) =>
      find(p.name + " " + p.sku + " " + p.category) &&
      (!category || p.category === category),
  );
  const images = React.useMemo(
    () =>
      new Set(
        s.media
          .filter((m: any) => m.kind === "product")
          .map((m: any) => m.record_id),
      ),
    [s.media],
  );
  const lines = s.products.filter((p: any) => cart[p.id] > 0),
    subtotal = sum(lines, (p) => p.price * cart[p.id]);
  function change(p: any, delta: number) {
    C({
      ...cart,
      [p.id]: Math.max(0, Math.min(p.stock, (cart[p.id] || 0) + delta)),
    });
  }
  return (
    <div className="poslayout">
      <section className="surface">
        <div className="boxhead">
          <h3>Product catalogue</h3>
          <button className="mini" onClick={() => open("Product")}>
            Add product
          </button>
        </div>
        {cats.length > 0 && (
          <label className="catfilter">
            <Tags size={15} />
            <select
              aria-label="Product category"
              value={category}
              onChange={(e) => Category(e.target.value)}
            >
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        {!catalogue.length ? (
          <Grid
            heads={[]}
            rows={[]}
            empty={
              s.products.length
                ? "No matching products"
                : "Your catalogue is empty"
            }
            hint={
              s.products.length
                ? "Try a different name, SKU or category."
                : "Add a product with stock to begin checkout."
            }
          />
        ) : (
          <div className="catalogue">
            {catalogue.map((p: any) => (
              <button
                key={p.id}
                disabled={p.stock < 1 || cart[p.id] >= p.stock}
                onClick={() => change(p, 1)}
              >
                <span className="productthumb">
                  {images.has(p.id) ? (
                    <img
                      loading="lazy"
                      src={"/api/b/" + s.business.id + "/media/product/" + p.id}
                      alt=""
                    />
                  ) : (
                    <Boxes size={23} />
                  )}
                  <small>{p.category || "General"}</small>
                </span>
                <b>{p.name}</b>
                <small className={p.stock <= p.minimum ? "stocklow" : ""}>
                  {p.stock === 0 ? "Out of stock" : p.stock + " in stock"}
                </small>
                <strong>
                  {fmt(p.price)} <Plus size={15} />
                </strong>
              </button>
            ))}
          </div>
        )}
      </section>
      <form
        className="surface basket"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          B(true);
          E("");
          try {
            const r = await save("checkout", {
              items: lines.map((p: any) => ({
                product: p.id,
                qty: cart[p.id],
              })),
              method,
              discount: Number(discount),
              taxable: tax,
              customer: customer || null,
              account: account || null,
            });
            R({
              id: r.id,
              lines: lines.map(
                (p: any) =>
                  `${p.name} × ${cart[p.id]} — ${fmt(p.price * cart[p.id])}`,
              ),
              amount: subtotal - Math.round(Number(discount) * 100),
            });
            C({});
            D("0");
          } catch (x: any) {
            E(x.message);
          } finally {
            B(false);
          }
        }}
      >
        <div className="boxhead">
          <h3>Current sale</h3>
          <ShoppingCart size={19} />
        </div>
        {!lines.length && (
          <div className="cartempty">
            <ShoppingCart size={20} />
            <b>Your basket is empty</b>
            <small>Select a product to begin a sale.</small>
          </div>
        )}
        {lines.map((p: any) => (
          <div className="cartline" key={p.id}>
            <span>
              <b>{p.name}</b>
              <small>{fmt(p.price * cart[p.id])}</small>
            </span>
            <div>
              <button
                type="button"
                aria-label={"Decrease " + p.name + " quantity"}
                onClick={() => change(p, -1)}
              >
                <Minus size={13} />
              </button>
              {cart[p.id]}
              <button
                type="button"
                aria-label={"Increase " + p.name + " quantity"}
                disabled={cart[p.id] >= p.stock}
                onClick={() => change(p, 1)}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        ))}
        <label>
          Discount (₦)
          <input
            value={discount}
            type="number"
            min="0"
            max={subtotal / 100}
            step="0.01"
            onChange={(e) => D(e.target.value)}
          />
        </label>
        <label>
          Payment method
          <select value={method} onChange={(e) => M(e.target.value)}>
            {["Cash", "Card", "Transfer", "Other"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Customer
          <select value={customer} onChange={(e) => U(e.target.value)}>
            <option value="">Walk-in customer</option>
            {s.customers.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Deposit account
          <select value={account} onChange={(e) => A(e.target.value)}>
            <option value="">Unassigned</option>
            {s.accounts.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={tax}
            onChange={(e) => T(e.target.checked)}
          />{" "}
          Mark sale taxable
        </label>
        <div className="note">
          Total <b>{fmt(subtotal - Math.round(Number(discount) * 100))}</b>
        </div>
        {err && <p role="alert">{err}</p>}
        <button className="primary" disabled={busy || !lines.length}>
          {busy ? "Saving…" : "Complete sale"}
          <ArrowRight size={15} />
        </button>
      </form>
      {receipt && (
        <Dialog title={"Sale receipt #" + receipt.id} close={() => R(null)}>
          <div className="receiptnote">
            <CheckCheck size={18} />
            Sale recorded successfully
          </div>
          {receipt.lines.map((l: string, i: number) => (
            <p key={i}>{l}</p>
          ))}
          <div className="note">
            Amount paid <b>{fmt(receipt.amount)}</b>
          </div>
          <button
            className="primary"
            onClick={() =>
              pdf(s.business, "Receipt " + receipt.id, [
                ...receipt.lines,
                "Amount paid: " + fmt(receipt.amount),
              ])
            }
          >
            <Download size={15} />
            Download receipt
          </button>
        </Dialog>
      )}
    </div>
  );
}
export function Reports({ s, rows }: any) {
  const [kind, K] = useState("Profit and loss");
  const t = totals(rows, s.docs),
    valid = rows.filter((e: any) => !e.reversed);
  const reports: any = {
    "Profit and loss": [
      ["Measure", "Amount"],
      [
        ["Recorded revenue", fmt(t.sales)],
        ["Cost of goods sold", fmt(t.cost)],
        ["Recorded expenses", fmt(t.expenses)],
        ["Operating profit", fmt(t.profit)],
      ],
    ],
    "Cash flow": [
      ["Measure", "Amount"],
      [
        ["Money in", fmt(sum(valid.filter(inflow), (e) => e.amount))],
        [
          "Money out",
          fmt(
            sum(
              valid.filter((e: any) => !inflow(e)),
              (e) => e.amount,
            ),
          ),
        ],
        ["Net cash flow", fmt(t.cash)],
      ],
    ],
    Sales: [
      ["Date", "Sale", "Amount"],
      valid
        .filter((e: any) => e.kind === "Sale")
        .map((e: any) => [day(e.created), e.description, fmt(e.amount)]),
    ],
    Expenses: [
      ["Date", "Expense", "Category", "Amount"],
      valid
        .filter((e: any) => e.kind === "Expense")
        .map((e: any) => [
          day(e.created),
          e.description,
          e.category,
          fmt(e.amount),
        ]),
    ],
    Inventory: [
      ["Product", "Stock now", "Cost value"],
      s.products.map((p: any) => [p.name, p.stock, fmt(p.stock * p.cost)]),
    ],
    Customers: [
      ["Customer", "Recorded spending"],
      s.customers.map((c: any) => [
        c.name,
        fmt(
          sum(
            valid.filter((e: any) => e.customer === c.id && e.kind === "Sale"),
            (e) => e.amount,
          ),
        ),
      ]),
    ],
    "Tax summary": [
      ["Measure", "Amount"],
      [
        ["Estimated sales tax", fmt(estimated(s, valid))],
        [
          "Recorded payments",
          fmt(
            sum(
              valid.filter((e: any) => e.kind === "Tax payment"),
              (e) => e.amount,
            ),
          ),
        ],
      ],
    ],
  };
  const [heads, body] = reports[kind];
  return (
    <section className="surface reportpanel">
      <div className="boxhead">
        <div>
          <small className="kicker">REPORT BUILDER</small>
          <h3>Business reports</h3>
        </div>
        <button className="mini" onClick={() => csv(kind, [heads, ...body])}>
          <Download size={15} />
          Export CSV
        </button>
      </div>
      <label>
        Report type
        <select
          aria-label="Report type"
          value={kind}
          onChange={(e) => K(e.target.value)}
        >
          {Object.keys(reports).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <p>
        {kind === "Inventory"
          ? "Current stock snapshot; not a historical valuation."
          : "Based on non-reversed records in the selected period."}
      </p>
      <Grid
        heads={heads}
        rows={body}
        empty={"No " + kind.toLowerCase() + " records"}
        hint="Choose a different period or add a record to the corresponding module."
      />
    </section>
  );
}
export const estimated = (s: any, rows: any[]) =>
  sum(
    rows.filter((e) => !e.reversed && e.kind === "Sale"),
    (e) =>
      e.document
        ? Number(s.docs.find((v: any) => v.id === e.document)?.tax || 0)
        : e.taxable
          ? Math.round((Number(e.amount) * Number(e.taxrate)) / 100)
          : 0,
  );
