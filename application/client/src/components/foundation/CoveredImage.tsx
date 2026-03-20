import { memo, MouseEvent, useCallback, useId } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";
import { closeDialog, showDialog } from "@web-speed-hackathon-2026/client/src/utils/dialog";

interface Props {
  alt: string;
  fetchPriority?: "auto" | "high" | "low";
  height?: number;
  loading?: "eager" | "lazy";
  src: string;
  width?: number;
}

/**
 * アスペクト比を維持したまま、要素のコンテンツボックス全体を埋めるように画像を拡大縮小します
 */
export const CoveredImage = memo(
  ({ alt, fetchPriority = "auto", height, loading = "lazy", src, width }: Props) => {
  const dialogId = useId();
  // ダイアログの背景をクリックしたときに投稿詳細ページに遷移しないようにする
  const handleDialogClick = useCallback((ev: MouseEvent<HTMLDialogElement>) => {
    ev.stopPropagation();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        decoding={loading === "eager" ? "sync" : "async"}
        fetchPriority={fetchPriority}
        height={height}
        loading={loading}
        src={src}
        style={{ inset: 0, position: "absolute" }}
        width={width}
      />

      <button
        className="border-cax-border bg-cax-surface-raised/90 text-cax-text-muted hover:bg-cax-surface absolute right-1 bottom-1 rounded-full border px-2 py-1 text-center text-xs"
        onClick={() => showDialog(dialogId)}
        type="button"
      >
        ALT を表示する
      </button>

      <Modal id={dialogId} closedby="any" onClick={handleDialogClick}>
        <div className="grid gap-y-6">
          <h1 className="text-center text-2xl font-bold">画像の説明</h1>

          <p className="text-sm">{alt}</p>

          <Button onClick={() => closeDialog(dialogId)} variant="secondary">
            閉じる
          </Button>
        </div>
      </Modal>
    </div>
  );
  },
);
