import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // admin, production_supervisor, cutter
  permissions: text("permissions").notNull(), // view, register, edit
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  fabricType: text("fabric_type").notNull(),
  fabricMetersPerPiece: text("fabric_meters_per_piece").notNull(),
  notions: json("notions").$type<Array<{ name: string; quantity: string }>>().notNull(),
  notes: text("notes"),
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
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  cutDate: timestamp("cut_date").notNull(),
  status: text("status").notNull(), // waiting, internal_production, external_workshop, returned_ok, returned_issues
  workshopId: integer("workshop_id"),
  sentToProductionDate: timestamp("sent_to_production_date"),
  expectedReturnDate: timestamp("expected_return_date"),
  actualReturnDate: timestamp("actual_return_date"),
  conferenceResult: text("conference_result"), // ok, problem
  observations: text("observations"),
  imageUrl: text("image_url"),
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
export const insertBatchHistorySchema = createInsertSchema(batchHistory).omit({ id: true, timestamp: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Batch = typeof batches.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type BatchHistory = typeof batchHistory.$inferSelect;
export type InsertBatchHistory = z.infer<typeof insertBatchHistorySchema>;
