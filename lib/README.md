# Dashboard Components

Biblioteca leve para padronizar os componentes do dashboard BV.

Em vez de espalhar lógica de Chart.js, formatação e HTML em vários arquivos, você só chama funções passando **dados + opções**.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `dashboard-components.js` | API principal (`Dashboard.*`) |
| `README.md` | Este guia |

## Dependências

- Chart.js 4.x (obrigatório para gráficos)
- CSS existente do dashboard (classes `.kpi`, `.partner-row`, `.chart-inner`, etc.)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="${BASE_FOLDER}/dashboard-lib/dashboard-components.js"></script>
```

---

## 1. KPI

```js
// Card simples com valor + badge de variação
Dashboard.renderKPI('kpi-faturamento', {
  value: 6808650.15,
  ref: 7259201.48,          // calcula delta automaticamente
  format: 'currency'        // 'currency' | 'number' | 'percent'
});

// Com barra de progresso (M1, M2, Margem…)
Dashboard.renderKPI('kpi-m1', {
  value: 5587606.91,
  percent: 82.07,           // preenche #kpi-m1-percent
  barPercent: 82.07,        // preenche width de #kpi-m1-bar
  format: 'currency'
});

// Vários de uma vez
Dashboard.renderKPIs({
  'kpi-faturamento': { value: 6808650, ref: 7259201 },
  'kpi-m1':          { value: 5587606, barPercent: 82, percent: 82 },
  'kpi-m2':          { value: 4854494, barPercent: 71, percent: 71 },
  'kpi-margem':      { value: 1810824, barPercent: 32, percent: 32 }
});
```

**Convenção de IDs** (pode sobrescrever com `opts.ids`):

| Elemento | ID padrão |
|----------|-----------|
| Valor    | `{rootId}` |
| Badge Δ% | `{rootId}-badge` |
| Ref.     | `{rootId}-anterior` |
| Percent  | `{rootId}-percent` |
| Barra    | `{rootId}-bar` |

---

## 2. Gráfico de barras COM meta (referencial)

Substitui `buildHBarChart` / `atualizarGraficoCanal` / `atualizarGraficoRegiao`.

```js
Dashboard.renderBarWithMeta('canal-chart', {
  items: [
    { label: 'Distribuidores', value: 2813350, ref: 2650000 },
    { label: 'Varejo',         value: 1590326, ref: 1480000 },
    { label: 'Corporativo',    value:  980547, ref:  720000 }
    // delta é calculado se não informado
  ],
  color: '#3fae87',
  innerId: 'canal-inner',   // altura dinâmica (4 barras = 320px, depois scroll)
  onClick: (item, index) => {
    console.log('Clicou em', item.label);
  }
});
```

O plugin desenha:
- barra do valor
- linha tracejada da meta/referencial
- colunas à direita: valor (em mil) + variação ▲/▼

---

## 3. Gráfico de barras simples (sem meta)

```js
// Horizontal (padrão)
Dashboard.renderBar('channel-chart', {
  items: [
    { label: 'Distribuidores', value: 2813350 },
    { label: 'Varejo', value: 1590326 }
  ],
  horizontal: true,
  color: '#3fae87'
});

// Vertical + cores por barra
Dashboard.renderBar('outro-chart', {
  items: [
    { label: 'A', value: 40, color: '#3fae87' },
    { label: 'B', value: 60, color: '#5b8def' }
  ],
  horizontal: false
});
```

---

## 4. Tabela de parceiros (3 níveis)

1. **Linhas** — rank, nome, barra proporcional, valor, referencial, delta  
2. **Estados especiais** — “Novo” / “não comparável” quando `ref` é `null`  
3. **Total** — linha Σ em container separado

```js
Dashboard.renderPartnersTable('partners-list', {
  items: [
    { name: 'SENDAS DISTRIBUIDORA S/A', value: 7961538, ref: 7061520 },
    { name: 'TOP SERVICE',              value: 6020155, ref: 6658954 },
    { name: 'NOVO PARCEIRO',            value:  510200, ref: null }  // → "Novo"
  ],
  limit: 10,
  valueFormat: 'mil',                    // ou 'currency'
  totalContainerId: 'partners-total',
  totalLabel: 'Total dos parceiros',
  totalSub: 'Base: todos os parceiros ativos no período'
  // total: { value, ref, delta }  ← opcional; se omitido, soma os items
});
```

---

## Migração rápida (do código atual)

### Antes (js2)

```js
canalChart = buildHBarChart('canal-chart', canalLabels, canalValores, canalReferenciais, canalDeltas);
ajustarAlturaGraficoBarras('canal-inner', canalLabels.length);
```

### Depois

```js
Dashboard.renderBarWithMeta('canal-chart', {
  items: canalLabels.map((label, i) => ({
    label,
    value: canalValores[i],
    ref: canalReferenciais[i],
    delta: canalDeltas[i]
  })),
  innerId: 'canal-inner',
  onClick: (item) => abrirAnaliseRegiao(item.label)  // se for região
});
```

### KPI antes

```js
document.getElementById('kpi-faturamento').textContent = formatarMoeda(faturamento);
badgeFaturamento.textContent = formatarVariacao(crescimento);
// ... várias linhas
```

### KPI depois

```js
Dashboard.renderKPI('kpi-faturamento', {
  value: faturamento,
  ref: faturamentoAnterior
});
```

### Parceiros antes

```js
renderParceiros();
renderTotalParceiros();
```

### Parceiros depois

```js
Dashboard.renderPartnersTable('partners-list', {
  items: parceiros.map(p => ({ name: p.nome, value: p.valor, ref: p.ref, delta: p.delta })),
  totalContainerId: 'partners-total',
  total: totalParceiros
});
```

---

## Formatação utilitária

```js
Dashboard.fmt.currency(1234.5);   // "R$ 1.234,50"
Dashboard.fmt.mil(1500000);       // "1.500,0 mil"
Dashboard.fmt.pctArrow(-6.2);     // "▼ 6,2%"
Dashboard.fmt.delta(110, 100);    // 10
```

---

## Notas

- Re-render seguro: cada `renderBar*` destrói a instância anterior do mesmo `canvasId`.
- Os estilos (cores de medalha, badges up/down, `.partner-row`) continuam vindo do CSS atual (`css2/style.css` ou `css3/styles.css`).
- Não altera queries nem o fluxo Sankhya — só a camada de renderização.
