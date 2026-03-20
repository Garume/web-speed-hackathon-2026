import { useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

interface Props {
  src: string;
}

/**
 * GIF の即時ダウンロードを避けるため、クリック時にだけ読み込みます。
 */
export const PausableMovie = ({ src }: Props) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      {isLoaded ? (
        <img alt="" className="h-full w-full object-cover" decoding="async" src={src} />
      ) : (
        <button
          aria-label="動画プレイヤー"
          className="bg-cax-surface-subtle text-cax-text-muted relative block h-full w-full"
          onClick={() => setIsLoaded(true)}
          type="button"
        >
          <div className="absolute inset-0 bg-linear-to-br from-cax-brand-soft via-cax-surface-subtle to-cax-accent-soft opacity-80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="bg-cax-overlay/60 text-cax-surface-raised flex h-16 w-16 items-center justify-center rounded-full text-3xl">
              <FontAwesomeIcon iconType="play" styleType="solid" />
            </span>
            <span className="text-sm font-bold">タップして GIF を再生</span>
          </div>
        </button>
      )}
    </AspectRatioBox>
  );
};
