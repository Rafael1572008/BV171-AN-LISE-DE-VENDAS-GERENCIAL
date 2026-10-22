/* KPIs de vendas: componentes agregados na mesma granularidade e com os mesmos filtros. */
(function (global) {
  'use strict';
  var sales = "AMV.TPMOV = 'V' AND AMV.OPER NOT IN (1124,1151,2071)";
  var bonus = "AMV.TPMOV = 'V' AND AMV.OPER IN (1124,1151,2071)";
  var taxFields = ['ST', 'ICMS', 'PIS', 'COFINS'];
  var movements = "AMV.TPMOV IN ('V','D','F')";
  var fields = ['ST', 'ICMS', 'PIS', 'COFINS', 'CUSTOPROD', 'VLRDESCFINITEM',
    'VLRPRZPAGTOITEM', 'VLFRETEITEM', 'VLRCOMISSITEM', 'VLRPROMOTOR'];
  function isSales(value) {
    return String(value == null ? '' : value).trim().replace(/^["']+|["']+$/g, '').trim() === 'V';
  }
  function sum(condition, expression, alias) {
    return 'NVL(SUM(CASE WHEN ' + condition + ' THEN NVL(' + expression + ',0) ELSE 0 END),0) AS ' + alias;
  }
  function select(alias) {
    return [sum(sales, 'AMV.VLRTOTITEM', alias),
      '0 AS M1', '0 AS M2', '0 AS MARGEM',
      sum("AMV.TPMOV = 'D'", 'AMV.VLRTOTITEM', 'KPI_DEVOLUCOES'),
      sum(bonus, 'AMV.VLRTOTITEM', 'KPI_BONIFICACOES')]
      .concat(fields.map(function (field) {
        return sum(taxFields.indexOf(field) >= 0 ? movements : sales, 'AMV.' + field, 'KPI_' + field);
      })).join(',\n');
  }
  function columns() {
    return ['DEVOLUCOES', 'BONIFICACOES'].concat(fields).map(function (field) {
      return ', A.KPI_' + field;
    }).join('');
  }
  // Arredonda os componentes uma vez, em centavos, antes de calcular seus totais.
  function calculate(row) {
    function cents(value) { return Math.round((Number(value) || 0) * 100); }
    function component(label, field) { return [label, cents(row['KPI_' + field])]; }
    var returns = cents(row.KPI_DEVOLUCOES);
    var taxes = taxFields.map(function (field) { return component(field, field); });
    var deductions = returns + total(taxes);
    var expenses = [component('Desconto Financeiro', 'VLRDESCFINITEM'),
      component('Prazo de Pagamento', 'VLRPRZPAGTOITEM'), component('Frete', 'VLFRETEITEM'),
      component('Comissões', 'VLRCOMISSITEM'), component('Promotor', 'VLRPROMOTOR'),
      component('Bonificações', 'BONIFICACOES')];
    function total(items) { return items.reduce(function (value, item) { return value + item[1]; }, 0); }
    var gross = cents(row.FATURAMENTO == null ? row.FAT : row.FATURAMENTO);
    var net = gross + deductions;
    var cost = cents(row.KPI_CUSTOPROD);
    return [
      ['Receita Bruta', gross], ['Deduções da Receita Bruta', deductions],
      ['Devoluções', returns], ['Impostos', total(taxes), taxes], ['Receita Líquida', net],
      ['CPV', cost], ['Margem Contábil 1', net + cost],
      ['D.V.V. (Despesas Variáveis de Vendas)', total(expenses), expenses],
      // D.V.V. mantém sua composição; seu total reduz a margem em ambas as convenções de sinal.
      ['Margem de Contribuição 2', net + cost - Math.abs(total(expenses))]
    ];
  }
  function representation(value, gross) {
    var percent = gross === 0 ? null : value / gross * 100;
    return {
      percent: percent,
      label: percent === null ? '—' : percent.toLocaleString('pt-BR', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }) + '%',
      width: percent === null ? 0 : Math.min(100, Math.abs(percent)),
      negative: percent !== null && percent < 0
    };
  }
  // Cada indicador fornece somente metadados; os valores vêm do mesmo calculate usado pelos cards.
  var modalConfigs = {
    3: {
      title: 'Composição dos Impostos',
      totalLabel: 'Total de Impostos'
    },
    7: {
      title: 'Despesas Variáveis de Vendas',
      totalLabel: 'Total de D.V.V.'
    }
  };
  function createDetailModal() {
    var dialog = document.createElement('dialog');
    dialog.id = 'sales-kpi-modal';
    dialog.className = 'sales-kpi-modal';
    dialog.setAttribute('aria-labelledby', 'sales-kpi-modal-title');
    var trigger;
    function node(tag, className, text) {
      var el = document.createElement(tag);
      el.className = className || '';
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function money(value) {
      var amount = node('strong', '', global.Dashboard.fmt.currency(value / 100));
      if (value < 0) amount.style.color = 'var(--negative)';
      return amount;
    }
    function percent(value, base, suffix) {
      var share = representation(value, base);
      var el = node('span', 'sales-kpi-modal-percent', share.label + ' ' + suffix);
      if (share.negative) el.style.color = 'var(--negative)';
      return el;
    }
    function close() { dialog.close(); }
    dialog.addEventListener('close', function () { if (trigger) trigger.focus(); });
    // Escape é tratado pelo dialog nativo. O retângulo evita fechar ao clicar no conteúdo/padding.
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    document.body.appendChild(dialog);
    return {
      open: function (data, source) {
        trigger = source;
        dialog.replaceChildren();
        var header = node('div', 'sales-kpi-modal-header');
        var title = node('h2', '', data.title);
        title.id = 'sales-kpi-modal-title';
        header.appendChild(title);
        var button = node('button', 'sales-kpi-modal-close', 'Fechar ×');
        button.type = 'button';
        button.addEventListener('click', close);
        header.appendChild(button);
        dialog.appendChild(header);
        var composition = node('dl', 'sales-kpi-composition');
        data.components.forEach(function (part) {
          var line = node('div');
          line.appendChild(node('dt', '', part[0]));
          var amount = node('dd');
          amount.appendChild(money(part[1]));
          amount.appendChild(percent(part[1], data.total, 'do total'));
          line.appendChild(amount);
          composition.appendChild(line);
        });
        dialog.appendChild(composition);
        var total = node('div', 'sales-kpi-modal-total');
        total.appendChild(node('span', '', data.totalLabel));
        var result = node('div', 'sales-kpi-modal-result');
        result.appendChild(money(data.total));
        result.appendChild(percent(data.total, data.gross, 'da Receita Bruta'));
        total.appendChild(result);
        dialog.appendChild(total);
        (data.additionalInfo || []).forEach(function (info) {
          var note = node('div', 'sales-kpi-modal-note');
          note.appendChild(node('p', '', info.label));
          if (info.value !== undefined) note.appendChild(money(info.value));
          if (info.description) note.appendChild(node('p', '', info.description));
          dialog.appendChild(note);
        });
        if (!dialog.open) dialog.showModal();
      }
    };
  }
  function render(row) {
    // O marcador vem apenas da consulta de vendas; os demais movimentos usam a renderização original.
    if (!row || !Object.prototype.hasOwnProperty.call(row, 'KPI_DEVOLUCOES')) return false;
    var container = document.querySelector('.kpis');
    if (!container) return false;
    var previousModal = document.getElementById('sales-kpi-modal');
    if (previousModal) {
      if (previousModal.open) previousModal.close();
      previousModal.remove();
    }
    container.className = 'kpis sales-kpis';
    container.replaceChildren();
    var items = calculate(row);
    var modal = createDetailModal();
    items.forEach(function (item, index) {
      var config = modalConfigs[index];
      var id = 'sales-kpi-' + index;
      var card = document.createElement('div');
      card.className = 'kpi' + (index === 0 ? ' primary' : '') + (config ? ' sales-kpi-interactive' : '');
      var top = document.createElement('div');
      top.className = 'kpi-top';
      var label = document.createElement(config ? 'button' : 'span');
      label.className = 'label';
      label.textContent = item[0];
      top.appendChild(label);
      if (index === 0) {
        var badge = document.createElement('span');
        badge.className = 'kpi-badge';
        badge.id = id + '-badge';
        top.appendChild(badge);
      }
      card.appendChild(top);
      var value = document.createElement('div');
      value.className = 'value num';
      value.id = id;
      value.textContent = global.Dashboard.fmt.currency(item[1] / 100);
      if (item[1] < 0) value.style.color = 'var(--negative)';
      card.appendChild(value);
      if (index === 0) {
        var reference = document.createElement('div');
        reference.className = 'sub';
        reference.textContent = 'Referência: ' + global.Dashboard.fmt.currency(row.FATREF == null ? row.FATURAMENTO_ANTERIOR : row.FATREF);
        card.appendChild(reference);
      } else {
        var share = representation(item[1], items[0][1]);
        var ratio = document.createElement('div');
        ratio.className = 'sub sales-kpi-ratio';
        var percent = document.createElement('strong');
        percent.textContent = share.label;
        if (share.negative) percent.style.color = 'var(--negative)';
        ratio.appendChild(percent);
        var caption = document.createElement('span');
        caption.textContent = share.percent === null ? 'Receita Bruta igual a zero' : 'da Receita Bruta';
        ratio.appendChild(caption);
        card.appendChild(ratio);
        var track = document.createElement('div');
        track.className = 'sales-kpi-track' + (share.negative ? ' is-negative' : '');
        track.setAttribute('aria-hidden', 'true');
        track.title = share.percent === null ? 'Percentual indisponível' :
          share.label + (share.negative ? ' (negativo: barra vermelha)' : ' da Receita Bruta');
        var fill = document.createElement('div');
        fill.className = 'sales-kpi-fill';
        fill.style.width = share.width + '%';
        track.appendChild(fill);
        card.appendChild(track);
      }
      if (config) {
        label.type = 'button';
        label.className += ' sales-kpi-trigger';
        label.setAttribute('aria-haspopup', 'dialog');
        label.setAttribute('aria-controls', 'sales-kpi-modal');
        card.addEventListener('click', function () {
          modal.open({title: config.title,
            totalLabel: config.totalLabel, total: item[1], gross: items[0][1],
            components: config.components ? config.components(items, row) : (item[2] || []),
            additionalInfo: config.additionalInfo ? config.additionalInfo(items) : []}, label);
        });
      }
      container.appendChild(card);
      global.Dashboard.renderKPI(id, {
        value: item[1] / 100,
        ref: index === 0 ? (row.FATREF == null ? row.FATURAMENTO_ANTERIOR : row.FATREF) : null
      });
    });
    return true;
  }
  global.Dashboard.salesKpis = {isSales: isSales, select: select, columns: columns,
    movements: movements, calculate: calculate, representation: representation, render: render};
})(window);
