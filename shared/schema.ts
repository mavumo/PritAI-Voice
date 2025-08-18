import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  status: text("status").notNull(), // 'active', 'completed', 'ended'
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  callSid: text("call_sid").unique(),
  sessionId: text("session_id"),
  matterType: text("matter_type"),
  summary: text("summary"),
  audioUrl: text("audio_url"),
});

export const intakes = pgTable("intakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  matterType: text("matter_type").notNull(),
  matterSummary: text("matter_summary").notNull(),
  urgency: text("urgency").default("normal"), // 'low', 'normal', 'high', 'emergency'
  status: text("status").default("pending"), // 'pending', 'reviewed', 'scheduled', 'completed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  additionalInfo: jsonb("additional_info"),
});

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'call', 'intake', 'system', 'error'
  message: text("message").notNull(),
  details: jsonb("details"),
  level: text("level").default("info"), // 'info', 'warning', 'error'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  relatedId: text("related_id"), // related call/intake id
});

export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessHoursEnabled: boolean("business_hours_enabled").default(true),
  responseMode: text("response_mode").default("friendly"), // 'professional', 'friendly', 'concise'
  twilioWebhookUrl: text("twilio_webhook_url"),
  openaiApiStatus: text("openai_api_status").default("connected"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Insert schemas
export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  startTime: true,
});

export const insertIntakeSchema = createInsertSchema(intakes).omit({
  id: true,
  createdAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Intake = typeof intakes.$inferSelect;
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferSelect;
