<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"  isELIgnored ="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html lang="pt-BR">
<head>
  <snk:load/>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bela Vista · BV171 ANÁLISE DE VENDAS GERENCIAL</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE_FOLDER}/css/style.css">
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>

<style>
/* Ajustes específicos do nível 1 */
.header.header-centered {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
}
.header.header-centered .header-center {
  grid-column: 2;
  justify-self: center;
}
.header.header-centered .header-right {
  grid-column: 3;
  justify-self: end;
}
.chart-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}
.chart-scroll .chart-box {
  width: 100%;
  min-width: 100%;
}
.chart-scroll .chart-box canvas {
  display: block;
}
@media (max-width: 960px) {
  .header.header-centered {
    grid-template-columns: 1fr;
  }
  .header.header-centered .brand,
  .header.header-centered .header-center,
  .header.header-centered .header-right {
    grid-column: 1;
    justify-self: center;
  }
}
</style>
<link rel="stylesheet" href="${BASE_FOLDER}/lib/sales-kpis.css">
<link rel="stylesheet" href="${BASE_FOLDER}/lib/dashboard-filters.css">
</head>
<body>
<div class="wrap">

  <div class="header header-centered">
    <div class="brand">
      <div class="brand-mark">BV</div>
      <div class="brand-text">
        <div class="brand-name">Bela Vista</div>
        <div class="brand-sub">Business Intelligence</div>
      </div>
    </div>
    <div class="header-center">
      <nav class="breadcrumb" aria-label="Navegação">
        <span class="breadcrumb-item active" id="breadcrumb-regiao">Visão geral</span>
      </nav>
      <h1>BV171 ANÁLISE DE VENDAS GERENCIAL</h1>
      <div class="header-period">
        <span class="hp-item analise"><span class="hp-label">Análise</span><span class="hp-value" id="header-periodo"></span></span>
        <span class="hp-item referencia"><span class="hp-label">Referência</span><span class="hp-value" id="header-periodo-ref"></span></span>
      </div>
    </div>
    <div class="header-right">
    </div>
  </div>

  <div class="card kpis-card">
  <div class="kpis">
    <div class="kpi primary">
      <div class="kpi-top"><span class="label">Faturamento</span><span class="kpi-badge up" id="kpi-faturamento-badge"></span></div>
      <div class="value num" id="kpi-faturamento-valor"></div>
      <div class="sub">vs. <b id="kpi-faturamento-ref"></b> no período de referência</div>
    </div>
    <div class="kpi">
      <div class="kpi-top"><span class="label">M1 · Valor líquido 1</span></div>
      <div class="value num" id="kpi-m1-valor"></div>
      <div class="sub"><b><span id="kpi-m1-sub-pct"></span></b> do faturamento</div>
      <div class="bar-track"><div class="bar-fill" id="kpi-m1-bar"></div></div>
    </div>
    <div class="kpi">
      <div class="kpi-top"><span class="label">M2 · Valor líquido 2</span></div>
      <div class="value num" id="kpi-m2-valor"></div>
      <div class="sub"><b><span id="kpi-m2-sub-pct"></span></b> do faturamento</div>
      <div class="bar-track"><div class="bar-fill" id="kpi-m2-bar"></div></div>
    </div>
    <div class="kpi">
      <div class="kpi-top"><span class="label">Margem</span><span class="kpi-badge up" id="kpi-margem-badge"></span></div>
      <div class="value num" id="kpi-margem-valor"></div>
      <div class="sub"><b><span id="kpi-margem-sub-pct"></span></b> do faturamento</div>
      <div class="bar-track"><div class="bar-fill" id="kpi-margem-bar"></div></div>
    </div>
  </div>
  </div>

  <div class="grid-main">
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Faturamento por estado</h2>
          <div class="subtitle">Distribuição geográfica da receita, por UF</div>
        </div>
        <div class="map-legend">
          <div class="map-legend-scale">menor <div class="bar"></div> maior</div>
        </div>
      </div>
      <div id="map-wrap" style="position:relative;">
        <svg id="map-svg"></svg>
        <div class="map-tooltip" id="map-tooltip"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div>
          <h2>Ranking por UF</h2>
          <div class="subtitle">Participação no faturamento total</div>
        </div>
      </div>
      <div class="rank-scroll">
        <table class="rank rank-data">
          <colgroup><col class="rank-col-uf"><col class="rank-col-val"><col class="rank-col-pct"></colgroup>
          <thead><tr><th>UF</th><th>Valor</th><th>Part.</th></tr></thead>
          <tbody id="rank-body"></tbody>
        </table>
      </div>
      <table class="rank rank-total">
        <colgroup><col class="rank-col-uf"><col class="rank-col-val"><col class="rank-col-pct"></colgroup>
        <tfoot><tr class="total-row"><td>Total geral</td><td class="rank-val" id="rank-total-valor"></td><td class="rank-pct" id="rank-total-pct"></td></tr></tfoot>
      </table>
    </div>
  </div>

  <div class="card">
    <div class="card-head">
      <div>
        <h2>Faturamento por canal (R$ mil)</h2>
        <div class="subtitle">Comparativo com o período anterior e margem por canal</div>
      </div>
      <div class="legend-row">
        <span><i class="sw sw-g"></i>Atual</span>
        <span><i class="sw sw-grey"></i>Anterior</span>
      </div>
    </div>
    <div class="chart-scroll"><div class="chart-box"><canvas id="chan-chart"></canvas></div></div>
  </div>

  <div class="footer">
    <div class="footer-left"><span class="dot"></span><span id="footer-updated"></span></div>
    <div class="footer-right">
      <span>Bela Vista</span>
      <span class="version-tag">v2.1</span>
    </div>
  </div>
