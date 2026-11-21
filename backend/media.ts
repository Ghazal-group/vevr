import { BusinessError } from "./operations";
import { z } from "zod";
export function mediaRoutes(app: any, q: any) {
  const route = "/api/b/:id/media/:kind/:record";
  const valid = async (r: any) => {
    const t = r.params.kind;
    if (!["receipt", "product"].includes(t))
      throw new BusinessError("Unsupported attachment type");
    const id = z.coerce.number().int().positive().parse(r.params.record);
    const rows = await q(
      `select id from ${t === "receipt" ? "ledger" : "products"} where id=$1 and bid=$2${t === "receipt" ? " and kind='Expense'" : ""}`,
      [id, r.bid],
    );
    if (!rows.length) throw new BusinessError("Record not found");
    return [t, id];
  };
  app.post(route, async (r: any, s: any) => {
    const [t, id] = await valid(r);
    const data = z.string().max(720000).parse(r.body.image);
    const b = Buffer.from(data, "base64");
    const mime =
      b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
        ? "image/png"
        : b.subarray(0, 3).toString("hex") === "ffd8ff"
          ? "image/jpeg"
          : null;
    if (!mime || b.length > 512000)
      throw new BusinessError("Choose a JPEG or PNG under 500 KB");
    await q(
      "insert into media(bid,kind,record_id,mime,bytes) values($1,$2,$3,$4,$5) on conflict(bid,kind,record_id) do update set mime=excluded.mime,bytes=excluded.bytes",
      [r.bid, t, id, mime, b],
    );
    s.json({ ok: true });
  });
  app.get(route, async (r: any, s: any) => {
    const [t, id] = await valid(r);
    const [img] = await q(
      "select bytes,mime from media where bid=$1 and kind=$2 and record_id=$3",
      [r.bid, t, id],
    );
    if (!img) return s.sendStatus(404);
    s.set("X-Content-Type-Options", "nosniff")
      .type(img.mime)
      .send(Buffer.from(img.bytes));
  });
}
