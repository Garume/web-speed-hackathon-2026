import { ReactEventHandler, useCallback, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";
import { getSoundPath } from "@web-speed-hackathon-2026/client/src/utils/get_path";

interface Props {
  sound: Models.Sound;
}

export const SoundPlayer = ({ sound }: Props) => {
  const [currentTimeRatio, setCurrentTimeRatio] = useState(0);
  const handleTimeUpdate = useCallback<ReactEventHandler<HTMLAudioElement>>((ev) => {
    const el = ev.currentTarget;
    const ratio = el.duration > 0 ? el.currentTime / el.duration : 0;
    setCurrentTimeRatio(Number.isFinite(ratio) ? ratio : 0);
  }, []);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const handleTogglePlaying = useCallback(() => {
    setIsPlaying((isPlaying) => {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      return !isPlaying;
    });
  }, []);

  return (
    <div className="bg-cax-surface-subtle flex h-full w-full items-center justify-center">
      <audio
        loop={true}
        onTimeUpdate={handleTimeUpdate}
        preload="none"
        ref={audioRef}
        src={getSoundPath(sound.id)}
      />
      <div className="p-2">
        <button
          className="bg-cax-accent text-cax-surface-raised flex h-8 w-8 items-center justify-center rounded-full text-sm hover:opacity-75"
          onClick={handleTogglePlaying}
          type="button"
        >
          <FontAwesomeIcon iconType={isPlaying ? "pause" : "play"} styleType="solid" />
        </button>
      </div>
      <div className="flex h-full min-w-0 shrink grow flex-col pt-2">
        <p className="overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap">
          {sound.title}
        </p>
        <p className="text-cax-text-muted overflow-hidden text-sm text-ellipsis whitespace-nowrap">
          {sound.artist}
        </p>
        <div className="pt-2">
          <AspectRatioBox aspectHeight={1} aspectWidth={10}>
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <div className="from-cax-brand-soft via-cax-accent-soft to-cax-brand-soft absolute inset-0 bg-linear-to-r" />
              <div
                className="bg-cax-surface-subtle absolute inset-y-0 right-0 opacity-75"
                style={{ width: `${Math.max(0, 100 - currentTimeRatio * 100)}%` }}
              />
              <div
                className="bg-cax-overlay/20 absolute inset-y-0 w-0.5"
                style={{ left: `${currentTimeRatio * 100}%` }}
              />
            </div>
          </AspectRatioBox>
        </div>
      </div>
    </div>
  );
};
