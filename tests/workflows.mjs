import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function workflows(req, b) {
  const action = (op, d, status) => req(b + "/action/" + op, d, status),
    state = () => req(b + "/state");
  await action("settings", {
    name: "Workshop",
    category: "Retail",
    contact: "",
    taxrate: 5,
  });
  await action("customer", { name: "Buyer" });
  await action("account", { name: "Till", type: "Cash", opening: 0 });
  await action("product", {
    name: "Paper",
    sku: "P1",
    price: 120,
    cost: 70,
    stock: 10,
    minimum: 2,
    category: "Office",
  });
  let s = await state(),
    p = s.products[0].id,
    c = s.customers[0].id,
    a = s.accounts[0].id;
  const checkout = {
    items: [{ product: p, qty: 3 }],
    discount: 10,
    method: "Cash",
    account: a,
    customer: c,
    taxable: true,
  };
  let { id } = await action("checkout", checkout);
  s = await state();
  assert.equal(Number(s.entries[0].amount), 35000);
  assert.equal(Number(s.entries[0].cogs), 21000);
  assert.equal(s.lines[0].qty, 3);
  assert.equal(s.products[0].stock, 7);
  assert.equal(Number(s.entries[0].taxrate), 5);
  await action(
    "checkout",
    {
      ...checkout,
      items: [
        { product: p, qty: 1 },
        { product: p, qty: 10 },
      ],
    },
    400,
  );
  assert.equal((await state()).products[0].stock, 7);
  await action("reconcile", { id });
  assert.equal((await state()).entries[0].reconciled, true);
  await action("reverse", { id, reason: "Cancelled purchase" });
  assert.equal((await state()).products[0].stock, 10);
  await action("reverse", { id, reason: "Repeat" }, 400);
  await action("adjust", { product: p, change: -2, reason: "Damaged" });
  assert.equal((await state()).products[0].stock, 8);
  await action("document", {
    kind: "Quote",
    customer: c,
    due: "2026-12-10",
    taxrate: 5,
    lines: [{ name: "Service", qty: 2, price: 100 }],
  });
  let quote = (await state()).docs[0];
  assert.equal(Number(quote.total), 21000);
  await action("convert", { id: quote.id });
  await action("convert", { id: quote.id }, 400);
  let invoice = (await state()).docs[0];
  await action("pay", { id: invoice.id, method: "Transfer", account: a });
  await action("pay", { id: invoice.id, method: "Cash" }, 400);
  s = await state();
  assert.equal(s.docs[0].status, "Paid");
  assert.equal(s.entries[0].document, invoice.id);
  await action("reverse", { id: s.entries[0].id, reason: "Payment returned" });
  assert.equal((await state()).docs[0].status, "Unpaid");
  await action("record", {
    kind: "Expense",
    amount: 30,
    description: "Delivery",
    category: "Logistics",
    date: "2026-11-01",
    method: "Cash",
    account: a,
  });
  assert.equal(Number((await state()).entries[0].amount), 3000);
  await action(
    "record",
    {
      kind: "Money out",
      amount: 30,
      description: "Withdrawal",
      category: "Owner",
      date: "2026-11-01",
      method: "Cash",
    },
    400,
  );
  const result = await req(b + "/ask", {
    question: "What are my biggest expenses?",
  });
  assert.ok(result.answer.includes("Logistics"));
  const [other] = await req("business", { name: "Second business" });
  const otherPath = "b/" + other.id;
  await req(otherPath + "/action/checkout", checkout, 400);
  await req(
    otherPath + "/action/reverse",
    { id, reason: "Wrong workspace" },
    400,
  );
  assert.deepEqual((await req(otherPath + "/state")).entries, []);
  assert.ok((await state()).audit.length >= 10);
  const idem = { ...checkout, _key: randomUUID() };
  const before = (await state()).products[0].stock;
  const one = await action("checkout", idem);
  const two = await action("checkout", idem);
  assert.equal(one.id, two.id);
  assert.equal((await state()).products[0].stock, before - 3);
  await action("checkout", { ...idem, discount: 20 }, 400);
  await action("reverse", { id: one.id, reason: "Returned" });
  await action("document", {
    kind: "Invoice",
    customer: c,
    due: "2026-12-10",
    taxrate: 5,
    lines: [{ product: p, name: "client supplied", qty: 1, price: 1 }],
  });
  const prodDoc = (await state()).docs[0];
  assert.equal(Number(prodDoc.subtotal), 12000);
  await action("pay", { id: prodDoc.id, method: "Cash" });
  assert.equal((await state()).products[0].stock, before - 1);
  let exp = (await state()).entries.find((e) => e.description === "Delivery");
  await action("correct", {
    id: exp.id,
    description: "Local delivery",
    amount: 40,
    category: "Logistics",
    date: "2026-11-01",
    reason: "Receipt correction",
  });
  assert.equal(
    Number((await state()).entries.find((e) => e.id === exp.id).amount),
    4000,
  );
  const page = await req(b + "/records?kind=Expense&search=delivery&limit=1");
  assert.equal(page.total, 2);
  assert.equal(page.records.length, 1);
  const image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2XcAAAAASUVORK5CYII=";
  await req(b + "/media/receipt/" + exp.id, { image });
  await req(otherPath + "/media/receipt/" + exp.id, { image }, 400);
  await req(b + "/media/product/" + p, { image: "bm90IGFuIGltYWdl" }, 400);
  assert.ok((await state()).media.some((m) => m.record_id === exp.id));
  await action("application", {
    lender: "Selected lender",
    purpose: "Equipment",
    amount: 50000,
  });
  const draft = (await state()).applications[0];
  assert.equal(draft.status, "Draft");
  await action("applicationStatus", {
    id: draft.id,
    status: "Submitted externally",
  });
  assert.equal((await state()).applications[0].status, "Submitted externally");
  console.log(
    "PASS: idempotent checkout, invoice product integrity, corrections, pagination, tenant-private media and funding files.",
  );
  console.log(
    "PASS: multi-item atomic checkout, cost/discount/tax, restoration, stock adjustment, quote/invoice/payment lifecycle, account reconciliation, actual-data insights and business isolation.",
  );
}
