import React, { useState } from "react";
import { UploadCloud } from "lucide-react";
import { api } from "./tools";
export function Attachment({ bid, id, kind, present, onSaved }: any) {
  const [v, V] = useState(present ? 1 : 0),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  const [saved, Saved] = useState(false);
  const path = `b/${bid}/media/${kind}/${id}`;
  return (
    <section className="attachment">
      <label>
        <UploadCloud size={16} />
        {kind === "product" ? "Product image" : "Expense receipt"}
        {v > 0 && (
          <img
            src={"/api/" + path + "?v=" + v}
            alt={kind === "product" ? "Product photo" : "Receipt attachment"}
          />
        )}
        <input
          aria-label="Upload image"
          accept="image/png,image/jpeg"
          type="file"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            E("");
            Saved(false);
            if (f.size > 512000)
              return E("Choose a JPEG or PNG smaller than 500 KB.");
            B(true);
            try {
              const data = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result).split(",")[1]);
                r.onerror = reject;
                r.readAsDataURL(f);
              });
              await api(path, { image: data });
              V(v + 1);
              Saved(true);
              onSaved?.();
            } catch (x: any) {
              E(x.message);
            } finally {
              B(false);
            }
          }}
        />
      </label>
      <small role="status">
        {busy
          ? "Uploading…"
          : saved
            ? "Image saved to this record."
            : "Private JPEG or PNG · max 500 KB"}
      </small>
      {err && <p role="alert">{err}</p>}
    </section>
  );
}
