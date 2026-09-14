# Checklist para copiar para outro dono

Este e o roteiro para transformar uma instalacao existente em uma instalacao nova e independente.

## Nao copiar

- `.env.local`
- `.vercel/`
- `.next/`
- `node_modules/`
- tokens antigos do Instagram
- `SUPABASE_SERVICE_ROLE_KEY` antiga
- `DATABASE_URL` antiga
- senhas ou secrets antigos

## Copiar

- codigo fonte
- `package.json` e `package-lock.json`
- `supabase/migrations/`
- `supabase/cron.sql`
- `docs/`
- `.env.example`

## Criar do zero no novo perfil

- novo repositorio GitHub
- novo projeto Supabase
- novo projeto Vercel
- novo app Meta ou acesso ao app correto
- novas variaveis de ambiente
- novo token de webhook
- novo `WORKER_SECRET`

## Ordem recomendada

1. Copiar codigo para o novo GitHub.
2. Criar Supabase e executar `npm run db:migrate`.
3. Criar Vercel e configurar env vars.
4. Fazer deploy.
5. Atualizar Supabase Auth com o dominio novo.
6. Atualizar Meta com callback OAuth e webhook novo.
7. Conectar Instagram pelo painel.
8. Configurar cron no Supabase.
9. Testar automacao ponta a ponta.

## Observacao sobre dados

Para uma versao open source, nao recomendo levar dados reais de clientes, contatos, eventos ou filas para outro dono. O mais limpo e instalar o schema e deixar cada dono conectar suas proprias contas.