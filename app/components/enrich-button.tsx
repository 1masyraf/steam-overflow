"use client";

import { useRef, useState } from "react";
import { enrichGamesBatch } from "@/app/actions/enrich";

export default function EnrichButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const stopRef = useRef(false);

  async function handleEnrich() {
    stopRef.current = false;
    setRunning(true);
    setMessage(null);

    let total = 0;
    try {
      // Each call enriches one small batch, so loop until nothing is left
      while (!stopRef.current) {
        const { processed, remaining, rateLimited } = await enrichGamesBatch();
        total += processed;

        if (remaining === 0) {
          setMessage({ ok: true, text: `Done. Enriched ${total} games.` });
          return;
        }
        if (rateLimited) {
          setMessage({
            ok: false,
            text: `Steam rate limit hit. Enriched ${total}, ${remaining} remaining. Try again in a few minutes.`,
          });
          return;
        }
        if (processed === 0) {
          setMessage({
            ok: false,
            text: `Could not enrich the remaining ${remaining} games. Try again later.`,
          });
          return;
        }
        setMessage({ ok: true, text: `Enriched ${total}, ${remaining} remaining...` });
      }
      setMessage({ ok: true, text: `Stopped. Enriched ${total} games.` });
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to enrich metadata",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handleEnrich}
        disabled={running}
        className="bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
      >
        {running ? "Enriching..." : "Enrich Metadata"}
      </button>
      {running && (
        <button
          type="button"
          onClick={() => {
            stopRef.current = true;
          }}
          className="text-sm text-zinc-400 hover:text-zinc-200 underline"
        >
          Stop
        </button>
      )}
      {message && (
        <span className={`text-sm ${message.ok ? "text-sky-400" : "text-red-400"}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
