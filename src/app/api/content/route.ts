import { NextRequest, NextResponse } from "next/server";
import {
  createContentPost,
  getConfig,
  listContentPosts,
  updateContentPostMediaItems,
  updateContentPostStatus,
  type Config,
  type ContentMediaItem,
  type ContentPost,
  type ContentPublishType,
} from "@/lib/db/repositories";
import {
  createInstagramCarouselContainer,
  createInstagramCarouselItemContainer,
  createInstagramMediaContainer,
  getInstagramMediaContainerStatus,
  getPublishedInstagramMedia,
  publishInstagramMediaContainer,
  type InstagramCarouselMediaItem,
  type InstagramPublishType,
} from "@/lib/instagram/client";

export const runtime = "nodejs";

type ContentResponse = { data: ContentPost | null; warning?: string };

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const posts = await listContentPosts(50, accountId);
  await finalizePendingPosts(posts);
  const updatedPosts = await listContentPosts(50, accountId);
  return NextResponse.json({ data: updatedPosts });
}

async function finalizePendingPosts(posts: ContentPost[]) {
  const pendingPosts = posts.filter((post) => post.status === "publishing").slice(0, 10);

  for (const post of pendingPosts) {
    const config = await getConfig(post.account_id);
    if (!config.instagram_user_id || !config.instagram_access_token) continue;

    if (post.publish_type === "carousel") {
      await finalizePendingCarouselPost(post, config);
      continue;
    }

    if (!post.container_id) continue;

    try {
      const container = await getInstagramMediaContainerStatus(post.container_id, config.instagram_access_token);

      if (container.status_code === "FINISHED") {
        await publishFinishedContainer(post, config, post.container_id);
        continue;
      }

      if (container.status_code === "ERROR" || container.status_code === "EXPIRED") {
        await updateContentPostStatus({
          id: post.id,
          status: "failed",
          containerId: post.container_id,
          lastError: container.status || `Container ${container.status_code}`,
        });
        continue;
      }

      await updateContentPostStatus({
        id: post.id,
        status: "publishing",
        containerId: post.container_id,
        lastError: "A Meta ainda esta processando a midia. Clique em Atualizar novamente em alguns minutos.",
      });
    } catch (error) {
      await updateContentPostStatus({
        id: post.id,
        status: "publishing",
        containerId: post.container_id,
        lastError: translatePublishError(error),
      });
    }
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const accountId = optionalString(body.accountId);
  const publishType = parsePublishType(body.publishType);
  const mediaUrl = optionalString(body.mediaUrl);
  const coverUrl = optionalString(body.coverUrl) ?? null;
  const caption = optionalString(body.caption) ?? "";
  const carouselItems = parseCarouselItems(body.mediaItems);

  if (!publishType) {
    return NextResponse.json({ error: "Tipo de publicacao invalido." }, { status: 400 });
  }

  if (publishType === "carousel") {
    const validation = validateCarouselItems(carouselItems);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  } else {
    if (!mediaUrl || !isValidHttpUrl(mediaUrl)) {
      return NextResponse.json({ error: "Informe uma URL publica de imagem ou video." }, { status: 400 });
    }

    if (coverUrl && !isValidHttpUrl(coverUrl)) {
      return NextResponse.json({ error: "A URL da capa precisa ser publica e valida." }, { status: 400 });
    }
  }

  const config = await getConfig(accountId);
  if (!config.account_id || !config.instagram_user_id || !config.instagram_access_token) {
    return NextResponse.json({ error: "Instagram nao conectado para este perfil." }, { status: 400 });
  }

  const post = await createContentPost({
    accountId: config.account_id,
    publishType,
    caption,
    mediaUrl: publishType === "carousel" ? carouselItems[0]?.url ?? "" : mediaUrl ?? "",
    coverUrl,
    mediaItems: publishType === "carousel" ? carouselItems : [],
  });

  try {
    if (publishType === "carousel") {
      const result = await processCarouselPost(post, config, carouselItems, caption);
      return NextResponse.json(result, result.warning ? { status: 202 } : undefined);
    }

    const container = await createInstagramMediaContainer({
      instagramUserId: config.instagram_user_id,
      accessToken: config.instagram_access_token,
      publishType: toInstagramPublishType(publishType),
      mediaUrl: mediaUrl ?? "",
      coverUrl,
      caption,
    });

    await updateContentPostStatus({ id: post.id, status: "publishing", containerId: container.id, lastError: null });

    const ready = await waitForContainer(container.id, config.instagram_access_token);
    if (!ready) {
      const updated = await updateContentPostStatus({
        id: post.id,
        status: "publishing",
        containerId: container.id,
        lastError: "A Meta ainda esta processando a midia. Tente atualizar em alguns minutos.",
      });
      return NextResponse.json({ data: updated, warning: "Midia enviada para processamento, mas ainda nao publicada." }, { status: 202 });
    }

    const updated = await publishFinishedContainer(post, config, container.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = translatePublishError(error);
    const updated = await updateContentPostStatus({ id: post.id, status: "failed", lastError: message });
    return NextResponse.json({ data: updated, error: message }, { status: 502 });
  }
}

async function processCarouselPost(
  post: ContentPost,
  config: Config,
  inputItems: ContentMediaItem[],
  caption: string,
): Promise<ContentResponse> {
  const items = inputItems.map((item) => ({ ...item, status: item.status ?? "pending" })) satisfies ContentMediaItem[];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (!item.container_id) {
      const child = await createInstagramCarouselItemContainer({
        instagramUserId: config.instagram_user_id ?? "",
        accessToken: config.instagram_access_token ?? "",
        item: toInstagramCarouselItem(item),
      });
      items[index] = { ...item, container_id: child.id, status: "processing", error: null };
      await updateContentPostMediaItems(post.id, items);
    }

    const childContainerId = items[index].container_id;
    if (!childContainerId) continue;

    const ready = await waitForContainer(childContainerId, config.instagram_access_token ?? "", 10);
    if (!ready) {
      items[index] = { ...items[index], status: "processing", error: "Ainda processando na Meta" };
      await updateContentPostMediaItems(post.id, items);
      const updated = await updateContentPostStatus({
        id: post.id,
        status: "publishing",
        lastError: `Item ${index + 1} do carrossel ainda esta processando. Clique em Atualizar em alguns minutos.`,
      });
      return { data: updated, warning: "Carrossel enviado para processamento, mas ainda nao publicado." };
    }

    items[index] = { ...items[index], status: "finished", error: null };
    await updateContentPostMediaItems(post.id, items);
  }

  const carouselContainer = await createInstagramCarouselContainer({
    instagramUserId: config.instagram_user_id ?? "",
    accessToken: config.instagram_access_token ?? "",
    children: items.map((item) => item.container_id).filter(Boolean) as string[],
    caption,
  });

  await updateContentPostStatus({ id: post.id, status: "publishing", containerId: carouselContainer.id, lastError: null });

  const parentReady = await waitForContainer(carouselContainer.id, config.instagram_access_token ?? "", 8);
  if (!parentReady) {
    const updated = await updateContentPostStatus({
      id: post.id,
      status: "publishing",
      containerId: carouselContainer.id,
      lastError: "Container do carrossel ainda esta processando. Clique em Atualizar em alguns minutos.",
    });
    return { data: updated, warning: "Carrossel enviado para processamento, mas ainda nao publicado." };
  }

  const updated = await publishFinishedContainer(post, config, carouselContainer.id);
  return { data: updated };
}

async function finalizePendingCarouselPost(post: ContentPost, config: Config) {
  const items = normalizeCarouselItems(post.media_items);
  if (items.length < 2) return;

  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];

      if (!item.container_id) {
        const child = await createInstagramCarouselItemContainer({
          instagramUserId: config.instagram_user_id ?? "",
          accessToken: config.instagram_access_token ?? "",
          item: toInstagramCarouselItem(item),
        });
        items[index] = { ...item, container_id: child.id, status: "processing", error: null };
        await updateContentPostMediaItems(post.id, items);
      }

      const childContainerId = items[index].container_id;
      if (!childContainerId) continue;

      const container = await getInstagramMediaContainerStatus(childContainerId, config.instagram_access_token ?? "");
      if (container.status_code === "FINISHED") {
        items[index] = { ...items[index], status: "finished", error: null };
        continue;
      }

      if (container.status_code === "ERROR" || container.status_code === "EXPIRED") {
        items[index] = { ...items[index], status: "failed", error: container.status || `Container ${container.status_code}` };
        await updateContentPostMediaItems(post.id, items);
        await updateContentPostStatus({ id: post.id, status: "failed", lastError: `Item ${index + 1}: ${items[index].error}` });
        return;
      }

      items[index] = { ...items[index], status: "processing", error: "Ainda processando na Meta" };
      await updateContentPostMediaItems(post.id, items);
      await updateContentPostStatus({
        id: post.id,
        status: "publishing",
        lastError: `Item ${index + 1} do carrossel ainda esta processando. Clique em Atualizar em alguns minutos.`,
      });
      return;
    }

    await updateContentPostMediaItems(post.id, items);

    let parentContainerId = post.container_id;
    if (!parentContainerId) {
      const parent = await createInstagramCarouselContainer({
        instagramUserId: config.instagram_user_id ?? "",
        accessToken: config.instagram_access_token ?? "",
        children: items.map((item) => item.container_id).filter(Boolean) as string[],
        caption: post.caption,
      });
      parentContainerId = parent.id;
      await updateContentPostStatus({ id: post.id, status: "publishing", containerId: parentContainerId, lastError: null });
    }

    const parent = await getInstagramMediaContainerStatus(parentContainerId, config.instagram_access_token ?? "");
    if (parent.status_code === "FINISHED") {
      await publishFinishedContainer(post, config, parentContainerId);
      return;
    }

    if (parent.status_code === "ERROR" || parent.status_code === "EXPIRED") {
      await updateContentPostStatus({ id: post.id, status: "failed", containerId: parentContainerId, lastError: parent.status || `Container ${parent.status_code}` });
      return;
    }

    await updateContentPostStatus({
      id: post.id,
      status: "publishing",
      containerId: parentContainerId,
      lastError: "Container do carrossel ainda esta processando. Clique em Atualizar em alguns minutos.",
    });
  } catch (error) {
    await updateContentPostStatus({ id: post.id, status: "publishing", lastError: translatePublishError(error) });
  }
}

