# Validação dos filtros Gerente, Marca e Grupo de Produto

## Implementação

`lib/dashboard-filters.js` separa estado aplicado (`window.top.BV171_FILTERS.gerente`, `.marca` e `.grupo`), seleção pendente do único modal, obtenção das opções e predicado SQL. Os três campos usam o mesmo modal de pesquisa e seleção múltipla. O estado acompanha os níveis hospedados no mesmo `window.top`, sem depender de `dashboardArgs`, que alguns fluxos substituem. Não há persistência entre sessões do painel.

O painel existente é uma aba fixa à direita, acima do relatório, com botão de três barras dentro de `.header.header-centered`. Não há wrapper de layout lateral, alteração de largura do relatório nem emissão de resize ao abrir. `.panelOpen` conserva a abertura entre cargas. O mesmo botão, o clique no fundo externo e Escape fecham a aba sem alterar seleções. O painel fechado fica `inert`, sem receber foco. O modal nativo `dialog.showModal()` usa a camada superior do navegador, acima da aba e do fundo. A transição respeita `prefers-reduced-motion`.

Os sete JSPs executáveis carregam o módulo e o CSS compartilhados. `data-context` identifica quais parâmetros existentes se aplicam à lista de cada nível. `171_5.jsp` é um protótipo sem carga de dados e permanece intacto.

Grupo de Produto usa `PRO.CODGRUPOPROD AS CODGRUPOPROD` e `GRU.DESCRGRUPOPROD AS GRUPOPROD`, com o grupo exato do produto, sem truncamento. A lista deriva dos produtos efetivamente presentes em AMV, preservando período e contexto, com cache próprio. Como AMV já disponibiliza `CODPROD`, não se juntam todos os itens de uma nota para localizar seu grupo.

A lista de gerentes usa `SELECT DISTINCT CODGER, GERENTE` pela relação AMV → nota → parceiro → vendedor → gerente, considerando os dois períodos e o contexto. Marca usa `SELECT DISTINCT CODMARCA, MARCA` por `AMV.CODPROD → TGFPRO → TGFGRU`, com `TRUNC(PRO.CODGRUPOPROD / 10000) * 10000`. `AMV.CODPROD` já é utilizado nos builders de produtos; não é necessário acrescentar o JOIN com todos os itens da nota (`TGFITE`). Nos KPIs de vendas, as opções também consideram os movimentos de devolução e despesa usados pelo cálculo existente. As listas são carregadas antecipadamente e armazenadas separadamente no host por SQL de contexto; a pesquisa é local. Falhas oferecem nova tentativa por campo. Nomes são inseridos como texto, sem interpretação de HTML.

Todas as bases de AMV dos builders de `js/main.js`, `js2/main.js`, `js3/main.js`, `js6/main.js` e `js4/queries.js`, `js5/queries.js`, `js7/queries.js` já recebem `Dashboard.filters.sql()`. O predicado correlaciona `PAR.CODVEND` com vendedor/gerente por `EXISTS`, usando `CODGER IN (...)`. Para Marca, acrescenta outro `EXISTS` correlacionado por `BV_PRO.CODPROD = AMV.CODPROD` com grupo de marca em `IN (...)`. Grupo de Produto acrescenta `EXISTS` por `BV_GROUP_PRO.CODPROD = AMV.CODPROD` e `BV_GROUP_PRO.CODGRUPOPROD IN (...)`. Há OR entre códigos do mesmo campo e AND entre os três campos. Isso mantém a granularidade de cada item, sem incluir outros produtos da nota nem multiplicar os valores. Não altera JOINs dos builders. Sem seleção, o respectivo predicado é vazio, mantendo registros sem gerente, marca ou grupo.

Em `lib/sales-kpis.js`, o agregado `KPI_BONIFICACOES` preserva `AMV.VLRTOTITEM` sem `ABS`. Assim a bonificação negativa reduz o total DVV e aparece negativa na sua composição. As demais regras do cálculo, inclusive a forma como o total DVV participa da margem, foram preservadas.

Aplicar confirma o rascunho e recarrega o documento atual, reutilizando suas rotinas completas de carga. Isso descarta respostas antigas, limpa dados de gráficos/tabelas anteriores e mantém os parâmetros do nível no host. Cancelar e Escape descartam o rascunho; Limpar seleção só altera o rascunho até Aplicar. O cache das opções é reutilizado na recarga e substituído quando muda o contexto SQL.

## Verificações automatizadas

Na raiz do projeto:

```text
node tests/verify-filters.cjs
python tests/verify-filters.py
node tests/verify-kpis.cjs
python tests/verify-kpis.py
node --check lib/dashboard-filters.js
python tests/verify-filters-browser.py
```

Os testes verificam eventos do modal com DOM simulado, pesquisa com e sem acentos, seleção preservada fora da pesquisa, Cancelar/Escape, limpeza, aplicação, cache, falha e independência dos três estados. Geram 2.500 consultas (20 builders × cinco seleções de cada filtro), exigindo cada predicado em todas as bases de AMV quando ativo. As consultas são executadas em SQLite em memória com marcas e grupos distintos na mesma nota, dois grupos da mesma marca, produto repetido, matriz/filiais, dados sem vínculo e seleções sem resultados. Também executam as 21 consultas de opções com códigos distintos e período atual sem dados. Os testes de KPIs verificam o sinal negativo da bonificação na consulta, no total DVV e na composição.

`verify-filters-browser.py` usa o Edge headless instalado, sem pacotes adicionais, com perfil e páginas temporários e resolução de rede bloqueada. Reaproveita a marcação de `index.jsp` e os CSS locais, com opções sintéticas. Em iframes de 1440px e 390px, executa 19 verificações por tamanho: botão no header à direita, três barras, painel dentro da tela, retângulos do relatório e dos KPIs inalterados, três filtros na ordem correta, modal nativo acima da aba, fechamento pelo botão/fora, seleções preservadas e ausência de overflow horizontal. Não executa consultas no ERP nem carrega gráficos com dados reais.

