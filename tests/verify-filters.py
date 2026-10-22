"""Executa SQL gerado em banco sintético em memória; não acessa o Sankhya."""
import json
import re
import sqlite3
import subprocess

db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.create_function('NVL', 2, lambda a, b: b if a is None else a)
db.create_function('TRUNC', 1, lambda a: int(a) if a is not None else None)
db.executescript('''
CREATE TABLE TGFCAB (NUNOTA NUMBER, CODPARC NUMBER);
CREATE TABLE TGFPAR (CODPARC NUMBER, CODPARCMATRIZ NUMBER, NOMEPARC TEXT, CODCID NUMBER, CODREG NUMBER, CODTIPPARC NUMBER, CODVEND NUMBER);
CREATE TABLE TGFVEN (CODVEND NUMBER, CODGER NUMBER, APELIDO TEXT);
CREATE TABLE TSICID (CODCID NUMBER, UF NUMBER);
CREATE TABLE TSIUFS (CODUF NUMBER, UF TEXT);
CREATE TABLE TSIREG (CODREG NUMBER, NOMEREG TEXT);
CREATE TABLE TGFTPP (CODTIPPARC NUMBER, CODTIPPARCPAI NUMBER, DESCRTIPPARC TEXT);
CREATE TABLE TGFPRO (CODPROD NUMBER, DESCRPROD TEXT, CODGRUPOPROD NUMBER);
CREATE TABLE TGFGRU (CODGRUPOPROD NUMBER, DESCRGRUPOPROD TEXT);
INSERT INTO TGFPAR VALUES (10,NULL,'Matriz',1,1,2,101),(11,10,'Filial',1,1,3,102),(12,10,'Sem gerente',1,1,2,NULL);
INSERT INTO TGFVEN VALUES (101,1,'Vendedor A'),(102,2,'Vendedor B'),(1,NULL,'Mesmo nome'),(2,NULL,'Mesmo nome');
INSERT INTO TSICID VALUES (1,1);
INSERT INTO TSIUFS VALUES (1,'SP');
INSERT INTO TSIREG VALUES (1,'CENTRO');
INSERT INTO TGFTPP VALUES (2,1,'Loja'),(1,NULL,'Varejo'),(3,1,'Atacado');
INSERT INTO TGFPRO VALUES (1,'Produto A',11001),(2,'Produto B',21001),(3,'Sem marca',NULL),(4,'Produto C',11002);
INSERT INTO TGFGRU VALUES (10000,'Marca A'),(20000,'Marca B'),(11001,'Grupo A'),(11002,'Grupo C'),(21001,'Grupo B');
''')
fields = ['VLRTOTITEM','VLRLIQ1','VLRLIQ2','MARGEM','ST','ICMS','PIS','COFINS',
          'CUSTOPROD','VLRDESCFINITEM','VLRPRZPAGTOITEM','VLFRETEITEM','VLRCOMISSITEM','VLRPROMOTOR']
db.execute('CREATE TABLE AD_MARGEM_VENDA (NUNOTA NUMBER,CODPROD NUMBER,QTDNEG NUMBER,TPMOV TEXT,OPER NUMBER,DTNF TEXT,DESCOPER TEXT,' + ','.join(f+' NUMBER' for f in fields)+')')
for i, partner in enumerate([10,11,12], start=1):
    for year, factor in [(2026,1),(2025,.1)]:
        note = year * 10 + i
        db.execute('INSERT INTO TGFCAB VALUES (?,?)', (note,partner))
        # Nota mista e produto repetido: não incluir outras marcas nem multiplicar itens.
        for product, fraction in [(1,.1),(1,.1),(4,.1),(2,.5),(3,.2)]:
            value = i * 100 * factor * fraction
            money = [value,value*.7,value*.6,value*.3] + [0]*10
            db.execute('INSERT INTO AD_MARGEM_VENDA VALUES ('+','.join('?' for _ in range(21))+')',
                       [note,product,value/10,'V',1000,f'{year}-01-15','Venda']+money)
