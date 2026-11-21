import {
  pgTable,
  serial,
  integer,
  text,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  bid: integer("bid").notNull(),
  lender: text("lender").notNull(),
  purpose: text("purpose").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  status: text("status").notNull(),
  created: timestamp("created", { withTimezone: true }).defaultNow(),
});
