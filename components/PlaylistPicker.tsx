"use client";

type Playlist = { id: string; name: string; uri: string };

export default function PlaylistPicker({
                                           playlists,
                                           selectedUri,
                                           onSelect,
                                       }: {
    playlists: Playlist[];
    selectedUri: string;
    onSelect: (uri: string) => void;
}) {
    return (
        <div>
            <div className="text-white font-semibold text-sm mb-3">
                Playlists
            </div>

            <div className="max-h-[420px] overflow-auto pr-1 space-y-2">
                {playlists.length === 0 ? (
                    <div className="text-white/85 text-sm">
                        No playlists loaded yet (or token/scopes issue).
                    </div>
                ) : (
                    playlists.map((p) => {
                        const active = p.uri === selectedUri;
                        return (
                            <button
                                key={p.id}
                                onClick={() => onSelect(p.uri)}
                                className={[
                                    "w-full text-left rounded-2xl px-4 py-3 border transition",
                                    "backdrop-blur bg-white/10 hover:bg-white/15",
                                    active ? "border-white/60 ring-2 ring-white/40" : "border-white/20",
                                ].join(" ")}
                            >
                                <div className="flex items-center gap-3">
                  <span
                      className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                          active ? "bg-white text-zinc-900 border-white" : "border-white/50",
                      ].join(" ")}
                  >
                    {active ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
                    ) : null}
                  </span>

                                    <div className="text-white font-semibold">{p.name}</div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
