import classNames from "classnames";
import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useId,
  FormEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";

import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";
import { DirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { formatTime } from "@web-speed-hackathon-2026/client/src/utils/datetime";
import { getProfileImagePath } from "@web-speed-hackathon-2026/client/src/utils/get_path";

interface Props {
  conversationError: Error | null;
  conversation: Models.DirectMessageConversation;
  activeUser: Models.User;
  isPeerTyping: boolean;
  onTyping: () => void;
  onSubmit: (params: DirectMessageFormData) => Promise<void>;
}

const DirectMessageHeader = memo(
  ({ peer }: { peer: Models.User }) => {
    return (
      <header className="border-cax-border bg-cax-surface sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3">
        <img
          alt={peer.profileImage.alt}
          className="h-12 w-12 rounded-full object-cover"
          src={getProfileImagePath(peer.profileImage.id)}
        />
        <div className="min-w-0">
          <h1 className="overflow-hidden text-xl font-bold text-ellipsis whitespace-nowrap">
            {peer.name}
          </h1>
          <p className="text-cax-text-muted overflow-hidden text-xs text-ellipsis whitespace-nowrap">
            @{peer.username}
          </p>
        </div>
      </header>
    );
  },
  (prev, next) =>
    prev.peer.id === next.peer.id &&
    prev.peer.name === next.peer.name &&
    prev.peer.username === next.peer.username &&
    prev.peer.profileImage.id === next.peer.profileImage.id &&
    prev.peer.profileImage.alt === next.peer.profileImage.alt,
);

const DirectMessageList = memo(
  ({
    activeUser,
    isPeerTyping,
    messages,
  }: {
    activeUser: Models.User;
    isPeerTyping: boolean;
    messages: Models.DirectMessage[];
  }) => {
    const messageListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const frameId = requestAnimationFrame(() => {
        const messageList = messageListRef.current;
        if (messageList == null) {
          return;
        }

        messageList.scrollTop = messageList.scrollHeight;
      });

      return () => cancelAnimationFrame(frameId);
    }, [messages.length, isPeerTyping]);

    return (
      <div
        className="bg-cax-surface-subtle flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-8"
        ref={messageListRef}
      >
        {messages.length === 0 && (
          <p className="text-cax-text-muted text-center text-sm">
            まだメッセージはありません。最初のメッセージを送信してみましょう。
          </p>
        )}

        <ul className="grid gap-3" data-testid="dm-message-list">
          {messages.map((message) => {
            const isActiveUserSend = message.sender.id === activeUser.id;

            return (
              <li
                className={classNames(
                  "flex flex-col w-full",
                  isActiveUserSend ? "items-end" : "items-start",
                )}
                key={message.id}
              >
                <p
                  className={classNames(
                    "max-w-3/4 rounded-xl border px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed wrap-anywhere",
                    isActiveUserSend
                      ? "rounded-br-sm border-transparent bg-cax-brand text-cax-surface-raised"
                      : "rounded-bl-sm border-cax-border bg-cax-surface text-cax-text",
                  )}
                >
                  {message.body}
                </p>
                <div className="flex gap-1 text-xs">
                  <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                  {isActiveUserSend && message.isRead && (
                    <span className="text-cax-text-muted">既読</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
  (prev, next) =>
    prev.activeUser.id === next.activeUser.id &&
    prev.isPeerTyping === next.isPeerTyping &&
    prev.messages === next.messages,
);

const DirectMessageComposer = ({
  onSubmit,
  onTyping,
}: Pick<Props, "onSubmit" | "onTyping">) => {
  const formRef = useRef<HTMLFormElement>(null);
  const textAreaId = useId();
  const [text, setText] = useState("");
  const textAreaRows = Math.min((text || "").split("\n").length, 5);
  const isInvalid = text.trim().length === 0;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
      onTyping();
    },
    [onTyping],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const draft = text;
      const body = text.trim();
      if (body.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      setText("");
      void onSubmit({ body }).catch(() => {
        setText(draft);
      });
    },
    [onSubmit, text],
  );

  return (
    <form
      className="border-cax-border bg-cax-surface flex items-end gap-2 border-t p-4"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="flex grow">
        <label className="sr-only" htmlFor={textAreaId}>
          内容
        </label>
        <textarea
          id={textAreaId}
          className="border-cax-border placeholder-cax-text-subtle focus:outline-cax-brand w-full resize-none rounded-xl border px-3 py-2 focus:outline-2 focus:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={textAreaRows}
        />
      </div>
      <button
        className="bg-cax-brand text-cax-surface-raised hover:bg-cax-brand-strong rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isInvalid}
        type="submit"
      >
        <FontAwesomeIcon iconType="arrow-right" styleType="solid" />
      </button>
    </form>
  );
};

export const DirectMessagePage = ({
  conversationError,
  conversation,
  activeUser,
  isPeerTyping,
  onTyping,
  onSubmit,
}: Props) => {
  const peer =
    conversation.initiator.id !== activeUser.id ? conversation.initiator : conversation.member;

  if (conversationError != null) {
    return (
      <section className="px-6 py-10">
        <p className="text-cax-danger text-sm">メッセージの取得に失敗しました</p>
      </section>
    );
  }

  return (
    <section className="bg-cax-surface flex min-h-[calc(100vh-(--spacing(12)))] flex-col lg:min-h-screen">
      <DirectMessageHeader peer={peer} />
      <DirectMessageList
        activeUser={activeUser}
        isPeerTyping={isPeerTyping}
        messages={conversation.messages}
      />

      <div className="sticky bottom-12 z-10 lg:bottom-0">
        {isPeerTyping && (
          <p className="bg-cax-surface-raised/75 text-cax-brand absolute inset-x-0 top-0 -translate-y-full px-4 py-1 text-xs">
            <span className="font-bold">{peer.name}</span>さんが入力中…
          </p>
        )}

        <DirectMessageComposer
          onSubmit={onSubmit}
          onTyping={onTyping}
        />
      </div>
    </section>
  );
};
