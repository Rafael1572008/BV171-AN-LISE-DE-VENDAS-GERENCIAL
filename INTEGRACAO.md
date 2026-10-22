# BV171 — Integração / 171_5

## Alterações desta versão

1. **Eixos de Faturamento × Margem**
   - Escala recalculada conforme os dados do período filtrado.
   - Uso de percentis (P10/P90) e passos “nice” para evitar que um único extremo determine toda a distribuição.
   - Faturamento usa escala logarítmica somente quando a assimetria dos valores realmente justifica.
   - Eixo de margem também usa faixa robusta e passos legíveis.

2. **Bolhas**
   - Raio das bolhas ampliado para melhorar leitura visual.
   - Tamanho continua representando quantidade de caixas.

3. **Top Produtos / gráfico de rosca**
   - Clique somente nas labels da legenda alterna o produto entre incluído e removido da composição.
   - A legenda permanece disponível para reativar o produto.
   - Clique diretamente em uma fatia da rosca não executa nenhuma ação.
   - O totalizador considera apenas os produtos atualmente visíveis.
   - Não altera nem seleciona a tabela.

4. **Layout**
   - Maior proporção de área para Faturamento × Margem e maior altura útil do gráfico.

## Ajuste 171_5 — bolhas por percentil/log
O tamanho das bolhas do gráfico Faturamento × Margem agora usa `Math.log1p(boxes)` e os percentis P10/P90 da distribuição para normalizar a posição. A interpolação é feita na **área** da bolha e convertida para raio com `sqrt(area/pi)`, reduzindo o impacto de outliers e preservando a ordem dos produtos.
