"use client";

import { useState, useTransition } from "react";
import { syncSteamLibrary } from "@/app/actions/synclibrary";
import EnrichButton from "./enrich-button";

export default function SyncButton({ steamId }: { steamId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [synced, setSynced] = useState(false);

  function handleSync() {
    setMessage(null);
    startTransition(async () => {
      try {
        const { count } = await syncSteamLibrary(steamId);
        setMessage({ ok: true, text: `Synced ${count} games to the database.` });
        setSynced(true);
      } catch (err) {
        setMessage({
          ok: false,
          text: err instanceof Error ? err.message : "Failed to sync library",
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSync}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {isPending ? "Syncing..." : "Sync to Database"}
        </button>
        {message && (
          <span className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
            {message.text}
          </span>
        )}
      </div>
      {synced && <EnrichButton />}
    </div>
  );
}
