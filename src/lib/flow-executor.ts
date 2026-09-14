import {
  addContactTag,
  enqueueFollowups,
  enqueueJob,
  type Automation,
  type DelayMode,
  type FlowEdgeDefinition,
  type FlowNodeDefinition,
  type QuickReply,
  type SendType,
} from "@/lib/db/repositories";

export type FlowTrigger = "comment" | "dm" | "story";

type FlowNodeKind =
  | "trigger"
  | "keywords"
  | "publicReply"
  | "condition"
  | "dm"
  | "quickReplies"
  | "link"
  | "reminder"
  | "end"
  | "commentReply"
  | "privateReply"
  | "buttonMessage"
  | "mediaMessage"
  | "reaction"
  | "tagAction"
  | "automationLink";

type FlowNodeConfig = {
  text?: string;
  buttonLabel?: string;
  url?: string;
  payload?: string;
  mediaUrl?: string;
  mediaType?: "image" | "gif" | "audio" | "video";
  tagName?: string;
  automationId?: string;
  reactionEmoji?: string;
  delayMode?: DelayMode;
  delayValue?: string;
  delayMin?: string;
  delayMax?: string;
  delayUnit?: "seconds" | "minutes" | "hours";
};

type ExecuteAutomationFlowInput = {
  automation: Automation;
  eventId: string;
  contactId: string;
  instagramUserId: string;
  trigger: FlowTrigger;
  commentId?: string | null;
  isFollower?: boolean | null;
  followUrl?: string | null;
  startNodeId?: string | null;
};

type ExecutionState = {
  usedPrivateReply: boolean;
};

const executableNodeKinds = new Set<FlowNodeKind>([
  "publicReply",
  "commentReply",
  "privateReply",
  "dm",
  "buttonMessage",
  "mediaMessage",
  "link",
  "reminder",
  "tagAction",
  "automationLink",
]);

const passThroughNodeKinds = new Set<FlowNodeKind>(["trigger", "keywords", "quickReplies"]);

export const FOLLOW_CHECK_PAYLOAD_PREFIX = "follow_check:";

export function buildFollowCheckPayload(automationId: string) {
  return FOLLOW_CHECK_PAYLOAD_PREFIX + automationId;
}

export function buildFollowerGateButtons(automation: Automation, followUrl: string) {
  return [
    { type: "web_url" as const, title: "\uD83D\uDD17 Seguir Agora", url: followUrl },
    { type: "postback" as const, title: "\u2705 J\u00E1 Segui", payload: buildFollowCheckPayload(automation.id) },
  ];
}

export function buildFollowerGatePayload(automation: Automation, followUrl: string) {
  return {
    text: automation.non_follower_dm,
    buttons: buildFollowerGateButtons(automation, followUrl),
  };
}

export function hasExecutableFlow(automation: Automation) {
  if (!automation.flow_nodes?.length || !automation.flow_edges?.length) return false;
  return automation.flow_nodes.some((node) => executableNodeKinds.has(node.kind as FlowNodeKind));
}

export async function executeAutomationFlow(input: ExecuteAutomationFlowInput) {
  const nodes = normalizeNodes(input.automation.flow_nodes);
  const edges = normalizeEdges(input.automation.flow_edges);
  if (!nodes.size || !edges.length) return false;

  const startNodeId = input.startNodeId || (input.trigger === "comment" ? "trigger" : "condition");
  const startNode = nodes.get(startNodeId) ?? nodes.get("trigger") ?? nodes.values().next().value;
  if (!startNode) return false;

  const state: ExecutionState = { usedPrivateReply: false };
  const queue: FlowNodeDefinition[] = [startNode];
  const visited = new Set<string>();
  let actions = 0;

  while (queue.length && visited.size < 40) {
    const node = queue.shift();
    if (!node || visited.has(node.id)) continue;
    visited.add(node.id);

    const result = await executeNode(node, input, state, edges);
    actions += result.actions;

    for (const next of result.nextNodeIds) {
      const nextNode = nodes.get(next);
      if (nextNode && !visited.has(nextNode.id)) queue.push(nextNode);
    }
  }

  return actions > 0;
}

