# AGENTS.md — Diretrizes de Desenvolvimento

## 1. Contexto do projeto

Este repositório contém código utilizado no desenvolvimento e manutenção de relatórios e dashboards integrados ao ERP Sankhya.

Tecnologias possíveis:
- HTML5, CSS3 e JavaScript.
- SQL para consultas e indicadores gerenciais.
- Componentes JSP e tags específicas do Sankhya.
- Bibliotecas de terceiros já utilizadas no projeto.

Antes de implementar qualquer alteração, examine a estrutura real do repositório. Não presuma a existência de arquivos, bibliotecas ou frameworks.

## 2. Princípios de desenvolvimento

- Priorize correção, legibilidade, manutenção e desempenho.
- Entenda o fluxo de dados antes de modificar o código.
- Preserve funcionalidades existentes que não fazem parte da solicitação.
- Evite reescritas completas quando uma alteração localizada for suficiente.
- Não introduza dependências sem justificar sua necessidade.
- Não altere regras de negócio sem autorização.
- Não invente tabelas, colunas, relacionamentos ou APIs do Sankhya.
- Não afirme que algo foi testado sem executar a verificação correspondente.

## 3. Uso do Codebase Memory MCP

Antes de alterações que envolvam múltiplos arquivos:

1. Consulte o índice existente do projeto.
2. Localize componentes e dependências relevantes.
3. Investigue os caminhos de execução afetados.
4. Identifique possíveis impactos indiretos.
5. Consulte trechos do código-fonte quando necessário.

Não reindexe automaticamente o projeto a cada solicitação. Verifique a cobertura e a atualização do índice quando houver indícios de desatualização.

## 4. Uso do Serena MCP

Utilize o Serena para:

- Localizar funções, classes, símbolos e referências.
- Investigar implementações existentes.
- Compreender relações semânticas entre componentes.
- Realizar edições pontuais quando as ferramentas forem adequadas.

Evite ler arquivos inteiros quando uma consulta por símbolo ou trecho for suficiente.

Use o Codebase Memory e o Serena de forma complementar, sem repetir consultas desnecessariamente.

## 5. Regras para SQL e Sankhya

- O acesso ao banco de dados deve ser exclusivamente de leitura.
- Não execute INSERT, UPDATE, DELETE, MERGE, TRUNCATE, DROP ou ALTER.
- Não execute procedimentos com efeitos colaterais.
- Preserve os filtros de segurança e as regras de negócio existentes.
- Verifique relacionamentos, granularidade e possíveis duplicações em JOINs.
- Evite consultas desnecessariamente custosas.
- Não utilize SELECT * quando for possível selecionar apenas as colunas necessárias.
- Não exponha credenciais, informações pessoais ou dados confidenciais.
- Não execute consultas em produção sem autorização explícita.

## 6. Front-end

- Preserve os padrões visuais existentes, salvo solicitação contrária.
- Priorize interfaces responsivas e acessíveis.
- Evite CSS duplicado e JavaScript desnecessariamente complexo.
- Mantenha separação lógica entre estrutura, apresentação e comportamento.
- Não substitua bibliotecas existentes sem necessidade.

## 7. Processo de alteração

Para tarefas não triviais:

1. Investigue o comportamento atual.
2. Identifique os arquivos e símbolos envolvidos.
3. Explique resumidamente o plano de alteração.
4. Implemente somente o escopo solicitado.
5. Execute as verificações disponíveis e apropriadas.
6. Revise o diff para detectar alterações acidentais.
7. Resuma os arquivos modificados, as decisões e os testes realizados.

Solicite confirmação antes de alterações destrutivas, migrações, modificações de configuração sensível ou mudanças amplas de arquitetura.

## 8. Validação

- Utilize testes e ferramentas de validação existentes no repositório.
- Não execute comandos destrutivos sem autorização.
- Não ignore erros de execução.
- Se não for possível testar uma funcionalidade dependente do Sankhya, explique a limitação.
- Diferencie claramente verificações executadas de hipóteses não validadas.

## 9. Comunicação

- Responda em português brasileiro.
- Seja técnico, objetivo e preciso.
- Explique decisões arquiteturais relevantes.
- Apresente alternativas quando houver trade-offs significativos.
- Evite explicações extensas para alterações triviais.
- Não declare sucesso sem evidências.

## 10. Segurança e limites

- Trate código e dados corporativos como confidenciais.
- Não envie informações para serviços externos sem autorização.
- Não instale pacotes ou ferramentas sem aprovação.
- Não altere configurações globais do ambiente sem solicitação.
- Preserve arquivos, índices e configurações existentes, salvo autorização expressa.
