// app/page.tsx
import { Suspense } from "react";
import { getSteamLibrary, type SteamGame } from "@/lib/steamapi";
import SyncButton from "./components/sync-button";
import { db } from "@/db";
import { games } from "@/db/schema";
import { asc } from "drizzle-orm";
import AcceptedAnswerPicker from "./components/accepted-answer-picker";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ steamid?: string }>;
}) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Steam <span className="text-amber-500">Overflow</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Module 1: Steam API Integration Test. Enter your public SteamID64 below.
        </p>

        {/* searchParams is runtime data, so it must be read inside Suspense with cacheComponents */}
        <Suspense fallback={<p className="text-zinc-500 text-sm">Loading...</p>}>
          <Library searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
const allGames = await db.select().from(games).orderBy(asc(games.name));

async function Library({
  searchParams,
}: {
  searchParams: Promise<{ steamid?: string }>;
}) {
  const { steamid } = await searchParams;
  const steamId = steamid?.trim();
  let games: SteamGame[] = [];
  let error: string | null = null;

  if (steamId) {
    try {
      games = await getSteamLibrary(steamId);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <>
      {/* Input Form */}
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="steamid"
            defaultValue={steamId || ""}
            placeholder="e.g. 765611980... (SteamID64)"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Fetch Library
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
            Error: {error} (Check if your Steam ID is correct and profile is public)
          </div>
        )}

        {/* Accepted Answer Picker */}
        <AcceptedAnswerPicker initialGames={allGames} />

        {/* Results Preview */}
        {steamId && !error && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold">
                Found {games.length} games in library
              </h2>
              {games.length > 0 && <SyncButton steamId={steamId} />}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-h-[500px] overflow-y-auto space-y-2">
              {games.length === 0 ? (
                <p className="text-zinc-500 text-sm">No games found or profile is private.</p>
              ) : (
                games.map((game) => (
                  <div
                    key={game.appid}
                    className="flex items-center justify-between p-2 hover:bg-zinc-800/50 rounded-lg text-sm"
                  >
                    <span className="font-medium text-zinc-200">{game.name}</span>
                    <span className="text-zinc-500 text-xs">
                      {(game.playtime_forever / 60).toFixed(1)} hrs played
                    </span>
                    <img
                      src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                      alt={`${game.name} icon`}
                      className="w-6 h-6 rounded"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
    </>
  );
}