queries = json.loads(subprocess.check_output(['node','tests/verify-filters.cjs','--queries'],encoding='utf-8'))
for query in queries:
    sql = re.sub(r'(\d{2})/(\d{2})/(\d{4})',r'\3-\2-\1',query['sql'])
    sql = re.sub(r'FETCH FIRST (\d+) ROWS ONLY',r'LIMIT \1',sql,flags=re.I)
    try:
        rows = [dict(r) for r in db.execute(sql)]
    except Exception as exc:
        raise AssertionError((query['file'],query['name'],query['selected'],str(exc))) from exc
    selected = query['selected']
    expected = sum(value for manager,seller,profile,value in [('1','101','2',100),('2','102','3',200),(None,None,'2',300)]
                   if (not query.get('parceiro') or {'101':'10','102':'11',None:'12'}[seller] in query['parceiro'])
                   and (not query.get('matriz') or '10' in query['matriz'])
                   and (not query.get('top') or '1000' in query['top'])
                   and (not selected or manager in selected) and (not query['sellers'] or seller in query['sellers'])
                   and (not query['profiles'] or profile in query['profiles']))
    expected *= sum(fraction for brand, group, fraction, product in [('10000','11001',.2,'1'),('10000','11002',.1,'4'),('20000','21001',.5,'2'),(None,None,.2,'3')]
                    if (not query.get('produto') or product in query['produto']) and (not query['brands'] or brand in query['brands']) and (not query['groups'] or group in query['groups']))
    if rows:
        value_key = next(k for k in ['FAT','FATURAMENTO','VLRTOTITEM','VALOR'] if k in rows[0])
        total = sum((r[value_key] or 0) for r in rows)
        assert abs(total-expected)<.0001, (query['file'],query['name'],selected,total,expected)
        reference_key = next((k for k in ['FATREF','FATURAMENTO_ANTERIOR','VLRTOTITEM_ANTERIOR','VALORREF'] if k in rows[0]), None)
        if reference_key:
            previous = sum((r[reference_key] or 0) for r in rows)
            assert abs(previous-expected*.1)<.0001, (query['file'],query['name'],selected,previous)
        if 'MARGEM' in rows[0] and query['name'] != 'qKpi' and query['name'] != 'montarQueryKPI':
            assert abs(sum((r['MARGEM'] or 0) for r in rows)-expected*.3)<.0001
    else:
        assert expected == 0, (query['file'],query['name'],selected)
option_queries = json.loads(subprocess.check_output(['node','tests/verify-filters.cjs','--options'],encoding='utf-8'))
for query in option_queries:
    sql = re.sub(r'(\d{2})/(\d{2})/(\d{4})',r'\3-\2-\1',query['sql'])
    rows = [dict(r) for r in db.execute(sql)]
    code, expected_codes = {'top':('OPER',{1000}),'parceiro':('CODCLI',{10,11,12}),'produto':('CODPROD',{1,2,3,4}),'matriz':('CODPARCMATRIZ',{10}),'gerente':('CODGER',{1,2}),'vendedor':('CODVEND',{101,102}),'perfil':('CODTIPPARC',{2,3}),'marca':('CODMARCA',{10000,20000}),'grupo':('CODGRUPOPROD',{11001,11002,21001})}[query['key']]
    assert {r[code] for r in rows} == expected_codes, query['file']
    assert len({r[code] for r in rows}) == len(expected_codes), 'descrições não podem colapsar os códigos'
    # Opções também consideram um gerente presente somente na referência.
    reference_only = sql.replace("'2026-01-01'", "'2024-01-01'").replace("'2026-01-31'", "'2024-01-31'")
    assert len({r[code] for r in db.execute(reference_only)}) == len(expected_codes), query['file']
print(f'OK: {len(queries)} consultas de dados e {len(option_queries)} de opcoes; nove filtros, notas mistas, itens repetidos, atuais/comparativos e conjunto vazio.')
