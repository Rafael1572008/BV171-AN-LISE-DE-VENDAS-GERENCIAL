/**
 * BV171 · orquestração do dashboard de produtos do parceiro (index7)
 * Contexto: UF → Canal → Parceiro (vindo do index6 / nível 03Z)
 * Dependências: utils → queries → table → charts → main
 */
(function (global) {
  'use strict';

  var U = global.BV.utils;
  var Q = global.BV.queries;
  var T = global.BV.table;
  var C = global.BV.charts;

  function setContext() {
    var uf = U.arg('UF', 'Todos os estados');
    var canal = U.arg('CANAL', 'Canal');
    var parceiro = U.arg('PARCEIRO', 'Parceiro selecionado');

    var elUf = document.getElementById('breadcrumb-uf');
    var elCanal = document.getElementById('breadcrumb-canal');
    var elParc = document.getElementById('breadcrumb-parceiro');
    if (elUf) elUf.textContent = uf;
    if (elCanal) elCanal.textContent = canal;
    if (elParc) elParc.textContent = parceiro;

    document.getElementById('header-periodo').textContent =
      U.period(U.arg('P_PERIODO_INI', ''), U.arg('P_PERIODO_FIM', ''));
    document.getElementById('header-periodo-ref').textContent =
      U.period(U.arg('P_PERIODO_R_INI', ''), U.arg('P_PERIODO_R_FIM', ''));

    var pc = document.getElementById('product-context');
    if (pc) pc.textContent = parceiro + ' · ' + canal + ' · ' + uf;
  }

  function renderKpi(rows) {
    if (Dashboard.salesKpis.render(rows && rows[0])) return;
    var r = (rows && rows[0]) || {};
    var fat = U.n(r.FAT);
    var ref = U.n(r.FATREF);
    var m1 = U.n(r.M1);
    var m2 = U.n(r.M2);
    var marg = U.n(r.MARGEM);
    var m1p = fat ? (m1 / fat) * 100 : 0;
    var m2p = fat ? (m2 / fat) * 100 : 0;
    var mp = m1 ? (marg / m1) * 100 : 0;
    var delta = ref ? ((fat - ref) / ref) * 100 : 0;

    document.getElementById('kpi-fat').textContent = U.money(fat);
    document.getElementById('kpi-fat-ref').textContent = U.money(ref);
    document.getElementById('kpi-m1').textContent = U.money(m1);
    document.getElementById('kpi-m2').textContent = U.money(m2);
    document.getElementById('kpi-margin').textContent = U.money(marg);
    document.getElementById('kpi-m1-pct').textContent = U.pct(m1p);
    document.getElementById('kpi-m2-pct').textContent = U.pct(m2p);
    document.getElementById('kpi-margin-badge').textContent = U.pct(mp);
    document.getElementById('kpi-fat-badge').textContent = (delta >= 0 ? '+' : '') + U.pct(delta);
    document.getElementById('kpi-fat-badge').className = 'kpi-badge ' + (delta >= 0 ? 'up' : 'down');
    document.getElementById('m1-bar').style.width = Math.min(100, Math.max(0, m1p)) + '%';
    document.getElementById('m2-bar').style.width = Math.min(100, Math.max(0, m2p)) + '%';
    document.getElementById('kpi-margin-bar').style.width = Math.min(100, Math.max(0, mp)) + '%';
  }

  function normalize(rows) {
    return (rows || []).map(function (r) {
      return {
        codprod: r.CODPROD ?? r.codprod,
        name: r.DESCRPROD ?? r.name,
        boxes: U.n(r.CAIXAS ?? r.boxes),
        value: U.n(r.VALOR ?? r.value),
        unit: U.n(r.VALORUNIT ?? r.unit),
        boxesRef: U.n(r.CAIXASREF ?? r.boxesRef),
        valueRef: U.n(r.VALORREF ?? r.valueRef),
        unitRef: U.n(r.VALORUNITREF ?? r.unitRef),
        variation: U.n(r.VARIACAO ?? r.variation),
        variationPct: U.n(r.VARIACAOPCT ?? r.variationPct),
        margin: U.n(r.MARGEM ?? r.margin),
        m1: U.n(r.M1 ?? r.m1),
        marginPct: U.n(r.MARGEMPCT ?? r.marginPct)
      };
    });
  }

  function render(rows) {
    var data = normalize(rows && rows.length ? rows : []);
    T.renderTable(data);
    C.renderDonut(data);
    C.renderScatter(data);
  }

  function run() {
    setContext();
    try {
      executeQuery(Q.qKpi(), [], function (v) {
        renderKpi(JSON.parse(v));
      }, function (e) {
        console.error('KPI parceiro/canal:', e);
      });

      executeQuery(Q.qProducts(), [], function (v) {
        render(JSON.parse(v));
      }, function (e) {
        console.error('Produtos parceiro/canal:', e);
        render([]);
      });
    } catch (e) {
      console.error(e);
      render([]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})(window);
