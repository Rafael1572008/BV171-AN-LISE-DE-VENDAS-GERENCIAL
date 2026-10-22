"""Validação local da interface com Edge headless, sem pacotes ou acesso ao ERP."""
import html
import json
import re
import subprocess
import tempfile
from pathlib import Path

edge = Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
if not edge.exists():
    raise SystemExit('Edge não encontrado. A validação visual deve ser executada manualmente.')

page = Path('index.jsp').read_text(encoding='utf-8')
page = re.sub(r'<%@.*?%>', '', page, flags=re.S)
page = re.sub(r'<snk:load\s*/>', '', page)
page = re.sub(r'<script\b.*?</script>', '', page, flags=re.S | re.I)
page = re.sub(r'<link\b[^>]*>', '', page, flags=re.S | re.I)
styles = Path('css/style.css').read_text(encoding='utf-8') + Path('lib/dashboard-filters.css').read_text(encoding='utf-8')
page = page.replace('</head>', '<style>' + styles + '</style></head>')
setup = '''
window.top.dashboardArgs = {P_NEG:"'V'",P_PERIODO_INI:'01/01/2026',P_PERIODO_FIM:'31/01/2026',P_PERIODO_R_INI:'01/01/2025',P_PERIODO_R_FIM:'31/01/2025'};
window.executeQuery = function(sql, params, ok) {
  ok(JSON.stringify(sql.includes('AS CODCLI') ? [{OPER:1000,DESCOPER:'Venda',CODCLI:10,NOMECLI:'Filial',CODPROD:1,DESCPROD:'Produto',CODPARCMATRIZ:10,MATRIZ:'Matriz'}] :
    sql.includes('AS VENDEDOR') ? [{CODVEND:101,VENDEDOR:'Vendedor A'}] :
    sql.includes('AS PERFIL') ? [{CODTIPPARC:2,PERFIL:'Loja'}] :
    sql.includes('AS GRUPOPROD') ? [{CODGRUPOPROD:11001,GRUPOPROD:'Grupo A'},{CODGRUPOPROD:11002,GRUPOPROD:'Grupo B'}] :
    sql.includes('AS CODMARCA') ? [{CODMARCA:10000,MARCA:'Marca A'}] : [{CODGER:1,GERENTE:'Gerente A'}]));
};
'''
checks = '''
document.addEventListener('DOMContentLoaded', async function() {
  const checks = [];
  const assert = (value, name) => { if(!value) throw Error(name); checks.push(name); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 280));
  const rect = node => {const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
  try {
    const toggle = document.getElementById('bv-filter-toggle');
    const panel = document.getElementById('bv-filter-panel');
    const dialog = document.getElementById('bv-filter-dialog');
    const header = document.querySelector('.header.header-centered');
    assert(toggle.parentNode === header, 'botão dentro do header');
    assert(toggle.querySelectorAll('.bv-hamburger i').length === 3, 'ícone com três barras');
    const headerRect=header.getBoundingClientRect(), buttonRect=toggle.getBoundingClientRect();
    assert(Math.abs(headerRect.right-buttonRect.right)<1, 'botão no canto direito');
    const report=document.querySelector('.wrap');
    const card=document.querySelector('.kpis-card');
    const before=rect(report), cardBefore=rect(card);
    toggle.click(); await pause();
    assert(!panel.inert && getComputedStyle(panel).visibility==='visible', 'aba aberta');
    assert(JSON.stringify(rect(report))===JSON.stringify(before), 'relatório sem deslocamento ou redimensionamento');
    assert(JSON.stringify(rect(card))===JSON.stringify(cardBefore), 'indicadores sem deslocamento ou redimensionamento');
    const p=panel.getBoundingClientRect();
    assert(Math.abs(p.right-document.documentElement.clientWidth)<1 && p.left>=0, 'aba sobreposta pela direita dentro da tela');
    assert(document.elementFromPoint(buttonRect.x+22,buttonRect.y+22).closest('#bv-filter-toggle'), 'mesmo botão acessível acima da aba');
    const fields=[...panel.querySelectorAll('button[aria-haspopup="dialog"]')];
    assert(fields.map(x=>x.id).join(',')==='bv-gerente,bv-vendedor,bv-perfil,bv-marca,bv-grupo,bv-top,bv-parceiro,bv-produto,bv-matriz', 'ordem dos três filtros');
    for(const key of ['gerente','vendedor','perfil','marca','grupo','top','parceiro','produto','matriz']) {
      document.getElementById('bv-'+key).click();
      assert(dialog.open && dialog.matches(':modal'), 'modal nativo acima da aba: '+key);
      const r=dialog.getBoundingClientRect();
      assert(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).closest('#bv-filter-dialog'), 'modal recebe interação: '+key);
      document.getElementById('bv-filter-cancel').click();
    }
    const state=window.top.BV171_FILTERS;
    state.gerente=['1']; state.marca=['10000']; state.grupo=['11001'];
    toggle.click(); await pause();
    assert(panel.inert && getComputedStyle(panel).visibility==='hidden', 'mesmo botão fecha aba');
    toggle.click(); await pause();
    document.querySelector('.bv-filter-backdrop').click(); await pause();
    assert(panel.inert, 'clique fora fecha aba');
    assert(state.gerente[0]==='1' && state.marca[0]==='10000' && state.grupo[0]==='11001', 'abrir e fechar preserva seleções');
    assert(document.documentElement.scrollWidth<=innerWidth, 'sem rolagem horizontal introduzida');
    window.browserResult={ok:true,width:innerWidth,checks};
  } catch(e) { window.browserResult={ok:false,error:e.message,checks}; }
  window.parent.postMessage(window.browserResult, '*');
});
'''
scripts = '<script>' + setup + '</script><script data-context="overview">' + Path('lib/dashboard-filters.js').read_text(encoding='utf-8') + '</script><script>' + checks + '</script>'
page = page.replace('</body>', scripts + '</body>')
with tempfile.TemporaryDirectory(prefix='bv171-browser-') as directory:
    root = Path(directory)
    fixture = root / 'interface.html'
    for width, height in [(1440,1000),(390,844)]:
        # Um iframe reproduz o host do Sankhya e evita a largura mínima de janela do Edge.
        outer = '<!doctype html><meta charset="utf-8"><script>addEventListener("message",e=>{const p=document.createElement("pre");p.id="browser-result";p.textContent=JSON.stringify(e.data);document.body.append(p);});</script>'
        outer += f'<iframe style="border:0;width:{width}px;height:{height}px" srcdoc="{html.escape(page, quote=True)}"></iframe>'
        fixture.write_text(outer, encoding='utf-8')
        run = subprocess.run([str(edge), '--headless=new', '--disable-gpu', '--no-first-run',
                              '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
                              '--host-resolver-rules=MAP * ~NOTFOUND', '--no-proxy-server',
                              '--force-device-scale-factor=1', f'--window-size={width},{height}',
                              '--virtual-time-budget=4000', '--dump-dom',
                              f'--user-data-dir={root / str(width)}', fixture.as_uri()],
                             capture_output=True, encoding='utf-8', errors='replace', timeout=45)
        match = re.search(r'<pre id="browser-result">(.*?)</pre>', run.stdout, flags=re.S)
        if not match:
            raise AssertionError(f'Edge não retornou o resultado ({width}px): {run.stderr[-1500:]}')
        result = json.loads(html.unescape(match.group(1)))
        assert result['ok'], result
        print(f'OK: Edge {result["width"]}px, {len(result["checks"])} verificações de interface.')
