import classNames from "classnames";
import { Animator, Decoder } from "gifler";
import { GifReader } from "omggif";
import { RefCallback, useCallback, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";
import { useFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_fetch";
import { fetchBinary } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface Props {
  interactive?: boolean;
  src: string;
}

/**
 * クリックすると再生・一時停止を切り替えます。
 */
export const PausableMovie = ({ interactive = true, src }: Props) => {
  const { data, isLoading } = useFetch(src, fetchBinary);

  const animatorRef = useRef<Animator>(null);
  const canvasCallbackRef = useCallback<RefCallback<HTMLCanvasElement>>(
    (el) => {
      animatorRef.current?.stop();

      if (el === null || data === null) {
        return;
      }

      const reader = new GifReader(new Uint8Array(data));
      const frames = Decoder.decodeFramesSync(reader);
      const animator = new Animator(reader, frames);

      animator.animateInCanvas(el);
      animator.onFrame(frames[0]!);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIsPlaying(false);
        animator.stop();
      } else {
        setIsPlaying(true);
        animator.start();
      }

      animatorRef.current = animator;
    },
    [data],
  );

  const [isPlaying, setIsPlaying] = useState(true);
  const handleClick = useCallback(() => {
    if (!interactive) {
      return;
    }

    setIsPlaying((currentIsPlaying) => {
      if (currentIsPlaying) {
        animatorRef.current?.stop();
      } else {
        animatorRef.current?.start();
      }
      return !currentIsPlaying;
    });
  }, [interactive]);

  if (isLoading || data === null) {
    return null;
  }

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      {interactive ? (
        <button
          aria-label="動画プレイヤー"
          className="group relative block h-full w-full"
          onClick={handleClick}
          type="button"
        >
          <canvas ref={canvasCallbackRef} className="w-full" />
          <div
            className={classNames(
              "absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cax-overlay/50 text-3xl text-cax-surface-raised",
              {
                "opacity-0 group-hover:opacity-100": isPlaying,
              },
            )}
          >
            <FontAwesomeIcon iconType={isPlaying ? "pause" : "play"} styleType="solid" />
          </div>
        </button>
      ) : (
        <div className="h-full w-full">
          <canvas ref={canvasCallbackRef} className="w-full" />
        </div>
      )}
    </AspectRatioBox>
  );
};
