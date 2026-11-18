// app/actions/enrich.ts
"use server";

import { db } from "@/db";
import { games } from "@/db/schema";
import { getSteamAppDetails } from "@/lib/steamapi";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function enrichGamesBatch(batchSize = 15) {
  // 1. Grab up to `batchSize` games that haven't been enriched yet
  const unenrichedGames = await db
    .select({ appId: games.appId, name: games.name })
    .from(games)
    .where(eq(games.isEnriched, 0))
    .limit(batchSize);

  if (unenrichedGames.length === 0) {
    return { processed: 0, remaining: 0, rateLimited: false };
  }

  let processed = 0;
  let rateLimited = false;

  for (const game of unenrichedGames) {
    try {
      const metadata = await getSteamAppDetails(game.appId);

      if (metadata) {
        await db
          .update(games)
          .set({
            genres: metadata.genres,
            categories: metadata.categories,
            isEnriched: 1, // Mark as enriched even if arrays are empty (e.g., delisted game)
            updatedAt: new Date(),
          })
          .where(eq(games.appId, game.appId));

        processed++;
      }

      // Pause 1 second between Steam Store requests to avoid 429 rate limits
      await sleep(1000);
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        rateLimited = true;
        break;
      }
      console.error(`Failed to enrich ${game.name} (${game.appId}):`, err);
    }
  }

  // 2. Count how many games are still waiting to be enriched
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(games)
    .where(eq(games.isEnriched, 0));

  revalidatePath("/");

  return {
    processed,
    remaining: count,
    rateLimited,
  };
}