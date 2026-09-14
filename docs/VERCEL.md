# Vercel

A Vercel detecta o projeto como Next.js.

## Configuracao

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

## Variaveis de ambiente

Copie todas as chaves de `.env.example` para o projeto da Vercel. Em producao, ajuste:

```text
APP_BASE_URL=https://SEU-DOMINIO
INSTAGRAM_REDIRECT_URI=https://SEU-DOMINIO/api/oauth/callback
```

Use valores fortes e diferentes para:

```text
ADMIN_SESSION_SECRET
WORKER_SECRET
WEBHOOK_VERIFY_TOKEN
```

## Depois do primeiro deploy

1. Copie o dominio final da Vercel.
2. Atualize as URLs no Supabase Auth.
3. Atualize as URLs no app Meta.
4. Edite `supabase/cron.sql` com o dominio final e o `WORKER_SECRET`.
5. Execute `supabase/cron.sql` no SQL Editor do Supabase.

Para um roteiro orientado a cliques, consulte o [guia completo para novo proprietario](GUIA_COMPLETO_NOVO_PROPRIETARIO.md).