// components/AcceptedAnswerPicker.tsx
"use client";

import { useState, useMemo } from "react";
import { Game } from "@/db/schema";
import { updateGameStatus } from "@/app/actions/games";

export default function AcceptedAnswerPicker({
  initialGames,
}: {
  initialGames: Game[];
}) {
  const [playtimeFilter, setPlaytimeFilter] = useState<"zero" | "under2" | "all">("zero");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [controllerOnly, setControllerOnly] = useState<boolean>(false);
  const [pickedGameId, setPickedGameId] = useState<number | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // 1. Dynamically collect all available genres from your enriched games
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    initialGames.forEach((g) => {
      g.genres?.forEach((genre) => genreSet.add(genre));
    });
    return Array.from(genreSet).sort();
  }, [initialGames]);

  // 2. Filter out beaten/dropped games and apply active vibe filters
  const eligibleGames = useMemo(() => {
    return initialGames.filter((game) => {
      if (game.status === "beaten" || game.status === "dropped") return false;

      if (playtimeFilter === "zero" && game.playtimeMinutes > 0) return false;
      if (playtimeFilter === "under2" && game.playtimeMinutes >= 120) return false;

      if (selectedGenre !== "ALL" && !game.genres?.includes(selectedGenre)) {
        return false;
      }

      if (controllerOnly) {
        const hasController = game.categories?.some((c) =>
          c.toLowerCase().includes("controller")
        );
        if (!hasController) return false;
      }

      return true;
    });
  }, [initialGames, playtimeFilter, selectedGenre, controllerOnly]);

  // 3. Pick a random game from the eligible pool (avoiding immediate repeats)
  const pickRandomGame = () => {
    if (eligibleGames.length === 0) {
      setPickedGameId(null);
      return;
    }
    const pool =
      eligibleGames.length > 1
        ? eligibleGames.filter((g) => g.appId !== pickedGameId)
        : eligibleGames;

    const randomGame = pool[Math.floor(Math.random() * pool.length)];
    setImgError(false);
    setPickedGameId(randomGame.appId);
  };

  const activeGame = useMemo(
    () => eligibleGames.find((g) => g.appId === pickedGameId) || null,
    [eligibleGames, pickedGameId]
  );

  const handleStatusChange = async (
    status: "in_progress" | "beaten" | "dropped"
  ) => {
    if (!activeGame) return;
    setIsUpdating(true);
    await updateGameStatus(activeGame.appId, status);
    setIsUpdating(false);
    pickRandomGame(); // Automatically roll the next candidate
  };

  // Steam vertical cover art URL with fallback to horizontal header
  const coverUrl = activeGame
    ? imgError
      ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${activeGame.appId}/header.jpg`
      : `https://shared.steamstatic.com/store_item_assets/steam/apps/${activeGame.appId}/library_600x900.jpg`
    : "";

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Playtime Bucket */}
          <div className="flex gap-2">
            {[
              { id: "zero", label: "0.0 hrs (Shame Pile)" },
              { id: "under2", label: "< 2 hrs (Barely Touched)" },
              { id: "all", label: "All Unfinished" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPlaytimeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  playtimeFilter === tab.id
                    ? "bg-amber-500 text-zinc-950 font-semibold"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Genre Dropdown & Controller Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Genres ({eligibleGames.length})</option>
              {availableGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={controllerOnly}
                onChange={(e) => setControllerOnly(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              Controller Support
            </label>
          </div>
        </div>

        {/* Main CTA Button */}
        <button
          onClick={pickRandomGame}
          disabled={eligibleGames.length === 0}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-lg text-sm transition-colors cursor-pointer"
        >
          {eligibleGames.length === 0
            ? "No games match these filters"
            : activeGame
            ? `Reroll Accepted Answer (${eligibleGames.length} candidates)`
            : `Find Accepted Answer (${eligibleGames.length} candidates)`}
        </button>
      </div>

      {/* Accepted Answer Reveal Card */}
      {activeGame && (
        <div className="bg-zinc-900 border-2 border-emerald-500/60 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center">
          <img
            src={coverUrl}
            alt={activeGame.name}
            onError={() => setImgError(true)}
            className="w-44 h-64 object-cover rounded-lg shadow-lg bg-zinc-800 shrink-0"
          />

          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span>✓</span> Accepted Answer
            </div>

            <div>
              <h2 className="text-2xl font-bold text-zinc-100">
                {activeGame.name}
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                Playtime: {(activeGame.playtimeMinutes / 60).toFixed(1)} hrs
              </p>
            </div>

            {/* Genre Pills */}
            {activeGame.genres && activeGame.genres.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                {activeGame.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Direct Steam Launch + Status Actions */}
            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2.5">
              <a
                href={`steam://run/${activeGame.appId}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors"
              >
                ▶ Launch on Steam
              </a>

              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange("in_progress")}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs transition-colors"
              >
                Mark Playing
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange("beaten")}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs transition-colors"
              >
                Mark Beaten
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange("dropped")}
                className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/50 rounded-lg text-xs transition-colors"
              >
                Drop Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}