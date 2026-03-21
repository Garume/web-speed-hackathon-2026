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
  const [{ max, peaks }, setPeaks] = useState<ParsedData>({
    max: 1,
    peaks: Array.from({ length: 100 }, (_, idx) => {
      const cycle = idx % 12;
      return cycle === 0 || cycle === 11 ? 0.18 : cycle < 4 || cycle > 8 ? 0.36 : 0.62;
    }),
  });

  useEffect(() => {
    let cancelled = false;
    // Defer waveform loading until after the first paint settles.
    const timer = setTimeout(() => {
      fetch(`/api/v1/sounds/${soundId}/waveform`)
        .then((r) => r.json())
        .then((data: ParsedData) => {
          if (!cancelled) {
            setPeaks(data);
          }
        })
        .catch(() => {});
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
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
