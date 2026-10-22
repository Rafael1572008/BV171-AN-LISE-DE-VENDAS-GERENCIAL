<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html lang="pt-BR">
<head>
  <snk:load />
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BV171 · Top Produtos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${BASE_FOLDER}/css4/styles.css">
<link rel="stylesheet" href="${BASE_FOLDER}/lib/sales-kpis.css">
<link rel="stylesheet" href="${BASE_FOLDER}/lib/dashboard-filters.css">
</head>
<body>
<div class="wrap">
  <header class="header header-centered">
    <div class="brand">
      <div class="brand-mark">BV</div>
      <div><div class="brand-name">Bela Vista</div><div class="brand-sub">Business Intelligence</div></div>
    </div>
    <div class="header-center">
      <nav class="breadcrumb" aria-label="Navegação">
        <span class="breadcrumb-item">Visão geral</span><span class="breadcrumb-separator">&#8250;</span>
        <span class="breadcrumb-item" id="breadcrumb-uf"></span><span class="breadcrumb-separator">&#8250;</span>
        <span class="breadcrumb-item" id="breadcrumb-regiao"></span><span class="breadcrumb-separator">&#8250;</span>
        <span class="breadcrumb-item active" id="breadcrumb-parceiro"></span>
      </nav>
      <h1>BV171 ANÁLISE DE VENDAS GERENCIAL</h1>
      <div class="header-period">
        <span class="hp-item analise"><span class="hp-label">Análise</span><span class="hp-value" id="header-periodo"></span></span>
        <span class="hp-item referencia"><span class="hp-label">Referência</span><span class="hp-value" id="header-periodo-ref"></span></span>
      </div>
    </div>
    <div class="header-right"><div class="divider-v"></div></div>
  </header>

  

  <section class="card kpis-card">
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-top"><span class="label">Valor de faturamento</span><span class="kpi-badge" id="kpi-fat-badge"></span></div>
        <div class="value num" id="kpi-fat"></div>
        <div class="sub">vs. <b id="kpi-fat-ref"></b> no período de referência</div>
      </div>
      <div class="kpi">
        <div class="kpi-top"><span class="label">M1 · Valor líquido 1</span></div>
        <div class="value num" id="kpi-m1"></div>
        <div class="sub"><b id="kpi-m1-pct"></b> do faturamento</div>
        <div class="kpi-bar-track"><div class="kpi-bar-fill" id="m1-bar"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-top"><span class="label">M2 · Valor líquido 2</span></div>
        <div class="value num" id="kpi-m2"></div>
        <div class="sub"><b id="kpi-m2-pct"></b> do faturamento</div>
        <div class="kpi-bar-track"><div class="kpi-bar-fill" id="m2-bar"></div></div>
      </div>
      <div class="kpi">
        <div class="kpi-top"><span class="label">Margem</span><span class="kpi-badge up" id="kpi-margin-badge"></span></div>
        <div class="value num" id="kpi-margin"></div>
        <div class="sub">sobre M1</div>
        <div class="kpi-bar-track"><div class="kpi-bar-fill" id="kpi-margin-bar"></div></div>
      </div>
    </div>
  </section>

  <section class="visual-grid">
    <section class="card top-products-card">
      <div class="card-head">
        <div>
          <h2>Top Produtos</h2>
          <div class="subtitle">Principais produtos por faturamento</div>
        </div>
      </div>
      <div class="product-chart-area">
        <div class="product-legend" id="product-legend" aria-label="Principais produtos"></div>
        <div class="donut-wrap product-donut-wrap">
          <canvas id="product-chart"></canvas>
          <div class="donut-center"><strong id="product-total"></strong><span>faturamento</span></div>
        </div>
      </div>
    </section>

    <section class="card margin-analysis-card">
      <div class="card-head">
        <div>
          <h2>Faturamento × Margem</h2>
          <div class="subtitle">Relação entre faturamento e margem</div>
        </div>
      </div>
      <div class="scatter-wrap">
        <canvas id="margin-scatter"></canvas>
      </div>
      <div class="scatter-legend">
        <span><i class="quad-good"></i>Alto faturamento · alta margem</span>
        <span><i class="quad-opportunity"></i>Alto faturamento · baixa margem</span>
        <span class="scatter-hint">Tamanho da bolha = caixas</span>
      </div>
    </section>
  </section>

  <section class="card products-card">
    <div class="card-head">
      <div>
        <h2>Produtos do Parceiro</h2>
        <div class="subtitle">Período atual × referência</div>
      </div>
      <div class="tag" id="product-count"></div>
    </div>
    <div class="table-toolbar">
      <div class="table-search-wrap">
        <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="search" id="product-search" class="table-search" placeholder="Buscar código ou descrição…" autocomplete="off" spellcheck="false">
      </div>
      <div class="table-toolbar-meta" id="table-page-info"></div>
    </div>
    <div class="table-scroll scroll-area">
      <table class="products-table" id="products-table">
        <thead>
          <tr class="group-head">
            <th colspan="2" class="group-product">Produto</th>
            <th colspan="3" class="group-current">Atual</th>
            <th colspan="3" class="group-reference">Referência</th>
            <th colspan="2" class="group-variation">Variação</th>
            <th colspan="3" class="group-profit">Rentabilidade</th>
          </tr>
          <tr class="column-head">
            <th data-sort="codprod" class="sortable">Código<span class="sort-ind"></span></th>
            <th data-sort="name" class="sortable">Descrição<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="boxes">Caixas<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="value">Valor<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="unit">Valor unit.<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="boxesRef">Caixas<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="valueRef">Valor<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="unitRef">Valor unit.<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="variation">Valor<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="variationPct">% valor<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="margin">Margem<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="m1">Líquido 1<span class="sort-ind"></span></th>
            <th class="numh sortable" data-sort="marginPct">Margem %<span class="sort-ind"></span></th>
          </tr>
        </thead>
        <tbody id="products-body"></tbody>
        <tfoot id="products-foot"></tfoot>
      </table>
    </div>
    <div class="table-pagination" id="table-pagination" aria-label="Paginação da tabela"></div>
  </section>

  <footer class="footer">
    <div class="footer-left"><span class="dot"></span><span>Protótipo HTML · dados demonstrativos</span></div>
    <div class="footer-right"><span>Bela Vista</span><span class="version-tag">drill-down v1.4 · tabela interativa</span></div>
  </footer>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<script>Chart.register(ChartDataLabels);</script>
<script src="${BASE_FOLDER}/lib/dashboard-components.js"></script>
<script src="${BASE_FOLDER}/lib/sales-kpis.js"></script>
<script src="${BASE_FOLDER}/lib/dashboard-filters.js" data-context="products-region"></script>
<script src="${BASE_FOLDER}/js4/utils.js"></script>
<script src="${BASE_FOLDER}/js4/queries.js"></script>
<script src="${BASE_FOLDER}/js4/table.js"></script>
<script src="${BASE_FOLDER}/js4/charts.js"></script>
<script src="${BASE_FOLDER}/js4/main.js"></script>
</body>
</html>
