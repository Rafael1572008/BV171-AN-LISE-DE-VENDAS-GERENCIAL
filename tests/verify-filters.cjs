const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const filterSource = fs.readFileSync('lib/dashboard-filters.js', 'utf8');
const args = {P_NEG:"'V'",P_PERIODO_INI:'01/01/2026',P_PERIODO_FIM:'31/01/2026',
  P_PERIODO_R_INI:'01/01/2025',P_PERIODO_R_FIM:'31/01/2025',UF:'SP',REGIAO:'CENTRO',CANAL:'Varejo',CODPARC:'10'};
const quiet = {log(){},warn(){},error(){}};
function environment(contextName = 'overview') {
  const context = {console:quiet, URLSearchParams, top:{dashboardArgs:{...args}},
    location:{search:'',reload(){}}, document:{readyState:'loading',addEventListener(){},currentScript:{getAttribute:()=>contextName}},
    Dashboard:{}, Chart:{register(){}}, ChartDataLabels:{}};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(filterSource, context);
  vm.runInContext(fs.readFileSync('lib/sales-kpis.js','utf8'), context);
  return context;
}
const queries = [];
const runtimes = {};
const optionQueries = [];
for (const dir of ['js','js2','js3','js6','js4','js5','js7']) {
  const contextName = {js:'overview',js2:'state',js3:'region',js6:'channel',js4:'products-region',js5:'products-state',js7:'products-channel'}[dir];
  const c = environment(contextName);
  const modern = ['js4','js5','js7'].includes(dir);
  if (modern) {
    c.BV={utils:{args,params:new URLSearchParams(),arg:(k,f)=>args[k]??f,sql:s=>String(s).replace(/'/g,"''")}};
    vm.runInContext(fs.readFileSync(`${dir}/queries.js`,'utf8'),c);
  } else {
    if(dir === 'js') {
      for (const key of Object.keys(args).filter(k=>k.startsWith('P_PERIODO'))) {
        c.top.dashboardArgs[key] = args[key].split('/').reverse().join('-');
      }
      c.P_NEG="'V'";
    }
    vm.runInContext(fs.readFileSync(`${dir}/main.js`,'utf8'),c);
  }
  const builders = modern ? ['qKpi','qProducts'] : Object.keys(c).filter(k=>k.startsWith('montarQuery'));
  runtimes[dir]={c,modern};
  for (const selected of [[],['1'],['2'],['1','2'],['99']]) for (const brands of [[],['10000'],['20000'],['10000','20000'],['990000']]) for (const groups of [[],['11001'],['11002'],['11001','21001'],['990001']]) {
    c.top.BV171_FILTERS.gerente = selected;
    c.top.BV171_FILTERS.marca = brands;
    c.top.BV171_FILTERS.grupo = groups;
    for (const [sellers,profiles] of [[[],[]],[['101'],[]],[[],['2']],[['101','102'],['2','3']],[['102'],['2']],[['101'],['3']],[['99'],['99']]]) {
    c.top.BV171_FILTERS.vendedor = sellers;
    c.top.BV171_FILTERS.perfil = profiles;
    for (const name of builders) {
      const sql = modern ? c.BV.queries[name]() : c[name]();
      const scans = (sql.match(/FROM AD_MARGEM_VENDA AMV/g)||[]).length;
      const predicates = (sql.match(/BV_GER.CODVEND IN/g)||[]).length;
      assert.equal(predicates, selected.length ? scans : 0,`${dir}/${name}: todas as bases devem ser filtradas`);
      assert.equal((sql.match(/BV_GRU.CODGRUPOPROD IN/g)||[]).length, brands.length ? scans : 0);
      if(brands.length) assert(sql.includes('BV_PRO.CODPROD = AMV.CODPROD'));
      assert.equal((sql.match(/BV_GROUP_PRO.CODGRUPOPROD IN/g)||[]).length, groups.length ? scans : 0);
      if(groups.length) assert(sql.includes('BV_GROUP_PRO.CODPROD = AMV.CODPROD'));
      assert.equal((sql.match(/BV_SELLER.CODVEND IN/g)||[]).length, sellers.length ? scans : 0);
      assert.equal((sql.match(/PAR.CODTIPPARC IN/g)||[]).length, profiles.length ? scans : 0);
      assert(!sql.includes('CAB.CODVEND'));
      queries.push({file:dir,name,selected,brands,groups,sellers,profiles,sql});
    }
  }
  }
  if(dir === 'js') {
    c.top.BV171_FILTERS.gerente = ['1','2) OR 1=1','NaN','1','999999999999999999999999'];
    assert(c.Dashboard.filters.sql().includes('IN (1)'));
  }
  for(const key of ['gerente','vendedor','perfil','marca','grupo','top','parceiro','produto','matriz']) optionQueries.push({file:dir,key,sql:c.Dashboard.filters.optionsQuery(key)});
}

// Exercise each new field alone, multiple values, no matches, and all nine together.
const detailCases = [
  {top:['1000']}, {top:['1000','1101']}, {top:['99']},
  {parceiro:['10']}, {parceiro:['10','11']}, {parceiro:['99']},
  {produto:['1']}, {produto:['1','4']}, {produto:['99']},
  {matriz:['10']}, {matriz:['10','12']}, {matriz:['99']},
  {top:['1000'],parceiro:['10','11'],produto:['1','4'],matriz:['10']}
];
const baseline=queries.slice();
for(const q of baseline.filter((q,i)=>i%113===0)) {
  for(const values of detailCases) {
    const terms={top:'AMV.OPER',parceiro:'PAR.CODPARC',produto:'AMV.CODPROD',matriz:'COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC)'};
    const extra=Object.entries(values).map(([k,ids])=>' AND '+terms[k]+' IN ('+ids.join(',')+')').join('');
    // Generate with the actual central predicate in the same runtime used by builders.
    const e=environment();Object.assign(e.top.BV171_FILTERS,values);
    assert.equal(e.Dashboard.filters.sql(),extra);
    const {c,modern}=runtimes[q.file];
    Object.assign(c.top.BV171_FILTERS,{gerente:q.selected,marca:q.brands,grupo:q.groups,vendedor:q.sellers,perfil:q.profiles,top:[],parceiro:[],produto:[],matriz:[]},values);
    const sql=modern ? c.BV.queries[q.name]() : c[q.name]();
    queries.push({...q,...values,sql});
  }
}
// DOM mínimo para testar transições de estado e eventos, sem simular renderização visual.
function dom() {
  const ids = {};
  class Element {
    constructor(tag) { this.tag=tag; this.children=[]; this.events={}; this.value=''; this.attributes={}; }
    set id(v) { this._id=v;ids[v]=this; } get id(){return this._id;}
    set innerHTML(html) {
      this.children=[];
      for(const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
        const e=new Element(m[1]);e.id=m[2];this.children.push(e);
      }
    }
    setAttribute(k,v){this.attributes[k]=v;}
    append(...nodes){this.children.push(...nodes);}
    before(){}
    replaceChildren(){this.children=[];this.textContent='';}
    addEventListener(k,v){this.events[k]=v;}
    fire(k,event={}){if(this.events[k]) this.events[k]({preventDefault(){},...event});}
    focus(){this.focused=true;}
    showModal(){this.open=true;}
    close(){this.open=false;}
  }
  const header=new Element('div');
  const events={};
  return {ids,header,events,ready:()=>events.DOMContentLoaded(), document:{readyState:'loading',body:new Element('body'),
    addEventListener:(k,v)=>{events[k]=v;},createElement:t=>new Element(t),
    createTextNode:text=>({textContent:text}),getElementById:id=>ids[id],querySelector:s=>s==='.header.header-centered'?header:null}};
}
const host={dashboardArgs:{...args}};
let requests=0,reloads=0;
function page(fail=false, defer=false) {
  const callbacks=[];
  const d=dom();
  d.document.currentScript={getAttribute:()=> 'state'};
  const c={console:quiet,URLSearchParams,Event:class {constructor(type){this.type=type;}},dispatchEvent(){},top:host,document:d.document,location:{reload(){reloads++;}},
    executeQuery(sql,params,ok,error){requests++; if(fail) return error('erro');
      const deliver=()=>ok(JSON.stringify(sql.includes('AS CODCLI') ? [{OPER:1000,DESCOPER:'Venda',CODCLI:10,NOMECLI:'Mesmo nome',CODPROD:1,DESCPROD:'Produto A',CODPARCMATRIZ:10,MATRIZ:'Matriz'}, {OPER:1101,DESCOPER:'Venda especial',CODCLI:11,NOMECLI:'Mesmo nome',CODPROD:2,DESCPROD:'Produto B',CODPARCMATRIZ:10,MATRIZ:'Matriz'}] :
        sql.includes('AS VENDEDOR') ? [{CODVEND:101,VENDEDOR:'Jos? vendedor'},{CODVEND:102,VENDEDOR:'Ana vendedora'}] :
        sql.includes('AS PERFIL') ? [{CODTIPPARC:2,PERFIL:'Loja'},{CODTIPPARC:3,PERFIL:'Atacado'}] :
        sql.includes('AS GRUPOPROD') ? [{CODGRUPOPROD:11001,GRUPOPROD:'Água mineral'},{CODGRUPOPROD:11002,GRUPOPROD:'Água com gás'}] :
        sql.includes('AS CODMARCA') ? [{CODMARCA:10000,MARCA:'Água'},{CODMARCA:20000,MARCA:'Suco'}] :
        [{CODGER:1,GERENTE:'José'},{CODGER:2,GERENTE:'Ana'},{CODGER:1,GERENTE:'José'}]));
      if(defer) callbacks.push(deliver); else deliver();}};
  c.window=c;vm.createContext(c);vm.runInContext(filterSource,c);d.ready();return {c,d,flush:()=>callbacks.forEach(fn=>fn())};
}
let {c,d}=page();
const click=id=>d.ids[id].fire('click');
const toggle=(id,checked)=>{
  const e=d.ids['bv-filter-options'].children.find(e=>e.children[0].value===id).children[0];
  e.checked=checked;e.fire('change');
};
assert.equal(requests,6);
assert.equal(d.header.children[0].id,'bv-filter-toggle');
assert.equal(d.ids['bv-filter-toggle'].attributes['aria-expanded'],'false');
assert(d.ids['bv-filter-panel'].inert);
click('bv-filter-toggle');assert(host.BV171_FILTERS.panelOpen);
assert(!d.ids['bv-filter-panel'].inert);
assert(!d.ids['bv-gerente'].disabled);
click('bv-gerente');
assert.equal(d.ids['bv-filter-options'].children.length,2);
toggle('1',true);
d.ids['bv-filter-search'].value='ana';d.ids['bv-filter-search'].fire('input');
assert.equal(d.ids['bv-filter-options'].children.length,1);
toggle('2',true);
assert.equal(requests,6,'pesquisa local');
click('bv-filter-cancel');assert.equal(host.BV171_FILTERS.gerente.length,0);
click('bv-gerente');toggle('1',true);toggle('2',true);click('bv-filter-apply');
assert.equal(host.BV171_FILTERS.gerente.join(','),'1,2');assert.equal(reloads,1);
assert.equal(d.ids['bv-gerente'].textContent,'José, Ana');
click('bv-gerente');click('bv-filter-clear');click('bv-filter-cancel');
assert.equal(host.BV171_FILTERS.gerente.join(','),'1,2');
click('bv-gerente');toggle('1',false);d.ids['bv-filter-dialog'].fire('cancel');
assert.equal(host.BV171_FILTERS.gerente.join(','),'1,2','Escape cancela');
click('bv-gerente');
d.ids['bv-filter-search'].value='jose';d.ids['bv-filter-search'].fire('input');
assert.equal(d.ids['bv-filter-options'].children.length,1,'pesquisa sem acento');
assert(d.ids['bv-filter-options'].children[0].children[0].checked);
click('bv-filter-clear');click('bv-filter-apply');
assert.equal(host.BV171_FILTERS.gerente.length,0);assert.equal(reloads,2);
click('bv-gerente');click('bv-filter-apply');assert.equal(reloads,2,'não recarrega sem alteração');
// O mesmo dialog atende Marca; o estado de Gerente não é sobrescrito.
click('bv-gerente');toggle('1',true);click('bv-filter-apply');
click('bv-marca');assert.equal(d.ids['bv-filter-title'].textContent,'Selecionar marcas');
toggle('10000',true);
d.ids['bv-filter-search'].value='suco';d.ids['bv-filter-search'].fire('input');toggle('20000',true);
click('bv-filter-cancel');assert.equal(host.BV171_FILTERS.marca.length,0);
click('bv-marca');toggle('10000',true);toggle('20000',true);click('bv-filter-apply');
assert.equal(host.BV171_FILTERS.marca.join(','),'10000,20000');
assert.equal(host.BV171_FILTERS.gerente.join(','),'1');
assert(c.Dashboard.filters.sql().includes('BV_GER.CODVEND IN (1)'));
assert(c.Dashboard.filters.sql().includes('BV_GRU.CODGRUPOPROD IN (10000,20000)'));
click('bv-grupo');assert.equal(d.ids['bv-filter-title'].textContent,'Selecionar grupos de produto');
toggle('11001',true);d.ids['bv-filter-search'].value='gas';d.ids['bv-filter-search'].fire('input');
toggle('11002',true);click('bv-filter-cancel');assert.equal(host.BV171_FILTERS.grupo.length,0);
click('bv-grupo');toggle('11001',true);toggle('11002',true);click('bv-filter-apply');
assert.equal(host.BV171_FILTERS.grupo.join(','),'11001,11002');
assert(c.Dashboard.filters.sql().includes('BV_GROUP_PRO.CODGRUPOPROD IN (11001,11002)'));
click('bv-filter-toggle');assert(!host.BV171_FILTERS.panelOpen);
assert(d.ids['bv-filter-panel'].inert);assert.equal(d.ids['bv-filter-toggle'].attributes['aria-expanded'],'false');
({c,d}=page());assert(!host.BV171_FILTERS.panelOpen);
assert.equal(requests,6,'cache entre cargas do mesmo contexto');
click('bv-filter-toggle');assert(host.BV171_FILTERS.panelOpen);
// Cliques no modal não fecham a aba; Escape do modal cancela apenas o rascunho.
click('bv-grupo');toggle('11001',false);d.ids['bv-filter-dialog'].fire('cancel');
assert(host.BV171_FILTERS.panelOpen);assert.equal(host.BV171_FILTERS.grupo.join(','),'11001,11002');
d.document.body.children[0].fire('click');assert(!host.BV171_FILTERS.panelOpen);
click('bv-filter-toggle');d.events.keydown({key:'Escape'});assert(!host.BV171_FILTERS.panelOpen);
assert.equal(host.BV171_FILTERS.grupo.join(','),'11001,11002');
click('bv-filter-toggle');
assert.equal(host.BV171_FILTERS.marca.join(','),'10000,20000');
assert.equal(host.BV171_FILTERS.gerente.join(','),'1');
click('bv-marca');click('bv-filter-clear');click('bv-filter-apply');
assert.equal(host.BV171_FILTERS.marca.length,0);assert.equal(host.BV171_FILTERS.gerente.join(','),'1');
click('bv-grupo');click('bv-filter-clear');click('bv-filter-apply');
assert.equal(host.BV171_FILTERS.grupo.length,0);assert.equal(host.BV171_FILTERS.gerente.join(','),'1');
for (const [key,ids,search] of [['vendedor',['101','102'],'ana'],['perfil',['2','3'],'atacado']]) {
  const before=requests;
  click('bv-'+key);toggle(ids[0],true);
  d.ids['bv-filter-search'].value=search;d.ids['bv-filter-search'].fire('input');
  assert.equal(d.ids['bv-filter-options'].children.length,1);
  toggle(ids[1],true);click('bv-filter-cancel');assert.equal(host.BV171_FILTERS[key].length,0);
  click('bv-'+key);toggle(ids[0],true);toggle(ids[1],true);click('bv-filter-apply');
  assert.equal(host.BV171_FILTERS[key].join(','),ids.join(','));
  click('bv-'+key);click('bv-filter-clear');click('bv-filter-cancel');
  assert.equal(host.BV171_FILTERS[key].length,2);
  click('bv-'+key);click('bv-filter-clear');click('bv-filter-apply');
  assert.equal(host.BV171_FILTERS[key].length,0);assert.equal(requests,before);
}
for(const [key,ids,search] of [['top',['1000','1101'],'especial'],['parceiro',['10','11'],'mesmo'],['produto',['1','2'],'produto b'],['matriz',['10'],'matriz']]) {
  const before=requests;
  click('bv-'+key);toggle(ids[0],true);
  d.ids['bv-filter-search'].value=search;d.ids['bv-filter-search'].fire('input');
  assert(d.ids['bv-filter-options'].children.length>0);
  click('bv-filter-cancel');assert.equal(host.BV171_FILTERS[key].length,0);
  click('bv-'+key);ids.forEach(id=>toggle(id,true));click('bv-filter-apply');
  assert.equal(host.BV171_FILTERS[key].join(','),ids.join(','));
  click('bv-filter-toggle');click('bv-filter-toggle');
  click('bv-'+key);d.ids['bv-filter-search'].value=ids[0];d.ids['bv-filter-search'].fire('input');
  if(key!=='parceiro') assert(d.ids['bv-filter-options'].children[0].children[0].checked);
  click('bv-filter-clear');click('bv-filter-apply');
  assert.equal(host.BV171_FILTERS[key].length,0);assert.equal(requests,before);
}
host.dashboardArgs.UF='RJ';
({c,d}=page(true));assert.equal(requests,15);assert(d.ids['bv-gerente'].disabled);assert(d.ids['bv-marca'].disabled);assert(d.ids['bv-grupo'].disabled);
assert.equal(d.ids['bv-filter-retry'].hidden,false);
page();assert.equal(requests,21,'falha não contamina cache');
const q=c.Dashboard.filters.optionsQuery();
assert(q.includes('SELECT DISTINCT GER.CODVEND AS CODGER'));
assert(q.includes("UFS.UF = 'RJ'"));assert(q.includes('2025'));
assert(!q.includes('BV_GER.CODVEND IN'),'opções independem da seleção aplicada');
for(const page of ['index.jsp',...Array.from({length:6},(_,i)=>`index${i+2}.jsp`)]) {
  const source=fs.readFileSync(page,'utf8');
  assert(source.includes('/lib/dashboard-filters.css'));
  assert(source.includes('class="header header-centered"'));
  assert(source.indexOf('/lib/dashboard-filters.js')<source.indexOf('/js'+(page==='index.jsp'?'':page[5])+'/'));
}
host.dashboardArgs.UF='MG';
const beforeAsync=requests;
const asyncPage=page(false,true);
assert.equal(requests-beforeAsync,6,'uma unica consulta pendente para os quatro novos filtros');
asyncPage.flush();
for(const key of ['top','parceiro','produto','matriz']) assert(!asyncPage.d.ids['bv-'+key].disabled);
const css=fs.readFileSync('lib/dashboard-filters.css','utf8');
assert(css.includes('position:fixed; right:0; top:0'));
assert(css.includes('transform:translateX(100%)'));
assert(!css.includes('grid-template-columns:48px'));
assert(!filterSource.includes("global.dispatchEvent(new Event('resize'))"));
if(process.argv.includes('--options')) console.log(JSON.stringify(optionQueries));
else if(process.argv.includes('--queries')) console.log(JSON.stringify(queries));
else console.log(`OK: ${queries.length} consultas geradas; pesquisa, seleção, cancelamento, limpeza, aplicação, cache, falha e navegação.`);
