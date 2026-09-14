# Onboarding de novo perfil

Use este roteiro quando um novo dono/cliente for instalar o UaiFlow.

## Antes da chamada

Peça para a pessoa criar ou separar acesso a:

- GitHub
- Supabase
- Vercel
- Meta Developers
- Instagram profissional

## Durante a configuracao

1. Criar ou importar o repositorio no GitHub.
2. Criar projeto Supabase.
3. Preencher `.env.local` local e variaveis na Vercel.
4. Rodar `npm run db:migrate` e conferir `npm run db:status`.
5. Fazer deploy na Vercel.
6. Configurar URLs no Supabase Auth.
7. Configurar OAuth e Webhook na Meta.
8. Entrar no UaiFlow e conectar Instagram.
9. Criar primeira automacao de teste.
10. Testar comentario, DM e fila.

## Primeira automacao sugerida

- Nome: Entrega de link teste
- Gatilho: comentarios
- Palavra-chave: quero
- Resposta publica: Enviei no direct.
- DM inicial: Oi! Aqui esta o link que voce pediu.
- Botao: Abrir link
- URL: um link publico de teste

## Criterio de pronto

A instalacao esta pronta quando:

- O login funciona.
- O Instagram aparece em `Perfis`.
- Um comentario gera evento.
- A fila envia resposta privada ou DM.
- O cron consegue chamar `/api/queue/drain`.
- A renovacao de token esta agendada em `/api/token/refresh`.