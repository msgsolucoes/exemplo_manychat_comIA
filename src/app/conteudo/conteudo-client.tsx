"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Filter, ImageIcon, Loader2, Plus, RefreshCw, Send, Trash2, Video } from "lucide-react";
import type { ContentMediaItem, ContentPost, ContentPublishType } from "@/lib/db/repositories";

type Props = {
  activeAccountId: string | null;
  connected: boolean;
  username: string | null;
  initialPosts: ContentPost[];
};

type Notice = { tone: "success" | "error" | "warn"; text: string } | null;
type CarouselDraftItem = { type: "image" | "video"; url: string; coverUrl: string };
type HistoryStatusFilter = "all" | ContentPost["status"];
type HistoryTypeFilter = "all" | ContentPublishType;

const publishTypes: Array<{ value: ContentPublishType; label: string; description: string }> = [
  { value: "feed_image", label: "Feed imagem", description: "Imagem unica no feed." },
  { value: "reel_video", label: "Reel video", description: "Video publicado como Reel e compartilhado no feed." },
  { value: "story_image", label: "Story imagem", description: "Imagem publicada no Story por 24h." },
  { value: "story_video", label: "Story video", description: "Video publicado no Story por 24h." },
  { value: "carousel", label: "Carrossel", description: "De 2 a 10 imagens ou videos no feed." },
];

const emptyCarouselItem: CarouselDraftItem = { type: "image", url: "", coverUrl: "" };

