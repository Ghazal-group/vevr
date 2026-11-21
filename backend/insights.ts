import { z } from "zod";
export async function snapshot(q: any, id: number) {
  const read = (table: string) =>
    q(`select * from ${table} where bid=$1 order by id desc`, [id]);
  const [
    products,
    entries,
    customers,
    accounts,
    docs,
    moves,
    audit,
    lines,
    [business],
  ] = await Promise.all([
    read("products"),
    read("ledger"),
    read("customers"),
    read("accounts"),
    read("docs"),
    read("movements"),
    q(
      "select id,action,created from audit where bid=$1 order by id desc limit 100",
      [id],
    ),
    q(
      "select l.* from lineitems l join ledger e on e.id=l.entry where e.bid=$1",
      [id],
    ),
    q(
      "select id,name,category,business_type,contact,taxrate from businesses where id=$1",
      [id],
    ),
  ]);
  return {
    business,
    products,
    entries,
    customers,
    accounts,
    docs,
    moves,
    audit,
    lines,
  };
}
export async function ask(q: any, id: number, question: string) {
  question = z.string().trim().min(1).max(400).parse(question);
  const now = new Date(),
    start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString(),
    last = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    ).toISOString();
  const month = /month/i.test(question);
  const bounds = month ? start : "1970-01-01";
  const [s] = await q(
    `select coalesce(sum(amount-coalesce((select tax from docs where docs.id=ledger.document),0)) filter(where kind='Sale'),0) sales,coalesce(sum(amount) filter(where kind='Expense'),0) expenses,coalesce(sum(cogs),0) cost,count(*) entries from ledger where bid=$1 and not reversed and created >=$2`,
    [id, bounds],
  );
  const [previous] = await q(
    "select coalesce(sum(amount-coalesce((select tax from docs where docs.id=ledger.document),0)),0) sales from ledger where bid=$1 and not reversed and kind='Sale' and created>=$2 and created<$3",
    [id, last, start],
  );
  const groups = await q(
    "select category,sum(amount) total from ledger where bid=$1 and not reversed and kind='Expense' and created>=$2 group by category order by total desc limit 3",
    [id, bounds],
  );
  const products = await q(
    "select l.name,sum(l.qty) units from lineitems l join ledger e on e.id=l.entry where e.bid=$1 and not e.reversed and e.created>=$2 group by l.name order by units desc limit 3",
    [id, bounds],
  );
  const fmt = (n: any) => "₦" + (Number(n) / 100).toLocaleString("en-NG");
  const period = month ? "this month" : "across all recorded dates";
  let answer = !Number(s.entries)
    ? "There are no active entries for this period yet. Record your first sale or expense to see insights."
    : /compare|last month/i.test(question)
      ? `Sales this month: ${fmt(s.sales)}. Previous calendar month: ${fmt(previous.sales)}.`
      : /product|sell the most/i.test(question)
        ? products.length
          ? "Top products by units sold: " +
            products.map((p: any) => `${p.name} (${p.units})`).join(", ") +
            "."
          : "No POS product sales in this period."
        : /expense|reduce/i.test(question)
          ? `Recorded expenses ${period}: ${fmt(s.expenses)}. ${groups.length ? "Largest categories: " + groups.map((g: any) => g.category + " " + fmt(g.total)).join(", ") + ". Review these costs first." : "No expense categories recorded yet."}`
          : /profit|make/i.test(question)
            ? `Recorded sales less expenses and product costs ${period}: ${fmt(Number(s.sales) - Number(s.expenses) - Number(s.cost))}. This is a bookkeeping estimate, not an audited profit figure.`
            : `Recorded sales ${period}: ${fmt(s.sales)}; expenses: ${fmt(s.expenses)}. Ask about profit, expenses, top products, or monthly sales comparisons.`;
  if (!process.env.AI_API_KEY)
    return { mode: "Local insights · no live model", answer };
  const r = await fetch(
    process.env.AI_ENDPOINT || "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.AI_API_KEY,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Answer from only these business aggregates, amounts in kobo (100 kobo per naira). Do not make lending decisions or assert legal tax duties. The supplied figures are bookkeeping totals.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question,
              period,
              summary: s,
              previousMonthSales: previous.sales,
              expenseCategories: groups,
              productUnits: products,
            }),
          },
        ],
      }),
    },
  );
  if (!r.ok) return { mode: "Local fallback · model unavailable", answer };
  const j: any = await r.json();
  return {
    mode: "Connected model",
    answer: j.choices?.[0]?.message?.content || answer,
  };
}
