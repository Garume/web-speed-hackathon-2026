import { useCallback, useEffect, useRef, useState } from "react";

import { NewDirectMessageModalPage } from "@web-speed-hackathon-2026/client/src/components/direct_message/NewDirectMessageModalPage";
import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";
import { NewDirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface Props {
  id: string;
}

interface CreateDirectMessageConversationResponse {
  id: string;
}

export const NewDirectMessageModalContainer = ({ id }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;

    const handleClose = () => {
      setResetKey((key) => key + 1);
    };
    element.addEventListener("close", handleClose);
    return () => {
      element.removeEventListener("close", handleClose);
    };
  }, [ref]);
  const handleSubmit = useCallback(
    async (values: NewDirectMessageFormData) => {
      try {
        const conversation = await sendJSON<CreateDirectMessageConversationResponse>(`/api/v1/dm`, {
          peerUsername: values.username.trim().replace(/^@/, ""),
        });
        window.location.assign(`/dm/${conversation.id}`);
      } catch {
        throw new Error("ユーザーが見つかりませんでした");
      }
    },
    [],
  );

  return (
    <Modal id={id} ref={ref} closedby="any">
      <NewDirectMessageModalPage key={resetKey} id={id} onSubmit={handleSubmit} />
    </Modal>
  );
};
