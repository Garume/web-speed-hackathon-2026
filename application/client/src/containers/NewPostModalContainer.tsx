import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";
import { NewPostModalPage } from "@web-speed-hackathon-2026/client/src/components/new_post_modal/NewPostModalPage";
import { sendFile, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface PreparedImage {
  alt: string;
  file: File;
}

interface PreparedSound {
  artist: string;
  file: File;
  title: string;
}

interface SubmitParams {
  images: PreparedImage[];
  movie: File | undefined;
  sound: PreparedSound | undefined;
  text: string;
}

async function uploadSound(sound: PreparedSound): Promise<Models.Sound> {
  const response = await fetch("/api/v1/sounds", {
    body: sound.file,
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Sound-Artist": encodeURIComponent(sound.artist),
      "X-Sound-Title": encodeURIComponent(sound.title),
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as Models.Sound;
}

async function sendNewPost({ images, movie, sound, text }: SubmitParams): Promise<Models.Post> {
  const payload = {
    images: images
      ? await Promise.all(
          images.map(async ({ alt, file }) => ({
            ...(await sendFile<{ id: string }>("/api/v1/images", file)),
            alt,
          })),
        )
      : [],
    movie: movie ? await sendFile("/api/v1/movies", movie) : undefined,
    sound: sound ? await uploadSound(sound) : undefined,
    text,
  };

  return sendJSON("/api/v1/posts", payload);
}

interface Props {
  id: string;
}

function prefetchPost(post: Models.Post) {
  const apiPath = `/api/v1/posts/${post.id}`;
  window.__PREFETCH_JSON__ = window.__PREFETCH_JSON__ ?? {};
  window.__PREFETCH_JSON__[apiPath] = fetch(apiPath, { credentials: "same-origin" }).then(
    async (response) => {
      if (!response.ok) {
        throw new Error((await response.text()) || `Request failed with status ${response.status}`);
      }

      return (await response.json()) as Models.Post;
    },
  );
}

export const NewPostModalContainer = ({ id }: Props) => {
  const dialogId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element == null) {
      return;
    }

    const handleClose = () => {
      // 閉じるたびにkeyを更新して次回表示時のフォーム状態をリセットする
      setResetKey((key) => key + 1);
    };
    element.addEventListener("close", handleClose);
    return () => {
      element.removeEventListener("close", handleClose);
    };
  }, []);

  const navigate = useNavigate();

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetError = useCallback(() => {
    setHasError(false);
  }, []);

  const handleSubmit = useCallback(
    async (params: SubmitParams) => {
      try {
        setIsLoading(true);
        const post = await sendNewPost(params);
        prefetchPost(post);
        ref.current?.close();
        navigate(`/posts/${post.id}`);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  return (
    <Modal aria-labelledby={dialogId} id={id} ref={ref} closedby="any">
      <NewPostModalPage
        key={resetKey}
        id={dialogId}
        hasError={hasError}
        isLoading={isLoading}
        onResetError={handleResetError}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};
