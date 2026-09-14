# Instalacao tecnica

Este guia resume a instalacao para quem ja usa terminal. Se voce nao e programador, siga o [guia completo para novo proprietario](GUIA_COMPLETO_NOVO_PROPRIETARIO.md).

## 1. Criar o repositorio

1. Crie um repositorio novo no GitHub.
2. Copie os arquivos deste projeto para esse repositorio.
3. Nao copie `.env.local`, `.vercel`, `.next` ou `node_modules`.
4. Rode:

```bash
npm install
npm run lint
npm run build
```

## 2. Criar projeto no Supabase

1. Crie um projeto Supabase novo.
2. Copie `Project URL`, `anon public key` e `service_role key`.
3. Copie a connection string Postgres para `DATABASE_URL`.
4. Preencha `.env.local` usando `.env.example`.
5. Confira o ambiente:

```bash
npm run setup:check
```

6. Aplique as migrations:

```bash
npm run db:migrate
npm run db:status
```

As migrations ficam em `supabase/migrations`. Nao edite uma migration ja aplicada.

## 3. Configurar Auth no Supabase

Adicione as URLs de redirecionamento:

```text
http://127.0.0.1:3000/auth/callback
http://localhost:3000/auth/callback
https://SEU-DOMINIO.vercel.app/auth/callback
https://SEU-DOMINIO-PRODUCAO/auth/callback
```

Se usar magic link, confirme tambem o dominio do site em Auth > URL Configuration.

## 4. Criar app na Meta

Configure um app Meta com Instagram Login/API e Webhooks. No UaiFlow, as rotas usadas sao:

```text
OAuth callback: /api/oauth/callback
Webhook callback: /api/webhook
Privacy policy: /privacy-policy ou /privacidade
Data deletion: /data-deletion ou /exclusao-de-dados
```

Depois preencha:

```text
INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI
WEBHOOK_VERIFY_TOKEN
```

## 5. Deploy na Vercel

1. Importe o repositorio no Vercel.
2. Configure todas as variaveis de ambiente do `.env.example`.
3. Ajuste `APP_BASE_URL` e `INSTAGRAM_REDIRECT_URI` para o dominio publico.
4. Rode o deploy.
5. Depois do deploy, configure `supabase/cron.sql` com o dominio final e `WORKER_SECRET`.

## 6. Conectar o primeiro Instagram

1. Entre no app.
2. Abra `Perfis`.
3. Clique para conectar o Instagram.
4. Autorize a conta profissional.
5. Crie uma automacao simples e teste com comentario ou DM.

## Checklist final

- Build passa localmente.
- `npm run db:migrate` executa sem erro e `npm run db:status` nao mostra pendencias.
- Vercel tem todas as env vars.
- Supabase Auth aceita o dominio da Vercel.
- Meta app tem callback OAuth, webhook, privacidade e exclusao de dados.
- Cron chama `/api/queue/drain` e `/api/token/refresh` com `WORKER_SECRET`.