import { useEffect, useRef, useState } from "react";

interface ParsedData {
  max: number;
  peaks: number[];
}

interface Props {
  soundId: string;
}

export const SoundWaveSVG = ({ soundId }: Props) => {
  const uniqueIdRef = useRef(Math.random().toString(16));
  const [{ max, peaks }, setPeaks] = useState<ParsedData>({ max: 0, peaks: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/sounds/${soundId}/waveform`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ParsedData) => {
        setPeaks(data);
      })
      .catch(() => {});

    return () => {
      controller.abort();
    };
  }, [soundId]);

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
      {peaks.map((peak, idx) => {
        const ratio = max > 0 ? peak / max : 0;
        return (
          <rect
            key={`${uniqueIdRef.current}#${idx}`}
            fill="var(--color-cax-accent)"
            height={ratio}
            width="1"
            x={idx}
            y={1 - ratio}
          />
        );
      })}
    </svg>
  );
};
