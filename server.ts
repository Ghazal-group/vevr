import { promisify } from "node:util";
const derive = promisify(scrypt);
import { mediaRoutes } from "./backend/media";
import { drizzle as localOrm } from "drizzle-orm/pglite";
import { drizzle as pgOrm } from "drizzle-orm/node-postgres";
import { applications } from "./backend/schema";
import { eq, desc } from "drizzle-orm";
import { operate, BusinessError } from "./backend/operations";
import { ask, snapshot } from "./backend/insights";
import express from "express";
import rateLimit from "express-rate-limit";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { z } from "zod";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
async function main() {
  const pool = process.env.DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
    : null;
  const local = pool ? null : new PGlite(process.env.PGLITE_DIR || "data");
  const db: any = pool || local;
  const orm: any = pool ? pgOrm(pool) : localOrm(local!);
  const q = async (s: string, p: any[] = []) => (await db.query(s, p)).rows;
  const tx = async (fn: any) => {
    if (local) return local.transaction(fn);
    const c = await pool!.connect();
    try {
      await c.query("begin");
      const v = await fn(c);
      await c.query("commit");
      return v;
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  };
  for (const file of ["001.sql", "002.sql", "003.sql"])
    for (const s of readFileSync("migrations/" + file, "utf8")
      .split(";")
      .filter((x) => x.trim()))
      await q(s);
  if (process.argv.includes("--migrate")) {
    console.log("Schema is up to date. No business records were seeded.");
    if (local) await local.close();
    else await pool!.end();
    return;
  }
  const app = express();
  app.disable("x-powered-by");
  app.use("/api/b/:id/media", express.json({ limit: "730kb" }));
  app.use(express.json({ limit: "48kb" }));
  app.use("/api", (r, s, n) => {
    s.set("Cache-Control", "no-store");
    if (r.method === "POST" && !r.is("application/json"))
      return s.sendStatus(415);
    n();
  });
  const auth = rateLimit({ windowMs: 600000, limit: 60 });
  const text = z.string().trim().min(1).max(180);
  const money = z.number().finite().nonnegative().max(1000000000);
  const hash = (v: string) => createHash("sha256").update(v).digest("hex");
  const cookie = (r: any) =>
    hash((r.headers.cookie || "").match(/(?:^|; )vevr=([a-f0-9]+)/)?.[1] || "");
  for (const mode of ["login", "signup"])
    app.post("/api/" + mode, auth, async (r, s) => {
      let { email, password } = z
        .object({
          email: z.string().email().max(250),
          password: z.string().min(8).max(128),
        })
        .parse(r.body);
      email = email.toLowerCase();
      let id;
      if (mode === "signup") {
        const name = text.parse(r.body.name),
          biz = text.parse(r.body.business),
          salt = randomBytes(16).toString("hex");
        id = await tx(async (c: any) => {
          const user = (
            await c.query(
              "insert into users(email,password,name) values($1,$2,$3) returning id",
              [
                email,
                salt +
                  ":" +
                  ((await derive(password, salt, 64)) as Buffer).toString(
                    "hex",
                  ),
                name,
              ],
            )
          ).rows[0];
          const [b] = (
            await c.query(
              "insert into businesses(owner,name,category,business_type,contact) values($1,$2,$3,$4,$5) returning id",
              [
                user.id,
                biz,
                text.parse(r.body.category || "General"),
                text.parse(r.body.business_type || "Sole proprietorship"),
                z
                  .string()
                  .max(240)
                  .parse(r.body.contact || ""),
              ],
            )
          ).rows;
          await c.query("insert into memberships values($1,$2,'owner')", [
            b.id,
            user.id,
          ]);
          return user.id;
        });
      } else {
        const [u] = await q("select * from users where email=$1", [email]);
        const [salt, key] = (u?.password || "missing:").split(":");
        const verify = (await derive(password, salt, 64)) as Buffer;
        if (!u || !timingSafeEqual(verify, Buffer.from(key, "hex")))
          return s.status(401).json({ error: "Incorrect email or password." });
        id = u.id;
      }
      const token = randomBytes(32).toString("hex");
      await q("insert into sessions values($1,$2,now()+interval '7 days')", [
        hash(token),
        id,
      ]);
      s.cookie("vevr", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        partitioned: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
        maxAge: 604800000,
      });
      s.json({ ok: true });
    });
  app.post("/api/recovery", auth, async (r, s) => {
    const email = z.string().email().parse(r.body.email).toLowerCase();
    if (
      !process.env.RESEND_API_KEY ||
      !process.env.APP_URL ||
      !process.env.MAIL_FROM
    )
      return s
        .status(503)
        .json({
          error:
            "Password reset email is not configured. Contact your workspace administrator.",
        });
    const [u] = await q("select id from users where email=$1", [email]);
    if (u) {
      const token = randomBytes(32).toString("hex");
      await q("insert into resets values($1,$2,now()+interval '20 minutes')", [
        hash(token),
        u.id,
      ]);
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM,
          to: email,
          subject: "Reset your VEVR password",
          text:
            "Reset within 20 minutes: " +
            process.env.APP_URL +
            "/login#reset=" +
            token,
        }),
      });
      if (!resp.ok) console.error("Reset email provider unavailable");
    }
    s.json({ ok: true });
  });
  app.post("/api/reset", auth, async (r, s) => {
    const password = z.string().min(8).max(128).parse(r.body.password);
    await tx(async (c: any) => {
      const [v] = (
        await c.query(
          "delete from resets where token=$1 and expires>now() returning uid",
          [hash(z.string().length(64).parse(r.body.token))],
        )
      ).rows;
      if (!v) throw new BusinessError("Reset link is invalid or expired");
      const salt = randomBytes(16).toString("hex");
      await c.query("update users set password=$1 where id=$2", [
        salt +
          ":" +
          ((await derive(password, salt, 64)) as Buffer).toString("hex"),
        v.uid,
      ]);
      await c.query("delete from sessions where uid=$1", [v.uid]);
      await c.query("delete from resets where uid=$1", [v.uid]);
    });
    s.json({ ok: true });
  });
  app.use("/api", async (r: any, s, n) => {
    const [u] = await q(
      "select users.id,name,email from sessions join users on users.id=uid where token=$1 and expires>now()",
      [cookie(r)],
    );
    if (!u) return s.status(401).json({ error: "Please log in." });
    r.user = u;
    n();
  });
  app.post("/api/logout", async (r, s) => {
    await q("delete from sessions where token=$1", [cookie(r)]);
    s.clearCookie("vevr", {
      secure: process.env.NODE_ENV === "production",
      partitioned: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }).json({ ok: true });
  });
  app.get("/api/me", async (r: any, s) =>
    s.json({
      ...r.user,
      businesses: await q(
        "select id,name from businesses where owner=$1 order by id",
        [r.user.id],
      ),
    }),
  );
  app.post("/api/business", async (r: any, s) =>
    s.json(
      await tx(async (c: any) => {
        const rows = (
          await c.query(
            "insert into businesses(owner,name) values($1,$2) returning id",
            [r.user.id, text.parse(r.body.name)],
          )
        ).rows;
        await c.query("insert into memberships values($1,$2,'owner')", [
          rows[0].id,
          r.user.id,
        ]);
        return rows;
      }),
    ),
  );
  app.use("/api/b/:id", async (r: any, s, n) => {
    const [b] = await q("select id from businesses where id=$1 and owner=$2", [
      Number(r.params.id) || 0,
      r.user.id,
    ]);
    if (!b) return s.sendStatus(403);
    r.bid = b.id;
    n();
  });
  mediaRoutes(app, q);
  app.get("/api/b/:id/state", async (r: any, s) =>
    s.json({
      ...(await snapshot(q, r.bid)),
      applications: await orm
        .select()
        .from(applications)
        .where(eq(applications.bid, r.bid))
        .orderBy(desc(applications.id)),
      media: await q("select kind,record_id from media where bid=$1", [r.bid]),
    }),
  );
  app.post("/api/b/:id/action/:op", async (r: any, s) =>
    s.json(await operate(tx, r.bid, r.user.id, r.params.op, r.body)),
  );
  app.post(
    "/api/b/:id/ask",
    rateLimit({ limit: 30, windowMs: 600000 }),
    async (r: any, s) => s.json(await ask(q, r.bid, r.body.question)),
  );
  app.get("/api/b/:id", async (r: any, s) =>
    s.json({
      products: await q(
        "select * from products where bid=$1 order by id desc",
        [r.bid],
      ),
      entries: await q("select * from ledger where bid=$1 order by id desc", [
        r.bid,
      ]),
    }),
  );
  app.post("/api/b/:id/product", async (r: any, s) => {
    s.json(
      await operate(tx, r.bid, r.user.id, "product", {
        ...r.body,
        category: "General",
        minimum: 3,
        cost: 0,
      }),
    );
  });
  app.post("/api/b/:id/entry", async (r: any, s) => {
    const d = z
      .object({
        kind: z.enum(["Sale", "Expense"]),
        description: text,
        amount: money,
        product: z.number().int().positive().optional(),
        qty: z.number().int().positive().default(1),
      })
      .parse(r.body);
    if (d.product && d.kind !== "Sale")
      throw new BusinessError("Invalid stock operation");
    s.json(
      await operate(
        tx,
        r.bid,
        r.user.id,
        d.product ? "checkout" : "record",
        d.product
          ? { items: [{ product: d.product, qty: d.qty }], method: "Cash" }
          : {
              ...d,
              category: "General",
              method: "Cash",
              date: new Date().toISOString().slice(0, 10),
            },
      ),
    );
  });
  app.get("/api/b/:id/records", async (r: any, s) => {
    const d = z
      .object({
        page: z.coerce.number().int().positive().max(100000).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
        search: z.string().max(120).default(""),
        kind: z
          .enum(["Sale", "Expense", "Tax payment", "Money in", "Money out"])
          .optional(),
        from: z.string().date().default("1970-01-01"),
        to: z.string().date().default("9999-12-31"),
      })
      .parse(r.query);
    const args = [r.bid, "%" + d.search + "%", d.kind || null, d.from, d.to];
    const clause =
      "from ledger where bid=$1 and description ilike $2 and ($3::text is null or kind=$3) and created>=$4::date and created<($5::date+1)";
    const [count] = await q("select count(*) n " + clause, args);
    s.json({
      page: d.page,
      limit: d.limit,
      total: Number(count.n),
      records: await q(
        "select * " + clause + " order by id desc limit $6 offset $7",
        [...args, d.limit, (d.page - 1) * d.limit],
      ),
    });
  });
  app.use("/api", (_, s) => s.sendStatus(404));
  app.use((e: any, r: any, s: any, n: any) =>
    s
      .status(400)
      .json({
        error:
          e instanceof BusinessError
            ? e.message
            : e.code === "23505"
              ? "That record already exists."
              : e.message === "Insufficient stock"
                ? e.message
                : "Check the details and try again.",
      }),
  );
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("dist"));
    app.get("/{*path}", (_, s) => s.sendFile(path.resolve("dist/index.html")));
  } else {
    const { createServer } = await import("vite");
    app.use(
      (
        await createServer({
          server: {
            middlewareMode: true,
            allowedHosts: true,
            fs: {
              deny: [
                "**/data/**",
                "**/server.ts",
                "**/.env*",
                "**/.git/**",
                "**/*.pem",
              ],
            },
          },
          appType: "spa",
        })
      ).middlewares,
    );
  }
  app.listen(Number(process.env.PORT) || 3000, "0.0.0.0");
}
main();
