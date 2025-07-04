import { pgTable, text, serial, integer, timestamp, json, decimal, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // admin, production_supervisor, cutter
  permissions: json("permissions").$type<{
    products: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    workshops: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    users: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    batches: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  }>().default({
    products: { view: false, create: false, edit: false, delete: false },
    workshops: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    batches: { view: false, create: false, edit: false, delete: false },
  }),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  fabricType: text("fabric_type").notNull(),
  fabricMetersPerPiece: text("fabric_meters_per_piece").notNull(),
  notions: json("notions").$type<Array<{ name: string; quantity: string }>>().default([]),
  notes: text("notes"),
  availableColors: json("available_colors").$type<string[]>().default([]),
  availableSizes: json("available_sizes").$type<string[]>().default([]),
  productionValue: decimal("production_value", { precision: 10, scale: 2 }).default('0'),
  isActive: integer("is_active").notNull().default(1)
});

export const workshops = pgTable("workshops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  manager: text("manager").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  serviceType: text("service_type").notNull(),
  capacity: text("capacity"),
  color: text("color").notNull(), // for calendar display
  scheduleOrder: integer("schedule_order").notNull().default(1),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  cutDate: timestamp("cut_date").notNull(),
  status: text("status").notNull(), // waiting, internal_production, external_workshop, returned_ok, returned_issues
  workshopId: integer("workshop_id"),
  sentToProductionDate: timestamp("sent_to_production_date"),
  expectedReturnDate: timestamp("expected_return_date"),
  actualReturnDate: timestamp("actual_return_date"),
  conferenceResult: text("conference_result"), // ok, problem
  observations: text("observations"),
  imageUrl: text("image_url"),
  paid: boolean("paid").notNull().default(false), // Payment status for financial tracking
  // Temporary compatibility fields
  productId: integer("product_id"),
  quantity: integer("quantity")
});

export const batchProducts = pgTable("batch_products", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  selectedColor: text("selected_color"),
  selectedSize: text("selected_size")
});

export const batchHistory = pgTable("batch_history", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  action: text("action").notNull(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  notes: text("notes"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertWorkshopSchema = createInsertSchema(workshops).omit({ id: true });
export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, code: true });
export const insertBatchProductSchema = createInsertSchema(batchProducts).omit({ id: true });
export const insertBatchHistorySchema = createInsertSchema(batchHistory).omit({ id: true, timestamp: true });

// Financial invoice schema for tracking workshop payments
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshops.id),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidDate: timestamp("paid_date"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, paid, overdue
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for batches included in invoices
export const invoiceBatches = pgTable("invoice_batches", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  batchId: integer("batch_id").notNull().references(() => batches.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertInvoiceBatchSchema = createInsertSchema(invoiceBatches).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Batch = typeof batches.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type BatchProduct = typeof batchProducts.$inferSelect;
export type InsertBatchProduct = z.infer<typeof insertBatchProductSchema>;
export type BatchHistory = typeof batchHistory.$inferSelect;
export type InsertBatchHistory = z.infer<typeof insertBatchHistorySchema>;

// Financial types
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceBatch = typeof invoiceBatches.$inferSelect;
export type InsertInvoiceBatch = z.infer<typeof insertInvoiceBatchSchema>;
