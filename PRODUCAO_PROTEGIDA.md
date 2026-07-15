# PRODUCAO PROTEGIDA - ACHEI X

Este projeto esta em producao e atende usuarios reais.

E proibido alterar qualquer comportamento existente sem autorizacao explicita do proprietario do projeto.

Antes de qualquer alteracao, a IA deve apresentar um DOUBLE CHECK contendo:

1. Arquivos que serao alterados
2. Comportamento atual
3. Comportamento novo
4. Riscos da alteracao
5. Impacto em usuarios reais
6. Impacto em pagamentos, anuncios, login, planos, mensagens, banco de dados, Supabase, Android/APK ou Vercel
7. Necessidade ou nao de deploy

A alteracao so podera ser feita apos confirmacao escrita do proprietario com a frase:

`CONFIRMO A ALTERACAO`

E proibido fazer deploy sem a frase:

`FACA DEPLOY AGORA`

## Trava Do Cadastro

A area de cadastro esta protegida por trava automatica de build e deploy.

Arquivos criticos de cadastro possuem hash travado em `.registration-safety-lock.json`. Se qualquer linha protegida for alterada, o comando `npm run build` falha antes do deploy.

Para autorizar mudanca real no cadastro, o proprietario deve definir uma destas variaveis antes do build/deploy:

`REGISTRATION_GUARD_PHRASE`

ou

`CADASTRO_MASTER_PHRASE`

Frase mestre:

`EU AUTORIZO ALTERAR CADASTRO DO ACHEI X EM PRODUCAO`

Sem essa frase, nenhuma alteracao em cadastro deve chegar em producao.

## Trava Do Preview Dos Anuncios

O comportamento de abrir anuncios em preview/reel antes do anuncio completo esta protegido por trava automatica de build e deploy.

Arquivos criticos de preview possuem hash travado em `.listing-preview-safety-lock.json`. Alem disso, o build falha se qualquer tela voltar a usar `<ListingCard>` sem `onOpenPreview`, porque isso faz o app/site abrir o anuncio completo direto.

Para autorizar mudanca real nesse comportamento, o proprietario deve definir uma destas variaveis antes do build/deploy:

`LISTING_PREVIEW_GUARD_PHRASE`

ou

`ANUNCIOS_PREVIEW_MASTER_PHRASE`

Frase mestre:

`EU AUTORIZO ALTERAR PREVIEW DE ANUNCIOS DO ACHEI X EM PRODUCAO`

Sem essa frase, nenhuma alteracao que desconfigure o preview/reel dos anuncios deve chegar em producao.

## Trava Do Grid Da Pagina Principal

O layout antigo dos anuncios na pagina principal esta protegido por trava automatica de build e deploy.

Na home, as secoes IMOVEIS e VEICULOS devem continuar lado a lado, e os anuncios dentro de cada secao devem aparecer um abaixo do outro no celular. Qualquer mudanca nesse grid bloqueia o build.

Para autorizar mudanca real nesse grid, o proprietario deve definir uma destas variaveis antes do build/deploy:

`HOME_GRID_GUARD_PHRASE`

ou

`GRID_MASTER_PHRASE`

Frase mestre:

`FAZER ALTERAÇÃO NO GRID`

Sem essa frase, nenhuma alteracao no grid antigo da pagina principal deve chegar em producao.

Areas protegidas:

* login e cadastro
* anuncios
* planos e pagamentos
* Asaas/webhooks
* Supabase/migrations/RLS
* mensagens/notificacoes
* menu inferior
* dashboard/conta
* APK/Android
* Vercel/deploy
* regras de expiracao, renovacao e volta ao topo

Qualquer melhoria sugerida deve ser apenas apresentada, nunca aplicada automaticamente.
