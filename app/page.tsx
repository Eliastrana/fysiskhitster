"use client";

import { useEffect, useMemo, useState } from "react";
import PlaylistPicker from "@/components/PlaylistPicker";
import BouncyButton from "@/components/BouncyButton";
import PlayPauseOrb from "@/components/PlayPauseOrb";
import SettingsPanel from "@/components/SettingsPanel";

type Playlist = { id: string; name: string; uri: string };
type PlayerPhase = "pick" | "player";

export default function Page() {
  const [phase, setPhase] = useState<PlayerPhase>("pick");

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedUri, setSelectedUri] = useState<string>("");

  const selectedPlaylist = useMemo(
      () => playlists.find((p) => p.uri === selectedUri) || null,
      [playlists, selectedUri]
  );

  // auth-gate
  const [needsLogin, setNeedsLogin] = useState<boolean>(false);

  // hidden info (only shown in settings panel)
  const [status, setStatus] = useState<string>("");
  const [nowPlaying, setNowPlaying] = useState<string>("(unknown)");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasActiveDevice, setHasActiveDevice] = useState<boolean>(true);

  const [settingsOpen, setSettingsOpen] = useState(false);

  async function loadPlaylists() {
    setStatus("Loading playlists…");

    const res = await fetch("/api/spotify/playlists");

    if (res.status === 401) {
      setNeedsLogin(true);
      setPlaylists([]);
      setSelectedUri("");
      setStatus("Ikke logget inn. Trykk 'Logg inn med Spotify'.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Failed to load playlists (${res.status}).`);
      return;
    }

    setNeedsLogin(false);

    const items = (data.items ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      uri: p.uri,
    }));

    setPlaylists(items);
    setStatus(`Loaded ${items.length} playlists.`);
  }

  async function refreshState() {
    const res = await fetch("/api/spotify/state");

    if (res.status === 401) {
      setNeedsLogin(true);
      setHasActiveDevice(true);
      setIsPlaying(false);
      setNowPlaying("(not logged in)");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    setNeedsLogin(false);

    if (data?.active === false) {
      setHasActiveDevice(false);
      setIsPlaying(false);
      setNowPlaying("(no active Spotify device)");
      return;
    }

    setHasActiveDevice(true);

    const playing = !!data?.is_playing;
    setIsPlaying(playing);

    const item = data?.item;
    if (item) {
      const title = item.name ?? "";
      const artist = item.artists?.[0]?.name ?? "Unknown";
      setNowPlaying(`${title} — ${artist}`);
    } else {
      setNowPlaying("(nothing playing)");
    }
  }

  async function startPlaylist() {
    if (!selectedUri) {
      setStatus("Select a playlist first.");
      return;
    }
    setStatus("Starting playback…");

    const res = await fetch("/api/spotify/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistUri: selectedUri }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setNeedsLogin(true);
      setStatus("Ikke logget inn. Trykk 'Logg inn med Spotify'.");
      return;
    }

    if (data.ok) {
      setStatus("Playing.");
      setPhase("player");
    } else {
      setStatus(`Play failed (${data.status}). Premium required / no active device?`);
    }

    await refreshState();
  }

  async function togglePause() {
    setStatus(isPlaying ? "Pausing…" : "Resuming…");

    const res = await fetch("/api/spotify/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isPlaying ? "pause" : "resume" }),
    });

    if (res.status === 401) {
      setNeedsLogin(true);
      setStatus("Ikke logget inn. Trykk 'Logg inn med Spotify'.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    setStatus(data.ok ? (isPlaying ? "Paused." : "Playing.") : `Failed (${data.status}).`);
    await refreshState();
  }

  async function next() {
    setStatus("Skipping to next…");

    const res = await fetch("/api/spotify/next", { method: "POST" });

    if (res.status === 401) {
      setNeedsLogin(true);
      setStatus("Ikke logget inn. Trykk 'Logg inn med Spotify'.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    setStatus(data.ok ? "Skipped." : `Next failed (${data.status}). Premium required.`);
    setTimeout(() => refreshState().catch(() => {}), 700);
  }

  async function getSetupAuthUrl() {
    const res = await fetch("/api/spotify/setup/auth-url");
    const data = await res.json().catch(() => ({}));
    if (data?.url) window.open(data.url, "_blank");
    else setStatus("Setup URL failed. Check SPOTIFY_CLIENT_ID and setup routes.");
  }

  function resetToPicker() {
    setPhase("pick");
    setSettingsOpen(false);
    setStatus("Choose a playlist and press Start.");
  }

  useEffect(() => {
    loadPlaylists().catch(() => {});
    refreshState().catch(() => {});
    const t = setInterval(() => refreshState().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);

  return (
      <main className="min-h-screen relative overflow-hidden">
        {/* background */}
        <div className="absolute inset-0 bg-cyan-900" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[420px] w-[420px] rounded-full bg-yellow-300/25 blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
          {/* top bar */}
          <div className="flex items-center justify-between">
            <div className="text-white">
              <div className="text-lg font-extrabold tracking-tight">
                {phase === "pick" ? "Velg en spilleliste" : "Fysisk Hitster"}
              </div>
            </div>

            <button
                aria-label="Open settings"
                onClick={() => setSettingsOpen(true)}
                className="group inline-flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/25 w-11 h-11 backdrop-blur transition active:scale-95"
            >
              <svg
                  className="h-5 w-5 opacity-95 group-hover:rotate-12 transition"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
              >
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                <path d="M19.4 15a7.7 7.7 0 0 0 .1-1l2-1.2-2-3.4-2.3.7a7.3 7.3 0 0 0-.8-.6l-.3-2.4H10l-.3 2.4c-.3.2-.6.4-.8.6l-2.3-.7-2 3.4 2 1.2a7.7 7.7 0 0 0 0 2l-2 1.2 2 3.4 2.3-.7c.2.2.5.4.8.6L10 22h4l.3-2.4c.3-.2.6-.4.8-.6l2.3.7 2-3.4-2-1.2Z" />
              </svg>
            </button>
          </div>

          {/* content */}
          <div className="mt-6">
            {phase === "pick" ? (
                needsLogin ? (
                    <div className="rounded-3xl bg-white/15 border border-white/20 backdrop-blur p-6 shadow-xl text-white">
                      <div className="text-xl font-extrabold">Logg inn</div>
                      <div className="mt-2 text-white/90 text-sm">
                        For å hente spillelistene dine må du logge inn med Spotify.
                      </div>

                      <div className="mt-5">
                        <BouncyButton onClick={getSetupAuthUrl} variant="primary">
                          Logg inn med Spotify
                        </BouncyButton>
                      </div>

                      <div className="mt-3 text-xs text-white/70">
                        Etter innlogging blir du sendt tilbake hit automatisk.
                      </div>

                      {/* hidden status for debugging (still not exposing song) */}
                      {status ? (
                          <div className="mt-4 text-xs text-white/60 font-mono break-words">
                            {status}
                          </div>
                      ) : null}
                    </div>
                ) : (
                    <div className="rounded-3xl bg-white/15 border border-white/20 backdrop-blur p-5 shadow-xl">
                      <PlaylistPicker playlists={playlists} selectedUri={selectedUri} onSelect={setSelectedUri} />

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-white/90 text-sm">
                          {selectedPlaylist ? (
                              <>
                                Selected: <span className="font-semibold">{selectedPlaylist.name}</span>
                              </>
                          ) : (
                              "Pick a playlist to start."
                          )}
                        </div>

                        <BouncyButton onClick={startPlaylist} disabled={!selectedUri} variant="primary">
                          Start
                        </BouncyButton>
                      </div>
                    </div>
                )
            ) : (
                <div className="relative min-h-[calc(100vh-120px)]">
                  {/* Perfect center: Play/Pause */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <PlayPauseOrb isPlaying={isPlaying} onClick={togglePause} disabled={!hasActiveDevice} />
                  </div>

                  {/* Below the center: Next */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[140px]">
                    <div className="flex flex-col items-center gap-4">
                      <BouncyButton onClick={next} variant="ghost" disabled={!hasActiveDevice}>
                        Neste
                      </BouncyButton>

                      {!hasActiveDevice && (
                          <div className="text-white/90 text-sm text-center max-w-sm">
                            Ingen aktiv spotify enhet funnet. Åpne Spotify på en enhet og spill av en sang.
                          </div>
                      )}
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>

        <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            phase={phase}
            selectedPlaylistName={selectedPlaylist?.name ?? "(none)"}
            status={status || "—"}
            nowPlaying={nowPlaying}
            isPlaying={isPlaying}
            hasActiveDevice={hasActiveDevice}
            onRefresh={refreshState}
            onChangePlaylist={resetToPicker}
            onSetupAuth={getSetupAuthUrl}
        />
      </main>
  );
}
