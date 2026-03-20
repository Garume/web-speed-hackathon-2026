import { Router } from "express";
import httpErrors from "http-errors";
import { Op } from "sequelize";

import { eventhub } from "@web-speed-hackathon-2026/server/src/eventhub";
import {
  DirectMessage,
  DirectMessageConversation,
  User,
} from "@web-speed-hackathon-2026/server/src/models";

export const directMessageRouter = Router();
const TYPING_INDICATOR_DURATION_MS = 10 * 1000;
const typingByConversationAndUser = new Map<string, number>();

function getTypingKey(conversationId: string, userId: string) {
  return `${conversationId}:${userId}`;
}

function getOwnedConversationWhere(conversationId: string, userId: string) {
  return {
    id: conversationId,
    [Op.or]: [{ initiatorId: userId }, { memberId: userId }],
  };
}

directMessageRouter.get("/dm", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversations = await DirectMessageConversation.unscoped().findAll({
    attributes: ["id", "initiatorId", "memberId"],
    where: {
      [Op.or]: [{ initiatorId: req.session.userId }, { memberId: req.session.userId }],
    },
    include: [
      {
        association: "initiator",
        attributes: ["id", "name", "username"],
        include: [{ association: "profileImage", attributes: ["id", "alt"] }],
      },
      {
        association: "member",
        attributes: ["id", "name", "username"],
        include: [{ association: "profileImage", attributes: ["id", "alt"] }],
      },
    ],
  });

  const summaries = await Promise.all(
    conversations.map(async (conversation) => {
      const [latestMessage, unreadCount] = await Promise.all([
        DirectMessage.unscoped().findOne({
          attributes: ["id", "body", "isRead", "createdAt", "updatedAt"],
          where: {
            conversationId: conversation.id,
          },
          include: [{ association: "sender", attributes: ["id"] }],
          order: [["createdAt", "DESC"]],
        }),
        DirectMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: {
              [Op.ne]: req.session.userId,
            },
            isRead: false,
          },
        }),
      ]);

      return {
        ...conversation.toJSON(),
        hasUnread: unreadCount > 0,
        messages: latestMessage == null ? [] : [latestMessage.toJSON()],
      };
    }),
  );

  const sorted = summaries
    .filter((conversation) => conversation.messages.length > 0)
    .sort(
      (left, right) =>
        new Date(right.messages[0]!.createdAt).getTime() -
        new Date(left.messages[0]!.createdAt).getTime(),
    );

  return res.status(200).type("application/json").send(sorted);
});

directMessageRouter.post("/dm", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const peerUsername =
    typeof req.body?.peerUsername === "string" ? req.body.peerUsername.trim().replace(/^@/, "") : "";
  const peerId = typeof req.body?.peerId === "string" ? req.body.peerId : "";
  const peer =
    peerUsername.length > 0
      ? await User.findOne({
          where: {
            username: peerUsername,
          },
        })
      : await User.findByPk(peerId);
  if (peer === null) {
    throw new httpErrors.NotFound();
  }

  const conversation = await DirectMessageConversation.unscoped().create({
    initiatorId: req.session.userId,
    memberId: peer.id,
  });

  return res.status(200).type("application/json").send({ id: conversation.id });
});

directMessageRouter.ws("/dm/unread", async (req, _res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const handler = (payload: unknown) => {
    req.ws.send(JSON.stringify({ type: "dm:unread", payload }));
  };

  eventhub.on(`dm:unread/${req.session.userId}`, handler);
  req.ws.on("close", () => {
    eventhub.off(`dm:unread/${req.session.userId}`, handler);
  });

  const unreadCount = await DirectMessage.count({
    distinct: true,
    where: {
      senderId: { [Op.ne]: req.session.userId },
      isRead: false,
    },
    include: [
      {
        association: "conversation",
        where: {
          [Op.or]: [{ initiatorId: req.session.userId }, { memberId: req.session.userId }],
        },
        required: true,
      },
    ],
  });

  eventhub.emit(`dm:unread/${req.session.userId}`, { unreadCount });
});

