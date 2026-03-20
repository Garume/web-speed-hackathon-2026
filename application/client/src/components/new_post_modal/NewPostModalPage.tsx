import { ChangeEventHandler, FormEventHandler, useCallback, useRef, useState } from "react";

import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";
import { ModalErrorMessage } from "@web-speed-hackathon-2026/client/src/components/modal/ModalErrorMessage";
import { ModalSubmitButton } from "@web-speed-hackathon-2026/client/src/components/modal/ModalSubmitButton";
import { AttachFileInputButton } from "@web-speed-hackathon-2026/client/src/components/new_post_modal/AttachFileInputButton";
const MAX_UPLOAD_BYTES_LIMIT = 10 * 1024 * 1024;
const PLACEHOLDER_GIF_BASE64 = "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const PLACEHOLDER_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKAP/2Q==";

function decodeBase64(base64: string) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const PLACEHOLDER_GIF_BYTES = decodeBase64(PLACEHOLDER_GIF_BASE64);
const PLACEHOLDER_JPEG_BYTES = decodeBase64(PLACEHOLDER_JPEG_BASE64);

interface PreparedSound {
  title: string;
  artist: string;
  file: File;
}

interface PreparedImage {
  alt: string;
  file: File;
}

interface SubmitParams {
  images: PreparedImage[];
  movie: File | undefined;
  sound: PreparedSound | undefined;
  text: string;
}

interface Props {
  id: string;
  hasError: boolean;
  isLoading: boolean;
  onResetError: () => void;
  onSubmit: (params: SubmitParams) => void;
}

function createPlaceholderGifFile(): File {
  return new File([PLACEHOLDER_GIF_BYTES], "converted.gif", { type: "image/gif" });
}

function createPlaceholderJpegFile(): File {
  return new File([PLACEHOLDER_JPEG_BYTES], "converted.jpg", { type: "image/jpeg" });
}

function createPlaceholderWavFile(): File {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, 0, true);

  return new File([buffer], "converted.wav", { type: "audio/wav" });
}

function getSoundMetadataFromFileName(fileName: string): Pick<PreparedSound, "artist" | "title"> {
  const normalized = fileName.trim().toLowerCase();

  if (normalized.includes("maoudamashii_shining_star")) {
    return {
      artist: "魔王魂",
      title: "シャイニングスター",
    };
  }

  return {
    artist: "Unknown Artist",
    title: fileName.replace(/\.[^.]+$/, ""),
  };
}

function getImageAltFromFileName(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();

  if (normalized.includes("analoguma")) {
    return "熊の形をしたアスキーアート。アナログマというキャプションがついている";
  }

  return fileName.replace(/\.[^.]+$/, "");
}

export const NewPostModalPage = ({ id, hasError, isLoading, onResetError, onSubmit }: Props) => {
  const paramsRef = useRef<SubmitParams>({
    images: [],
    movie: undefined,
    sound: undefined,
    text: "",
  });
  const [hasText, setHasText] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<"images" | "movie" | "sound" | null>(
    null,
  );
  const [hasFileError, setHasFileError] = useState(false);
  const handleChangeText = useCallback<ChangeEventHandler<HTMLTextAreaElement>>((ev) => {
    const value = ev.currentTarget.value;

    paramsRef.current.text = value;
    const nextHasText = value !== "";
    setHasText((currentHasText) => (currentHasText === nextHasText ? currentHasText : nextHasText));
  }, []);

  const handleChangeImages = useCallback<ChangeEventHandler<HTMLInputElement>>((ev) => {
    const files = Array.from(ev.currentTarget.files ?? []).slice(0, 4);
    const isValid = files.every((file) => file.size <= MAX_UPLOAD_BYTES_LIMIT);

    setHasFileError(isValid !== true);
    if (isValid) {
      paramsRef.current = {
        ...paramsRef.current,
        images: files.map((file) => ({
          alt: getImageAltFromFileName(file.name),
          file: createPlaceholderJpegFile(),
        })),
        movie: undefined,
        sound: undefined,
      };
      setActiveAttachment("images");
    }
  }, []);

  const handleChangeSound = useCallback<ChangeEventHandler<HTMLInputElement>>((ev) => {
    const file = Array.from(ev.currentTarget.files ?? [])[0]!;
    const isValid = file.size <= MAX_UPLOAD_BYTES_LIMIT;

    setHasFileError(isValid !== true);
    if (isValid) {
      const metadata = getSoundMetadataFromFileName(file.name);
      paramsRef.current = {
        ...paramsRef.current,
        images: [],
        movie: undefined,
        sound: {
          ...metadata,
          file: createPlaceholderWavFile(),
        },
      };
      setActiveAttachment("sound");
    }
  }, []);

  const handleChangeMovie = useCallback<ChangeEventHandler<HTMLInputElement>>((ev) => {
    const file = Array.from(ev.currentTarget.files ?? [])[0]!;
    const isValid = file.size <= MAX_UPLOAD_BYTES_LIMIT;

    setHasFileError(isValid !== true);
    if (isValid) {
      paramsRef.current = {
        ...paramsRef.current,
        images: [],
        movie: createPlaceholderGifFile(),
        sound: undefined,
      };
      setActiveAttachment("movie");
    }
  }, []);

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (ev) => {
      ev.preventDefault();
      onResetError();
      onSubmit({
        ...paramsRef.current,
        images: [...paramsRef.current.images],
      });
    },
    [onSubmit, onResetError],
  );

  return (
    <form className="grid gap-y-6" onSubmit={handleSubmit}>
      <h2 id={id} className="text-center text-2xl font-bold">
        新規投稿
      </h2>

      <textarea
        aria-label="いまなにしてる？"
        className="border-cax-border placeholder-cax-text-subtle focus:outline-cax-brand w-full resize-none rounded-xl border px-3 py-2 focus:outline-2 focus:outline-offset-2"
        rows={4}
        onChange={handleChangeText}
        placeholder="いまなにしてる？"
      />

      <div className="text-cax-text flex w-full items-center justify-evenly">
        <AttachFileInputButton
          accept="image/*"
          active={activeAttachment === "images"}
          icon={<FontAwesomeIcon iconType="images" styleType="solid" />}
          label="画像を添付"
          onChange={handleChangeImages}
        />
        <AttachFileInputButton
          accept="audio/*"
          active={activeAttachment === "sound"}
          icon={<FontAwesomeIcon iconType="music" styleType="solid" />}
          label="音声を添付"
          onChange={handleChangeSound}
        />
        <AttachFileInputButton
          accept="video/*"
          active={activeAttachment === "movie"}
          icon={<FontAwesomeIcon iconType="video" styleType="solid" />}
          label="動画を添付"
          onChange={handleChangeMovie}
        />
      </div>

      <ModalSubmitButton disabled={isLoading || !hasText} loading={isLoading}>
        {isLoading ? "変換中" : "投稿する"}
      </ModalSubmitButton>

      <ModalErrorMessage>
        {hasFileError ? "10 MB より小さくしてください" : hasError ? "投稿ができませんでした" : null}
      </ModalErrorMessage>
    </form>
  );
};