export function ConteudoClient({ activeAccountId, connected, username, initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [publishType, setPublishType] = useState<ContentPublishType>("feed_image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [carouselItems, setCarouselItems] = useState<CarouselDraftItem[]>([
    { ...emptyCarouselItem },
    { ...emptyCarouselItem },
  ]);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => ({
    published: posts.filter((post) => post.status === "published").length,
    publishing: posts.filter((post) => post.status === "publishing").length,
    failed: posts.filter((post) => post.status === "failed").length,
  }), [posts]);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (typeFilter !== "all" && post.publish_type !== typeFilter) return false;
      if (!term) return true;

      return [post.caption, post.media_url, post.account_username, post.last_error]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [posts, search, statusFilter, typeFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);
    setNotice(null);

    const mediaItems = carouselItems
      .map((item) => ({ type: item.type, url: item.url.trim(), coverUrl: item.coverUrl.trim() }))
      .filter((item) => item.url);

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccountId,
          publishType,
          mediaUrl,
          coverUrl,
          caption,
          mediaItems,
        }),
      });
      const result = (await response.json().catch(() => null)) as { data?: ContentPost; error?: string; warning?: string } | null;
      if (!result?.data) throw new Error(result?.error || "Nao consegui publicar.");

      setPosts((current) => [result.data as ContentPost, ...current.filter((post) => post.id !== result.data?.id)]);
      if (!response.ok) throw new Error(result.error || "A Meta recusou a publicacao.");
      if (response.status === 202) {
        setNotice({ tone: "warn", text: result.warning || "Midia em processamento na Meta. Clique em Atualizar em alguns minutos." });
      } else {
        setNotice({ tone: "success", text: "Publicado com sucesso." });
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Erro ao publicar." });
    } finally {
      setPublishing(false);
    }
  }

  async function refreshHistory() {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/content${activeAccountId ? `?accountId=${encodeURIComponent(activeAccountId)}` : ""}`);
      const result = (await response.json().catch(() => null)) as { data?: ContentPost[] } | null;
      setPosts(result?.data ?? []);
    } finally {
      setRefreshing(false);
    }
  }

  function updateCarouselItem(index: number, patch: Partial<CarouselDraftItem>) {
    setCarouselItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addCarouselItem() {
    setCarouselItems((current) => current.length >= 10 ? current : [...current, { ...emptyCarouselItem }]);
  }

  function removeCarouselItem(index: number) {
    setCarouselItems((current) => current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function copyToClipboard(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice({ tone: "success", text: "URL copiada." });
  }

  const isImageType = publishType === "feed_image" || publishType === "story_image";
  const isVideoType = publishType === "reel_video" || publishType === "story_video";

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Publicados" value={String(stats.published)} tone="green" />
        <Metric label="Processando" value={String(stats.publishing)} tone="amber" />
        <Metric label="Com erro" value={String(stats.failed)} tone="red" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <form className="panel overflow-hidden" onSubmit={submit}>
          <div className="border-b border-[var(--ms-border)] p-5 sm:p-6">
            <p className="eyebrow">Nova publicacao</p>
            <h2 className="mt-2 text-xl font-bold">Publicar agora {username ? `em @${username}` : ""}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ms-muted)]">Use URLs publicas acessiveis pela Meta. Carrossel aceita de 2 a 10 itens.</p>
          </div>

          <fieldset className="grid gap-5 p-5 sm:p-6" disabled={publishing || !connected}>
            <div className="grid gap-3 md:grid-cols-2">
              {publishTypes.map((item) => (
                <button className={publishType === item.value ? "rounded-lg border border-[var(--ms-primary-soft)] bg-[var(--ms-surface-soft)] p-4 text-left ring-2 ring-[var(--ms-primary-soft)]" : "rounded-lg border border-[var(--ms-border)] bg-[var(--ms-surface-soft)] p-4 text-left"} key={item.value} onClick={() => setPublishType(item.value)} type="button">
                  <span className="metric-icon metric-blue">{item.value === "reel_video" || item.value === "story_video" ? <Video size={18} /> : <ImageIcon size={18} />}</span>
                  <span className="mt-3 block font-bold">{item.label}</span>
                  <span className="mt-1 block text-sm text-[var(--ms-muted)]">{item.description}</span>
                </button>
              ))}
            </div>

            {publishType === "carousel" ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">Itens do carrossel</p>
                    <p className="text-xs text-[var(--ms-muted)]">Use imagem ou video. O primeiro item define o enquadramento do carrossel.</p>
                  </div>
                  <button className="btn-secondary" onClick={addCarouselItem} disabled={carouselItems.length >= 10} type="button"><Plus size={16} /> Adicionar item</button>
                </div>
                <div className="grid gap-3">
                  {carouselItems.map((item, index) => (
                    <div className="rounded-lg border border-[var(--ms-border)] bg-[var(--ms-surface-soft)] p-4" key={index}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">Item {index + 1}</span>
                        <button className="btn-icon" onClick={() => removeCarouselItem(index)} disabled={carouselItems.length <= 2} title="Remover item" type="button"><Trash2 size={16} /></button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[150px_1fr]">
                        <select className="input" value={item.type} onChange={(event) => updateCarouselItem(index, { type: event.target.value === "video" ? "video" : "image" })}>
                          <option value="image">Imagem</option>
                          <option value="video">Video</option>
                        </select>
                        <input className="input" value={item.url} onChange={(event) => updateCarouselItem(index, { url: event.target.value })} placeholder={item.type === "video" ? "https://.../video.mp4" : "https://.../imagem.jpg"} type="url" required />
                      </div>
                      {item.type === "video" ? <input className="input mt-3" value={item.coverUrl} onChange={(event) => updateCarouselItem(index, { coverUrl: event.target.value })} placeholder="URL da capa opcional" type="url" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <label className="field">
                  <span>{isImageType ? "URL publica da imagem" : "URL publica do video"}</span>
                  <input className="input" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder={isImageType ? "https://.../imagem.jpg" : "https://.../video.mp4"} type="url" required={isImageType || isVideoType} />
                </label>

                {publishType === "reel_video" ? (
                  <label className="field">
                    <span>URL da capa opcional</span>
                    <input className="input" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://.../capa.jpg" type="url" />
                  </label>
                ) : null}
              </>
            )}

            <label className="field">
              <span>Legenda</span>
              <textarea className="input min-h-36" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Escreva a legenda da publicacao..." />
            </label>

            {!connected ? <p className="status-pill text-red-500"><AlertCircle size={14} /> Conecte um Instagram antes de publicar.</p> : null}
            {notice ? <p className={noticeClass(notice.tone)}>{notice.tone === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{notice.text}</p> : null}

            <button className="btn-primary w-fit" disabled={publishing || !connected} type="submit">
              {publishing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {publishing ? "Publicando..." : "Publicar agora"}
            </button>
          </fieldset>
        </form>

        <aside className="panel p-5 sm:p-6">
          <p className="eyebrow">Requisitos</p>
          <h2 className="mt-2 text-lg font-bold">Antes de publicar</h2>
          <div className="mt-4 grid gap-3 text-sm text-[var(--ms-muted)]">
            <Requirement text="Reconectar o perfil aceitando instagram_business_content_publish." />
            <Requirement text="Usar URLs publicas; links locais, privados ou expirados falham." />
            <Requirement text="Carrossel aceita de 2 a 10 imagens/videos." />
            <Requirement text="Videos podem demorar alguns minutos para processar; use Atualizar no historico." />
            <Requirement text="Stories publicados por API nao incluem stickers, links, enquetes, musica ou caixa de perguntas." />
          </div>
        </aside>
      </section>

      <section className="panel overflow-hidden p-0">
        <div className="grid gap-4 border-b border-[var(--ms-border)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Historico</p>
              <h2 className="mt-2 text-xl font-bold">Publicacoes recentes</h2>
            </div>
            <button className="btn-secondary" onClick={refreshHistory} disabled={refreshing} type="button">
              {refreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Atualizar pendentes
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <label className="field">
              <span><Filter size={13} /> Buscar</span>
              <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Legenda, perfil, URL ou erro" />
            </label>
            <label className="field">
              <span>Status</span>
              <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as HistoryStatusFilter)}>
                <option value="all">Todos</option>
                <option value="published">Publicado</option>
                <option value="publishing">Processando</option>
                <option value="failed">Erro</option>
              </select>
            </label>
            <label className="field">
              <span>Tipo</span>
              <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as HistoryTypeFilter)}>
                <option value="all">Todos</option>
                {publishTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="grid divide-y divide-[var(--ms-border)]">
          {filteredPosts.length ? filteredPosts.map((post) => <HistoryRow key={post.id} post={post} onCopy={copyToClipboard} />) : <p className="p-8 text-center text-sm text-[var(--ms-muted)]">Nenhuma publicacao encontrada.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "red" }) {
  const color = tone === "green" ? "metric-green" : tone === "amber" ? "metric-amber" : "metric-violet";
  return <article className="panel p-5"><p className="text-sm font-medium text-[var(--ms-muted)]">{label}</p><p className={`metric-icon ${color} mt-3 w-fit`}>{value}</p></article>;
}

function Requirement({ text }: { text: string }) {
  return <div className="flex gap-2 rounded-lg border border-[var(--ms-border)] bg-[var(--ms-surface-soft)] p-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={15} /><span>{text}</span></div>;
}

function HistoryRow({ post, onCopy }: { post: ContentPost; onCopy: (value: string) => void }) {
  const items = getMediaItems(post);
  const displayDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(post.published_at || post.created_at));

  return (
    <article className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusClass(post.status)}>{translateStatus(post.status)}</span>
          <span className="status-pill">{translatePublishType(post.publish_type)}</span>
          {post.account_username ? <span className="status-pill">@{post.account_username}</span> : null}
          <span className="status-pill">{displayDate}</span>
          {items.length > 1 ? <span className="status-pill">{items.length} itens</span> : null}
        </div>
        <p className="mt-3 truncate text-sm font-semibold">{post.caption || "Sem legenda"}</p>
        <p className="mt-1 truncate text-xs text-[var(--ms-muted)]">{post.media_url}</p>
        {items.length > 1 ? <div className="mt-3 flex flex-wrap gap-2">{items.map((item, index) => <span className="status-pill" key={`${item.url}-${index}`}>#{index + 1} {item.type === "video" ? "video" : "imagem"}{item.status ? ` Â· ${translateItemStatus(item.status)}` : ""}</span>)}</div> : null}
        {post.last_error ? <p className="mt-2 text-sm text-red-500">{post.last_error}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button className="btn-secondary" onClick={() => onCopy(post.permalink || post.media_url)} type="button"><Copy size={16} /> Copiar</button>
        {post.permalink ? <a className="btn-secondary" href={post.permalink} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir</a> : null}
      </div>
    </article>
  );
}

function getMediaItems(post: ContentPost): ContentMediaItem[] {
  if (Array.isArray(post.media_items) && post.media_items.length) return post.media_items;
  return [{ type: post.publish_type.includes("video") ? "video" : "image", url: post.media_url }];
}

function noticeClass(tone: Notice extends infer N ? N extends { tone: infer T } ? T : never : never) {
  if (tone === "success") return "status-pill status-pill-green w-fit";
  if (tone === "warn") return "status-pill status-pill-amber w-fit";
  return "status-pill w-fit text-red-500";
}

function statusClass(status: ContentPost["status"]) {
  if (status === "published") return "status-pill status-pill-green";
  if (status === "publishing") return "status-pill status-pill-amber";
  if (status === "failed") return "status-pill text-red-500";
  return "status-pill";
}

function translateStatus(status: ContentPost["status"]) {
  const labels = { draft: "Rascunho", publishing: "Processando", published: "Publicado", failed: "Erro" };
  return labels[status];
}

function translateItemStatus(status: NonNullable<ContentMediaItem["status"]>) {
  const labels = { pending: "pendente", processing: "processando", finished: "pronto", failed: "erro" };
  return labels[status];
}

function translatePublishType(type: ContentPublishType) {
  const labels: Record<ContentPublishType, string> = {
    feed_image: "Feed imagem",
    feed_video: "Feed video",
    reel_video: "Reel",
    story_image: "Story imagem",
    story_video: "Story video",
    carousel: "Carrossel",
  };
  return labels[type];
}
