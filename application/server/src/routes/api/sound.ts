import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import { fileTypeFromBuffer } from "file-type";
import httpErrors from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";
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
