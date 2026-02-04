"use client";

import { useEffect, useState } from "react";

type Playlist = { id: string; name: string; uri: string };

export default function Page() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistUri, setPlaylistUri] = useState("");
  const [status, setStatus] = useState<string>("");
  const [nowPlaying, setNowPlaying] = useState<string>("(unknown)");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  async function loadPlaylists() {
    setStatus("Loading playlists…");
    const res = await fetch("/api/spotify/playlists");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Failed to load playlists (${res.status}). Check env + refresh token.`);
      return;
    }
    const items = (data.items ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      uri: p.uri
    }));
    setPlaylists(items);
    setStatus(`Loaded ${items.length} playlists.`);
  }

  async function refreshState() {
    const res = await fetch("/api/spotify/state");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const playing = !!data?.is_playing;
    setIsPlaying(playing);

    const item = data?.item;
    if (item) {
      const title = item.name ?? "";
      const artist = item.artists?.[0]?.name ?? "Unknown";
      setNowPlaying(`${title} — ${artist}`);
    } else {
      setNowPlaying("(nothing playing / no active device)");
    }
  }

  async function play() {
    if (!playlistUri) {
      setStatus("Select a playlist first.");
      return;
    }
    setStatus("Starting playback…");
    const res = await fetch("/api/spotify/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistUri })
    });
    const data = await res.json();
    setStatus(data.ok ? "Playing." : `Play failed (${data.status}). Premium required.`);
    await refreshState();
  }

  async function togglePause() {
    setStatus(isPlaying ? "Pausing…" : "Resuming…");
    const res = await fetch("/api/spotify/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isPlaying ? "pause" : "resume" })
    });
    const data = await res.json();
    setStatus(data.ok ? (isPlaying ? "Paused." : "Playing.") : `Failed (${data.status}).`);
    await refreshState();
  }

  async function next() {
    setStatus("Skipping to next…");
    const res = await fetch("/api/spotify/next", { method: "POST" });
    const data = await res.json();
    setStatus(data.ok ? "Skipped." : `Next failed (${data.status}). Premium required.`);
    // give Spotify a moment to advance
    setTimeout(() => refreshState().catch(() => {}), 700);
  }

  async function getSetupAuthUrl() {
    const res = await fetch("/api/spotify/setup/auth-url");
    const data = await res.json();
    if (data?.url) {
      window.open(data.url, "_blank");
    } else {
      alert("Missing SPOTIFY_CLIENT_ID or setup route error.");
    }
  }

  useEffect(() => {
    loadPlaylists().catch(() => {});
    refreshState().catch(() => {});
    const t = setInterval(() => refreshState().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);

  return (
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Spotify Printer Player</h1>
          <p className="text-sm text-zinc-600">
            Select playlist → Play → Pause/Resume → Next.
            <br />
            Your Pi polls <code className="px-1 bg-zinc-100 rounded">/api/pi/now-playing</code> and prints when the track changes.
          </p>
        </header>

        <div className="p-4 rounded border space-y-3">
          <div className="text-sm text-zinc-600">Status</div>
          <div className="font-mono">{status || "—"}</div>
          <div className="text-sm text-zinc-600 mt-2">Now playing</div>
          <div className="font-mono">{nowPlaying}</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Playlist</label>
          <select
              className="w-full border rounded p-2"
              value={playlistUri}
              onChange={(e) => setPlaylistUri(e.target.value)}
          >
            <option value="">Select a playlist…</option>
            {playlists.map((p) => (
                <option key={p.id} value={p.uri}>
                  {p.name}
                </option>
            ))}
          </select>

          <div className="flex gap-3 pt-2">
            <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={play}>
              Play
            </button>
            <button className="px-4 py-2 rounded border" onClick={togglePause}>
              {isPlaying ? "Pause" : "Resume"}
            </button>
            <button className="px-4 py-2 rounded bg-black text-white" onClick={next}>
              Next
            </button>
          </div>
        </div>

      </main>
  );
}
