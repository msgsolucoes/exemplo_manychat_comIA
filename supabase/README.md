# Banco de dados e migrations

As migrations oficiais ficam em `supabase/migrations` e usam nomes como `0001_initial_schema.sql`.

## Banco novo

Preencha `DATABASE_URL` em `.env.local` e execute:

```bash
npm run db:migrate
npm run db:status
```

O executor aplica os arquivos em ordem, usa uma transacao por migration, evita execucoes simultaneas, registra versao/checksum em `public.schema_migrations` e nao reaplica arquivos concluidos.

## Futuras mudancas

Nunca edite uma migration que ja foi aplicada. Crie um novo arquivo com o proximo numero. Mudancas destrutivas devem primeiro adicionar estrutura compativel, depois migrar dados e somente em uma versao futura remover a estrutura antiga.

`supabase/schema.sql` permanece como snapshot historico. Instalacoes e atualizacoes oficiais usam `npm run db:migrate`.

`supabase/cron.sql` depende do dominio final e do `WORKER_SECRET`; execute-o somente depois do primeiro deploy.