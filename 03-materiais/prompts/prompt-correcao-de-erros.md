# Prompt — Correção de erros

```text
Quero diagnosticar um erro sem aplicar tentativas aleatórias.

Etapa: {ETAPA}
O que eu fiz: {PASSOS_PARA_REPRODUZIR}
O que eu esperava: {RESULTADO_ESPERADO}
O que aconteceu: {RESULTADO_OBSERVADO}
Mensagem/log sem segredos:
{LOG_COMPLETO}
Última mudança realizada: {ULTIMA_MUDANCA}

Faça nesta ordem:
1. Inspecione os arquivos e configurações relacionados.
2. Classifique a origem provável: navegador, servidor, banco, deploy, OAuth, webhook ou API.
3. Liste as evidências do diagnóstico.
4. Proponha a menor correção possível.
5. Aplique somente essa correção.
6. Rode os testes, lint e build disponíveis.
7. Explique como repetir exatamente o cenário original.

Não esconda o erro, não remova validações e não exponha tokens. Se faltar informação, peça somente o dado necessário e diga como obtê-lo com segurança.
```
