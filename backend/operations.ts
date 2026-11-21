import { createHash } from "node:crypto";
import { z } from "zod";
const id = z.coerce.number().int().positive(),
  str = z.string().trim().min(1).max(200),
  short = z.string().trim().max(240).default(""),
  money = z.coerce.number().finite().min(0).max(100000000),
  integer = z.coerce.number().int().min(0).max(100000),
  rate = z.coerce.number().min(0).max(100),
  date = z.string().date();
const cents = (v: number) => Math.round(v * 100);
const items = z
  .array(z.object({ product: id, qty: integer.min(1) }))
  .min(1)
  .max(60);
const optionalId = id.nullish();
const schemas: any = {
  customer: z.object({
    id: optionalId,
    name: str,
    email: z.union([z.string().email(), z.literal("")]).default(""),
    phone: short,
    address: short,
  }),
  product: z.object({
    id: optionalId,
    name: str,
    sku: short,
    category: str,
    cost: money,
    price: money,
    stock: integer,
    minimum: integer,
  }),
  adjust: z.object({
    product: id,
    change: z.coerce
      .number()
      .int()
      .min(-100000)
      .max(100000)
      .refine((v) => v !== 0),
    reason: str,
  }),
  account: z.object({
    name: str,
    type: z.enum(["Cash", "Bank"]),
    opening: money,
  }),
  document: z.object({
    kind: z.enum(["Invoice", "Quote"]),
    customer: id,
    due: date,
    taxrate: rate,
    lines: z
      .array(
        z.object({
          name: str,
          qty: integer.min(1),
          price: money,
          product: optionalId,
        }),
      )
      .min(1)
      .max(60),
  }),
  convert: z.object({ id }),
  pay: z.object({ id, account: optionalId, method: str }),
  reverse: z.object({ id, reason: str }),
  reconcile: z.object({ id }),
  settings: z.object({
    name: str,
    category: str,
    contact: short,
    taxrate: rate,
  }),
  profile: z.object({ name: str }),
  checkout: z.object({
    items,
    discount: money.default(0),
    method: str,
    customer: optionalId,
    account: optionalId,
    taxable: z.boolean().default(false),
  }),
  record: z.object({
    kind: z.enum(["Sale", "Expense", "Tax payment", "Money in", "Money out"]),
    description: str,
    amount: money.positive(),
    category: str,
    method: str,
    date,
    customer: optionalId,
    account: optionalId,
    taxable: z.boolean().default(false),
  }),
};
schemas.application = z.object({
  lender: str,
  purpose: str,
  amount: money.positive(),
});
schemas.applicationStatus = z.object({
  id,
  status: z.enum(["Draft", "Submitted externally", "Closed"]),
});
schemas.correct = z.object({
  id,
  description: str,
  amount: money.positive(),
  category: str,
  date,
  reason: str,
});
export class BusinessError extends Error {}
const fail = (s: string) => {
  throw new BusinessError(s);
};
export async function operate(
  tx: any,
  bid: number,
  uid: number,
  op: string,
  body: any,
) {
  if (!Object.hasOwn(schemas, op)) fail("Unknown action");
  const d = schemas[op].parse(body);
  const key = z.string().uuid().optional().parse(body._key);
  const digest = createHash("sha256")
    .update(JSON.stringify([op, d]))
    .digest("hex");
  return tx(async (c: any) => {
    const query = async (s: string, p: any[] = []) =>
      (await c.query(s, p)).rows;
    const [biz] = await query(
      "select * from businesses where id=$1 and owner=$2 for update",
      [bid, uid],
    );
    if (!biz) fail("Workspace unavailable");
    if (key) {
      const [old] = await query(
        "select digest,result from operation_keys where bid=$1 and key=$2",
        [bid, key],
      );
      if (old) {
        if (old.digest !== digest) fail("Request key already used");
        return old.result;
      }
    }
    const get = async (table: string, i: number) => {
      const [v] = await query(`select * from ${table} where id=$1 and bid=$2`, [
        i,
        bid,
      ]);
      return v || fail("Record not found in this business");
    };
    const log = async (action: string) =>
      query("insert into audit(bid,uid,action) values($1,$2,$3)", [
        bid,
        uid,
        action,
      ]);
    const move = async (p: number, qty: number, reason: string) => {
      let v = await query(
        "update products set stock=stock+$1 where id=$2 and bid=$3 and stock+$1>=0 returning id",
        [qty, p, bid],
      );
      if (!v.length) fail("Not enough stock");
      await query(
        "insert into movements(bid,product,qty,reason) values($1,$2,$3,$4)",
        [bid, p, qty, reason],
      );
    };
    if (d.customer) await get("customers", d.customer);
    if (d.account) await get("accounts", d.account);
    let result: any = {};
    let action = op;
    if (op === "application") {
      await query(
        "insert into applications(bid,lender,purpose,amount) values($1,$2,$3,$4)",
        [bid, d.lender, d.purpose, cents(d.amount)],
      );
      action = "Prepared funding file: " + d.lender;
    }
    if (op === "applicationStatus") {
      await get("applications", d.id);
      await query("update applications set status=$1 where id=$2 and bid=$3", [
        d.status,
        d.id,
        bid,
      ]);
      action = "Updated funding file #" + d.id + ": " + d.status;
    }
    if (op === "correct") {
      const e = await get("ledger", d.id);
      if (e.kind !== "Expense" || e.reversed)
        fail("Only active expenses can be corrected");
      await query(
        "update ledger set description=$1,amount=$2,category=$3,created=$4,reconciled=false where id=$5",
        [d.description, cents(d.amount), d.category, d.date, d.id],
      );
      action = `Corrected expense #${d.id}: ${e.amount} → ${cents(d.amount)} kobo. ${d.reason}`;
    }
    if (op === "customer") {
      if (d.id) {
        await get("customers", d.id);
        await query(
          "update customers set name=$1,email=$2,phone=$3,address=$4 where id=$5",
          [d.name, d.email, d.phone, d.address, d.id],
        );
      } else
        await query(
          "insert into customers(bid,name,email,phone,address) values($1,$2,$3,$4,$5)",
          [bid, d.name, d.email, d.phone, d.address],
        );
      action = "Saved customer: " + d.name;
    }
    if (op === "product") {
      if (d.id) {
        await get("products", d.id);
        await query(
          "update products set name=$1,sku=$2,category=$3,price=$4,cost=$5,minimum=$6 where id=$7",
          [
            d.name,
            d.sku,
            d.category,
            cents(d.price),
            cents(d.cost),
            d.minimum,
            d.id,
          ],
        );
      } else {
        const [p] = await query(
          "insert into products(bid,name,sku,category,price,cost,minimum,stock) values($1,$2,$3,$4,$5,$6,$7,0) returning id",
          [
            bid,
            d.name,
            d.sku,
            d.category,
            cents(d.price),
            cents(d.cost),
            d.minimum,
          ],
        );
        if (d.stock) await move(p.id, d.stock, "Opening stock");
      }
      action = "Saved product: " + d.name;
    }
    if (op === "adjust") {
      await move(d.product, d.change, d.reason);
      action = "Adjusted stock: " + d.reason;
    }
    if (op === "account") {
      await query(
        "insert into accounts(bid,name,type,opening) values($1,$2,$3,$4)",
        [bid, d.name, d.type, cents(d.opening)],
      );
      action = "Registered account: " + d.name;
    }
    if (op === "settings") {
      await query(
        "update businesses set name=$1,category=$2,contact=$3,taxrate=$4 where id=$5",
        [d.name, d.category, d.contact, d.taxrate, bid],
      );
      action = "Updated business settings";
    }
    if (op === "profile") {
      await query("update users set name=$1 where id=$2", [d.name, uid]);
      action = "Updated profile";
    }
    if (op === "record") {
      if (["Money in", "Money out"].includes(d.kind) && !d.account)
        fail("Select a financial account");
      const [e] = await query(
        "insert into ledger(bid,kind,description,amount,category,method,customer,account,taxable,taxrate,created) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id",
        [
          bid,
          d.kind,
          d.description,
          cents(d.amount),
          d.category,
          d.method,
          d.customer || null,
          d.account || null,
          d.kind === "Sale" && d.taxable,
          biz.taxrate,
          d.date,
        ],
      );
      result = e;
      action = `Recorded ${d.kind.toLowerCase()} #${e.id}`;
    }
    if (op === "checkout") {
      let subtotal = 0,
        cost = 0;
      const lines = [];
      for (const item of d.items) {
        const p = await get("products", item.product);
        await move(p.id, -item.qty, "POS checkout");
        subtotal += Number(p.price) * item.qty;
        cost += Number(p.cost) * item.qty;
        lines.push({ ...p, qty: item.qty });
      }
      const amount = subtotal - cents(d.discount);
      if (
        amount < 0 ||
        !Number.isSafeInteger(amount) ||
        !Number.isSafeInteger(cost)
      )
        fail("Invalid sale total");
      const [e] = await query(
        "insert into ledger(bid,kind,description,amount,cogs,category,method,customer,account,taxable,taxrate) values($1,'Sale',$2,$3,$4,'POS',$5,$6,$7,$8,$9) returning id",
        [
          bid,
          lines
            .map((l) => l.name)
            .join(", ")
            .slice(0, 180),
          amount,
          cost,
          d.method,
          d.customer || null,
          d.account || null,
          d.taxable,
          biz.taxrate,
        ],
      );
      for (const l of lines)
        await query(
          "insert into lineitems(entry,product,name,qty,price,cost) values($1,$2,$3,$4,$5,$6)",
          [e.id, l.id, l.name, l.qty, l.price, l.cost],
        );
      result = e;
      action = "Completed POS sale #" + e.id;
    }
    if (op === "document") {
      let sub = 0;
      const lines = [];
      for (const l of d.lines) {
        const p = l.product ? await get("products", l.product) : null;
        const price = p ? Number(p.price) : cents(l.price);
        sub += price * l.qty;
        lines.push({ ...l, name: p?.name || l.name, price });
      }
      const tax = Math.round((sub * d.taxrate) / 100);
      if (!Number.isSafeInteger(sub + tax)) fail("Total too large");
      await query(
        "insert into docs(bid,kind,customer,lines,subtotal,tax,total,due,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          bid,
          d.kind,
          d.customer,
          JSON.stringify(lines),
          sub,
          tax,
          sub + tax,
          d.due,
          d.kind === "Quote" ? "Open" : "Unpaid",
        ],
      );
      action = "Created " + d.kind.toLowerCase();
    }
    if (op === "convert") {
      const doc = await get("docs", d.id);
      if (doc.kind !== "Quote" || doc.status !== "Open")
        fail("Only open quotes can be converted");
      await query(
        "insert into docs(bid,kind,customer,lines,subtotal,tax,total,due,status,source) select bid,'Invoice',customer,lines,subtotal,tax,total,due,'Unpaid',id from docs where id=$1",
        [d.id],
      );
      await query("update docs set status='Converted' where id=$1", [d.id]);
      action = "Accepted and converted quote #" + d.id;
    }
    if (op === "pay") {
      const doc = await get("docs", d.id);
      if (doc.kind !== "Invoice" || doc.status !== "Unpaid")
        fail("Invoice is not unpaid");
      await query("update docs set status='Paid' where id=$1", [d.id]);
      const [e] = await query(
        "insert into ledger(bid,kind,description,amount,category,method,document,account,customer) values($1,'Sale',$2,$3,'Invoice',$4,$5,$6,$7) returning id",
        [
          bid,
          "Payment for invoice #" + d.id,
          doc.total,
          d.method,
          d.id,
          d.account || null,
          doc.customer,
        ],
      );
      let cost = 0;
      for (const l of doc.lines) {
        if (!l.product) continue;
        const p = await get("products", l.product);
        await move(l.product, -l.qty, "Paid invoice #" + d.id);
        cost += Number(p.cost) * l.qty;
        await query(
          "insert into lineitems(entry,product,name,qty,price,cost) values($1,$2,$3,$4,$5,$6)",
          [e.id, l.product, l.name, l.qty, l.price, p.cost],
        );
      }
      if (!Number.isSafeInteger(cost)) fail("Total too large");
      await query("update ledger set cogs=$1 where id=$2", [cost, e.id]);
      action = "Recorded payment on invoice #" + d.id;
    }
    if (op === "reconcile") {
      const e = await get("ledger", d.id);
      if (!e.account || e.reversed)
        fail("Select an active account transaction");
      await query("update ledger set reconciled=not reconciled where id=$1", [
        d.id,
      ]);
      action = "Updated reconciliation #" + d.id;
    }
    if (op === "reverse") {
      const e = await get("ledger", d.id);
      if (e.reversed) fail("Entry already reversed");
      await query("update ledger set reversed=true where id=$1", [d.id]);
      for (const l of await query("select * from lineitems where entry=$1", [
        d.id,
      ]))
        await move(l.product, l.qty, "Reversal #" + d.id);
      if (e.product) await move(e.product, e.qty, "Reversal #" + d.id);
      if (e.document)
        await query("update docs set status='Unpaid' where id=$1 and bid=$2", [
          e.document,
          bid,
        ]);
      action = `Reversed entry #${d.id}: ${d.reason}`;
    }
    await log(action);
    if (key)
      await query("insert into operation_keys values($1,$2,$3,$4)", [
        bid,
        key,
        digest,
        JSON.stringify(result),
      ]);
    return result;
  });
}
