import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/db/repositories";
import {
  getInstagramMessengerProfile,
  getInstagramProfile,
  getInstagramSubscribedApps,
  listInstagramMedia,
} from "@/lib/instagram/client";

export const runtime = "nodejs";

type CheckStatus = "ok" | "warn" | "error";

type DiagnosticCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const config = await getConfig(accountId);

  if (!config.instagram_user_id || !config.instagram_access_token) {
    return NextResponse.json({ error: "Instagram nao conectado." }, { status: 400 });
  }

  const checks: DiagnosticCheck[] = [];

  checks.push(checkTokenDate(config.token_expires_at));

  const [profile, media, subscriptions, persistentMenu, iceBreakers] = await Promise.all([
    runCheck("profile", "Token e perfil", async () => {
      const result = await getInstagramProfile(config.instagram_access_token as string);
      return `Conectado como @${result.username}.`;
    }),
    runCheck("media", "Posts e reels", async () => {
      const result = await listInstagramMedia(config.instagram_user_id as string, config.instagram_access_token as string);
      const count = result.data?.length ?? 0;
      return count ? `${count} midia(s) retornada(s).` : "Conexao ok, mas nenhuma midia retornou.";
    }),
    runCheck("webhook", "Webhook", async () => {
      const result = await getInstagramSubscribedApps(config.instagram_user_id as string, config.instagram_access_token as string);
      const count = result.data?.length ?? 0;
      if (count > 0) return `Inscricao ativa na Meta. ${config.webhook_subscribed_at ? `Salva localmente desde ${formatDate(config.webhook_subscribed_at)}.` : "Sem data local salva."}`;
      return config.webhook_subscribed_at ? "Data local existe, mas a Meta nao retornou inscricao ativa." : "Nenhuma inscricao ativa retornada pela Meta.";
    }),
    runCheck("persistent_menu", "Menu principal", async () => {
      const result = await getInstagramMessengerProfile({
        instagramUserId: config.instagram_user_id as string,
        accessToken: config.instagram_access_token as string,
        fields: "persistent_menu",
      });
      const hasMenu = Boolean(result.data?.[0]?.persistent_menu);
      return hasMenu ? "Menu publicado encontrado na Meta." : "GET respondeu, mas nao ha menu publicado.";
    }),
    runCheck("ice_breakers", "Iniciadores", async () => {
      const result = await getInstagramMessengerProfile({
        instagramUserId: config.instagram_user_id as string,
        accessToken: config.instagram_access_token as string,
        fields: "ice_breakers",
      });
      const hasIceBreakers = Boolean(result.data?.[0]?.ice_breakers);
      return hasIceBreakers ? "Iniciadores publicados encontrados na Meta." : "GET respondeu, mas nao ha iniciadores publicados.";
    }),
  ]);

  checks.push(profile, media, subscriptions, persistentMenu, iceBreakers);

  return NextResponse.json({
    data: {
      accountId: config.account_id,
      username: config.instagram_username,
      checkedAt: new Date().toISOString(),
      checks,
      summary: summarize(checks),
    },
  });
}

function checkTokenDate(value: string | null): DiagnosticCheck {
  if (!value) {
    return { key: "token_expiry", label: "Validade do token", status: "warn", detail: "Sem data de expiracao salva." };
  }

  const expiresAt = new Date(value).getTime();
  const days = Math.ceil((expiresAt - Date.now()) / 86_400_000);

  if (days <= 0) {
    return { key: "token_expiry", label: "Validade do token", status: "error", detail: "Token expirado. Reconecte o perfil." };
  }

  if (days <= 7) {
    return { key: "token_expiry", label: "Validade do token", status: "warn", detail: `Expira em ${days} dia(s). Atualize permissoes em breve.` };
  }

  return { key: "token_expiry", label: "Validade do token", status: "ok", detail: `Expira em ${days} dia(s).` };
}

async function runCheck(key: string, label: string, action: () => Promise<string>): Promise<DiagnosticCheck> {
  try {
    const detail = await action();
    const status: CheckStatus = detail.includes("nao ha") || detail.includes("nao retornou") || detail.includes("Sem data") ? "warn" : "ok";
    return { key, label, status, detail };
  } catch (error) {
    return { key, label, status: "error", detail: translateMetaError(error) };
  }
}

function summarize(checks: DiagnosticCheck[]) {
  const errors = checks.filter((check) => check.status === "error").length;
  const warnings = checks.filter((check) => check.status === "warn").length;

  if (errors) return { status: "error" as const, label: `${errors} erro(s)` };
  if (warnings) return { status: "warn" as const, label: `${warnings} aviso(s)` };
  return { status: "ok" as const, label: "Tudo certo" };
}

function translateMetaError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido.";

  if (message.includes("Session has expired") || message.includes("Error validating access token")) {
    return "Token expirado ou invalido. Reconecte o perfil.";
  }

  if (message.includes("Unsupported request") || message.includes("permission")) {
    return "A Meta recusou a chamada. Verifique permissao do perfil, modo de teste e escopos concedidos.";
  }

  if (message.includes("User consent is required")) {
    return "Consentimento do usuario necessario. O lead precisa iniciar a conversa ou tocar em menu/iniciador.";
  }

  return message.replace(/^Instagram Graph v\d+\.\d+:\s*/i, "Meta: ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
