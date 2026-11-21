import { workflows } from "./workflows.mjs";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
const dir = await mkdtemp(tmpdir() + "/vevr-");
const server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  env: {
    ...process.env,
    DATABASE_URL: "",
    PGLITE_DIR: dir,
    PORT: "3129",
    NODE_ENV: "production",
  },
  stdio: "inherit",
});
let cookie = "";
async function req(p, d, status = 200) {
  let r = await fetch("http://127.0.0.1:3129/api/" + p, {
    method: d ? "POST" : "GET",
    headers: { "content-type": "application/json", cookie },
    body: d ? JSON.stringify(d) : undefined,
  });
  assert.equal(r.status, status, p);
  if (r.headers.has("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return r.json().catch(() => null);
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch("http://127.0.0.1:3129");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await req("me", null, 401);
  const account = {
    email: "test@example.test",
    password: "strong-secret",
    name: "Test",
    business: "A",
  };
  await req("signup", account);
  const b = "b/" + (await req("me")).businesses[0].id;
  assert.equal((await req(b)).entries.length, 0);
  await req(b + "/product", { name: "Product", stock: 4, price: 24.05 });
  let id = (await req(b)).products[0].id;
  let sale = {
    kind: "Sale",
    description: "Product sale",
    product: id,
    qty: 3,
    amount: 0,
  };
  await req(b + "/entry", sale);
  await req(b + "/entry", sale, 400);
  await req(b + "/entry", {
    kind: "Expense",
    description: "Delivery",
    amount: 10,
  });
  let data = await req(b);
  assert.equal(data.products[0].stock, 1);
  assert.deepEqual(
    data.entries.map((v) => Number(v.amount)),
    [1000, 7215],
  );
  await workflows(req, b);
  await req("logout", {});
  await req("login", { ...account, password: "incorrect" }, 401);
  await req("login", account);
  await req("signup", { ...account, email: "another@example.test" });
  await req(b, null, 403);
  console.log(
    "PASS: auth, empty workspace, product, sale calculation, expense, stock rollback, isolation.",
  );
} finally {
  if (server.exitCode === null) {
    server.kill();
    await new Promise((r) => server.once("exit", r));
  }
  await rm(dir, { recursive: true, force: true });
}
