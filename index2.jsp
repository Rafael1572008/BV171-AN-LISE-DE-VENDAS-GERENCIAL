<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"  isELIgnored ="false"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html lang="pt-BR">
<head>
  <snk:load/>
      <script>
        var uf = String(getParam("UF") || "");

        console.log("UF recebida:", uf);
    </script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BV171 · Região, Canal &amp; Parceiros</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<link rel="stylesheet" href="${BASE_FOLDER}/css2/style.css">
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
        <span class="breadcrumb-item">Visão geral</span>
        <span class="breadcrumb-separator">&#8250;</span>
        <span class="breadcrumb-item active" id="breadcrumb-uf"></span>
    </nav>
    <h1>BV171 ANÁLISE DE VENDAS GERENCIAL</h1>
    <div class="header-period">
        <span class="hp-item analise">
        <span class="hp-label">Análise</span>
        <span class="hp-value" id="header-periodo"></span>
        </span>
        <span class="hp-item referencia">
        <span class="hp-label">Referência</span>
        <span class="hp-value" id="header-periodo-ref"></span>
        </span>
    </div>
    </div>
    <div class="header-right">
    <div class="divider-v"></div>

    </div>
</div>

<div class="card kpis-card">
    <div class="kpis">

        <!-- KPI 1 -->
        <div class="kpi">
            <div class="kpi-top">
                <span class="label">Valor de faturamento</span>
                <span class="kpi-badge" id="kpi-faturamento-badge"></span>
            </div>

            <div class="value num" id="kpi-faturamento">
                
            </div>

            <div class="sub">
                vs. <b id="kpi-faturamento-anterior"></b> no período de referência
            </div>
        </div>


        <!-- KPI 2 -->
        <div class="kpi">
            <div class="kpi-top">
                <span class="label">M1 · Valor líquido 1</span>
            </div>

            <div class="value num" id="kpi-m1">
                
            </div>

            <div class="sub">
                <b id="kpi-m1-percent"></b> do faturamento
            </div>

            <div class="kpi-bar-track">
                <div
                    class="kpi-bar-fill"
                    id="kpi-m1-bar"
                    data-width="0"
                ></div>
            </div>
        </div>


        <!-- KPI 3 -->
        <div class="kpi">
            <div class="kpi-top">
                <span class="label">M2 · Valor líquido 2</span>
            </div>

            <div class="value num" id="kpi-m2">
                
            </div>

            <div class="sub">
                <b id="kpi-m2-percent"></b> do faturamento
            </div>

            <div class="kpi-bar-track">
                <div
                    class="kpi-bar-fill"
                    id="kpi-m2-bar"
                    data-width="0"
                ></div>
            </div>
        </div>


        <!-- KPI 4 -->
        <div class="kpi">
            <div class="kpi-top">
                <span class="label">Margem</span>
                <span class="kpi-badge up" id="kpi-margem-badge"></span>
            </div>

            <div class="value num" id="kpi-margem">
                
            </div>

            <div class="sub">
                sobre M1
            </div>

            <div class="kpi-bar-track">
                <div
                    class="kpi-bar-fill"
                    id="kpi-margem-bar"
                    data-width="0"
                ></div>
            </div>
        </div>

    </div>
</div>

<div class="grid-main">
    <div class="card">
    <div class="card-head">
        <div>
            <h2>Faturamento por Região</h2>
            <div class="subtitle">Em milhares · <span class="header-uf-label"></span></div>
        </div>
    </div>
    <div class="chart-columns-head">
        <span class="chart-col-name">Região</span>
        <span class="chart-col-value">Valor</span>
        <span class="chart-col-delta">Variação</span>
    </div>

    <div class="chart-scroll">
        <div class="chart-inner" id="regiao-inner">
            <canvas id="regiao-chart"></canvas>
        </div>
    </div>
    </div>

    <div class="card">
    <div class="card-head">
        <div>
            <h2>Faturamento por Canal</h2>
            <div class="subtitle">Em milhares · <span class="header-uf-label"></span></div>
        </div>
    </div>
    <div class="chart-columns-head">
        <span class="chart-col-name">Canal</span>
        <span class="chart-col-value">Valor</span>
        <span class="chart-col-delta">Variação</span>
    </div>

    <div class="chart-scroll">
        <div class="chart-inner" id="canal-inner">
            <canvas id="canal-chart"></canvas>
        </div>
    </div>
    </div>
</div>

<div class="card">
    <div class="card-head">
    <div>
        <h2>Top Parceiros</h2>
        <div class="subtitle"> Em milhares · Ranking por faturamento</div>
    </div>
    </div>
    <div class="partners-scroll">
    <div class="partners-list" id="partners-list"></div>
    </div>
    <div id="partners-total"></div>
</div>

<div class="footer">
    <div class="footer-left"><span class="dot"></span><span id="footer-updated">Atualizado em </span></div>
    <div class="footer-right">
    <span>Bela Vista</span>
    <span class="version-tag">v2.3</span>
    </div>
</div>
</div>



<!-- index2.jsp -->
<snk:load/>



<!-- Lib padronizada: KPI, barras com meta, barras, tabela parceiros -->
<script src="${BASE_FOLDER}/lib/dashboard-components.js"></script>
<script src="${BASE_FOLDER}/lib/sales-kpis.js"></script>
<script src="${BASE_FOLDER}/lib/dashboard-filters.js" data-context="state"></script>
<script src="${BASE_FOLDER}/js2/config.js"></script>
<script src="${BASE_FOLDER}/js2/formatacao.js"></script>
<script src="${BASE_FOLDER}/js2/graficos.js"></script>
<script src="${BASE_FOLDER}/js2/parceiros.js"></script>
<script src="${BASE_FOLDER}/js2/main.js"></script>

</body>
</html>