async function executeNode(
  node: FlowNodeDefinition,
  input: ExecuteAutomationFlowInput,
  state: ExecutionState,
  edges: FlowEdgeDefinition[],
): Promise<{ actions: number; nextNodeIds: string[] }> {
  const kind = node.kind as FlowNodeKind;

  if (kind === "end") return { actions: 0, nextNodeIds: [] };
  if (passThroughNodeKinds.has(kind)) return { actions: 0, nextNodeIds: nextTargets(edges, node.id) };

  if (kind === "condition") {
    if (!input.automation.require_follower) {
      const targets = nextTargets(edges, node.id, "yes");
      return { actions: 0, nextNodeIds: targets.length ? targets : nextTargets(edges, node.id) };
    }

    if (input.isFollower === true) return { actions: 0, nextNodeIds: nextTargets(edges, node.id, "yes") };

    const targets = nextTargets(edges, node.id, "no");
    if (targets.length) return { actions: 0, nextNodeIds: targets };

    if (input.followUrl) {
      await enqueuePrivateOrDm(input, state, buildFollowerGatePayload(input.automation, input.followUrl));
      return { actions: 1, nextNodeIds: [] };
    }

    return { actions: 0, nextNodeIds: [] };
  }

  const config = normalizeConfig(node.config);
  let actions = 0;

  if (kind === "publicReply" || kind === "commentReply") {
    const text = kind === "commentReply" ? config.text : pickPublicReply(input.automation);
    if (input.commentId && text) {
      await enqueueJob({
        accountId: input.automation.account_id,
        eventId: input.eventId,
        contactId: input.contactId,
        automationId: input.automation.id,
        instagramRecipientId: input.instagramUserId,
        instagramCommentId: input.commentId,
        sendType: "public_reply",
        availableAt: delayDate(resolveConfigDelaySeconds(config, resolveInitialDelaySeconds(input.automation))),
        payload: { text },
      });
      actions += 1;
    }
  }

  if (kind === "privateReply") {
    if (config.text) {
      await enqueuePrivateOrDm(input, state, {
        text: config.text,
        quickReplies: quickRepliesForNode(input.automation, edges, node.id),
      });
      actions += 1;
    }
  }

  if (kind === "dm") {
    if (input.automation.welcome_dm) {
      await enqueuePrivateOrDm(input, state, {
        text: input.automation.welcome_dm,
        quickReplyLabel: input.automation.quick_reply_label,
        quickReplyPayload: `automation:${input.automation.id}`,
        quickReplies: quickRepliesForNode(input.automation, edges, node.id),
      });
      actions += 1;
    }
  }

  if (kind === "buttonMessage") {
    if (config.text && config.buttonLabel && (config.url || config.payload)) {
      await enqueuePrivateOrDm(input, state, {
        text: config.text,
        buttonLabel: config.buttonLabel,
        url: config.url,
        buttonPayload: config.payload,
      });
      actions += 1;
    }
  }

  if (kind === "mediaMessage") {
    if (config.mediaUrl) {
      await enqueueJob({
        accountId: input.automation.account_id,
        eventId: input.eventId,
        contactId: input.contactId,
        automationId: input.automation.id,
        instagramRecipientId: input.instagramUserId,
        sendType: "dm",
        availableAt: delayDate(resolveConfigDelaySeconds(config, resolveInitialDelaySeconds(input.automation))),
        payload: {
          type: "media",
          text: config.text,
          mediaType: normalizeMediaType(config.mediaType),
          mediaUrl: config.mediaUrl,
        },
      });
      actions += 1;
    }
  }

  if (kind === "link") {
    if (input.automation.link_url) {
      await enqueueJob({
        accountId: input.automation.account_id,
        eventId: input.eventId,
        contactId: input.contactId,
        automationId: input.automation.id,
        instagramRecipientId: input.instagramUserId,
        sendType: "dm",
        availableAt: delayDate(resolveInitialDelaySeconds(input.automation)),
        payload: {
          type: "link",
          text: input.automation.link_text,
          buttonLabel: input.automation.link_button_label,
          url: input.automation.link_url,
        },
      });
      actions += 1;
    }
  }

  if (kind === "reminder") {
    if (input.automation.reminder_text) {
      await enqueueJob({
        accountId: input.automation.account_id,
        eventId: input.eventId,
        contactId: input.contactId,
        automationId: input.automation.id,
        instagramRecipientId: input.instagramUserId,
        sendType: "dm",
        availableAt: delayDate(resolveReminderDelaySeconds(input.automation)),
        payload: { type: "reminder", text: input.automation.reminder_text },
      });
      actions += 1;
    }
  }

  if (kind === "tagAction") {
    if (config.tagName) {
      await addContactTag(input.contactId, config.tagName);
      actions += 1;
    }
  }

  if (kind === "automationLink") {
    if (config.automationId) {
      await enqueueFollowups({
        accountId: input.automation.account_id,
        automationId: config.automationId,
        contactId: input.contactId,
        instagramRecipientId: input.instagramUserId,
        eventId: input.eventId,
      });
      actions += 1;
    }
  }

  return { actions, nextNodeIds: nextTargets(edges, node.id) };
}

