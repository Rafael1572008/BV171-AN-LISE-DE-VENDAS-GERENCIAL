/**
 * dashboard-components.js
 * --------------------------------------------------------------------------
 * Biblioteca padronizada para o dashboard BV.
 *
 * Uso típico (depois de carregar Chart.js + este arquivo):
 *
 *   // 1) KPI
 *   Dashboard.renderKPI('kpi-faturamento', {
 *     label: 'Valor de faturamento',
 *     value: 6808650.15,
 *     ref: 7259201.48,
 *     delta: -6.21,          // opcional; se omitido, calcula (value-ref)/ref
 *     format: 'currency'     // 'currency' | 'number' | 'percent'
 *   });
 *
 *   // 2) Gráfico de barras horizontal COM meta/referencial
 *   Dashboard.renderBarWithMeta('canal-chart', {
 *     items: [
 *       { label: 'Distribuidores', value: 2813350, ref: 2650000 },
 *       { label: 'Varejo',         value: 1590326, ref: 1480000 }
 *     ],
 *     color: '#3fae87',
 *     onClick: (item, index) => console.log(item)
 *   });
 *
 *   // 3) Gráfico de barras simples (sem meta)
 *   Dashboard.renderBar('share-chart', {
 *     items: [
 *       { label: 'A', value: 40 },
 *       { label: 'B', value: 60 }
 *     ],
 *     horizontal: true,
 *     color: '#3fae87'
 *   });
 *
 *   // 4) Tabela de parceiros (3 níveis: ranking + linhas + total)
 *   Dashboard.renderPartnersTable('partners-list', {
 *     items: [
 *       { name: 'SENDAS', value: 7961538, ref: 7061520 },
 *       { name: 'TOP SERVICE', value: 6020155, ref: 6658954 }
 *     ],
 *     totalContainerId: 'partners-total',   // opcional
 *     totalLabel: 'Total dos parceiros',
 *     totalSub: 'Base: todos os parceiros ativos no período'
 *   });
 *
 * Dependências: Chart.js 4.x (opcionalmente chartjs-plugin-datalabels).
 * --------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  // ========================================================================
  // Formatação (pt-BR)
  // ========================================================================

  const fmt = {
    currency(v, digits = 2) {
      return Number(v || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    },

    number(v, digits = 0) {
      return Number(v || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    },

    /** Valor em milhares, ex: "1.234 mil" */
    mil(v, digits = 1) {
      return (
        (Number(v || 0) / 1000).toLocaleString('pt-BR', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }) + ' mil'
      );
    },

    /** Ex: "▲ 12,5%" ou "▼ 3,1%" */
    pctArrow(v, digits = 1) {
      const n = Number(v) || 0;
      const arrow = n >= 0 ? '\u25B2' : '\u25BC';
      return (
        arrow +
        ' ' +
        Math.abs(n).toLocaleString('pt-BR', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }) +
        '%'
      );
    },

    /** Ex: "+12,5%" ou "-3,1%" */
    pct(v, signed = true, digits = 1) {
      const n = Number(v) || 0;
      const sign = signed && n > 0 ? '+' : '';
      return (
        sign +
        n.toLocaleString('pt-BR', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }) +
        '%'
      );
    },

    /** Calcula variação %: (atual - ref) / ref * 100 */
    delta(atual, ref) {
      const a = Number(atual) || 0;
      const r = Number(ref) || 0;
      if (r === 0) return a === 0 ? 0 : 100;
      return ((a - r) / r) * 100;
    }
  };

  // ========================================================================
  // Registry de instâncias Chart.js (para destroy seguro)
  // ========================================================================

  const chartRegistry = Object.create(null);

  function destroyChart(key) {
    if (chartRegistry[key]) {
      try {
        chartRegistry[key].destroy();
      } catch (e) {
        /* ignore */
      }
      chartRegistry[key] = null;
    }
  }

  // ========================================================================
  // 1) KPI
  // ========================================================================

  /**
   * Atualiza um card de KPI.
   *
   * @param {string} rootId  ID do elemento raiz do KPI (ou prefixo dos filhos)
   * @param {object} opts
   * @param {string}  [opts.label]
   * @param {number}  opts.value
   * @param {number}  [opts.ref]         valor de referência
   * @param {number}  [opts.delta]       variação % (se omitido, calcula)
   * @param {string}  [opts.format='currency']  'currency'|'number'|'percent'
   * @param {number}  [opts.barPercent]  0–100 para barra de progresso
   * @param {string}  [opts.sub]         texto auxiliar (sobrescreve o padrão)
   * @param {object}  [opts.ids]         mapeamento opcional de IDs filhos
   *   { value, badge, ref, percent, bar }
   */
  function renderKPI(rootId, opts) {
    opts = opts || {};
    const format = opts.format || 'currency';
    const value = Number(opts.value) || 0;
    const ref =
      opts.ref === undefined || opts.ref === null ? null : Number(opts.ref);
    let delta =
      opts.delta === undefined || opts.delta === null
        ? ref === null
          ? null
          : fmt.delta(value, ref)
        : Number(opts.delta);

    const ids = Object.assign(
      {
        value: rootId,
        badge: rootId + '-badge',
        ref: rootId + '-anterior',
        percent: rootId + '-percent',
        bar: rootId + '-bar',
        sub: rootId + '-sub'
      },
      opts.ids || {}
    );

    const elValue = document.getElementById(ids.value);
    if (elValue) {
      elValue.textContent =
        format === 'percent'
          ? fmt.pct(value, false, 2)
          : format === 'number'
            ? fmt.number(value, 0)
            : fmt.currency(value);
    }

    const elBadge = document.getElementById(ids.badge);
    if (elBadge && delta !== null) {
      elBadge.textContent = fmt.pctArrow(delta, 2);
      elBadge.classList.remove('up', 'down', 'neutral');
      if (delta > 0) elBadge.classList.add('up');
      else if (delta < 0) elBadge.classList.add('down');
      else elBadge.classList.add('neutral');
    }

    const elRef = document.getElementById(ids.ref);
    if (elRef && ref !== null) {
      elRef.textContent =
        format === 'currency' ? fmt.currency(ref) : fmt.number(ref, 0);
    }

    if (opts.barPercent !== undefined) {
      const elBar = document.getElementById(ids.bar);
      if (elBar) {
        const w = Math.min(Math.max(Number(opts.barPercent) || 0, 0), 100);
        elBar.style.width = w + '%';
        elBar.setAttribute('data-width', String(w));
      }
    }

    if (opts.percent !== undefined) {
      const elPct = document.getElementById(ids.percent);
      if (elPct) elPct.textContent = fmt.pct(opts.percent, false, 2);
    }

    if (opts.sub !== undefined) {
      const elSub = document.getElementById(ids.sub);
      if (elSub) elSub.textContent = opts.sub;
    }

    return { value, ref, delta };
  }

  /**
   * Atualiza vários KPIs de uma vez.
   * @param {object} map  { id: opts, ... }
   */
  function renderKPIs(map) {
    Object.keys(map || {}).forEach(function (id) {
      renderKPI(id, map[id]);
    });
  }

  // ========================================================================
  // 2) Barras horizontais COM meta/referencial
  // ========================================================================

  /**
   * Gráfico de barras horizontal com linha de meta e colunas Valor | Δ%.
   *
   * @param {string} canvasId
   * @param {object} opts
   * @param {Array<{label:string, value:number, ref?:number, delta?:number}>} opts.items
   * @param {string}  [opts.color='#3fae87']
   * @param {string}  [opts.innerId]          ID do .chart-inner (altura dinâmica)
   * @param {number}  [opts.heightPerBar=56]
   * @param {number}  [opts.minHeight=320]
   * @param {boolean} [opts.animation=false]
   * @param {function} [opts.onClick]         (item, index) => void
   * @param {string}  [opts.valueUnit='mil']  'mil' | 'raw' | 'currency'
   */
  function renderBarWithMeta(canvasId, opts) {
    opts = opts || {};
    const items = Array.isArray(opts.items) ? opts.items : [];
    const color = opts.color || '#3fae87';
    const valueUnit = opts.valueUnit || 'mil';

    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') {
      console.warn('[Dashboard] Canvas ou Chart.js ausente:', canvasId);
      return null;
    }

    destroyChart(canvasId);

    const labels = items.map(function (i) {
      return i.label || i.name || '';
    });
    const valores = items.map(function (i) {
      return Number(i.value) || 0;
    });
    const referenciais = items.map(function (i) {
      return i.ref === undefined || i.ref === null ? 0 : Number(i.ref) || 0;
    });
    const deltas = items.map(function (i, idx) {
      if (i.delta !== undefined && i.delta !== null) return Number(i.delta) || 0;
      return fmt.delta(valores[idx], referenciais[idx]);
    });

    // Altura dinâmica
    const count = Math.max(items.length, 1);
    const minH = opts.minHeight != null ? opts.minHeight : 320;
    const perBar = opts.heightPerBar != null ? opts.heightPerBar : 56;
    const chartHeight = Math.max(minH, count * perBar);

    const inner =
      (opts.innerId && document.getElementById(opts.innerId)) ||
      canvas.closest('.chart-inner');
    if (inner) inner.style.height = chartHeight + 'px';

    const scroll = canvas.closest('.chart-scroll');
    if (scroll) scroll.style.overflowY = count > 4 ? 'auto' : 'hidden';

    const formatValue = function (v) {
      if (valueUnit === 'currency') return fmt.currency(v, 0);
      if (valueUnit === 'raw') return fmt.number(v, 0);
      return fmt.number(v / 1000, 0); // mil
    };

    const colunasPlugin = {
      id: 'dashboard-colunas-meta',
      afterDatasetsDraw: function (chart) {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        if (!chartArea) return;

        const meta = chart.getDatasetMeta(0);
        const xScale = chart.scales.x;
        const valorX = chartArea.right + 10;
        const deltaX = chartArea.right + 80;

        ctx.save();

        // Linhas de referencial (meta)
        referenciais.forEach(function (ref, index) {
          const x = xScale.getPixelForValue(Math.abs(Number(ref) || 0));
          if (x < chartArea.left || x > chartArea.right) return;
          const bar = meta.data[index];
          if (!bar) return;

          ctx.beginPath();
          ctx.moveTo(x, bar.y - 17);
          ctx.lineTo(x, bar.y + 17);
          ctx.strokeStyle = 'rgba(109, 120, 137, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
        });
        ctx.setLineDash([]);

        // Valores + variação
        meta.data.forEach(function (bar, index) {
          const y = bar.y;
          const valorOriginal = valores[index];
          const delta = deltas[index];

          ctx.font = "600 9.5px 'IBM Plex Mono', monospace";
          ctx.fillStyle = '#c7cedb';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(formatValue(valorOriginal), valorX, y);

          ctx.font = "700 9.5px 'IBM Plex Mono', monospace";
          ctx.fillStyle = delta >= 0 ? '#4fc499' : '#d4796d';
          ctx.fillText(fmt.pctArrow(delta), deltaX, y);
        });

        ctx.restore();
      }
    };

    const chart = new Chart(canvas, {
      type: 'bar',
      plugins: [colunasPlugin],
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Valor',
            data: valores.map(function (v) {
              return Math.abs(v);
            }),
            backgroundColor: color,
            borderRadius: 3,
            barPercentage: 0.72,
            categoryPercentage: 0.72,
            maxBarThickness: 22
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: opts.animation === true,
        interaction: { mode: 'nearest', axis: 'y', intersect: true },
        hover: { animationDuration: 0 },
        layout: { padding: { right: 125, left: 2 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            backgroundColor: '#0e1420',
            borderColor: 'rgba(255,255,255,.09)',
            borderWidth: 1,
            titleColor: '#ffffff',
            bodyColor: '#c7cedb',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (ctx) {
                const i = ctx.dataIndex;
                return 'Valor: ' + fmt.currency(valores[i], 0);
              },
              afterBody: function (items) {
                const i = items[0].dataIndex;
                return [
                  'Referência: ' + fmt.currency(referenciais[i], 0),
                  'Variação: ' + fmt.pctArrow(deltas[i])
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { display: false },
            border: { display: false },
            ticks: { display: false }
          },
          y: {
            grid: {
              display: true,
              color: 'rgba(36, 46, 58, 0.65)',
              lineWidth: 1
            },
            ticks: {
              color: '#a7b1c2',
              padding: 6,
              font: { size: 11, family: "'IBM Plex Sans', sans-serif" }
            }
          }
        },
        onClick: function (event, elements) {
          if (!opts.onClick || !elements || !elements.length) return;
          const index = elements[0].index;
          opts.onClick(items[index], index);
        },
        onHover: function (event, elements) {
          const target =
            (event.native && event.native.target) ||
            (event.chart && event.chart.canvas);
          if (target) {
            target.style.cursor =
              elements && elements.length ? 'pointer' : 'default';
          }
        }
      }
    });

    chartRegistry[canvasId] = chart;
    return chart;
  }

  // ========================================================================
  // 3) Gráfico de barras simples (sem meta)
  // ========================================================================

  /**
   * @param {string} canvasId
   * @param {object} opts
   * @param {Array<{label:string, value:number, color?:string}>} opts.items
   * @param {boolean} [opts.horizontal=true]
   * @param {string}  [opts.color='#3fae87']
   * @param {string[]} [opts.colors]   paleta por barra
   * @param {boolean} [opts.showValues=true]
   * @param {string}  [opts.innerId]
   * @param {function} [opts.onClick]
   */
  function renderBar(canvasId, opts) {
    opts = opts || {};
    const items = Array.isArray(opts.items) ? opts.items : [];
    const horizontal = opts.horizontal !== false;
    const baseColor = opts.color || '#3fae87';
    const colors = opts.colors || null;

    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') {
      console.warn('[Dashboard] Canvas ou Chart.js ausente:', canvasId);
      return null;
    }

    destroyChart(canvasId);

    const labels = items.map(function (i) {
      return i.label || i.name || '';
    });
    const valores = items.map(function (i) {
      return Number(i.value) || 0;
    });
    const bg = items.map(function (i, idx) {
      return i.color || (colors && colors[idx]) || baseColor;
    });

    const count = Math.max(items.length, 1);
    if (horizontal) {
      const minH = opts.minHeight != null ? opts.minHeight : 320;
      const perBar = opts.heightPerBar != null ? opts.heightPerBar : 56;
      const chartHeight = Math.max(minH, count * perBar);
      const inner =
        (opts.innerId && document.getElementById(opts.innerId)) ||
        canvas.closest('.chart-inner');
      if (inner) inner.style.height = chartHeight + 'px';
      const scroll = canvas.closest('.chart-scroll');
      if (scroll) scroll.style.overflowY = count > 4 ? 'auto' : 'hidden';
    }

    const showValues = opts.showValues !== false;

    const valuesPlugin = showValues
      ? {
          id: 'dashboard-bar-values',
          afterDatasetsDraw: function (chart) {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            ctx.save();
            ctx.font = "600 11px 'IBM Plex Mono', monospace";
            ctx.fillStyle = '#c7cedb';
            ctx.textBaseline = 'middle';
            meta.data.forEach(function (bar, i) {
              if (horizontal) {
                ctx.textAlign = 'left';
                ctx.fillText(
                  fmt.number(valores[i] / 1000, 0),
                  bar.x + 8,
                  bar.y
                );
              } else {
                ctx.textAlign = 'center';
                ctx.fillText(
                  fmt.number(valores[i] / 1000, 0),
                  bar.x,
                  bar.y - 10
                );
              }
            });
            ctx.restore();
          }
        }
      : null;

    const chart = new Chart(canvas, {
      type: 'bar',
      plugins: valuesPlugin ? [valuesPlugin] : [],
      data: {
        labels: labels,
        datasets: [
          {
            data: valores,
            backgroundColor: bg,
            borderRadius: 3,
            barPercentage: 0.85,
            categoryPercentage: 0.8,
            maxBarThickness: horizontal
              ? count <= 1
                ? 170
                : count === 2
                  ? 105
                  : count === 3
                    ? 72
                    : 40
              : 48
          }
        ]
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: opts.animation === true,
        layout: { padding: horizontal ? { right: 50, left: 10 } : { top: 20 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            backgroundColor: '#0e1420',
            borderColor: 'rgba(255,255,255,.09)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#c7cedb',
            padding: 12,
            callbacks: {
              label: function (c) {
                return 'Valor: ' + fmt.currency(c.raw, 0);
              }
            }
          }
        },
        scales: {
          x: horizontal
            ? {
                beginAtZero: true,
                grid: { display: false },
                border: { display: false },
                ticks: { display: false }
              }
            : {
                grid: { color: 'rgba(36,46,58,.65)' },
                ticks: {
                  color: '#a7b1c2',
                  font: { size: 11, family: "'IBM Plex Sans'" }
                }
              },
          y: horizontal
            ? {
                grid: { color: 'rgba(36,46,58,.65)' },
                ticks: {
                  color: '#a7b1c2',
                  padding: 6,
                  font: { size: 11, family: "'IBM Plex Sans'" }
                }
              }
            : {
                beginAtZero: true,
                grid: { display: false },
                border: { display: false },
                ticks: { display: false }
              }
        },
        onClick: function (event, elements) {
          if (!opts.onClick || !elements || !elements.length) return;
          const index = elements[0].index;
          opts.onClick(items[index], index);
        }
      }
    });

    chartRegistry[canvasId] = chart;
    return chart;
  }

  // ========================================================================
  // 4) Tabela de parceiros (3 níveis)
  // ========================================================================

  function medalClass(index) {
    if (index === 0) return 'gold m1';
    if (index === 1) return 'silver m2';
    if (index === 2) return 'bronze m3';
    return 'm4';
  }

  /**
   * Renderiza ranking de parceiros em 3 níveis:
   *   1) linhas com rank + nome + barra + valor + ref + delta
   *   2) (opcional) linha de total no container separado
   *   3) estados vazios / "novo"
   *
   * @param {string} listId
   * @param {object} opts
   * @param {Array<{name:string, value:number, ref?:number|null, delta?:number}>} opts.items
   * @param {string}  [opts.totalContainerId]
   * @param {string}  [opts.totalLabel='Total dos parceiros']
   * @param {string}  [opts.totalSub]
   * @param {object}  [opts.total]   { value, ref, delta } — se omitido, soma dos items
   * @param {string}  [opts.valueFormat='mil']  'mil' | 'currency'
   * @param {number}  [opts.limit]   limita a N linhas (ex: top 10)
   */
  function renderPartnersTable(listId, opts) {
    opts = opts || {};
    let items = Array.isArray(opts.items) ? opts.items.slice() : [];
    if (opts.limit && items.length > opts.limit) {
      items = items.slice(0, opts.limit);
    }

    const list = document.getElementById(listId);
    if (!list) {
      console.warn('[Dashboard] Lista de parceiros não encontrada:', listId);
      return;
    }

    if (!items.length) {
      list.innerHTML =
        '<div class="section-note">Nenhum parceiro encontrado no período.</div>';
      if (opts.totalContainerId) {
        const t = document.getElementById(opts.totalContainerId);
        if (t) t.innerHTML = '';
      }
      return;
    }

    const valueFormat = opts.valueFormat || 'mil';
    const formatVal = function (v) {
      return valueFormat === 'currency' ? fmt.currency(v) : fmt.mil(v, 1);
    };

    const maxVal = Math.max.apply(
      null,
      items.map(function (p) {
        return Number(p.value) || 0;
      })
    );

    list.innerHTML = items
      .map(function (p, i) {
        const value = Number(p.value) || 0;
        const ref =
          p.ref === null || p.ref === undefined ? null : Number(p.ref) || 0;
        const delta =
          p.delta !== undefined && p.delta !== null
            ? Number(p.delta)
            : ref === null
              ? null
              : fmt.delta(value, ref);
        const width = maxVal > 0 ? ((value / maxVal) * 100).toFixed(1) : 0;
        const name = p.name || p.nome || 'Sem nome';

        const refHtml =
          ref === null
            ? '<div class="ref-na na">não comparável</div>'
            : '<div class="v">' +
              formatVal(ref) +
              '</div><div class="l">REFERENCIAL</div>';

        const deltaHtml =
          delta === null
            ? '<span class="delta-badge novo novo-tag">Novo</span>'
            : '<span class="delta-badge ' +
              (delta >= 0 ? 'up' : 'down') +
              '">' +
              fmt.pctArrow(delta) +
              '</span>';

        return (
          '<div class="partner-row">' +
          '<div class="p-rank ' +
          medalClass(i) +
          '">' +
          (i + 1) +
          '</div>' +
          '<div class="p-name-block">' +
          '<div class="p-name">' +
          escapeHtml(name) +
          '</div>' +
          '<div class="p-bar-track"><div class="p-bar-fill" style="width:' +
          width +
          '%"></div></div>' +
          '</div>' +
          '<div class="p-val"><div class="v">' +
          formatVal(value) +
          '</div><div class="l">VALOR</div></div>' +
          '<div class="p-ref">' +
          refHtml +
          '</div>' +
          '<div class="p-delta">' +
          deltaHtml +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    // Nível 3: total
    if (opts.totalContainerId) {
      const totalEl = document.getElementById(opts.totalContainerId);
      if (totalEl) {
        let totalValue, totalRef, totalDelta;
        if (opts.total) {
          totalValue = Number(opts.total.value) || 0;
          totalRef =
            opts.total.ref === undefined || opts.total.ref === null
              ? null
              : Number(opts.total.ref) || 0;
          totalDelta =
            opts.total.delta !== undefined
              ? Number(opts.total.delta)
              : totalRef === null
                ? null
                : fmt.delta(totalValue, totalRef);
        } else {
          totalValue = items.reduce(function (s, p) {
            return s + (Number(p.value) || 0);
          }, 0);
          totalRef = items.reduce(function (s, p) {
            return s + (Number(p.ref) || 0);
          }, 0);
          totalDelta = fmt.delta(totalValue, totalRef);
        }

        const label = opts.totalLabel || 'Total dos parceiros';
        const sub = opts.totalSub || 'Base: todos os parceiros ativos no período';
        const deltaClass =
          totalDelta === null ? 'neutral' : totalDelta >= 0 ? 'up' : 'down';
        const deltaText =
          totalDelta === null ? '—' : fmt.pctArrow(totalDelta);

        totalEl.innerHTML =
          '<div class="partner-row total-row">' +
          '<div class="p-rank total">\u03A3</div>' +
          '<div class="p-name-block">' +
          '<div class="p-name">' +
          escapeHtml(label) +
          '</div>' +
          '<div class="p-name-sub">' +
          escapeHtml(sub) +
          '</div>' +
          '</div>' +
          '<div class="p-val"><div class="v">' +
          formatVal(totalValue) +
          '</div><div class="l">Valor</div></div>' +
          '<div class="p-ref"><div class="v">' +
          (totalRef === null ? '—' : formatVal(totalRef)) +
          '</div><div class="l">Referencial</div></div>' +
          '<div class="p-delta"><span class="delta-badge ' +
          deltaClass +
          '">' +
          deltaText +
          '</span></div>' +
          '</div>';
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ========================================================================
  // Helpers extras
  // ========================================================================

  /** Destrói um gráfico registrado (útil em re-render manual). */
  function destroy(canvasId) {
    destroyChart(canvasId);
  }

  /** Atualiza texto de rodapé "Atualizado em dd/mm/yyyy às hh:mm". */
  function updateFooter(elementId) {
    const el = document.getElementById(elementId || 'footer-updated');
    if (!el) return;
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const hora = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    el.textContent = 'Atualizado em ' + data + ' às ' + hora;
  }

  // ========================================================================
  // Loading compartilhado
  // ========================================================================

  const loadingState = {
    total: 0,
    done: 0,
    overlay: null
  };

  function ensureLoadingStyles() {
    if (document.getElementById('dashboard-loading-styles')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-loading-styles';
    style.textContent = `
      .dashboard-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 12, 13, .34);
        backdrop-filter: blur(1.5px);
        transition: opacity .22s ease, visibility .22s ease;
      }
      .dashboard-loading-overlay.is-hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .dashboard-loading-modal {
        min-width: 154px;
        padding: 18px 22px;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 10px;
        background: #202326;
        box-shadow: 0 14px 42px rgba(0,0,0,.32);
        color: #e9ecef;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        font: 500 13px/1.2 'IBM Plex Sans', Arial, sans-serif;
      }
      .dashboard-loading-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid rgba(255,255,255,.16);
        border-top-color: #d1a367;
        border-radius: 50%;
        animation: dashboard-loading-spin .72s linear infinite;
      }
      .dashboard-loading-text { opacity: .86; letter-spacing: .01em; }
      @keyframes dashboard-loading-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  function createLoadingOverlay() {
    if (loadingState.overlay) return loadingState.overlay;
    ensureLoadingStyles();
    const overlay = document.createElement('div');
    overlay.className = 'dashboard-loading-overlay';
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="dashboard-loading-modal" role="status" aria-label="Carregando dados">
        <div class="dashboard-loading-spinner" aria-hidden="true"></div>
        <div class="dashboard-loading-text">Carregando dados...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    loadingState.overlay = overlay;
    return overlay;
  }

  function startLoading(total) {
    const count = Math.max(Number(total) || 0, 0);
    loadingState.total = count;
    loadingState.done = 0;
    if (!count) return;
    const overlay = createLoadingOverlay();
    overlay.classList.remove('is-hidden');
  }

  function completeLoading(amount) {
    if (!loadingState.total) return;
    const step = Math.max(Number(amount) || 1, 1);
    loadingState.done = Math.min(loadingState.done + step, loadingState.total);
    if (loadingState.done >= loadingState.total && loadingState.overlay) {
      loadingState.overlay.classList.add('is-hidden');
    }
  }

  function resetLoading() {
    loadingState.total = 0;
    loadingState.done = 0;
    if (loadingState.overlay) loadingState.overlay.classList.add('is-hidden');
  }

  // ========================================================================
  // 5) Donut padronizado (mesmo padrão visual do index3)
  // ========================================================================

  /**
   * Renderiza um gráfico de rosca no padrão visual do nível 3.
   *
   * @param {string} canvasId
   * @param {object} opts
   * @param {Array<{label:string,value:number,code?:string|number}>} opts.items
   * @param {string} [opts.totalId] elemento central do donut
   * @param {string} [opts.legendId] legenda externa
   * @param {Array<string>} [opts.colors]
   * @param {function} [opts.onItemClick] (item,index) => void
   * @param {boolean} [opts.showLegendValue=true] mostra valor/percentual na legenda
   */
  function renderDoughnut(canvasId, opts) {
    opts = opts || {};
    const canvas = document.getElementById(canvasId);
    const legend = opts.legendId ? document.getElementById(opts.legendId) : null;
    const totalEl = opts.totalId ? document.getElementById(opts.totalId) : null;
    if (!canvas || typeof Chart === 'undefined') return null;

    destroyChart('doughnut:' + canvasId);
    if (legend) legend.innerHTML = '';

    const items = (opts.items || []).map(function (x) {
      return {
        label: String(x.label == null ? '' : x.label),
        value: Number(x.value) || 0,
        code: x.code,
        hidden: !!x.hidden
      };
    });
    const colors = opts.colors || ['#3fae87','#5b8def','#d1a367','#c66be0','#d4796d','#c5ebe0'];
    const total = items.reduce(function (sum, x) { return sum + (x.hidden ? 0 : x.value); }, 0);

    if (totalEl) {
      totalEl.textContent = 'R$ ' + (total / 1000000).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' mi';
    }

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map(function (x) { return x.label; }),
        datasets: [{
          data: items.map(function (x) { return x.hidden ? 0 : x.value; }),
          backgroundColor: colors.slice(0, items.length),
          borderColor: '#171717',
          borderWidth: 4,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0e1420',
            borderColor: 'rgba(255,255,255,.09)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#c7cedb',
            padding: 12,
            callbacks: {
              label: function (c) {
                const share = total ? ((c.raw / total) * 100).toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1
                }) : '0,0';
                return ' ' + c.label + ': ' + share + '% · ' + fmt.currency(c.raw, 0);
              }
            }
          },
          datalabels: { display: false }
        },
        onClick: function (evt, elements) {
          const el = elements && elements[0];
          if (!el) return;
          const handler = typeof opts.onChartItemClick === 'function' ? opts.onChartItemClick : (typeof opts.onItemClick === 'function' ? opts.onItemClick : null);
          if (handler) handler(items[el.index], el.index);
        }
      }
    });

    chartRegistry['doughnut:' + canvasId] = chart;

    if (legend) {
      items.forEach(function (item, i) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-legend-item' + (item.hidden ? ' is-hidden' : '');
        const legendName = '<span class="product-legend-name" title="' + String(item.label).replace(/"/g, '&quot;') + '">' + item.label + '</span>';
        const legendValue = opts.showLegendValue === false ? '' :
          '<span class="product-legend-value">' + fmt.currency(item.value, 0) + ' · ' +
          (total ? ((item.value / total) * 100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) : '0,0') + '%</span>';
        button.innerHTML = '<span class="product-legend-dot" style="background:' + (colors[i] || colors[0]) + '"></span>' + legendName + legendValue;
        button.addEventListener('click', function () {
          const handler = typeof opts.onLegendItemClick === 'function' ? opts.onLegendItemClick : (typeof opts.onItemClick === 'function' ? opts.onItemClick : null);
          if (handler) handler(item, i);
        });
        legend.appendChild(button);
      });
    }

    return chart;
  }

  // ========================================================================
  // API pública
  // ========================================================================

  const Dashboard = {
    fmt: fmt,
    renderKPI: renderKPI,
    renderKPIs: renderKPIs,
    renderBarWithMeta: renderBarWithMeta,
    renderBar: renderBar,
    renderDoughnut: renderDoughnut,
    renderPartnersTable: renderPartnersTable,
    destroy: destroy,
    updateFooter: updateFooter,
    loading: {
      start: startLoading,
      done: completeLoading,
      reset: resetLoading
    }
  };

  // UMD-ish
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
  }
  global.Dashboard = Dashboard;
})(typeof window !== 'undefined' ? window : globalThis);
