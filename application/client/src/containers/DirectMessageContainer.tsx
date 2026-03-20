import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { DirectMessageGate } from "@web-speed-hackathon-2026/client/src/components/direct_message/DirectMessageGate";
import { DirectMessagePage } from "@web-speed-hackathon-2026/client/src/components/direct_message/DirectMessagePage";
import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { DirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { useWs } from "@web-speed-hackathon-2026/client/src/hooks/use_ws";
import { fetchJSON, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface DmUpdateEvent {
  type: "dm:conversation:message";
  payload: Models.DirectMessage;
}
interface DmTypingEvent {
  type: "dm:conversation:typing";
  payload: {};
}

const TYPING_INDICATOR_DURATION_MS = 10 * 1000;

function mergeConversationMessage(
  conversation: Models.DirectMessageConversation | null,
  message: Models.DirectMessage,
): Models.DirectMessageConversation | null {
  if (conversation == null) {
    return conversation;
  }

  const existingIndex = conversation.messages.findIndex(({ id }) => id === message.id);
  const nextMessages =
    existingIndex === -1
      ? [...conversation.messages, message]
      : conversation.messages.map((currentMessage, index) =>
          index === existingIndex ? message : currentMessage,
        );

  nextMessages.sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  return {
    ...conversation,
    messages: nextMessages,
  };
}

interface Props {
  activeUser: Models.User | null;
  authModalId: string;
}

const DirectMessagePageSkeleton = () => {
  return (
    <div aria-hidden="true" className="bg-cax-surface flex min-h-[calc(100vh-(--spacing(12)))] flex-col lg:min-h-screen">
      <div className="border-cax-border flex items-center gap-3 border-b px-4 py-3">
        <div className="bg-cax-surface-subtle h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <div className="bg-cax-surface-subtle h-5 w-32 rounded-full" />
          <div className="bg-cax-surface-subtle h-4 w-24 rounded-full" />
        </div>
      </div>
      <div className="bg-cax-surface-subtle flex-1 space-y-4 px-4 py-4">
        <div className="bg-cax-surface h-16 w-3/4 rounded-3xl" />
        <div className="bg-cax-brand-soft ml-auto h-16 w-1/2 rounded-3xl" />
        <div className="bg-cax-surface h-20 w-2/3 rounded-3xl" />
      </div>
      <div className="border-cax-border bg-cax-surface flex items-end gap-2 border-t p-4">
        <div className="bg-cax-surface-subtle h-12 flex-1 rounded-2xl" />
        <div className="bg-cax-brand h-10 w-20 rounded-full" />
      </div>
    </div>
  );
};

export const DirectMessageContainer = ({ activeUser, authModalId }: Props) => {
  const { conversationId = "" } = useParams<{ conversationId: string }>();

  const [conversation, setConversation] = useState<Models.DirectMessageConversation | null>(null);
  const [conversationError, setConversationError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAtRef = useRef(0);

  const loadConversation = useCallback(async () => {
    if (activeUser == null) {
      return;
    }

    try {
      const data = await fetchJSON<Models.DirectMessageConversation>(
        `/api/v1/dm/${conversationId}`,
      );
      setConversation(data);
      setConversationError(null);
    } catch (error) {
      setConversation(null);
      setConversationError(error as Error);
    }
  }, [activeUser, conversationId]);

  const sendRead = useCallback(async () => {
    await sendJSON(`/api/v1/dm/${conversationId}/read`, {});
  }, [conversationId]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (activeUser == null || conversation == null) {
      return;
    }

    const hasUnreadMessages = conversation.messages.some(
      (message) => message.sender.id !== activeUser.id && !message.isRead,
    );

    if (!hasUnreadMessages) {
      return;
    }

    void sendRead();
  }, [activeUser, conversation, sendRead]);

  const handleSubmit = useCallback(
    async (params: DirectMessageFormData) => {
      setIsSubmitting(true);
      try {
        const message = await sendJSON<Models.DirectMessage>(
          `/api/v1/dm/${conversationId}/messages`,
          {
            body: params.body,
          },
        );
        setConversation((currentConversation) =>
          mergeConversationMessage(currentConversation, message),
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId],
  );

  const handleTyping = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingSentAtRef.current < 1500) {
      return;
    }

    lastTypingSentAtRef.current = now;
    void sendJSON(`/api/v1/dm/${conversationId}/typing`, {});
  }, [conversationId]);

  useWs(`/api/v1/dm/${conversationId}`, (event: DmUpdateEvent | DmTypingEvent) => {
    if (event.type === "dm:conversation:message") {
      setConversation((currentConversation) =>
        mergeConversationMessage(currentConversation, event.payload),
      );
      if (event.payload.sender.id !== activeUser?.id) {
        setIsPeerTyping(false);
        if (peerTypingTimeoutRef.current !== null) {
          clearTimeout(peerTypingTimeoutRef.current);
        }
        peerTypingTimeoutRef.current = null;
        void sendRead();
      }
    } else if (event.type === "dm:conversation:typing") {
      setIsPeerTyping(true);
      if (peerTypingTimeoutRef.current !== null) {
        clearTimeout(peerTypingTimeoutRef.current);
      }
      peerTypingTimeoutRef.current = setTimeout(() => {
        setIsPeerTyping(false);
      }, TYPING_INDICATOR_DURATION_MS);
    }
  });

  if (activeUser === null) {
    return (
      <DirectMessageGate
        headline="DMを利用するにはサインインしてください"
        authModalId={authModalId}
      />
    );
  }

  if (conversation == null) {
    if (conversationError != null) {
      return <NotFoundContainer />;
    }
    return (
      <>
        <Helmet>
          <title>読込中 - CaX</title>
        </Helmet>
        <DirectMessagePageSkeleton />
      </>
    );
  }

  const peer =
    conversation.initiator.id !== activeUser?.id ? conversation.initiator : conversation.member;

  return (
    <>
      <Helmet>
        <title>{peer.name} さんとのダイレクトメッセージ - CaX</title>
      </Helmet>
      <DirectMessagePage
        conversationError={conversationError}
        conversation={conversation}
        activeUser={activeUser}
        onTyping={handleTyping}
        isPeerTyping={isPeerTyping}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
};
