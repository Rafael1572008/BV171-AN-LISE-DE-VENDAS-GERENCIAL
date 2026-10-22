/**
 * BV171 · gráficos: donut (Top Produtos) e scatter (Faturamento × Margem)
 * Dependências: BV.utils, BV.table (selectProduct), Chart.js, Dashboard (lib)
 */
(function (global) {
  'use strict';

  var U = global.BV.utils;
  var selectProduct = function (code) {
    if (global.BV.table && global.BV.table.selectProduct) {
      global.BV.table.selectProduct(code);
    }
  };

  // Paleta única: a mesma cor identifica o produto no Top Produtos e no scatter.
  var PRODUCT_COLORS = ['#3fae87', '#5b8def', '#d1a367', '#c66be0', '#d4796d', '#c5ebe0'];

  // A legenda do donut controla a própria visualização: clicar alterna o produto
  // entre visível e oculto no gráfico, sem alterar a seleção da tabela.
  var donutFilter = { hidden: new Set() };

  function toggleDonutProduct(code) {
    var key = String(code);
    if (donutFilter.hidden.has(key)) donutFilter.hidden.delete(key);
    else donutFilter.hidden.add(key);
  }

  function renderDonut(data) {
    var top = data.slice(0, 5);
    var others = data.slice(5).reduce(function (s, p) { return s + p.value; }, 0);
    var items = top.map(function (p) {
      return {
        label: p.name,
        value: p.value,
        code: p.codprod,
        hidden: donutFilter.hidden.has(String(p.codprod))
      };
    });
    if (others > 0) {
      items.push({
        label: 'Outros',
        value: others,
        code: null,
        hidden: donutFilter.hidden.has('__outros__')
      });
    }

    if (typeof Dashboard === 'undefined' || typeof Dashboard.renderDoughnut !== 'function') return;

    Dashboard.renderDoughnut('product-chart', {
      items: items,
      legendId: 'product-legend',
      totalId: 'product-total',
      showLegendValue: false,
      colors: PRODUCT_COLORS,
      onLegendItemClick: function (item) {
        if (!item || item.code === null || item.code === undefined) return;
        toggleDonutProduct(item.code);
        renderDonut(data);
      },
      onChartItemClick: null
    });
  }

  function renderScatter(data) {
    var canvas = document.getElementById('margin-scatter');
    if (!canvas || typeof Chart === 'undefined') return;

    if (global._marginScatter) {
      try { global._marginScatter.destroy(); } catch (e) {}
    }

    if (!data.length) {
      global._marginScatter = new Chart(canvas, {
        type: 'scatter',
        data: { datasets: [] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      return;
    }

    var values = data.map(function (p) { return Math.max(0, U.n(p.value)); });
    var margins = data.map(function (p) { return U.n(p.marginPct); });

    var sorted = function (arr) { return arr.slice().sort(function (a, b) { return a - b; }); };
    var median = function (arr) {
      var a = sorted(arr);
      var m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    var quantile = function (arr, q) {
      var a = sorted(arr);
      if (!a.length) return 0;
      var pos = (a.length - 1) * q;
      var lo = Math.floor(pos);
      var hi = Math.ceil(pos);
      return a[lo] + (a[hi] - a[lo]) * (pos - lo);
    };

    var medFat = median(values);
    var medMargin = median(margins);
    var positiveValues = values.filter(function (v) { return v > 0; });
    var minPositive = Math.min.apply(null, positiveValues.length ? positiveValues : [1]);
    var maxValue = Math.max.apply(null, values.concat([1]));

    // Escala robusta: usa percentis para que um único outlier não empurre
    // todo o conjunto para a direita. O eixo é recalculado a cada período.
    var useLogX = positiveValues.length >= 3 && maxValue / minPositive >= 6;

    var niceStep = function (range, target) {
      if (target === undefined) target = 6;
      var raw = Math.max(range, 1) / target;
      var pow = Math.pow(10, Math.floor(Math.log10(raw)));
      var nrm = raw / pow;
      var base = nrm <= 1 ? 1 : nrm <= 2 ? 2 : nrm <= 5 ? 5 : 10;
      return base * pow;
    };

    var xMin, xMax;
    if (useLogX) {
      xMin = Math.max(1, minPositive / 1.55);
      xMax = maxValue * 1.18;
    } else {
      var q10 = quantile(values, 0.10);
      var q90 = quantile(values, 0.90);
      var span = Math.max(q90 - q10, medFat * 0.18, 1);
      var pad = span * 0.24;
      xMin = Math.max(0, q10 - pad);
      xMax = Math.max(xMin + 1, q90 + pad);
      if (maxValue > xMax) xMax = maxValue + Math.max((maxValue - q90) * 0.08, niceStep(maxValue - xMin) * 0.25);
      var step = niceStep(xMax - xMin);
      xMin = Math.max(0, Math.floor(xMin / step) * step);
      xMax = Math.ceil(xMax / step) * step;
    }

    var q10m = quantile(margins, 0.10);
    var q90m = quantile(margins, 0.90);
    var marginSpan = Math.max(q90m - q10m, Math.max(medMargin, 5) * 0.22, 5);
    var marginPad = marginSpan * 0.22;
    var yStep = niceStep(marginSpan + marginPad * 2, 6);
    var yMin = Math.max(0, Math.floor((q10m - marginPad) / yStep) * yStep);
    var yMax = Math.max(yMin + yStep * 4, Math.ceil((q90m + marginPad) / yStep) * yStep);

    // Tamanho das bolhas: distribuição em escala logarítmica (percentis)
    // para reduzir o efeito de outliers. Interpolamos área e convertemos em raio.
    var boxLogs = data.map(function (p) { return Math.log1p(Math.max(0, p.boxes)); });
    var q10Boxes = quantile(boxLogs, 0.10);
    var q90Boxes = quantile(boxLogs, 0.90);
    var boxSpan = Math.max(q90Boxes - q10Boxes, 0.000001);
    var minBubbleRadius = 11;
    var maxBubbleRadius = 28;
    var minBubbleArea = Math.PI * minBubbleRadius * minBubbleRadius;
    var maxBubbleArea = Math.PI * maxBubbleRadius * maxBubbleRadius;

    var bubbleData = data.map(function (p) {
      var logBoxes = Math.log1p(Math.max(0, p.boxes));
      var percentilePosition = Math.max(0, Math.min(1, (logBoxes - q10Boxes) / boxSpan));
      var area = minBubbleArea + percentilePosition * (maxBubbleArea - minBubbleArea);
      return {
        x: Math.max(useLogX ? 1 : 0, p.value),
        y: p.marginPct,
        r: Math.sqrt(area / Math.PI),
        product: p
      };
    });

    var lineColor = 'rgba(141,152,168,.38)';
    var avgX = Math.max(useLogX ? 1 : 0, medFat);

    var datasets = [
      {
        label: 'Produtos',
        data: bubbleData,
        backgroundColor: function (ctx) {
          var i = ctx.dataIndex ?? 0;
          var base = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
          return base + 'c7';
        },
        borderColor: function (ctx) {
          return PRODUCT_COLORS[(ctx.dataIndex ?? 0) % PRODUCT_COLORS.length];
        },
        borderWidth: 1.4,
        pointRadius: function (ctx) { return ctx.raw && ctx.raw.r != null ? ctx.raw.r : 14; },
        pointHoverRadius: function (ctx) { return ((ctx.raw && ctx.raw.r != null ? ctx.raw.r : 14) + 3); },
        hoverBackgroundColor: '#d1a367',
        hoverBorderColor: '#eef1f5',
        hoverBorderWidth: 2
      },
      {
        label: 'Faturamento mediano',
        type: 'line',
        data: [{ x: avgX, y: yMin }, { x: avgX, y: yMax }],
        pointRadius: 0,
        borderColor: lineColor,
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false
      },
      {
        label: 'Margem mediana',
        type: 'line',
        data: [{ x: xMin, y: medMargin }, { x: xMax, y: medMargin }],
        pointRadius: 0,
        borderColor: lineColor,
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false
      }
    ];

    var quadrantPlugin = {
      id: 'quadrantLabels',
      beforeDraw: function (chart) {
        var ctx = chart.ctx;
        var chartArea = chart.chartArea;
        var scales = chart.scales;
        if (!chartArea || !scales.x || !scales.y) return;
        var x = scales.x.getPixelForValue(avgX);
        var y = scales.y.getPixelForValue(medMargin);
        ctx.save();
        ctx.fillStyle = 'rgba(79,196,153,.025)';
        ctx.fillRect(x, chartArea.top, chartArea.right - x, y - chartArea.top);
        ctx.fillStyle = 'rgba(209,163,103,.022)';
        ctx.fillRect(x, y, chartArea.right - x, chartArea.bottom - y);
        ctx.font = '600 8px IBM Plex Sans';
        ctx.fillStyle = 'rgba(79,196,153,.58)';
        ctx.textAlign = 'right';
        ctx.fillText('ACIMA DA MEDIANA · MAIOR MARGEM', chartArea.right - 8, chartArea.top + 13);
        ctx.fillStyle = 'rgba(209,163,103,.62)';
        ctx.fillText('ACIMA DA MEDIANA · MENOR MARGEM', chartArea.right - 8, chartArea.bottom - 8);
        ctx.restore();
      }
    };

    global._marginScatter = new Chart(canvas, {
      type: 'scatter',
      data: { datasets: datasets },
      plugins: [quadrantPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 220 },
        interaction: { mode: 'nearest', intersect: true },
        scales: {
          x: {
            type: useLogX ? 'logarithmic' : 'linear',
            min: xMin,
            max: xMax,
            grid: { color: 'rgba(255,255,255,.055)' },
            border: { display: false },
            ticks: {
              color: '#8d98a8',
              font: { size: 9 },
              maxTicksLimit: 7,
              callback: function (v) { return U.money(v); }
            }
          },
          y: {
            min: yMin,
            max: yMax,
            grid: { color: 'rgba(255,255,255,.055)' },
            border: { display: false },
            ticks: {
              color: '#8d98a8',
              font: { size: 9 },
              maxTicksLimit: 7,
              callback: function (v) { return U.pct(v); }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: function (items) {
                return (items[0] && items[0].raw && items[0].raw.product && items[0].raw.product.name) || '';
              },
              label: function (ctx) {
                var p = ctx.raw && ctx.raw.product;
                if (!p) return '';
                return [
                  'Faturamento: ' + U.money(p.value),
                  'Margem: ' + U.money(p.margin),
                  'Margem %: ' + U.pct(p.marginPct),
                  'Caixas: ' + U.qty(p.boxes)
                ];
              }
            }
          },
          datalabels: { display: false }
        },
        onClick: function (evt, elements) {
          var el = elements && elements.find(function (x) { return x.datasetIndex === 0; });
          if (!el) return;
          var p = data[el.index];
          if (p) selectProduct(p.codprod);
        }
      }
    });
  }

  global.BV = global.BV || {};
  global.BV.charts = {
    PRODUCT_COLORS: PRODUCT_COLORS,
    renderDonut: renderDonut,
    renderScatter: renderScatter
  };
})(window);
