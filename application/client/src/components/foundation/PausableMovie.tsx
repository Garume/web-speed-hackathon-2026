import classNames from "classnames";
import { useCallback, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

interface Props {
  interactive?: boolean;
  src: string;
}

export const PausableMovie = ({ interactive = true, src }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useGifFallback, setUseGifFallback] = useState(false);
  const mp4Src = src.replace(/\.gif$/, ".mp4");

  const handleClick = useCallback(() => {
    if (!interactive || useGifFallback) {
      return;
    }

    if (videoRef.current?.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [interactive, useGifFallback]);

  const media = useGifFallback ? (
    <img alt="" className="h-full w-full object-cover" draggable={false} src={src} />
  ) : (
    <video
      ref={videoRef}
      autoPlay
      className="h-full w-full object-cover"
      loop
      muted
      onError={() => setUseGifFallback(true)}
      playsInline
      src={mp4Src}
    />
  );

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      <button
        aria-label="動画プレイヤー"
        className={classNames("group relative block h-full w-full", {
          "pointer-events-none": !interactive,
        })}
        onClick={interactive ? handleClick : undefined}
        tabIndex={interactive ? undefined : -1}
        type="button"
      >
        {media}
        {interactive ? (
          <div
            className={classNames(
              "pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cax-overlay/50 text-3xl text-cax-surface-raised",
              {
                "opacity-0 group-hover:opacity-100": isPlaying && !useGifFallback,
              },
            )}
          >
            <FontAwesomeIcon
              iconType={useGifFallback ? "play" : isPlaying ? "pause" : "play"}
              styleType="solid"
            />
          </div>
        ) : null}
      </button>
    </AspectRatioBox>
  );
};