directMessageRouter.get("/dm/:conversationId", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.unscoped().findOne({
    attributes: ["id", "initiatorId", "memberId"],
    where: getOwnedConversationWhere(req.params.conversationId, req.session.userId),
    include: [
      {
        association: "initiator",
        attributes: ["id", "name", "username"],
        include: [{ association: "profileImage", attributes: ["id", "alt"] }],
      },
      {
        association: "member",
        attributes: ["id", "name", "username"],
        include: [{ association: "profileImage", attributes: ["id", "alt"] }],
      },
      {
        association: "messages",
        attributes: ["id", "body", "isRead", "createdAt", "updatedAt"],
        include: [{ association: "sender", attributes: ["id"] }],
        limit: 30,
        order: [["createdAt", "ASC"]],
        required: false,
        separate: true,
      },
    ],
  });
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  return res.status(200).type("application/json").send(conversation);
});

directMessageRouter.ws("/dm/:conversationId", async (req, _res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.unscoped().findOne({
    attributes: ["id", "initiatorId", "memberId"],
    where: getOwnedConversationWhere(req.params.conversationId, req.session.userId),
  });
  if (conversation == null) {
    throw new httpErrors.NotFound();
  }

  const peerId =
    conversation.initiatorId !== req.session.userId
      ? conversation.initiatorId
      : conversation.memberId;

  const handleMessageUpdated = (payload: unknown) => {
    req.ws.send(JSON.stringify({ type: "dm:conversation:message", payload }));
  };
  eventhub.on(`dm:conversation/${conversation.id}:message`, handleMessageUpdated);
  req.ws.on("close", () => {
    eventhub.off(`dm:conversation/${conversation.id}:message`, handleMessageUpdated);
  });

  const handleTyping = (payload: unknown) => {
    req.ws.send(JSON.stringify({ type: "dm:conversation:typing", payload }));
  };
  eventhub.on(`dm:conversation/${conversation.id}:typing/${peerId}`, handleTyping);
  req.ws.on("close", () => {
    eventhub.off(`dm:conversation/${conversation.id}:typing/${peerId}`, handleTyping);
  });

  const typingKey = getTypingKey(conversation.id, peerId);
  const lastTypingAt = typingByConversationAndUser.get(typingKey);
  if (lastTypingAt != null) {
    const isTyping = Date.now() - lastTypingAt < TYPING_INDICATOR_DURATION_MS;
    if (isTyping) {
      eventhub.emit(`dm:conversation/${conversation.id}:typing/${peerId}`, {});
    } else {
      typingByConversationAndUser.delete(typingKey);
    }
  }
});

directMessageRouter.post("/dm/:conversationId/messages", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const body: unknown = req.body?.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new httpErrors.BadRequest();
  }

  const conversation = await DirectMessageConversation.unscoped().findOne({
    attributes: ["id"],
    where: getOwnedConversationWhere(req.params.conversationId, req.session.userId),
  });
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  const message = await DirectMessage.create({
    body: body.trim(),
    conversationId: conversation.id,
    senderId: req.session.userId,
  });
  await message.reload();

  return res.status(201).type("application/json").send(message);
});

directMessageRouter.post("/dm/:conversationId/read", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.unscoped().findOne({
    attributes: ["id", "initiatorId", "memberId"],
    where: getOwnedConversationWhere(req.params.conversationId, req.session.userId),
  });
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  const peerId =
    conversation.initiatorId !== req.session.userId
      ? conversation.initiatorId
      : conversation.memberId;

  await DirectMessage.update(
    { isRead: true },
    {
      where: { conversationId: conversation.id, senderId: peerId, isRead: false },
      individualHooks: true,
    },
  );

  return res.status(200).type("application/json").send({});
});

directMessageRouter.post("/dm/:conversationId/typing", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.unscoped().findByPk(req.params.conversationId, {
    attributes: ["id"],
  });
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  typingByConversationAndUser.set(
    getTypingKey(conversation.id, req.session.userId),
    Date.now(),
  );
  eventhub.emit(`dm:conversation/${conversation.id}:typing/${req.session.userId}`, {});

  return res.status(200).type("application/json").send({});
});