async function enqueuePrivateOrDm(
  input: ExecuteAutomationFlowInput,
  state: ExecutionState,
  payload: Record<string, unknown>,
) {
  const canUsePrivateReply = input.trigger === "comment" && input.commentId && !state.usedPrivateReply;
  const sendType: SendType = canUsePrivateReply ? "private_reply" : "dm";
  if (canUsePrivateReply) state.usedPrivateReply = true;

  await enqueueJob({
    accountId: input.automation.account_id,
    eventId: input.eventId,
    contactId: input.contactId,
    automationId: input.automation.id,
    instagramRecipientId: input.instagramUserId,
    instagramCommentId: canUsePrivateReply ? input.commentId : null,
    sendType,
    availableAt: delayDate(resolveInitialDelaySeconds(input.automation)),
    payload,
  });
}

function normalizeNodes(nodes: FlowNodeDefinition[] | null | undefined) {
  const map = new Map<string, FlowNodeDefinition>();
  for (const node of nodes ?? []) {
    if (node?.id && node.kind) map.set(node.id, node);
  }
  return map;
}

function normalizeEdges(edges: FlowEdgeDefinition[] | null | undefined) {
  return (edges ?? []).filter((edge) => edge?.source && edge.target);
}

function nextTargets(edges: FlowEdgeDefinition[], source: string, sourceHandle?: string) {
  return edges
    .filter((edge) => edge.source === source && (!sourceHandle || edge.sourceHandle === sourceHandle))
    .map((edge) => edge.target);
}

function normalizeConfig(value: unknown): FlowNodeConfig {
  return value && typeof value === "object" ? (value as FlowNodeConfig) : {};
}

function quickRepliesForNode(automation: Automation, edges: FlowEdgeDefinition[], nodeId: string): QuickReply[] | null {
  const hasQuickReplyStep = nextTargets(edges, nodeId).some((target) => target === "quickReplies");
  if (!hasQuickReplyStep) return null;
  const replies = automation.quick_replies.filter((reply) => reply.title.trim() && reply.payload.trim());
  return replies.length ? replies : null;
}

function pickPublicReply(automation: Automation) {
  const replies = automation.public_replies.filter((reply) => reply.trim());
  if (!replies.length) return "";
  if (automation.public_reply_mode === "fixed") return replies[0];
  return replies[Math.floor(Math.random() * replies.length)];
}

function delayDate(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return new Date(Date.now() + safeSeconds * 1000);
}

function resolveInitialDelaySeconds(automation: Automation) {
  const fixedSeconds = positiveInteger(automation.reply_delay_seconds);
  if (automation.reply_delay_mode !== "random") return fixedSeconds;
  const min = positiveInteger(automation.reply_delay_min_seconds ?? fixedSeconds);
  const max = positiveInteger(automation.reply_delay_max_seconds ?? fixedSeconds);
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function resolveReminderDelaySeconds(automation: Automation) {
  const fixedSeconds = positiveInteger(automation.reminder_delay_seconds || automation.reminder_delay_minutes * 60);
  if (automation.reminder_delay_mode !== "random") return fixedSeconds;
  const min = positiveInteger(automation.reminder_delay_min_seconds ?? fixedSeconds);
  const max = positiveInteger(automation.reminder_delay_max_seconds ?? fixedSeconds);
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function resolveConfigDelaySeconds(config: FlowNodeConfig, fallbackSeconds: number) {
  if (!config.delayMode) return fallbackSeconds;

  const value = delayToSeconds(config.delayValue, config.delayUnit);
  if (config.delayMode !== "random") return value;

  const min = delayToSeconds(config.delayMin, config.delayUnit);
  const max = delayToSeconds(config.delayMax, config.delayUnit);
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function delayToSeconds(value: string | undefined, unit: FlowNodeConfig["delayUnit"]) {
  const amount = positiveInteger(Number(value || 0));
  if (unit === "hours") return amount * 3600;
  if (unit === "minutes") return amount * 60;
  return amount;
}

function normalizeMediaType(type: FlowNodeConfig["mediaType"]) {
  if (type === "audio") return "audio";
  if (type === "video") return "video";
  return "image";
}

function positiveInteger(value: number | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}
