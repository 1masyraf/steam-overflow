// app/actions/sync.ts
"use server";

import { db } from "@/db";
import { games } from "@/db/schema";
import { getSteamLibrary } from "@/lib/steamapi";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function syncSteamLibrary(steamId: string) {
  const steamGames = await getSteamLibrary(steamId);
  if (!steamGames.length) return { count: 0 };

  const values = steamGames.map((g) => ({
    appId: g.appid,
    name: g.name,
    playtimeMinutes: g.playtime_forever,
    iconUrl: g.img_icon_url,
    lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : null,
    // Auto-mark as 'in_progress' if played > 2 hours on initial import
    status: (g.playtime_forever > 120 ? "in_progress" : "unplayed") as "in_progress" | "unplayed",
  }));

  await db
    .insert(games)
    .values(values)
    .onConflictDoUpdate({
      target: games.appId,
      set: {
        name: sql`excluded.name`,
        iconUrl: sql`excluded.icon_url`,
        playtimeMinutes: sql`excluded.playtime_minutes`,
        lastPlayedAt: sql`excluded.last_played_at`,
        updatedAt: new Date(),
        // Notice we do NOT overwrite `status` here so your manual edits stay safe!
      },
    });

  revalidatePath("/");
  return { count: values.length };
}