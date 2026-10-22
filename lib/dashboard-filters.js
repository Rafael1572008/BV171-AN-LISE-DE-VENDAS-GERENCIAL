/* BV171: estado compartilhado entre níveis, opções e seletor múltiplo. */
(function (global) {
  'use strict';
  var host = global.top;
  var state = host.BV171_FILTERS || (host.BV171_FILTERS = { gerente: [], options: null });
  var context = document.currentScript ? document.currentScript.getAttribute('data-context') : 'overview';
  state.names = state.names || {};
  state.marca = state.marca || [];
  state.marcaNames = state.marcaNames || {};
  state.grupo = state.grupo || [];
  state.grupoNames = state.grupoNames || {};
  state.vendedor = state.vendedor || [];
  state.vendedorNames = state.vendedorNames || {};
  state.perfil = state.perfil || [];
  state.perfilNames = state.perfilNames || {};
  state.top = state.top || [];
  state.topNames = state.topNames || {};
  state.parceiro = state.parceiro || [];
  state.parceiroNames = state.parceiroNames || {};
  state.produto = state.produto || [];
  state.produtoNames = state.produtoNames || {};
  state.matriz = state.matriz || [];
  state.matrizNames = state.matrizNames || {};
  var fields = {
    top: { label: 'TOP', plural: 'TOPs', empty: 'Todas as TOPs', code: 'OPER', name: 'DESCOPER', cache: 'detailOptions', names: state.topNames, showCode: true },
    parceiro: { label: 'Parceiro/Filial', plural: 'parceiros/filiais', empty: 'Todos os parceiros/filiais', code: 'CODCLI', name: 'NOMECLI', cache: 'detailOptions', names: state.parceiroNames, showCode: false },
    produto: { label: 'Produto', plural: 'produtos', empty: 'Todos os produtos', code: 'CODPROD', name: 'DESCPROD', cache: 'detailOptions', names: state.produtoNames, showCode: true },
    matriz: { label: 'Matriz', plural: 'matrizes', empty: 'Todas as matrizes', code: 'CODPARCMATRIZ', name: 'MATRIZ', cache: 'detailOptions', names: state.matrizNames, showCode: true },

    gerente: { label: 'Gerente', plural: 'gerentes', empty: 'Todos os gerentes', code: 'CODGER', name: 'GERENTE', cache: 'options', names: state.names },
    vendedor: { label: 'Vendedor', plural: 'vendedores', empty: 'Todos os vendedores', code: 'CODVEND', name: 'VENDEDOR', cache: 'vendedorOptions', names: state.vendedorNames },
    perfil: { label: 'Perfil', plural: 'perfis', empty: 'Todos os perfis', code: 'CODTIPPARC', name: 'PERFIL', cache: 'perfilOptions', names: state.perfilNames },
    marca: { label: 'Marca', plural: 'marcas', empty: 'Todas as marcas', code: 'CODMARCA', name: 'MARCA', cache: 'marcaOptions', names: state.marcaNames },
    grupo: { label: 'Grupo de Produto', plural: 'grupos de produto', empty: 'Todos os grupos', code: 'CODGRUPOPROD', name: 'GRUPOPROD', cache: 'grupoOptions', names: state.grupoNames }
  };
  var active = 'gerente';
  var pending = [];
  var options = { gerente: [], vendedor: [], perfil: [], marca: [], grupo: [], top: [], parceiro: [], produto: [], matriz: [] };
  var requests = {};
  var ui;

  function codes(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(String)
      .filter(function (v) { return /^\d+$/.test(v) && Number.isSafeInteger(Number(v)); })
      .map(function (v) { return String(Number(v)); })));
  }

  function sql() {
    var selected = codes(state.gerente);
    var brands = codes(state.marca);
    var groups = codes(state.grupo);
    // Semijoin: não acrescenta linhas à granularidade original de AMV.
    var where = selected.length ? ' AND EXISTS (SELECT 1 FROM TGFVEN BV_VEN' +
      ' INNER JOIN TGFVEN BV_GER ON BV_GER.CODVEND = BV_VEN.CODGER' +
      ' WHERE BV_VEN.CODVEND = PAR.CODVEND' +
      ' AND BV_GER.CODVEND IN (' + selected.join(',') + '))' : '';
    // AMV já identifica o produto do item. Não relacionar todos os itens da nota.
    var sellers = codes(state.vendedor);
    var profiles = codes(state.perfil);
    if (sellers.length) where += ' AND EXISTS (SELECT 1 FROM TGFVEN BV_SELLER' +
      ' WHERE BV_SELLER.CODVEND = PAR.CODVEND AND BV_SELLER.CODVEND IN (' + sellers.join(',') + '))';
    if (profiles.length) where += ' AND PAR.CODTIPPARC IN (' + profiles.join(',') + ')';
    if (brands.length) where += ' AND EXISTS (SELECT 1 FROM TGFPRO BV_PRO' +
      ' INNER JOIN TGFGRU BV_GRU ON BV_GRU.CODGRUPOPROD = TRUNC(BV_PRO.CODGRUPOPROD / 10000) * 10000' +
      ' WHERE BV_PRO.CODPROD = AMV.CODPROD' +
      ' AND BV_GRU.CODGRUPOPROD IN (' + brands.join(',') + '))';
    if (groups.length) where += ' AND EXISTS (SELECT 1 FROM TGFPRO BV_GROUP_PRO' +
      ' WHERE BV_GROUP_PRO.CODPROD = AMV.CODPROD' +
      ' AND BV_GROUP_PRO.CODGRUPOPROD IN (' + groups.join(',') + '))';
    [['top', 'AMV.OPER'], ['parceiro', 'PAR.CODPARC'], ['produto', 'AMV.CODPROD'],
      ['matriz', 'COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC)']].forEach(function (entry) {
      var ids = codes(state[entry[0]]);
      if (ids.length) where += ' AND ' + entry[1] + ' IN (' + ids.join(',') + ')';
    });
    return where;
  }

  function quote(value) { return String(value || '').replace(/'/g, "''"); }
  function date(value) {
    var text = String(value || '').trim().split(/[ T]/)[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.split('-').reverse().join('/') : text;
  }

  function optionsQuery(key) {
    key = key || 'gerente';
    var a = {};
    var args = host.dashboardArgs || {};
    var params = new URLSearchParams(global.location.search || '');
    ['P_NEG', 'P_PERIODO_INI', 'P_PERIODO_FIM', 'P_PERIODO_R_INI', 'P_PERIODO_R_FIM',
      'UF', 'REGIAO', 'CANAL', 'CODPARC', 'P_CODPARC', 'CODPARCMATRIZ'].forEach(function (key) {
      a[key] = global.BV && global.BV.utils ? global.BV.utils.arg(key, '') : (args[key] || params.get(key) || '');
    });
    if (context === 'region') a.REGIAO = global.obterRegiaoSelecionada();
    if (context === 'channel') a.CANAL = global.obterCanalSelecionado();
    var types = String(a.P_NEG || global.P_NEG || 'V').match(/[VBDFCS]/g) || ['V'];
    var movements = {
      V: "(AMV.TPMOV = 'V' AND AMV.OPER NOT IN (1124,1151,2071))",
      B: "(AMV.TPMOV = 'V' AND AMV.OPER IN (1124,1151,2071))",
      D: "AMV.TPMOV = 'D'", F: "AMV.TPMOV = 'F'",
      C: "AMV.TPMOV = 'C'", S: "AMV.TPMOV = 'S'"
    };
    // O KPI de vendas também utiliza devoluções e despesas no período atual.
    var sales = types.length === 1 && types[0] === 'V';
    var movement = sales ? "AMV.TPMOV IN ('V','D','F')" :
      '(' + types.map(function (t) { return movements[t]; }).join(' OR ') + ')';
    var current = "AMV.DTNF BETWEEN '" + quote(date(a.P_PERIODO_INI)) + "' AND '" + quote(date(a.P_PERIODO_FIM)) + "'";
    var previous = "AMV.DTNF BETWEEN '" + quote(date(a.P_PERIODO_R_INI)) + "' AND '" + quote(date(a.P_PERIODO_R_FIM)) + "'";
    var where = ' WHERE (' + current + ' OR ' + previous + ') AND (' + movement + ')';
    if (context !== 'overview' && a.UF && !/^todos os estados$/i.test(a.UF)) where += " AND UFS.UF = '" + quote(a.UF) + "'";
    if (['region', 'products-region'].includes(context) && a.REGIAO && !/^todas as regi[õo]es$/i.test(a.REGIAO)) {
      where += " AND REPLACE(REG.NOMEREG, '<SEM REGIAO>', 'OUTROS') = '" + quote(a.REGIAO) + "'";
    }
    if (['channel', 'products-channel'].includes(context) && a.CANAL) where += " AND TPP_PAI.DESCRTIPPARC = '" + quote(a.CANAL) + "'";
    var partner = String(a.CODPARC || a.P_CODPARC || a.CODPARCMATRIZ || '');
    if (/^products-/.test(context) && /^\d+$/.test(partner)) {
      where += ' AND COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) = ' +
        '(SELECT COALESCE(PAR2.CODPARCMATRIZ, PAR2.CODPARC) FROM TGFPAR PAR2 WHERE PAR2.CODPARC = ' + partner + ')';
    }
    var details = ['top', 'parceiro', 'produto', 'matriz'].includes(key);
    return (details ? 'SELECT DISTINCT AMV.OPER, AMV.DESCOPER, PAR.CODPARC AS CODCLI, PAR.NOMEPARC AS NOMECLI,' +
      ' AMV.CODPROD, BV_DETAIL_PRO.DESCRPROD AS DESCPROD,' +
      ' COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) AS CODPARCMATRIZ, BV_MATRIX.NOMEPARC AS MATRIZ' :
      key === 'grupo' ? 'SELECT DISTINCT PRO.CODGRUPOPROD AS CODGRUPOPROD, GRU.DESCRGRUPOPROD AS GRUPOPROD' :
      key === 'vendedor' ? 'SELECT DISTINCT VEN.CODVEND AS CODVEND, VEN.APELIDO AS VENDEDOR' :
      key === 'perfil' ? 'SELECT DISTINCT PAR.CODTIPPARC AS CODTIPPARC, TPP.DESCRTIPPARC AS PERFIL' :
      key === 'marca' ? 'SELECT DISTINCT GRU.CODGRUPOPROD AS CODMARCA, GRU.DESCRGRUPOPROD AS MARCA' :
      'SELECT DISTINCT GER.CODVEND AS CODGER, GER.APELIDO AS GERENTE') +
      ' FROM AD_MARGEM_VENDA AMV' +
      ' INNER JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA' +
      ' INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC' +
      (details ? ' LEFT JOIN TGFPRO BV_DETAIL_PRO ON BV_DETAIL_PRO.CODPROD = AMV.CODPROD' +
        ' LEFT JOIN TGFPAR BV_MATRIX ON BV_MATRIX.CODPARC = COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC)' :
        key === 'grupo' ? ' INNER JOIN TGFPRO PRO ON PRO.CODPROD = AMV.CODPROD' +
        ' LEFT JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD' :
        key === 'marca' ? ' INNER JOIN TGFPRO PRO ON PRO.CODPROD = AMV.CODPROD' +
        ' INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = TRUNC(PRO.CODGRUPOPROD / 10000) * 10000' :
        key === 'perfil' ? '' :
        key === 'vendedor' ? ' LEFT JOIN TGFVEN VEN ON VEN.CODVEND = PAR.CODVEND' :
        ' INNER JOIN TGFVEN VEN ON VEN.CODVEND = PAR.CODVEND' +
        ' INNER JOIN TGFVEN GER ON GER.CODVEND = VEN.CODGER') +
      ' LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID' +
      ' LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF' +
      ' LEFT JOIN TSIREG REG ON REG.CODREG = PAR.CODREG' +
      ' LEFT JOIN TGFTPP TPP ON TPP.CODTIPPARC = PAR.CODTIPPARC' +
      ' LEFT JOIN TGFTPP TPP_PAI ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI' +
      where + (key === 'grupo' ? ' AND PRO.CODGRUPOPROD IS NOT NULL' : '') +
      (details ? '' : key === 'perfil' ? ' AND PAR.CODTIPPARC IS NOT NULL ORDER BY TPP.DESCRTIPPARC' :
        key === 'vendedor' ? ' AND VEN.CODVEND IS NOT NULL ORDER BY VEN.APELIDO' :
        key === 'gerente' ? ' ORDER BY GER.APELIDO' : ' ORDER BY GRU.DESCRGRUPOPROD');
  }

  function normalize(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }

  function summary(key) {
    var field = fields[key];
    var selected = codes(state[key]);
    var names = selected.map(function (id) {
      var option = options[key].find(function (item) { return item.id === id; });
      return option ? option.name : (field.names[id] || 'Código ' + id);
    });
    ui.fields[key].trigger.textContent = names.length ? names.join(', ') : field.empty;
    ui.fields[key].trigger.title = ui.fields[key].trigger.textContent;
  }

  function renderOptions() {
    var search = normalize(ui.search.value);
    ui.list.replaceChildren();
    options[active].filter(function (item) { return normalize(item.name).includes(search); }).forEach(function (item) {
      var label = document.createElement('label');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.id;
      checkbox.checked = pending.includes(item.id);
      checkbox.addEventListener('change', function () {
        pending = pending.filter(function (id) { return id !== item.id; });
        if (checkbox.checked) pending.push(item.id);
        ui.count.textContent = pending.length + ' selecionado(s)';
      });
      label.append(checkbox, document.createTextNode(item.name));
      ui.list.append(label);
    });
    if (!ui.list.children.length) ui.list.textContent = 'Nenhuma opção encontrada.';
    ui.count.textContent = pending.length + ' selecionado(s)';
  }

  function open(key) {
    active = key;
    pending = codes(state[key]);
    ui.title.textContent = 'Selecionar ' + fields[key].plural;
    ui.searchLabel.textContent = 'Pesquisar ' + fields[key].label.toLocaleLowerCase('pt-BR') +
      (fields[key].showCode ? ' por código ou descrição' : ' pelo nome');
    ui.search.value = '';
    renderOptions();
    ui.dialog.showModal();
    ui.fields[key].trigger.setAttribute('aria-expanded', 'true');
    ui.search.focus();
  }

  function close() {
    ui.dialog.close();
    ui.fields[active].trigger.setAttribute('aria-expanded', 'false');
    ui.fields[active].trigger.focus();
  }

  function apply() {
    var next = codes(pending);
    var changed = next.slice().sort().join(',') !== codes(state[active]).sort().join(',');
    state[active] = next;
    summary(active);
    close();
    // Reutiliza a carga completa do nível e descarta callbacks do conjunto anterior.
    if (changed) global.location.reload();
  }

  function loadOptions(key) {
    var field = fields[key];
    var controls = ui.fields[key];
    var query = optionsQuery(key);
    controls.trigger.disabled = true;
    controls.status.textContent = 'Carregando ' + field.plural + '…';
    function loaded(rows) {
      var distinct = new Map();
      rows.forEach(function (r) {
        var ids = codes([r[field.code]]);
        if (ids.length) {
          var name = String(r[field.name] || 'Código ' + ids[0]);
          if (field.showCode) name = ids[0] + ' - ' + name;
          distinct.set(ids[0], { id: ids[0], name: name });
          field.names[ids[0]] = name;
        }
      });
      options[key] = Array.from(distinct.values());
      state[field.cache] = { query: query, rows: rows };
      controls.status.textContent = '';
      controls.trigger.disabled = false;
      summary(key);
    }
    function failed() {
      controls.status.textContent = 'Falha ao carregar ' + field.plural + '.';
      controls.retry.hidden = false;
    }
    controls.retry.hidden = true;
    if (state[field.cache] && state[field.cache].query === query) return loaded(state[field.cache].rows);
    if (requests[query]) { requests[query].push({ loaded: loaded, failed: failed }); return; }
    requests[query] = [{ loaded: loaded, failed: failed }];
    function finish(rows) {
      var waiting = requests[query];
      delete requests[query];
      waiting.forEach(function (item) { if (rows) item.loaded(rows); else item.failed(); });
    }
    try {
      global.executeQuery(query, [], function (value) {
        var rows;
        try { rows = JSON.parse(value); if (!Array.isArray(rows)) throw Error('Invalid rows'); }
        catch (e) { finish(null); return; }
        finish(rows);
      }, function () { finish(null); });
    } catch (e) { if (requests[query]) finish(null); }

  }

  function mount() {
    var header = document.querySelector('.header.header-centered');
    if (!header) return;
    var toggle = document.createElement('button');
    toggle.id = 'bv-filter-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', 'bv-filter-panel');
    toggle.innerHTML = '<span aria-hidden="true" class="bv-hamburger"><i></i><i></i><i></i></span>';
    header.append(toggle);
    var backdrop = document.createElement('div');
    backdrop.className = 'bv-filter-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    var sidebar = document.createElement('aside');
    sidebar.id = 'bv-filter-panel';
    sidebar.className = 'bv-filters';
    sidebar.setAttribute('aria-label', 'Filtros');
    var sidebarHtml = '<div id="bv-filter-fields"><h2>Filtros</h2><label id="bv-gerente-label">Gerente</label>' +
      '<button type="button" id="bv-gerente" aria-labelledby="bv-gerente-label bv-gerente" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todos os gerentes</button>' +
      '<p role="status" id="bv-filter-status"></p><button type="button" id="bv-filter-retry" hidden>Tentar novamente</button>' +
      '<label id="bv-vendedor-label">Vendedor</label><button type="button" id="bv-vendedor" aria-labelledby="bv-vendedor-label bv-vendedor" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todos os vendedores</button>' +
      '<p role="status" id="bv-vendedor-status"></p><button type="button" id="bv-vendedor-retry" hidden>Tentar novamente</button>' +
      '<label id="bv-perfil-label">Perfil</label><button type="button" id="bv-perfil" aria-labelledby="bv-perfil-label bv-perfil" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todos os perfis</button>' +
      '<p role="status" id="bv-perfil-status"></p><button type="button" id="bv-perfil-retry" hidden>Tentar novamente</button>' +
      '<label id="bv-marca-label">Marca</label><button type="button" id="bv-marca" aria-labelledby="bv-marca-label bv-marca" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todas as marcas</button>' +
      '<p role="status" id="bv-marca-status"></p><button type="button" id="bv-marca-retry" hidden>Tentar novamente</button>' +
      '<label id="bv-grupo-label">Grupo de Produto</label><button type="button" id="bv-grupo" aria-labelledby="bv-grupo-label bv-grupo" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todos os grupos</button>' +
      '<p role="status" id="bv-grupo-status"></p><button type="button" id="bv-grupo-retry" hidden>Tentar novamente</button></div>';
    var extraFields = '';
    extraFields += '<label id="bv-top-label">TOP</label><button type="button" id="bv-top" aria-labelledby="bv-top-label bv-top" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todas as TOPs</button>' +
      '<p role="status" id="bv-top-status"></p><button type="button" id="bv-top-retry" hidden>Tentar novamente</button>';
    extraFields += '<label id="bv-parceiro-label">Parceiro/Filial</label><button type="button" id="bv-parceiro" aria-labelledby="bv-parceiro-label bv-parceiro" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todos os parceiros/filiais</button>' +
      '<p role="status" id="bv-parceiro-status"></p><button type="button" id="bv-parceiro-retry" hidden>Tentar novamente</button>';
    extraFields += '<label id="bv-produto-label">Produto</label><button type="button" id="bv-produto" aria-labelledby="bv-produto-label bv-produto" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todos os produtos</button>' +
      '<p role="status" id="bv-produto-status"></p><button type="button" id="bv-produto-retry" hidden>Tentar novamente</button>';
    extraFields += '<label id="bv-matriz-label">Matriz</label><button type="button" id="bv-matriz" aria-labelledby="bv-matriz-label bv-matriz" aria-haspopup="dialog" aria-controls="bv-filter-dialog" aria-expanded="false">Todas as matrizes</button>' +
      '<p role="status" id="bv-matriz-status"></p><button type="button" id="bv-matriz-retry" hidden>Tentar novamente</button>';
    sidebar.innerHTML = sidebarHtml.replace('</div>', extraFields + '</div>');
    document.body.append(backdrop, sidebar);
    var dialog = document.createElement('dialog');
    dialog.id = 'bv-filter-dialog';
    dialog.className = 'bv-filter-dialog';
    dialog.setAttribute('aria-labelledby', 'bv-filter-title');
    dialog.innerHTML = '<h2 id="bv-filter-title">Selecionar gerentes</h2>' +
      '<label id="bv-filter-search-label" for="bv-filter-search">Pesquisar gerente pelo nome</label>' +
      '<input type="search" id="bv-filter-search" autocomplete="off">' +
      '<p id="bv-filter-count" role="status"></p><div class="bv-filter-options" id="bv-filter-options"></div>' +
      '<div class="bv-filter-actions"><button type="button" id="bv-filter-clear">Limpar seleção</button>' +
      '<button type="button" id="bv-filter-cancel">Cancelar</button><button type="button" id="bv-filter-apply">Aplicar</button></div>';
    document.body.append(dialog);
    function get(id) { return document.getElementById(id); }
    ui = { fields: {
      gerente: { trigger: get('bv-gerente'), status: get('bv-filter-status'), retry: get('bv-filter-retry') },
      vendedor: { trigger: get('bv-vendedor'), status: get('bv-vendedor-status'), retry: get('bv-vendedor-retry') },
      perfil: { trigger: get('bv-perfil'), status: get('bv-perfil-status'), retry: get('bv-perfil-retry') },
      top: { trigger: get('bv-top'), status: get('bv-top-status'), retry: get('bv-top-retry') },
      parceiro: { trigger: get('bv-parceiro'), status: get('bv-parceiro-status'), retry: get('bv-parceiro-retry') },
      produto: { trigger: get('bv-produto'), status: get('bv-produto-status'), retry: get('bv-produto-retry') },
      matriz: { trigger: get('bv-matriz'), status: get('bv-matriz-status'), retry: get('bv-matriz-retry') },
      marca: { trigger: get('bv-marca'), status: get('bv-marca-status'), retry: get('bv-marca-retry') },
      grupo: { trigger: get('bv-grupo'), status: get('bv-grupo-status'), retry: get('bv-grupo-retry') }
    }, title: get('bv-filter-title'), searchLabel: get('bv-filter-search-label'),
      dialog: dialog, search: get('bv-filter-search'), count: get('bv-filter-count'), list: get('bv-filter-options') };
    ['gerente', 'vendedor', 'perfil', 'marca', 'grupo', 'top', 'parceiro', 'produto', 'matriz'].forEach(function (key) {
      ui.fields[key].trigger.addEventListener('click', function () { open(key); });
      ui.fields[key].retry.addEventListener('click', function () { loadOptions(key); });
      summary(key);
      loadOptions(key);
    });
    ui.search.addEventListener('input', renderOptions);
    get('bv-filter-clear').addEventListener('click', function () { pending = []; renderOptions(); });
    get('bv-filter-cancel').addEventListener('click', close);
    get('bv-filter-apply').addEventListener('click', apply);
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    function setPanelOpen(value) {
      state.panelOpen = !!value;
      sidebar.className = 'bv-filters' + (state.panelOpen ? ' is-open' : '');
      backdrop.className = 'bv-filter-backdrop' + (state.panelOpen ? ' is-open' : '');
      sidebar.inert = !state.panelOpen;
      sidebar.setAttribute('aria-hidden', String(!state.panelOpen));
      toggle.title = state.panelOpen ? 'Fechar filtros' : 'Abrir filtros';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-expanded', String(state.panelOpen));
    }
    toggle.addEventListener('click', function () { setPanelOpen(!state.panelOpen); });
    backdrop.addEventListener('click', function () { setPanelOpen(false); toggle.focus(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.panelOpen && !ui.dialog.open) {
        setPanelOpen(false);
        toggle.focus();
      }
    });
    setPanelOpen(state.panelOpen);
  }

  global.Dashboard = global.Dashboard || {};
  global.Dashboard.filters = { sql: sql, optionsQuery: optionsQuery };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})(window);
