import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
const dir = await mkdtemp(tmpdir() + "/vevr-ui-");
const srv = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PGLITE_DIR: dir,
    DATABASE_URL: "",
    PORT: "3130",
  },
  stdio: "inherit",
});
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch("http://localhost:3130/");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 920 },
  });
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3130");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Full name" }).fill("VEVR Test");
  await page
    .getByRole("textbox", { name: "Business name" })
    .fill("Fresh Books");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("ui@example.test");
  await page.locator('input[name="password"]').fill("strong-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByRole("heading", { name: "Welcome, VEVR" }).waitFor();
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await page.getByLabel("Product name").fill("Linen shirt");
  await page.getByLabel("Selling price").fill("7500");
  await page.getByLabel("Purchase cost").fill("4000");
  await page.getByLabel("Opening stock").fill("5");
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const nav = async (t) => {
    const width = page.viewportSize().width;
    if (width <= 760) {
      if (
        !(await page
          .getByRole("dialog", { name: "Workspace navigation" })
          .isVisible())
      )
        await page.getByRole("button", { name: "More", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Workspace navigation" })
        .getByRole("button", { name: t, exact: true })
        .click();
      return;
    }
    const bar = page.getByRole("navigation", { name: "Workspace navigation" });
    const group = [
      "Sales",
      "Point of Sale",
      "Inventory",
      "Customers",
      "Invoices & Quotes",
    ].includes(t)
      ? "Commerce"
      : ["Transactions", "Expenses", "Banking & Payments"].includes(t)
        ? "Money"
        : ["Reports", "Tax Centre", "Financial Health"].includes(t)
          ? "Insights"
          : null;
    if (group)
      await bar.getByRole("button", { name: group, exact: true }).click();
    await bar.getByRole("button", { name: t, exact: true }).click();
  };
  await nav("Point of Sale");
  await page.getByRole("button", { name: /Linen shirt/ }).click();
  await page.getByRole("button", { name: "Complete sale" }).click();
  await page.getByRole("heading", { name: /Sale receipt/ }).waitFor();
  await page.getByLabel("Close dialog").click();
  for (const k of [
    "Sales",
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
  ]) {
    await nav(k);
    await page
      .getByRole("heading", { name: k, exact: true, level: 1 })
      .waitFor();
  }
  await page
    .getByRole("button", { name: "Which products sell the most?" })
    .click();
  await page.getByText(/Top products by units sold/).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Overview", exact: true })
    .last()
    .click();
  await page.getByRole("heading", { name: "Welcome, VEVR" }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile dashboard overflow",
  );
  await page.getByRole("button", { name: "More", exact: true }).click();
  await nav("Inventory");
  await page.getByRole("heading", { name: "Inventory", exact: true }).waitFor();
  if (process.argv.includes("--polish")) {
    const { review } = await import("./polish.mjs");
    await review(page, nav);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser signup, product entry, checkout, receipt, all pages, assistant, mobile navigation and dashboard width.",
  );
} finally {
  await browser?.close();
  if (srv.exitCode === null && !srv.signalCode) {
    srv.kill();
    await new Promise((r) => srv.once("exit", r));
  }
  await rm(dir, { recursive: true, force: true });
}
