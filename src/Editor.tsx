import React, { useEffect, useRef, useState } from "react";
import { X, Check, Plus, Trash2, ArrowRight } from "lucide-react";
import { day, fmt } from "./tools";
import { Dialog } from "./Dialog";
export { Dialog };
export default function Editor({ mode, seed = {}, state, close, save }: any) {
  const [d, D] = useState<any>({ ...seed }),
    [err, E] = useState(""),
    [busy, B] = useState(false),
    [lines, L] = useState<any[]>([{ name: "", price: "", qty: "1" }]);
  const f = (
    key: string,
    label: string,
    kind = "text",
    def: any = "",
    opts?: any[],
    required = true,
  ) => (
    <label key={key}>
      {label}
      {opts ? (
        <select
          aria-label={label}
          required={required}
          value={d[key] ?? def}
          onChange={(e) => D({ ...d, [key]: e.target.value })}
        >
          {opts.map((v) => {
            const [id, t] = Array.isArray(v) ? v : [v, v];
            return (
              <option key={id} value={id}>
                {t}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          aria-label={label}
          required={required}
          type={kind}
          step={
            kind === "number"
              ? ["qty", "stock", "minimum", "change"].includes(key)
                ? "1"
                : "any"
              : undefined
          }
          min={
            kind !== "number" || key === "change"
              ? undefined
              : key === "qty"
                ? 1
                : 0
          }
          max={key === "taxrate" ? 100 : undefined}
          value={d[key] ?? def}
          onChange={(e) => D({ ...d, [key]: e.target.value })}
        />
      )}
    </label>
  );
  const customers = state.customers.map((c: any) => [c.id, c.name]),
    accounts = [
      ["", "Unassigned"],
      ...state.accounts.map((a: any) => [a.id, a.name]),
    ];
  const method = f("method", "Payment method", "text", "Cash", [
    "Cash",
    "Transfer",
    "Card",
    "Other",
  ]);
  let fields: any,
    op = "",
    payload: any,
    title = mode;
  const set = (o: string, v: any) => {
    op = o;
    payload = v;
  };
  if (
    ["Sale", "Expense", "Money in", "Money out", "Tax payment"].includes(mode)
  ) {
    title =
      mode === "Tax payment"
        ? "Record tax payment"
        : "Record " + mode.toLowerCase();
    fields = (
      <>
        {mode === "Sale" &&
          f(
            "product",
            "Sale item",
            "text",
            "",
            [
              ["", "Service / non-inventory sale"],
              ...state.products.map((p: any) => [
                p.id,
                p.name + " · " + p.stock + " available",
              ]),
            ],
            false,
          )}
        {d.product ? (
          <>
            {f("qty", "Units sold", "number", 1)}
            <div className="note">
              Line total{" "}
              <b>
                {fmt(
                  Number(
                    state.products.find((p: any) => p.id === Number(d.product))
                      ?.price || 0,
                  ) * Number(d.qty ?? 1),
                )}
              </b>
            </div>
          </>
        ) : (
          <>
            {f("description", "Description")}
            {f("amount", "Amount (₦)", "number")}
          </>
        )}
        {!d.product && (
          <>
            {f("date", "Date", "date", day())}
            {f(
              "category",
              "Category",
              "text",
              mode === "Tax payment" ? "Tax" : "General",
            )}
          </>
        )}
        {method}
        {f(
          "account",
          "Financial account",
          "text",
          "",
          accounts,
          ["Money in", "Money out"].includes(mode),
        )}
        {mode === "Sale" && (
          <>
            {f(
              "customer",
              "Customer",
              "text",
              "",
              [["", "Walk-in customer"], ...customers],
              false,
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!d.taxable}
                onChange={(e) => D({ ...d, taxable: e.target.checked })}
              />
              Include in taxable sales estimate
            </label>
          </>
        )}
      </>
    );
    set("record", {
      ...d,
      kind: mode,
      date: d.date || day(),
      category: d.category || (mode === "Tax payment" ? "Tax" : "General"),
      method: d.method || "Cash",
      account: d.account || null,
      customer: d.customer || null,
    });
    if (mode === "Sale" && d.product)
      set("checkout", {
        items: [{ product: d.product, qty: d.qty || 1 }],
        method: d.method || "Cash",
        customer: d.customer || null,
        account: d.account || null,
        taxable: !!d.taxable,
      });
  } else if (mode === "Product") {
    title = d.id ? "Edit product" : "Add product";
    fields = (
      <>
        {f("name", "Product name")}
        {f("sku", "SKU", "text", "", undefined, false)}
        {f("category", "Category", "text", "General")}
        {f("price", "Selling price (₦)", "number")}
        {f("cost", "Purchase cost (₦)", "number", 0)}
        {!d.id && f("stock", "Opening stock", "number", 0)}
        {f("minimum", "Low-stock threshold", "number", 3)}
      </>
    );
    set("product", {
      ...d,
      category: d.category || "General",
      stock: d.stock || 0,
      cost: d.cost || 0,
      minimum: d.minimum ?? 3,
    });
  } else if (mode === "Adjust stock") {
    fields = (
      <>
        {f("product", "Product", "text", "", [
          ["", "Select product"],
          ...state.products.map((p: any) => [p.id, p.name]),
        ])}
        {f("change", "Quantity change (+ or −)", "number")}
        {f("reason", "Reason for adjustment")}
      </>
    );
    set("adjust", d);
  } else if (mode === "Customer") {
    title = d.id ? "Edit customer" : "Add customer";
    fields = (
      <>
        {f("name", "Customer name")}
        {f("email", "Email address", "email", "", undefined, false)}
        {f("phone", "Phone number", "tel", "", undefined, false)}
        {f("address", "Address", "text", "", undefined, false)}
      </>
    );
    set("customer", d);
  } else if (mode === "Account") {
    title = "Register financial account";
    fields = (
      <>
        {f("name", "Account label")}
        {f("type", "Account type", "text", "Cash", ["Cash", "Bank"])}
        {f("opening", "Opening balance (₦)", "number", 0)}
        <p>For bookkeeping only. No bank connection is created.</p>
      </>
    );
    set("account", { ...d, type: d.type || "Cash", opening: d.opening || 0 });
  } else if (mode === "Invoice" || mode === "Quote") {
    title = "Create " + mode.toLowerCase();
    fields = (
      <>
        {f("customer", "Bill to", "text", "", [
          ["", "Select customer"],
          ...customers,
        ])}
        {f("due", mode === "Quote" ? "Valid until" : "Due date", "date", day())}
        <label>Line items</label>
        {state.products.length > 0 && (
          <select
            aria-label="Add catalogue item"
            value=""
            onChange={(e) => {
              const p = state.products.find(
                (p: any) => p.id === Number(e.target.value),
              );
              if (p)
                L([
                  ...lines.filter((l) => l.name),
                  { product: p.id, name: p.name, price: p.price / 100, qty: 1 },
                ]);
            }}
          >
            <option value="">Add from product catalogue…</option>
            {state.products.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} · {fmt(p.price)}
              </option>
            ))}
          </select>
        )}
        <div className="docline linehead" aria-hidden="true">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit price</span>
        </div>
        {lines.map((l, j) => (
          <div className="docline" key={j}>
            <input
              placeholder="Product or service"
              aria-label="Item name"
              readOnly={!!l.product}
              required
              value={l.name}
              onChange={(e) =>
                L(
                  lines.map((a, i) =>
                    i === j ? { ...a, name: e.target.value } : a,
                  ),
                )
              }
            />
            <input
              aria-label="Quantity"
              min="1"
              type="number"
              required
              value={l.qty}
              onChange={(e) =>
                L(
                  lines.map((a, i) =>
                    i === j ? { ...a, qty: e.target.value } : a,
                  ),
                )
              }
            />
            <input
              aria-label="Unit price in naira"
              readOnly={!!l.product}
              placeholder="₦ price"
              step="0.01"
              min="0"
              type="number"
              required
              value={l.price}
              onChange={(e) =>
                L(
                  lines.map((a, i) =>
                    i === j ? { ...a, price: e.target.value } : a,
                  ),
                )
              }
            />
            <button
              type="button"
              disabled={lines.length === 1}
              aria-label="Remove item"
              onClick={() => L(lines.filter((_, i) => i !== j))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          className="textaction"
          type="button"
          onClick={() => L([...lines, { name: "", qty: 1, price: "" }])}
        >
          <Plus size={14} /> Add line
        </button>
        {f("taxrate", "Tax rate (%)", "number", state.business.taxrate)}
        <div className="note">
          Document total{" "}
          <b>
            {fmt(
              lines.reduce(
                (v, l) => v + Math.round(Number(l.price) * 100) * Number(l.qty),
                0,
              ) *
                (1 + Number(d.taxrate ?? state.business.taxrate) / 100),
            )}
          </b>
        </div>
      </>
    );
    set("document", {
      ...d,
      kind: mode,
      due: d.due || day(),
      lines,
      taxrate: d.taxrate ?? state.business.taxrate,
    });
  } else if (mode === "Record payment") {
    fields = (
      <>
        <p>
          Confirm that you received the full invoice amount. VEVR records this
          payment; it does not charge the customer.
        </p>
        {method}
        {f("account", "Deposit account", "text", "", accounts, false)}
      </>
    );
    set("pay", {
      ...d,
      method: d.method || "Cash",
      account: d.account || null,
    });
  } else if (mode === "Reverse entry") {
    fields = (
      <>
        <p>
          This excludes the entry from totals and restores any stock sold. The
          original entry and reason remain visible.
        </p>
        {f("reason", "Reason")}
      </>
    );
    set("reverse", d);
  } else if (mode === "Business settings") {
    fields = (
      <>
        {f("name", "Business name")}
        {f("category", "Business category")}
        {f("contact", "Business contact", "text", "", undefined, false)}
        {f("taxrate", "Estimated tax rate (%)", "number", 0)}
        <p>
          Applies only to future entries marked taxable. Verify the rate with
          your tax adviser.
        </p>
      </>
    );
    set("settings", d);
  } else if (mode === "Profile") {
    fields = f("name", "Display name");
    set("profile", d);
  } else if (mode === "Funding file") {
    fields = (
      <>
        {f("lender", "Lender name")}
        {f("purpose", "Funding purpose")}
        {f("amount", "Requested amount (₦)", "number")}
        <p>This creates a private draft. No application is sent.</p>
      </>
    );
    set("application", d);
  } else if (mode === "Funding status") {
    fields = f("status", "Your tracking status", "text", "Draft", [
      "Draft",
      "Submitted externally",
      "Closed",
    ]);
    set("applicationStatus", d);
  } else if (mode === "Correct expense") {
    fields = (
      <>
        {f("description", "Description")}
        {f("amount", "Correct amount (₦)", "number")}
        {f("category", "Category")}
        {f("date", "Expense date", "date")}
        {f("reason", "Reason for correction")}
      </>
    );
    set("correct", d);
  } else if (mode === "New business") {
    fields = f("name", "Business name");
    set("business", d);
  } else if (mode === "Convert quote") {
    fields = (
      <p>
        Accept quote #{d.id} and issue an unpaid invoice with the same customer,
        lines, and total.
      </p>
    );
    set("convert", d);
  }
  return (
    <Dialog title={title} close={() => !busy && close()}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          B(true);
          E("");
          try {
            await save(op, payload);
            close();
          } catch (ex: any) {
            E(ex.message);
          } finally {
            B(false);
          }
        }}
      >
        {fields}
        {err && <p role="alert">{err}</p>}
        <div className="formfoot">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button disabled={busy} className="primary">
            {busy ? "Saving…" : "Confirm and save"}
            <Check size={15} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