SQLite não substitui Oracle: no teste, apenas datas são convertidas para ISO e `FETCH FIRST` para `LIMIT`. Nenhum banco corporativo é acessado. Os testes existentes cobrem a regressão dos cálculos de KPIs.

## Roteiro manual no Sankhya

1. Publicar os arquivos compartilhados atuais de `lib` junto com os sete JSPs e os builders já integrados.
2. Conferir o resultado sem seleção com o painel anterior, mantendo os mesmos períodos e parâmetros.
3. Comparar um e vários gerentes, marcas e grupos, isolados e combinados, com uma consulta de leitura autorizada, nos períodos atual e de referência; conferir KPIs, suas composições, mapa, rankings, canais, regiões, parceiros, produtos e percentuais. Usar notas com marcas/grupos diferentes e conferir que apenas os itens selecionados entram nos valores.
4. Abrir todos os níveis de detalhamento e retornar, confirmando seleção e contexto. Aplicar em cada nível e verificar que a recarga mantém os parâmetros e a seleção no host Sankhya.
5. Conferir lista, pesquisa, seleção fora da pesquisa, Aplicar, Cancelar, Escape e Limpar seleção nos três campos. Confirmar opções com dados somente na referência e itens sem vínculo quando o respectivo filtro estiver inativo. Conferir a bonificação negativa no total e na composição do DVV.
6. Conferir teclado, foco no modal, rolagem e ausência de corte em desktop e telas pequenas. Abrir/fechar a aba pelo hambúrguer, clicar fora e confirmar que os gráficos e tabelas não se deslocam nem redimensionam e as seleções são preservadas.
7. Conferir falha na consulta de opções, nova tentativa, resposta vazia e compatibilidade do `dialog` nativo com o navegador utilizado no ERP.

A interface foi verificada no Edge com dados sintéticos. Execução JSP/Oracle/Sankhya e gráficos com dados reais dependem do ambiente ERP. A pasta não possui repositório Git; a revisão desta alteração compara os arquivos com uma cópia temporária anterior à edição.


## Perfil e Vendedor (2026-10-22)

Ordem no painel: Gerente, Vendedor, Perfil, Marca e Grupo de Produto.
`lib/dashboard-filters.js` adiciona `.vendedor` e `.perfil` ao estado compartilhado,
com caches e nomes independentes. Ambos reutilizam pesquisa local, checkboxes,
Aplicar, Limpar e Cancelar do modal existente, sem consultas durante a pesquisa.

As listas usam os relacionamentos TGFCAB -> TGFPAR -> TGFVEN/TGFTPP solicitados,
restritos ao contexto AMV e aos dois periodos do relatorio. Projetam DISTINCT por
codigo/descricao (NUNOTA nao integra a lista, para evitar repetir opcoes por nota).
Vendedor usa VEN.CODVEND = PAR.CODVEND, nunca CAB.CODVEND. Perfil usa
PAR.CODTIPPARC e TPP.DESCRTIPPARC. Codigos nulos nao geram opcoes.

Nos indicadores, Vendedor usa EXISTS por PAR.CODVEND e Perfil usa
PAR.CODTIPPARC IN (...), antes de agregacoes em todas as bases existentes.
Nao ha novos JOINs nos indicadores; a granularidade dos itens e preservada.
Sem selecao nao ha restricao; IN dentro de um campo, AND entre os cinco.

Validacao sintetica ampliada: 17.500 consultas de dados e 35 listas de opcoes,
com combinacoes compativeis/incompativeis dos cinco filtros e comparativos.
Os testes de DOM cobrem os novos campos, pesquisa, cancelamento, limpeza,
aplicacao e cache. Homologacao Oracle/JSP/Sankhya permanece necessaria.


## TOP, Parceiro/Filial, Produto e Matriz (2026-10-22)

Os nove filtros seguem a ordem solicitada e usam o mesmo modal. TOP e Produto
usam AMV.OPER/AMV.DESCOPER e AMV.CODPROD/PRO.DESCRPROD. Parceiro usa
PAR.CODPARC AS CODCLI e PAR.NOMEPARC AS NOMECLI (nomes iguais nao colapsam IDs).
Matriz usa COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC), como os builders existentes,
e nome do parceiro da matriz por LEFT JOIN. Matriz sem cadastro correspondente
mantem o codigo e apresenta fallback. TOP, Produto e Matriz exibem codigo - nome.

Os resultados dos niveis estao agregados e nao fornecem todos esses campos.
Uma consulta DISTINCT compartilhada por contexto/periodos carrega as quatro
listas juntas, com cache compartilhado e coalescencia das chamadas assincronas.
Pesquisar e abrir modal nao consulta o banco. O DISTINCT SQL reduz tuplas;
o Map por codigo prepara cada lista individualmente. AMV.DESCOPER foi utilizado
conforme campo informado na solicitacao; disponibilidade real depende de homologacao.

O predicado central acrescenta IN sobre AMV.OPER, PAR.CODPARC, AMV.CODPROD
e COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC), sem joins financeiros adicionais.
Produto atua por item, em AND com Marca e Grupo. Nenhum calculo foi alterado.

Validacao: 19.515 consultas sinteticas (incluindo casos dos nove filtros), 63
consultas de opcoes, testes de DOM e cache assincrono; Edge 1440/390px com 31
verificacoes por tamanho. Regressao financeira e sintaxe tambem verificadas.
Oracle/JSP/Sankhya real nao acessado.
