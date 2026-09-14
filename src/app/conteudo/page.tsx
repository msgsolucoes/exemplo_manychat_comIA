import { AppFrame, PageHeader } from "../app-frame";
import { ConteudoClient } from "./conteudo-client";
import { getConfig, listContentPosts, listInstagramAccounts } from "@/lib/db/repositories";
import { getSelectedAccountId, type AccountRouteSearchParams } from "@/lib/account-routing";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<AccountRouteSearchParams>;
};

export default async function ConteudoPage({ searchParams }: Props) {
  const params = await searchParams;
  const [workspaceContext, accounts] = await Promise.all([getCurrentWorkspaceContext(), listInstagramAccounts()]);
  const activeAccountId = getSelectedAccountId(params, accounts);
  const [config, posts] = await Promise.all([getConfig(activeAccountId), listContentPosts(50, activeAccountId)]);
  const connected = Boolean(config.instagram_user_id);

  return (
    <AppFrame active="conteudo" connected={connected} username={config.instagram_username} accounts={accounts} activeAccountId={activeAccountId} workspaceName={workspaceContext?.workspace.name} userEmail={workspaceContext?.profile.email} plan={workspaceContext?.workspace.plan}>
      <PageHeader
        eyebrow="Conteudo"
        title="Publicar no Instagram"
        description="Publique Feed, Reels, Stories e Carrossel no perfil selecionado usando URLs publicas de midia. Para publicar, reconecte o perfil aceitando instagram_business_content_publish."
      />

      <ConteudoClient activeAccountId={activeAccountId} connected={connected} username={config.instagram_username} initialPosts={posts} />
    </AppFrame>
  );
}