async function publishFinishedContainer(post: ContentPost, config: Config, containerId: string) {
  const published = await publishInstagramMediaContainer({
    instagramUserId: config.instagram_user_id ?? "",
    accessToken: config.instagram_access_token ?? "",
    containerId,
  });
  const publishedMedia = await getPublishedInstagramMedia(published.id, config.instagram_access_token ?? "").catch(() => null);

  return updateContentPostStatus({
    id: post.id,
    status: "published",
    containerId,
    publishedMediaId: published.id,
    permalink: publishedMedia?.permalink ?? null,
    lastError: null,
    publishedAt: new Date(),
  });
}

async function waitForContainer(containerId: string, accessToken: string, attempts = 8) {
  for (let index = 0; index < attempts; index += 1) {
    const status = await getInstagramMediaContainerStatus(containerId, accessToken);
    if (status.status_code === "FINISHED") return true;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(status.status || `Container ${status.status_code}`);
    }
    await sleep(2500);
  }

  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePublishType(value: unknown): ContentPublishType | null {
  return value === "feed_image" || value === "reel_video" || value === "story_image" || value === "story_video" || value === "carousel" ? value : null;
}

function toInstagramPublishType(value: ContentPublishType): InstagramPublishType {
  if (value === "reel_video") return "reel_video";
  if (value === "story_image") return "story_image";
  if (value === "story_video") return "story_video";
  return "feed_image";
}

