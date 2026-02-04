"use client";

import BouncyButton from "./BouncyButton";

export default function SettingsPanel({
                                          open,
                                          onClose,
                                          phase,
                                          selectedPlaylistName,
                                          status,
                                          nowPlaying,
                                          isPlaying,
                                          hasActiveDevice,
                                          onRefresh,
                                          onChangePlaylist,
                                          onSetupAuth,
                                      }: {
    open: boolean;
    onClose: () => void;
    phase: "pick" | "player";
    selectedPlaylistName: string;
    status: string;
    nowPlaying: string;
    isPlaying: boolean;
    hasActiveDevice: boolean;
    onRefresh: () => void;
    onChangePlaylist: () => void;
    onSetupAuth: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* dim backdrop */}
            <button
                aria-label="Close settings"
                onClick={onClose}
                className="absolute inset-0 bg-black/50"
            />

            {/* panel */}
            <div className="absolute right-3 top-3 left-3 sm:left-auto sm:w-[420px] rounded-3xl bg-white/15 border border-white/20 backdrop-blur p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="text-white">
                        <div className="text-lg font-extrabold">Settings</div>
                        <div className="text-xs text-white/80">Debug + controls</div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-full w-10 h-10 grid place-items-center bg-white/15 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="mt-4 space-y-3 text-white">
                    <div className="rounded-2xl bg-black/15 border border-white/15 p-4">
                        <div className="text-xs text-white/75">Selected playlist</div>
                        <div className="font-semibold">{selectedPlaylistName}</div>
                    </div>

                    <div className="rounded-2xl bg-black/15 border border-white/15 p-4">
                        <div className="text-xs text-white/75">Now playing</div>
                        <div className="font-mono text-sm break-words">{nowPlaying}</div>
                    </div>

                    <div className="rounded-2xl bg-black/15 border border-white/15 p-4">
                        <div className="text-xs text-white/75">Status</div>
                        <div className="font-mono text-sm break-words">{status}</div>

                        <div className="mt-3 text-xs text-white/80 space-y-1">
                            <div>Phase: <span className="font-semibold">{phase}</span></div>
                            <div>isPlaying: <span className="font-semibold">{String(isPlaying)}</span></div>
                            <div>activeDevice: <span className="font-semibold">{String(hasActiveDevice)}</span></div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <BouncyButton variant="ghost" onClick={onRefresh}>
                            Refresh
                        </BouncyButton>

                        <BouncyButton variant="ghost" onClick={onChangePlaylist}>
                            Change playlist
                        </BouncyButton>

                        <BouncyButton variant="ghost" onClick={onSetupAuth}>
                            Setup auth
                        </BouncyButton>
                    </div>

                    <div className="text-xs text-white/70">
                        Main screen hides song/status for guessing. Your Pi can still poll <span className="font-mono">/api/pi/now-playing</span>.
                    </div>
                </div>
            </div>
        </div>
    );
}
