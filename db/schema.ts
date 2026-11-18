// db/schema.ts
import { pgTable, integer, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const backlogStatusEnum = pgEnum("backlog_status", [
  "unplayed",
  "in_progress",
  "beaten",
  "dropped",
]);

export const games = pgTable("games", {
  appId: integer("app_id").primaryKey(),
  name: text("name").notNull(),
  playtimeMinutes: integer("playtime_minutes").default(0).notNull(),
  iconUrl: text("icon_url"),
  lastPlayedAt: timestamp("last_played_at"),
  
  // Personal backlog tracking
  status: backlogStatusEnum("status").default("unplayed").notNull(),
  
  // Populated later in Module 3 (Genres, Controller Support, etc.)
  genres: jsonb("genres").$type<string[]>().default([]),
  categories: jsonb("categories").$type<string[]>().default([]),
  isEnriched: integer("is_enriched").default(0).notNull(), // 0 = false, 1 = true
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;