function parseCarouselItems(value: unknown): ContentMediaItem[] {
  if (!Array.isArray(value)) return [];

  const items: ContentMediaItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = optionalString(record.url);
    if (!url) continue;

    items.push({
      type: record.type === "video" ? "video" : "image",
      url,
      cover_url: optionalString(record.coverUrl) ?? optionalString(record.cover_url) ?? null,
      status: "pending",
    });
  }

  return items;
}

function normalizeCarouselItems(value: unknown): ContentMediaItem[] {
  if (!Array.isArray(value)) return [];

  const items: ContentMediaItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = optionalString(record.url);
    if (!url) continue;

    items.push({
      type: record.type === "video" ? "video" : "image",
      url,
      cover_url: optionalString(record.cover_url) ?? optionalString(record.coverUrl) ?? null,
      container_id: optionalString(record.container_id) ?? optionalString(record.containerId) ?? null,
      status: record.status === "processing" || record.status === "finished" || record.status === "failed" ? record.status : "pending",
      error: optionalString(record.error) ?? null,
    });
  }

  return items;
}

function validateCarouselItems(items: ContentMediaItem[]) {
  if (items.length < 2) return "Carrossel precisa ter pelo menos 2 itens.";
  if (items.length > 10) return "Carrossel aceita no maximo 10 itens.";

  for (const [index, item] of items.entries()) {
    if (!isValidHttpUrl(item.url)) return `Item ${index + 1}: informe uma URL publica valida.`;
    if (item.cover_url && !isValidHttpUrl(item.cover_url)) return `Item ${index + 1}: a capa precisa ser uma URL publica valida.`;
  }

  return null;
}

function toInstagramCarouselItem(item: ContentMediaItem): InstagramCarouselMediaItem {
  return {
    type: item.type,
    url: item.url,
    coverUrl: item.cover_url ?? null,
  };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function translatePublishError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido ao publicar.";

  if (message.includes("content_publish") || message.includes("permission")) {
    return "Permissao de publicacao ausente, ou Story indisponivel para este tipo de conta. Reconecte o perfil aceitando instagram_business_content_publish e confirme se a conta e Business para Stories.";
  }

  if (message.includes("Media ID is not available") || message.includes("not ready")) {
    return "A midia ainda nao terminou de processar na Meta. Tente novamente em alguns minutos.";
  }

  if (message.includes("Invalid parameter") || message.includes("url") || message.includes("children")) {
    return "A Meta recusou a publicacao. Confira se todas as URLs sao publicas, validas e se os itens do carrossel ja terminaram de processar.";
  }

  return message.replace(/^Instagram Graph v\d+\.\d+:\s*/i, "Meta: ");
}
