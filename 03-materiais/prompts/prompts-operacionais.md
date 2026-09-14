# Prompts operacionais

Use apenas o bloco correspondente à etapa atual.

## Instalar Node.js e Git no Windows

```text
Verifique se Node.js LTS, npm e Git já estão instalados. Se não estiverem, explique e instale via winget. Ao final, valide node --version, npm --version e git --version. Não altere outras configurações sem necessidade.
```

## Rodar e testar

```text
Inspecione os scripts do projeto, instale dependências pelo gerenciador já adotado e rode o app localmente. Depois execute lint, testes e build que existirem. Se houver erro, diagnostique e corrija sem desativar verificações.
```

## Guardar no GitHub

```text
Antes de enviar o projeto ao meu repositório, verifique o status do Git e confirme que .env, .env.local, tokens e chaves estão ignorados e nunca foram adicionados. Mostre os arquivos que serão versionados e só então prepare o commit e o push para o repositório que eu informar.
```

## Publicar na Vercel

```text
Revise o projeto e as variáveis necessárias para produção. Ajude-me a associar o repositório à Vercel e cadastrar as variáveis pelo ambiente seguro, sem exibir valores nos logs. Execute o build antes do deploy e valide a URL publicada ao final.
```
