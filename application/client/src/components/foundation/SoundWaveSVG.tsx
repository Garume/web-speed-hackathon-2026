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
    max: 0,
    peaks: [],
  });

  useEffect(() => {
    let cancelled = false;
    // Defer waveform loading slightly to avoid blocking LCP
    const timer = setTimeout(() => {
      fetch(`/api/v1/sounds/${soundId}/waveform`)
        .then((r) => r.json())
        .then((data: ParsedData) => {
          if (!cancelled) {
            setPeaks(data);
          }
        })
        .catch(() => {});
    }, 100);
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
