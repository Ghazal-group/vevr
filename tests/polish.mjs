import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
export async function review(page, nav) {
  page.setDefaultTimeout(6500);
  const btn = (s) => page.getByRole("button", { name: s, exact: true }),
    label = (s) => page.getByLabel(s, { exact: true }),
    dlg = () => page.getByRole("dialog"),
    save = async () => {
      await dlg().getByRole("button", { name: "Confirm and save" }).click();
      await dlg().waitFor({ state: "hidden" });
    };
  const contents = page.getByRole("main");
  const act = async (t) =>
    contents.getByRole("button", { name: t, exact: true }).click();
  const widthOK = async (context) => {
    const n = await page.evaluate(() => ({
      w: innerWidth,
      doc: document.documentElement.scrollWidth,
    }));
    if (n.doc > n.w + 1) {
      console.log(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll("body *"))
            .filter(
              (e) =>
                e instanceof HTMLElement &&
                e.getBoundingClientRect().right > innerWidth + 1 &&
                !e.closest(".tablewrap"),
            )
            .slice(0, 24)
            .map((e) => [
              e.tagName,
              e.className,
              e.getBoundingClientRect().right,
            ]),
        ),
      );
      await page.screenshot({ path: "/tmp/vevr-overflow.png" });
    }
    assert.ok(
      n.doc <= n.w + 1,
      `${context}: viewport ${n.w}, document ${n.doc}`,
    );
  };
  await page.setViewportSize({ width: 1440, height: 950 });
  await nav("Customers");
  await act("Add customer");
  await label("Customer name").fill("Test customer");
  await save();
  await nav("Invoices & Quotes");
  await act("Create quote");
  await label("Bill to").selectOption({ label: "Test customer" });
  await label("Item name").fill("Repair service");
  await label("Unit price in naira").fill("4500");
  await save();
  await act("View");
  await dlg().getByText("Repair service", { exact: true }).waitFor();
  await dlg().getByRole("button", { name: "Accept & convert" }).click();
  await save();
  await contents
    .getByRole("row")
    .filter({ hasText: "Invoice #" })
    .getByRole("button", { name: "View" })
    .click();
  const downloaded = page.waitForEvent("download");
  await dlg().getByRole("button", { name: "Download PDF" }).click();
  const pdf = await downloaded;
  assert.match(pdf.suggestedFilename(), /Invoice.*\.pdf$/);
  assert.ok(
    (await readFile(await pdf.path())).subarray(0, 4).toString() === "%PDF",
  );
  await dlg().getByRole("button", { name: "Record payment" }).click();
  await save();
  await contents
    .getByRole("table")
    .getByText("Paid", { exact: true })
    .waitFor();
  await nav("Expenses");
  await act("Add expense");
  await label("Description").fill("Courier charge");
  await label("Amount (₦)").fill("250");
  await save();
  await contents.getByText("Courier charge", { exact: true }).waitFor();
  await nav("Sales");
  await act("Record sale");
  await label("Description").fill("Walk-in service");
  await label("Amount (₦)").fill("600");
  await save();
  await nav("Overview");
  await contents.getByText("₦12,600", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Cash flow", exact: true }).click();
  await label("Chart interval").selectOption("Monthly");
  await label("Date range").selectOption("Custom");
  await label("From date").fill("2020-01-01");
  await label("To date").fill("2020-01-31");
  await page
    .getByText("No activity in this period", { exact: true })
    .first()
    .waitFor();
  await label("Date range").selectOption("Last 30 days");
  await label("Search workspace").click();
  await dlg().getByRole("textbox").fill("Tax Centre");
  await dlg().getByRole("button").filter({ hasText: "Tax Centre" }).click();
  await page
    .getByRole("heading", { name: "Tax Centre", exact: true })
    .waitFor();
  await nav("Reports");
  await label("Report type").selectOption("Expenses");
  const csvWait = page.waitForEvent("download");
  await act("Export CSV");
  const csv = await csvWait;
  assert.ok(
    (await readFile(await csv.path(), "utf8")).includes("Courier charge"),
  );
  await nav("Settings");
  await act("Create business");
  await label("Business name").fill("Empty second business");
  await save();
  await page.getByRole("heading", { name: "Welcome, VEVR" }).waitFor();
  await contents
    .getByText("No activity in this period", { exact: true })
    .first()
    .waitFor();
  assert.equal(
    await contents.getByText("Courier charge", { exact: true }).count(),
    0,
  );
  await label("Switch business").selectOption({ label: "Fresh Books" });
  await contents.getByText("Courier charge", { exact: true }).waitFor();
  await page.keyboard.press("Control+k");
  await dlg().getByRole("heading", { name: "Search" }).waitFor();
  await page.keyboard.press("Escape");
  await btn("Commerce").click();
  await page.keyboard.press("Escape");
  assert.equal(await btn("Commerce").getAttribute("aria-expanded"), "false");
  assert.ok(
    await btn("Commerce").evaluate((e) => e === document.activeElement),
  );
  await nav("AI Assistant");
  await page.route("**/api/b/*/ask", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Service temporarily unavailable." }),
    }),
  );
  await btn("Which products sell the most?").click();
  await page.getByText("Request failed", { exact: true }).waitFor();
  await page.unroute("**/api/b/*/ask");
  console.log(
    "PASS: quote conversion, PDF, invoice settlement, optional account fields, expenses, walk-in sale, real dashboard totals, date filters, search, CSV, business switching, menu focus and assistant error state.",
  );
  const modules = [
    "Overview",
    "Sales",
    "Point of Sale",
    "Transactions",
    "Expenses",
    "Inventory",
    "Customers",
    "Invoices & Quotes",
    "Banking & Payments",
    "Reports",
    "Tax Centre",
    "Financial Health",
    "Settings",
    "AI Assistant",
  ];
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of modules) {
      await page.evaluate((k) => (location.hash = encodeURIComponent(k)), name);
      await page
        .getByRole("heading", {
          level: 1,
          name: name === "Overview" ? "Welcome, VEVR" : name,
          exact: true,
        })
        .waitFor();
      await widthOK(name);
    }
    await nav("Overview");
    if (width === 1440 || width === 390)
      await page.screenshot({ path: "/tmp/vevr-overview-" + width + ".png" });
    await act("Add product");
    await widthOK("Product dialog");
    assert.ok(await dlg().evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
    await page.keyboard.press("Escape");
    console.log(`PASS: ${width}px · 14 workspace pages and product dialog`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await nav("Overview");
  assert.equal(
    await page
      .locator(".metricgrid article")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.goto("http://localhost:3130/");
  await page.getByRole("button", { name: "Play slideshow" }).waitFor();
  await page.getByRole("button", { name: "Next slide" }).click();
  await page.getByRole("heading", { name: /Your inventory/ }).waitFor();
  await page.getByRole("button", { name: "Previous slide" }).click();
  await page.getByRole("button", { name: /Intelligent capture/ }).click();
  await dlg().waitFor();
  await page.keyboard.press("Escape");
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/signup", "/recover"]) {
      await page.goto("http://localhost:3130" + path);
      await page.locator("h1").first().waitFor({ state: "attached" });
      await widthOK(path);
    }
    if (width === 1440) {
      await page.goto("http://localhost:3130");
      await page.screenshot({ path: "/tmp/vevr-public.png" });
    }
  }
  console.log(
    "PASS: 36 public-route width checks, manual carousel, native dialog Escape and reduced-motion behavior.",
  );
}
