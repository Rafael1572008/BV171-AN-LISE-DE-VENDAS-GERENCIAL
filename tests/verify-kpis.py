import json
import sqlite3
import subprocess

db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.create_function('NVL', 2, lambda a, b: b if a is None else a)
db.create_function('COALESCE', 2, lambda a, b: b if a is None else a)
db.executescript('''
CREATE TABLE DUAL (DUMMY TEXT);
INSERT INTO DUAL VALUES ('X');
CREATE TABLE TGFCAB (NUNOTA NUMBER, CODPARC NUMBER);
CREATE TABLE TGFPAR (CODPARC NUMBER, CODPARCMATRIZ NUMBER, CODCID NUMBER, CODREG NUMBER, CODTIPPARC NUMBER);
CREATE TABLE TSICID (CODCID NUMBER, UF NUMBER);
CREATE TABLE TSIUFS (CODUF NUMBER, UF TEXT);
CREATE TABLE TSIREG (CODREG NUMBER, NOMEREG TEXT);
CREATE TABLE TGFTPP (CODTIPPARC NUMBER, CODTIPPARCPAI NUMBER, DESCRTIPPARC TEXT);
INSERT INTO TGFPAR VALUES (10,NULL,1,1,2),(11,10,1,1,2),(20,NULL,2,2,3);
INSERT INTO TSICID VALUES (1,1),(2,2);
INSERT INTO TSIUFS VALUES (1,'SP'),(2,'RJ');
INSERT INTO TSIREG VALUES (1,'CENTRO'),(2,'OUTRA');
INSERT INTO TGFTPP VALUES (2,1,'Loja'),(1,NULL,'Varejo'),(3,NULL,'Outro');
''')
fields = ['VLRTOTITEM','VLRLIQ1','VLRLIQ2','MARGEM','ST','ICMS','PIS','COFINS','CUSTOPROD','VLRDESCFINITEM','VLRPRZPAGTOITEM','VLFRETEITEM','VLRCOMISSITEM','VLRPROMOTOR']
db.execute('CREATE TABLE AD_MARGEM_VENDA (NUNOTA NUMBER,TPMOV TEXT,OPER NUMBER,DTNF TEXT,' + ','.join(f+' NUMBER' for f in fields)+')')
def insert(note, partner, movement, operation, date, amount):
    db.execute('INSERT INTO TGFCAB VALUES (?,?)',(note,partner))
    # Tributos de devolução revertem o débito; F tem sua própria despesa tributária.
    sign = 1 if movement == 'D' else -1
    factor = 2 if movement == 'F' else 1
    money = [amount,700,600,300] + [sign*factor*v for v in [10,20,5,15]] + [-400,10,5,20,10,5]
    db.execute('INSERT INTO AD_MARGEM_VENDA VALUES ('+','.join('?' for _ in range(18))+')',[note,movement,operation,date]+money)
insert(1,10,'V',1000,'15/01/2026',1000)
insert(2,11,'D',1200,'15/01/2026',-100)
insert(3,10,'V',1124,'15/01/2026',-50)
insert(4,20,'V',1000,'15/01/2026',2000)
insert(5,10,'V',1000,'15/01/2025',800)
insert(6,10,'F',1000,'15/01/2026',9000)
queries = json.loads(subprocess.check_output(['node', 'tests/verify-kpis.cjs', '--queries'], encoding='utf-8'))
for query in queries:
    # ISO é usado somente no teste para comparação cronológica em SQLite.
    sql=query['sql']
    for year in ['2026','2025']:
        for day in ['01','15','31']:
            sql=sql.replace(f'{day}/01/{year}',f'{year}-01-{day}')
    db.execute("UPDATE AD_MARGEM_VENDA SET DTNF = SUBSTR(DTNF,7,4)||'-'||SUBSTR(DTNF,4,2)||'-'||SUBSTR(DTNF,1,2) WHERE DTNF LIKE '__/__/____'")
    row=dict(db.execute(sql).fetchone())
    general=query['file']=='js/main.js'
    assert row.get('FAT',row.get('FATURAMENTO'))==(3000 if general else 1000),query['file']
    assert row['KPI_DEVOLUCOES']==-100,query['file']
    assert row['KPI_BONIFICACOES']==-50,query['file']
    assert row['KPI_CUSTOPROD']==(-800 if general else -400),query['file']
    for field, value in [('ST',10),('ICMS',20),('PIS',5),('COFINS',15)]:
        assert row['KPI_'+field]==(-4*value if general else -3*value),query['file']
    assert row['KPI_VLRDESCFINITEM']==(20 if general else 10),query['file']
    assert row.get('FATREF',row.get('FATURAMENTO_ANTERIOR'))==800,query['file']
    # Sem movimento no período: todos os componentes continuam sendo zero.
    empty=sql.replace('2026-01','2024-01')
    empty_row=dict(db.execute(empty).fetchone())
    assert all(v==0 for k,v in empty_row.items() if k.startswith('KPI_')),query['file']
print('OK: 7 consultas executadas com filtros, matriz/filial, períodos, movimentos e ausência de dados (SQLite).')
