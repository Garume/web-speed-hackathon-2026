import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import { fileTypeFromBuffer } from "file-type";
import httpErrors from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";
import { extractMetadataFromSound } from "@web-speed-hackathon-2026/server/src/utils/extract_metadata_from_sound";

const ACCEPTED_EXTENSIONS = new Set(["mp3", "wav"]);
const EXTENSION = "mp3";

function decodeSoundHeader(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const soundRouter = Router();

soundRouter.get("/sounds/:soundId/waveform", async (req, res) => {
  const soundId = req.params["soundId"];
  if (!soundId) {
    throw new httpErrors.BadRequest();
  }

  const jsonCachePath = path.resolve(UPLOAD_PATH, `./sounds/${soundId}.json`);

  // Try cached JSON first
  try {
    const cached = await fs.readFile(jsonCachePath, "utf8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.type("application/json").send(cached);
  } catch {
    // Not cached yet, compute it
  }

  // Find the MP3 file (could be in upload or public directory)
  let buffer: Buffer | undefined;
  const uploadMp3Path = path.resolve(UPLOAD_PATH, `./sounds/${soundId}.mp3`);
  const publicMp3Path = path.resolve(PUBLIC_PATH, `./sounds/${soundId}.mp3`);

  try {
    buffer = await fs.readFile(uploadMp3Path);
  } catch {
    try {
      buffer = await fs.readFile(publicMp3Path);
    } catch {
      throw new httpErrors.NotFound();
    }
  }

  // Compute approximate peaks from raw MP3 bytes
  // We interpret the raw bytes as unsigned 8-bit values and compute RMS of chunks
  const totalSamples = buffer.length;
  const numPeaks = 100;
  const chunkSize = Math.ceil(totalSamples / numPeaks);
  const peaks: number[] = [];

  for (let i = 0; i < totalSamples; i += chunkSize) {
    const end = Math.min(i + chunkSize, totalSamples);
    let sum = 0;
    for (let j = i; j < end; j++) {
      // Treat each byte as an unsigned value, center around 128
      const val = Math.abs(buffer[j]! - 128);
      sum += val;
    }
    peaks.push(sum / (end - i));
  }

  const max = peaks.length > 0 ? Math.max(...peaks) : 0;
  const result = JSON.stringify({ max, peaks });

  // Cache for next time
  try {
    await fs.mkdir(path.resolve(UPLOAD_PATH, "sounds"), { recursive: true });
    await fs.writeFile(jsonCachePath, result);
  } catch {
    // Caching failure is non-fatal
  }

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.type("application/json").send(result);
});

soundRouter.post("/sounds", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const type = await fileTypeFromBuffer(req.body);
  if (type === undefined || !ACCEPTED_EXTENSIONS.has(type.ext)) {
    throw new httpErrors.BadRequest("Invalid file type");
  }

  const soundId = uuidv4();

  const headerArtist = decodeSoundHeader(
    typeof req.headers["x-sound-artist"] === "string" ? req.headers["x-sound-artist"] : undefined,
  );
  const headerTitle = decodeSoundHeader(
    typeof req.headers["x-sound-title"] === "string" ? req.headers["x-sound-title"] : undefined,
  );
  const fallbackMetadata = await extractMetadataFromSound(req.body);
  const artist = headerArtist?.trim() || fallbackMetadata.artist;
  const title = headerTitle?.trim() || fallbackMetadata.title;

  const filePath = path.resolve(UPLOAD_PATH, `./sounds/${soundId}.${EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "sounds"), { recursive: true });
  await fs.writeFile(filePath, req.body);

  return res.status(200).type("application/json").send({ artist, id: soundId, title });
});
