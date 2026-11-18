// app/actions/games.ts
"use server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateGameStatus(
  appId: number,
  status: "unplayed" | "in_progress" | "beaten" | "dropped"
) {
  await db
    .update(games)
    .set({ status, updatedAt: new Date() })
    .where(eq(games.appId, appId));

  revalidatePath("/");
}