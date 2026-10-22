/**
 * BV171 · utilitários de formatação e parâmetros
 * Funções puras / helpers compartilhados pelos demais módulos.
 */
(function (global) {
  'use strict';

  const args = global.top.dashboardArgs || {};
  const params = new URLSearchParams(global.location.search || '');

  function arg(name, fallback) {
    if (fallback === undefined) fallback = '';
    const v = args[name] ?? params.get(name);
    return v === null || v === undefined || String(v).trim() === '' ? fallback : String(v).trim();
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sql(s) {
    return String(s ?? '').replace(/'/g, "''");
  }

  function n(v) {
    return Number(v) || 0;
  }

  function money(v) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n(v));
  }

  function qty(v) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(n(v));
  }

  function pct(v) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n(v)) + ' %';
  }

  function period(ini, fim) {
    const f = function (v) {
      if (!v) return '';
      const p = String(v).split(/[ T]/)[0].split('-');
      return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : v;
    };
    return f(ini) + ' - ' + f(fim);
  }

  global.BV = global.BV || {};
  global.BV.utils = {
    args: args,
    params: params,
    arg: arg,
    esc: esc,
    sql: sql,
    n: n,
    money: money,
    qty: qty,
    pct: pct,
    period: period
  };
})(window);
