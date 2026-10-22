/**
 * BV171 · tabela interativa de produtos
 * Busca, ordenação, paginação (5/página) e seleção de linha.
 * Dependência: BV.utils
 */
(function (global) {
  'use strict';

  var U = global.BV.utils;

  var tableState = {
    all: [],
    filtered: [],
    page: 1,
    pageSize: 5,
    sortKey: 'value',
    sortDir: 'desc',
    search: '',
    bound: false
  };

  function marginBar(v) {
    var safe = Math.max(0, Math.min(100, U.n(v)));
    var cls = v >= 30 ? 'good' : v >= 15 ? 'mid' : 'low';
    return (
      '<div class="margin-meter" title="' + U.esc(U.pct(v)) + '">' +
      '<span class="margin-meter-track"><i class="margin-meter-fill ' + cls + '" style="width:' + safe + '%"></i></span>' +
      '<b>' + U.esc(U.pct(v)) + '</b></div>'
    );
  }

  function selectProduct(code) {
    var target = null;
    document.querySelectorAll('#products-body tr.product-row').forEach(function (tr) {
      var selected = String(tr.dataset.productCode) === String(code);
      tr.classList.toggle('selected', selected);
      if (selected) target = tr;
    });
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function compareRows(a, b, key, dir) {
    var av = a[key], bv = b[key];
    var cmp = 0;
    if (typeof av === 'string' || typeof bv === 'string') {
      cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    } else {
      cmp = (Number(av) || 0) - (Number(bv) || 0);
    }
    return dir === 'asc' ? cmp : -cmp;
  }

  function applyTableFilterSort() {
    var q = tableState.search.trim().toLowerCase();
    var rows = tableState.all.slice();
    if (q) {
      rows = rows.filter(function (p) {
        return String(p.codprod).toLowerCase().includes(q) ||
          String(p.name || '').toLowerCase().includes(q);
      });
    }
    rows.sort(function (a, b) {
      return compareRows(a, b, tableState.sortKey, tableState.sortDir);
    });
    tableState.filtered = rows;
    var maxPage = Math.max(1, Math.ceil(rows.length / tableState.pageSize));
    if (tableState.page > maxPage) tableState.page = maxPage;
  }

  function rowHtml(p) {
    var varCls = p.variation > 0 ? 'positive' : p.variation < 0 ? 'negative' : 'neutral';
    var varPctCls = p.variationPct > 0 ? 'positive' : p.variationPct < 0 ? 'negative' : 'neutral';
    var arrow = p.variationPct > 0 ? '↑' : p.variationPct < 0 ? '↓' : '—';
    return (
      '<tr class="product-row" data-product-code="' + U.esc(p.codprod) + '" tabindex="0" title="Clique para destacar este produto na análise de margem">' +
      '<td class="code mono col-product">' + U.esc(p.codprod) + '</td>' +
      '<td class="desc col-product" title="' + U.esc(p.name) + '"><span class="product-name">' + U.esc(p.name) + '</span></td>' +
      '<td class="numc strong-num col-current">' + U.qty(p.boxes) + '</td>' +
      '<td class="numc strong-num col-current">' + U.money(p.value) + '</td>' +
      '<td class="numc secondary-num col-current">' + U.money(p.unit) + '</td>' +
      '<td class="numc ref-num col-reference">' + U.qty(p.boxesRef) + '</td>' +
      '<td class="numc ref-num col-reference">' + U.money(p.valueRef) + '</td>' +
      '<td class="numc secondary-num ref-num col-reference">' + U.money(p.unitRef) + '</td>' +
      '<td class="numc ' + varCls + ' col-variation"><span class="variation-value">' + U.money(p.variation) + '</span></td>' +
      '<td class="numc ' + varPctCls + ' col-variation"><span class="variation-pct"><span class="variation-arrow">' + arrow + '</span>' + U.pct(p.variationPct) + '</span></td>' +
      '<td class="numc profit-num col-profit">' + U.money(p.margin) + '</td>' +
      '<td class="numc profit-num col-profit">' + U.money(p.m1) + '</td>' +
      '<td class="numc margin-cell col-profit">' + marginBar(p.marginPct) + '</td>' +
      '</tr>'
    );
  }

  function footerHtml(data) {
    var t = data.reduce(function (a, p) {
      return {
        boxes: a.boxes + p.boxes,
        value: a.value + p.value,
        boxesRef: a.boxesRef + p.boxesRef,
        valueRef: a.valueRef + p.valueRef,
        variation: a.variation + p.variation,
        margin: a.margin + p.margin,
        m1: a.m1 + p.m1
      };
    }, { boxes: 0, value: 0, boxesRef: 0, valueRef: 0, variation: 0, margin: 0, m1: 0 });

    var unit = t.boxes ? t.value / t.boxes : 0;
    var unitRef = t.boxesRef ? t.valueRef / t.boxesRef : 0;
    var variationPct = t.valueRef ? (t.variation / t.valueRef) * 100 : 0;
    var marginPct = t.m1 ? (t.margin / t.m1) * 100 : 0;
    var totalVarCls = t.variation > 0 ? 'positive' : t.variation < 0 ? 'negative' : 'neutral';
    var totalVarPctCls = variationPct > 0 ? 'positive' : variationPct < 0 ? 'negative' : 'neutral';
    var totalArrow = variationPct > 0 ? '↑' : variationPct < 0 ? '↓' : '—';

    return (
      '<tr>' +
      '<td class="col-product"></td><td class="col-product">Total</td>' +
      '<td class="numc strong-num col-current">' + U.qty(t.boxes) + '</td>' +
      '<td class="numc strong-num col-current">' + U.money(t.value) + '</td>' +
      '<td class="numc secondary-num col-current">' + U.money(unit) + '</td>' +
      '<td class="numc ref-num col-reference">' + U.qty(t.boxesRef) + '</td>' +
      '<td class="numc ref-num col-reference">' + U.money(t.valueRef) + '</td>' +
      '<td class="numc secondary-num ref-num col-reference">' + U.money(unitRef) + '</td>' +
      '<td class="numc ' + totalVarCls + ' col-variation">' + U.money(t.variation) + '</td>' +
      '<td class="numc ' + totalVarPctCls + ' col-variation"><span class="variation-arrow">' + totalArrow + '</span>' + U.pct(variationPct) + '</td>' +
      '<td class="numc profit-num col-profit">' + U.money(t.margin) + '</td>' +
      '<td class="numc profit-num col-profit">' + U.money(t.m1) + '</td>' +
      '<td class="numc margin-cell col-profit">' + marginBar(marginPct) + '</td>' +
      '</tr>'
    );
  }

  function updateSortIndicators() {
    document.querySelectorAll('#products-table th.sortable').forEach(function (th) {
      var key = th.getAttribute('data-sort');
      th.classList.toggle('sorted', key === tableState.sortKey);
      th.classList.toggle('asc', key === tableState.sortKey && tableState.sortDir === 'asc');
      th.classList.toggle('desc', key === tableState.sortKey && tableState.sortDir === 'desc');
      var ind = th.querySelector('.sort-ind');
      if (ind) {
        if (key === tableState.sortKey) ind.textContent = tableState.sortDir === 'asc' ? ' ▲' : ' ▼';
        else ind.textContent = '';
      }
    });
  }

  function renderPagination() {
    var el = document.getElementById('table-pagination');
    var info = document.getElementById('table-page-info');
    if (!el) return;

    var total = tableState.filtered.length;
    var pages = Math.max(1, Math.ceil(total / tableState.pageSize));
    var page = tableState.page;
    var from = total === 0 ? 0 : (page - 1) * tableState.pageSize + 1;
    var to = Math.min(page * tableState.pageSize, total);

    if (info) {
      info.textContent = total === 0
        ? 'Nenhum produto'
        : from + '–' + to + ' de ' + total;
    }

    if (pages <= 1) {
      el.innerHTML = total > 0
        ? '<span class="page-summary">' + total + ' registro' + (total === 1 ? '' : 's') + '</span>'
        : '';
      return;
    }

    function btn(label, p, disabled, extra) {
      extra = extra || '';
      return '<button type="button" class="page-btn ' + extra + '" data-page="' + p + '" ' +
        (disabled ? 'disabled' : '') + ' aria-label="' + label + '">' + label + '</button>';
    }

    var nums = '';
    var windowSize = 5;
    var start = Math.max(1, page - Math.floor(windowSize / 2));
    var end = Math.min(pages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    for (var i = start; i <= end; i++) {
      nums += btn(String(i), i, false, i === page ? 'active' : '');
    }

    el.innerHTML =
      btn('‹', page - 1, page <= 1, 'nav') +
      nums +
      btn('›', page + 1, page >= pages, 'nav');

    el.querySelectorAll('.page-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = Number(b.getAttribute('data-page'));
        if (!p || p === tableState.page || p < 1 || p > pages) return;
        tableState.page = p;
        paintTablePage();
      });
    });
  }

  function paintTablePage() {
    var body = document.getElementById('products-body');
    var foot = document.getElementById('products-foot');
    if (!body) return;

    var start = (tableState.page - 1) * tableState.pageSize;
    var pageRows = tableState.filtered.slice(start, start + tableState.pageSize);

    body.innerHTML = pageRows.length
      ? pageRows.map(rowHtml).join('')
      : '<tr class="empty-row"><td colspan="13">Nenhum produto encontrado</td></tr>';

    // Totais sempre sobre o conjunto filtrado (não só a página)
    foot.innerHTML = footerHtml(tableState.filtered);

    body.querySelectorAll('.product-row').forEach(function (tr) {
      tr.addEventListener('click', function () {
        selectProduct(tr.dataset.productCode);
      });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectProduct(tr.dataset.productCode);
        }
      });
    });

    updateSortIndicators();
    renderPagination();
  }

  function bindTableControls() {
    if (tableState.bound) return;
    tableState.bound = true;

    var search = document.getElementById('product-search');
    if (search) {
      var timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          tableState.search = search.value;
          tableState.page = 1;
          applyTableFilterSort();
          paintTablePage();
        }, 180);
      });
    }

    document.querySelectorAll('#products-table th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (!key) return;
        if (tableState.sortKey === key) {
          tableState.sortDir = tableState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          tableState.sortKey = key;
          tableState.sortDir = (key === 'name' || key === 'codprod') ? 'asc' : 'desc';
        }
        tableState.page = 1;
        applyTableFilterSort();
        paintTablePage();
      });
    });
  }

  function renderTable(data) {
    tableState.all = data.slice();
    tableState.page = 1;
    tableState.search = '';
    var searchEl = document.getElementById('product-search');
    if (searchEl) searchEl.value = '';
    document.getElementById('product-count').textContent =
      data.length + ' produto' + (data.length === 1 ? '' : 's');
    applyTableFilterSort();
    bindTableControls();
    paintTablePage();
  }

  global.BV = global.BV || {};
  global.BV.table = {
    renderTable: renderTable,
    selectProduct: selectProduct,
    tableState: tableState
  };
})(window);
