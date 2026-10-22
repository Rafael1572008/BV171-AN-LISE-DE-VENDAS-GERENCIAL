/**
 * BV171 · utilitários de formatação e parâmetros (index7 · parceiro / canal)
 */
(function (global) {
  'use strict';

  const args = (global.top && global.top.dashboardArgs) || {};
  const params = new URLSearchParams(global.location.search || '');

  function unwrap(v) {
    let value = String(v == null ? '' : v).trim();
    for (let i = 0; i < 5; i++) {
      if (!value) break;
      let next = value;
      try {
        const parsed = JSON.parse(next);
        if (typeof parsed === 'string') next = parsed.trim();
      } catch (e) { /* não é JSON */ }
      if (next === value && next.length >= 2 && next[0] === '"' && next[next.length - 1] === '"') {
        next = next.slice(1, -1).trim();
      }
      next = next.replace(/\\"/g, '"');
      if (next === value) break;
      value = next;
    }
    return value;
  }

  function findArg(name) {
    const candidates = [name, String(name).toLowerCase(), String(name).toUpperCase()];
    for (let i = 0; i < candidates.length; i++) {
      const key = candidates[i];
      if (args[key] !== undefined && args[key] !== null && String(args[key]).trim() !== '') {
        return args[key];
      }
      const pv = params.get(key);
      if (pv !== null && String(pv).trim() !== '') return pv;
    }
    return null;
  }

  function arg(name, fallback) {
    if (fallback === undefined) fallback = '';
    const v = findArg(name);
    if (v === null || v === undefined || String(v).trim() === '') return fallback;
    return unwrap(v);
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
      if (p.length === 3 && p[0].length === 4) return p[2] + '/' + p[1] + '/' + p[0];
      return v;
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
