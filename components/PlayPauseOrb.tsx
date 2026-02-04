"use client";

export default function PlayPauseOrb({
                                         isPlaying,
                                         onClick,
                                         disabled,
                                     }: {
    isPlaying: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-col items-center">
            {/* Keep the orb centered no matter how wide the label is */}
            <div className="relative">
                {isPlaying && !disabled ? (
                    <span className="absolute inset-0 rounded-full animate-ping bg-white/35 blur-sm" />
                ) : null}

                <button
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={onClick}
                    disabled={disabled}
                    className={[
                        "relative w-44 h-44 rounded-full",
                        "grid place-items-center",
                        "shadow-2xl shadow-black/35",
                        "transition-transform duration-150 active:scale-[0.96]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isPlaying
                            ? "bg-gradient-to-br from-lime-300 via-yellow-200 to-pink-300"
                            : "bg-gradient-to-br from-cyan-300 via-purple-300 to-pink-300",
                    ].join(" ")}
                >
                    <span className="absolute inset-0 rounded-full animate-pulse bg-white/10" />

                    <span className="relative grid place-items-center rounded-full bg-black/20 w-32 h-32 backdrop-blur border border-white/25">
            {isPlaying ? (
                <div className="flex gap-3">
                    <span className="w-3 h-10 rounded bg-white" />
                    <span className="w-3 h-10 rounded bg-white" />
                </div>
            ) : (
                <svg
                    viewBox="0 0 24 24"
                    className="w-14 h-14 fill-white translate-x-[2px]"
                    aria-hidden="true"
                >
                    <path d="M8 5v14l11-7z" />
                </svg>
            )}
          </span>
                </button>
            </div>

            {/* Optional: constrain label width so it wraps nicely */}
            <div className="mt-3 w-56 text-center text-white/90 text-sm font-semibold">
                {disabled ? "Åpne Spotify på en enhet" : isPlaying ? "Tap to pause" : "Tap to play"}
            </div>
        </div>
    );
}
