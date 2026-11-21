export const fmt = (v: any) =>
  "₦" +
  (Number(v || 0) / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
export const day = (n: any = new Date()) =>
  new Date(n).toISOString().slice(0, 10);
export async function api(p: string, d?: any) {
  const r = await fetch("/api/" + p, {
    method: d ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: d ? JSON.stringify(d) : undefined,
  });
  if (!r.ok)
    throw Error(
      (await r.json().catch(() => ({}))).error || "Request unavailable",
    );
  return r.json();
}
export const sum = (arr: any[], fn: (r: any) => number) =>
  arr.reduce((a, r) => a + Number(fn(r) || 0), 0);
export const inflow = (e: any) => ["Sale", "Money in"].includes(e.kind);
export function totals(rows: any[], docs: any[]) {
  const a = rows.filter((e) => !e.reversed),
    sales = sum(
      a.filter((e) => e.kind === "Sale"),
      (e) =>
        Number(e.amount) -
        Number(docs.find((x) => x.id === e.document)?.tax || 0),
    ),
    expenses = sum(
      a.filter((e) => e.kind === "Expense"),
      (e) => e.amount,
    ),
    cost = sum(a, (e) => e.cogs),
    cash = sum(a, (e) => (inflow(e) ? Number(e.amount) : -Number(e.amount)));
  return { sales, expenses, cost, cash, profit: sales - expenses - cost };
}
export function csv(name: string, rows: any[][]) {
  const str = rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            String(v ?? "")
              .replace(/^[=+@\-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + str], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "VEVR-" + name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export async function pdf(b: any, title: string, lines: string[]) {
  const { jsPDF } = await import("jspdf");
  const p = new jsPDF();
  const top = () => {
    p.setFillColor(6, 45, 29);
    p.rect(0, 0, 210, 26, "F");
    p.setTextColor(255);
    p.setFontSize(15);
    p.text("vevr   /   " + b.name.slice(0, 45), 16, 17);
    p.setTextColor(22, 50, 32);
  };
  top();
  p.setTextColor(66, 98, 77);
  p.setFontSize(9);
  p.text("BUSINESS DOCUMENT", 16, 33);
  p.setTextColor(18, 55, 36);
  p.setFontSize(23);
  p.text(title, 16, 44);
  let y = 57;
  p.setFontSize(11);
  for (const s of lines) {
    for (const l of p.splitTextToSize(s.replaceAll("₦", "NGN "), 175)) {
      if (y > 270) {
        p.addPage();
        top();
        p.setFontSize(11);
        y = 39;
      }
      p.text(l, 16, y);
      y += 7;
    }
    y += 3;
  }
  for (let i = 1; i <= p.getNumberOfPages(); i++) {
    p.setPage(i);
    p.setDrawColor(209, 222, 209);
    p.line(16, 280, 194, 280);
    p.setTextColor(68, 91, 74);
    p.setFontSize(9);
    p.text("VEVR   /   Business workspace", 16, 287);
    p.text(`${i} / ${p.getNumberOfPages()}`, 194, 287, { align: "right" });
  }
  p.save(title.replaceAll(" ", "-") + ".pdf");
}
