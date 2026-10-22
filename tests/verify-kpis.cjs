const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const args = {P_NEG: "'V'", P_PERIODO_INI:'01/01/2026', P_PERIODO_FIM:'31/01/2026', P_PERIODO_R_INI:'01/01/2025', P_PERIODO_R_FIM:'31/01/2025', UF:'SP', REGIAO:'CENTRO', CANAL:'Varejo', CODPARC:'10'};
let rendered = 0;
const context = {console, URLSearchParams, Dashboard:{filters:{sql:()=>''},fmt:{currency:v=>String(v)},renderKPI:()=>{rendered++;}}, top:{dashboardArgs:args}, location:{search:''}};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('lib/sales-kpis.js','utf8'), context);
const K = context.Dashboard.salesKpis;
assert(K.isSales("'V'"));
for (const value of ['D','B','F',"'V','D'",null,'']) assert(!K.isSales(value));
const row = {FAT:1000, KPI_DEVOLUCOES:-100, KPI_ST:-10,KPI_ICMS:-20,KPI_PIS:-5,KPI_COFINS:-15,KPI_CUSTOPROD:-400,KPI_VLRDESCFINITEM:10,KPI_VLRPRZPAGTOITEM:5,KPI_VLFRETEITEM:20,KPI_VLRCOMISSITEM:10,KPI_VLRPROMOTOR:5,KPI_BONIFICACOES:50};
const values = K.calculate(row);
const signedBonus = K.calculate({...row,KPI_BONIFICACOES:-50});
assert.equal(signedBonus[7][1],0); // despesas 50 + bonificação -50
assert.equal(signedBonus[7][2][5][1],-5000); // composição preserva sinal original
assert.equal(signedBonus[8][1],45000);
assert.equal(K.calculate({...row,KPI_BONIFICACOES:-75})[7][1],-2500);
assert(!K.select('FAT').includes('ABS(AMV.VLRTOTITEM)'));
assert.deepStrictEqual(Array.from(values, v=>v[1]), [100000,-15000,-10000,-5000,85000,-40000,45000,10000,35000]);
assert.equal(K.calculate({...row,KPI_CUSTOPROD:100})[6][1],95000); // sem inversão do sinal original
const negativeExpenses = {...row, KPI_VLRDESCFINITEM:-110};
assert.equal(K.calculate(negativeExpenses)[7][1],-2000);
assert.equal(K.calculate(negativeExpenses)[8][1],43000);
assert.equal(K.calculate({...row,KPI_ST:100})[4][1],96000); // sinal positivo preservado
for (const v of values.filter(v=>v[2])) assert.equal(v[1],v[2].reduce((s,p)=>s+p[1],0));
assert(K.calculate({}).every(v=>v[1]===0));
assert.equal(K.representation(-15000,100000).label,'-15,00%');
assert.equal(K.representation(85000,100000).label,'85,00%');
assert.equal(K.representation(150000,100000).label,'150,00%');
assert.equal(K.representation(150000,100000).width,100);
assert.equal(K.representation(-150000,100000).width,100);
assert.equal(K.representation(-150000,100000).negative,true);
assert.equal(K.representation(100,0).label,'—');
assert.equal(K.representation(100,0).width,0);
// O percentual é dos consolidados, não a média simples dos percentuais de cada grupo.
assert.equal(K.representation(20+180,100+300).percent,50);
const queries = [];
for (const file of ['js/main.js','js2/main.js','js3/main.js','js6/main.js']) {
  const source = fs.readFileSync(file,'utf8');
  const start = source.indexOf('function montarQueryKPI()');
  const end = source.indexOf('}',source.indexOf('CROSS JOIN ANTERIOR ANT',start))+1;
  context.P_NEG = "'V'";
  context.FILTRO_NEGOCIO = "((TPMOV = 'V' AND OPER NOT IN (1124, 1151, 2071)))";
  for (const name of ['P_PERIODO_INI','P_PERIODO_FIM','P_PERIODO_R_INI','P_PERIODO_R_FIM']) context[name]=args[name];
  context.obterRegiaoSql=()=> 'CENTRO';context.obterCanalSql=()=> 'Varejo';
  vm.runInContext(source.slice(start,end),context);
  const sql=context.montarQueryKPI();
  assert(sql.includes('A.KPI_DEVOLUCOES'),file);
  assert(sql.includes("AMV.TPMOV IN ('V','D','F')"),file);
  queries.push({file,sql});
  args.P_NEG="'D'";context.P_NEG="'D'";context.FILTRO_NEGOCIO="(TPMOV = 'D')";
  const legacy=context.montarQueryKPI();
  assert(!legacy.includes('KPI_DEVOLUCOES'),file);
  args.P_NEG="'V'";
}
for (const file of ['js4/queries.js','js5/queries.js','js7/queries.js']) {
  context.BV={utils:{args, params:new URLSearchParams(),arg:(k,f)=>args[k]??f, sql:s=>String(s).replace(/'/g,"''")}};
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const sql=context.BV.queries.qKpi();
  assert(sql.includes("AMV.TPMOV IN ('V','D','F')"),file);
  assert(sql.includes('KPI_DEVOLUCOES'),file);
  queries.push({file,sql});
  args.P_NEG='D';
  assert(!context.BV.queries.qKpi().includes('KPI_DEVOLUCOES'),file);
  args.P_NEG="'V'";
}
// DOM mínimo: valida abertura/fechamento e atualização dos detalhes após nova consulta.
function element(tag) {return {tag, children:[],style:{},attrs:{},hidden:false,appendChild(c){this.children.push(c);c.parent=this},remove(){this.parent.children=this.parent.children.filter(c=>c!==this)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this[k==='close'?'closeEvent':k]=fn},showModal(){this.open=true},close(){this.open=false;if(this.closeEvent)this.closeEvent()},getBoundingClientRect(){return {left:10,right:400,top:10,bottom:500}},focus(){this.focused=true}};}
const container=element('div');
const body=element('body');
context.document={body,querySelector:()=>container,createElement:element,getElementById:id=>body.children.find(c=>c.id===id)};
assert(K.render(row));assert.equal(container.children.length,9);
assert.equal(container.className,'kpis sales-kpis');
assert.equal(container.children[0].children.length,3); // Receita Bruta sem barra/percentual adicional
for (let i=1;i<9;i++) {
  const card=container.children[i];
  const share=K.representation(values[i][1],values[0][1]);
  assert.equal(card.children[2].children[0].textContent,share.label);
  assert.equal(card.children[3].children[0].style.width,share.width+'%');
  assert.equal(card.children[3].className.includes('is-negative'),share.negative);
}
assert.equal(rendered,9);
const deductions=container.children[1];
assert.equal(deductions.click,undefined);
assert.equal(deductions.children[0].children[0].tag,'span');
const taxCard=container.children[3];
const modal=body.children[0];
assert.equal(modal.tag,'dialog');
taxCard.click();assert(modal.open);
const componentRows=()=>modal.children[1].children;
const modalTotal=()=>modal.children[2].children[1].children[0];
assert.deepStrictEqual(componentRows().map(c=>[c.children[0].textContent,c.children[1].children[0].textContent]),[['ST','-10'],['ICMS','-20'],['PIS','-5'],['COFINS','-15']]);
assert.equal(componentRows()[0].children[1].children[1].textContent,'20,00% do total');
assert.equal(modalTotal().textContent,'-50');
assert.equal(modal.children[2].children[1].children[1].textContent,'-5,00% da Receita Bruta');
assert.equal(modalTotal().style.color,'var(--negative)');
modal.children[0].children[1].click();assert(!modal.open);
// O evento close também cobre o retorno de foco após Escape nativo.
taxCard.click();modal.close();assert(!modal.open);
assert(taxCard.children[0].children[0].focused);
const expenseCard=container.children[7];
expenseCard.click();assert(modal.open);
assert.equal(body.children.length,1);
assert.equal(modal.children[0].children[0].textContent,'Despesas Variáveis de Vendas');
assert.equal(componentRows().length,6);
assert.equal(componentRows()[2].children[0].textContent,'Frete');
assert.equal(componentRows()[2].children[1].children[0].textContent,'20');
assert.equal(modalTotal().textContent,'100');
assert.equal(modal.children[2].children[1].children[1].textContent,'10,00% da Receita Bruta');
assert.equal(componentRows().reduce((sum,line)=>sum+Number(line.children[1].children[0].textContent),0),100);
modal.click({target:modal,clientX:20,clientY:20});assert(modal.open); // padding interno
modal.click({target:modal,clientX:0,clientY:0});assert(!modal.open); // backdrop
assert(expenseCard.children[0].children[0].focused);
taxCard.click();assert.equal(componentRows().length,4);
assert.equal(modalTotal().textContent,'-50'); // alternância não mantém dados da D.V.V.
assert.equal(container.children.filter(c=>c.click).length,2);
for (let i=0;i<values.length;i++) if(values[i][1]<0) assert.equal(container.children[i].children[1].style.color,'var(--negative)');
K.render({...row,KPI_DEVOLUCOES:-25});
assert.equal(body.children.length,1);
container.children[7].click();
assert.equal(modal.open,false); // instância antiga fechada e removida
assert.equal(body.children[0].children[2].children[1].children[0].textContent,'100');
assert.equal(container.children[2].children[1].textContent,'-25');
assert.equal(container.children.filter(c=>c.children[0].children[0].textContent==='Devoluções').length,1);
assert(!K.render({FAT:100}));
K.render({...row,FAT:0});
assert(container.children.slice(1).every(c=>c.children[2].children[0].textContent==='—'));
assert(container.children.slice(1).every(c=>c.children[3].children[0].style.width==='0%'));
container.children[7].click();
assert.equal(body.children[0].children[2].children[1].children[1].textContent,'— da Receita Bruta');
K.render({...row,KPI_VLRDESCFINITEM:-90}); // total zero com componentes não nulos
container.children[7].click();
assert(body.children[0].children[1].children.every(c=>c.children[1].children[1].textContent==='— do total'));
K.render(negativeExpenses);
container.children[7].click();
assert.equal(body.children[0].children[2].children[1].children[0].textContent,'-20');
assert.equal(body.children[0].children[2].children[1].children[0].style.color,'var(--negative)');
assert.equal(body.children[0].children[2].children[1].children[1].textContent,'-2,00% da Receita Bruta');
K.render({...row,KPI_VLFRETEITEM:45}); // novo resultado filtrado atualiza KPI e modal juntos
container.children[7].click();
assert.equal(body.children[0].children[2].children[1].children[0].textContent,'125');
assert.equal(container.children[7].children[1].textContent,'125');
const css=fs.readFileSync('lib/sales-kpis.css','utf8');
assert(css.includes('repeat(3, minmax(0, 1fr))'));
assert(css.includes('@media (max-width: 900px)'));
assert(css.includes('@media (max-width: 560px)'));
for (const page of ['index.jsp',...Array.from({length:6},(_,i)=>`index${i+2}.jsp`)]) {
  assert(fs.readFileSync(page,'utf8').includes('${BASE_FOLDER}/lib/sales-kpis.css'),page);
}
if (process.argv.includes('--queries')) console.log(JSON.stringify(queries));
else console.log('OK: cálculos, sinais, composição, 7 consultas, outros movimentos e interação.');
