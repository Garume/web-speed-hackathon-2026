import { useEffect, useRef, useState } from "react";

interface ParsedData {
  max: number;
  peaks: number[];
}

async function calculate(data: ArrayBuffer): Promise<ParsedData> {
  const audioCtx = new AudioContext();
  try {
    const buffer = await audioCtx.decodeAudioData(data.slice(0));
    const leftData = Array.from(buffer.getChannelData(0), Math.abs);
    const rightChannelIndex = buffer.numberOfChannels > 1 ? 1 : 0;
    const rightData = Array.from(buffer.getChannelData(rightChannelIndex), Math.abs);

    const normalized = leftData.map((leftValue, index) => (leftValue + rightData[index]!) / 2);
    const chunkSize = Math.ceil(normalized.length / 100);
    const peaks: number[] = [];

    for (let index = 0; index < normalized.length; index += chunkSize) {
      const chunk = normalized.slice(index, index + chunkSize);
      const total = chunk.reduce((sum, value) => sum + value, 0);
      peaks.push(total / chunk.length);
    }

    const max = peaks.length > 0 ? Math.max(...peaks) : 0;

    return { max, peaks };
  } finally {
    void audioCtx.close();
  }
}

interface Props {
  soundData: ArrayBuffer;
}

export const SoundWaveSVG = ({ soundData }: Props) => {
  const uniqueIdRef = useRef(Math.random().toString(16));
  const [{ max, peaks }, setPeaks] = useState<ParsedData>({
    max: 0,
    peaks: [],
  });

  useEffect(() => {
    calculate(soundData).then(({ max, peaks }) => {
      setPeaks({ max, peaks });
    });
  }, [soundData]);

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
