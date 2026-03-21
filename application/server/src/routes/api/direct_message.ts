import { Router } from "express";
import httpErrors from "http-errors";
import { col, fn, Op } from "sequelize";

import { eventhub } from "@web-speed-hackathon-2026/server/src/eventhub";
import {
  DirectMessage,
  DirectMessageConversation,
  User,
} from "@web-speed-hackathon-2026/server/src/models";

export const directMessageRouter = Router();

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

  const conversationIds = conversations.map((c) => c.id);

  // Batch query: fetch all messages for all conversations in one query (ordered DESC to pick latest)
  const allMessages = await DirectMessage.unscoped().findAll({
    attributes: ["id", "body", "isRead", "createdAt", "updatedAt", "conversationId"],
    include: [{ association: "sender", attributes: ["id"] }],
    where: { conversationId: { [Op.in]: conversationIds } },
    order: [["createdAt", "DESC"]],
  });

  // Build latest-message map: first occurrence per conversationId (DESC order)
  const latestMessageMap = new Map<string, Record<string, unknown> & { createdAt: Date | string }>();
  for (const msg of allMessages) {
    if (!latestMessageMap.has(msg.conversationId)) {
      latestMessageMap.set(msg.conversationId, msg.toJSON() as Record<string, unknown> & { createdAt: Date | string });
    }
  }

  // Batch query: get unread count per conversation in one GROUP BY query
  const unreadRows = (await DirectMessage.unscoped().findAll({
    attributes: ["conversationId", [fn("COUNT", col("id")), "unreadCount"]],
    where: {
      conversationId: { [Op.in]: conversationIds },
      senderId: { [Op.ne]: req.session.userId },
      isRead: false,
    },
    group: ["conversationId"],
    raw: true,
  })) as unknown as Array<{ conversationId: string; unreadCount: string }>;

  const unreadCountMap = new Map<string, number>(
    unreadRows.map((row) => [row.conversationId, Number(row.unreadCount)]),
  );

  const summaries = conversations.map((conversation) => {
    const latestMessage = latestMessageMap.get(conversation.id);
    const unreadCount = unreadCountMap.get(conversation.id) ?? 0;
    return {
      ...conversation.toJSON(),
      hasUnread: unreadCount > 0,
      messages: latestMessage == null ? [] : [latestMessage],
    };
  });

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

  const [conversation] = await DirectMessageConversation.unscoped().findOrCreate({
    where: {
      [Op.or]: [
        { initiatorId: req.session.userId, memberId: peer.id },
        { initiatorId: peer.id, memberId: req.session.userId },
      ],
    },
    defaults: {
      initiatorId: req.session.userId,
      memberId: peer.id,
    },
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

  eventhub.emit(`dm:conversation/${conversation.id}:typing/${req.session.userId}`, {});

  return res.status(200).type("application/json").send({});
});