</div>

<!-- ordem importa: dados -> formatacao -> mapa -> ranking -> grafico -> main -->
 <script>
  window.P_PERIODO = "${P_PERIODO.INI}";
  window.P_PERIODO_F = "${P_PERIODO.FIN}";

  window.P_PERIODO_R = "${P_PERIODO_R.INI}";
  window.P_PERIODO_R_F = "${P_PERIODO_R.FIN}";

  window.P_NEG = "${P_NEG}";

  window.top.dashboardArgs = {
    P_PERIODO_INI: window.P_PERIODO,
    P_PERIODO_FIM: window.P_PERIODO_F,
    P_PERIODO_R_INI: window.P_PERIODO_R,
    P_PERIODO_R_FIM: window.P_PERIODO_R_F,
    P_NEG: window.P_NEG
  };

  console.log("DASHBOARD ARGS:", window.top.dashboardArgs);

 </script>
<!-- Lib padronizada: KPI, barras com meta, barras, tabela parceiros -->
<script src="${BASE_FOLDER}/lib/dashboard-components.js"></script>
<script src="${BASE_FOLDER}/lib/sales-kpis.js"></script>
<script src="${BASE_FOLDER}/lib/dashboard-filters.js" data-context="overview"></script>
<script src="${BASE_FOLDER}/js/dados.js"></script>
<script src="${BASE_FOLDER}/js/formatacao.js"></script>
<script src="${BASE_FOLDER}/js/mapa.js"></script>
<script src="${BASE_FOLDER}/js/ranking.js"></script>
<script src="${BASE_FOLDER}/js/grafico.js"></script>
<script src="${BASE_FOLDER}/js/main.js"></script>

<script>
(function () {
  function ajustarScrollCanais() {
    const scroll = document.querySelector('.chart-scroll');
    const box = scroll && scroll.querySelector('.chart-box');
    const dados = window.canaisData;
    if (!scroll || !box || !dados || !Array.isArray(dados.labels)) return false;

    const quantidade = dados.labels.length;
    const larguraVisivel = scroll.clientWidth;
    if (!larguraVisivel) return false;

    // Mantém 5 conjuntos de barras visíveis como padrão; o restante fica no scroll.
    const larguraMinima = quantidade > 5
      ? Math.ceil((larguraVisivel / 5) * quantidade)
      : larguraVisivel;

    box.style.width = larguraMinima + 'px';
    box.style.minWidth = larguraMinima + 'px';

    if (window.chanChartInstance && typeof window.chanChartInstance.resize === 'function') {
      window.chanChartInstance.resize();
    }
    return true;
  }

  function iniciar() {
    let tentativas = 0;
    const timer = setInterval(function () {
      tentativas++;
      if (ajustarScrollCanais() || tentativas >= 30) clearInterval(timer);
    }, 150);
  }

  window.addEventListener('load', iniciar);
  window.addEventListener('resize', function () {
    const scroll = document.querySelector('.chart-scroll');
    const box = scroll && scroll.querySelector('.chart-box');
    const dados = window.canaisData;
    if (!scroll || !box || !dados || !Array.isArray(dados.labels)) return;
    const quantidade = dados.labels.length;
    const larguraVisivel = scroll.clientWidth;
    const larguraMinima = quantidade > 5
      ? Math.ceil((larguraVisivel / 5) * quantidade)
      : larguraVisivel;
    box.style.width = larguraMinima + 'px';
    box.style.minWidth = larguraMinima + 'px';
  });
})();
</script>
</body>
</html>
