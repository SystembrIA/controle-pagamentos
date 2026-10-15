/* Categorias de pagamento do grupo (Maikon 15/10).
   Lista única usada no Pagamentos Diários (a categoria é escolhida desta lista) e no Dashboard de
   Pagamentos dos Resultados Operacionais (unifica os nomes antigos digitados de vários jeitos).
   JbCategorias.LISTA        → nomes oficiais (em ordem alfabética)
   JbCategorias.unifica(txt) → nome oficial para qualquer jeito de escrever ("SALARO FUNCIONARIO" → "Salário dos Funcionários") */
(function () {
  var LISTA = [
    '13º Salário', 'Adiantamento Salarial', 'Advocacia', 'Água', 'Alimentação Funcionários', 'Alimentação Motoboys',
    'Aluguel', 'Aplicativo', 'Aquisição de Equipamentos', 'Aquisição de Material', 'Bonificação', 'Cartão de Crédito',
    'Cobertura de Conta', 'Combustível', 'Comissão Motoboys', 'Comissões/Gorjetas', 'Consultoria/Assessoria', 'Contabilidade',
    'Cursos e Treinamentos', 'Decorações e Paisagismo', 'Despesa com Veículo', 'Devolução', 'Dias Trabalhados',
    'Embalagens e Descartáveis', 'Empréstimos', 'Empréstimos a Funcionários', 'Energia Elétrica', 'Estagiários', 'Férias',
    'FGTS', 'FGTS Rescisório', 'Freelancer', 'Gás', 'Impostos', 'Insumos', 'Internet e Telefone', 'Investimentos', 'IPTU',
    'Manutenção de Equipamentos', 'Manutenções', 'Marketing', 'Material de Limpeza/Higiene', 'Material Promocional',
    'Motoboy', 'Obra e Reformas', 'Outras Despesas', 'Particular', 'Pensão Alimentícia', 'Plano de Saúde',
    'Prestação de Serviços', 'Pró-labore', 'Reembolso', 'Rescisão', 'Retirada', 'Revenda de Mercadorias', 'Salário dos Funcionários',
    'Segurança', 'Seguros', 'Sindicato', 'Sistemas e Softwares', 'Tarifas Bancárias', 'Taxas', 'Taxas e Associações',
    'Transferência entre Contas', 'Transporte de Terceiros', 'Vale Transporte'
  ];
  function chave(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
      .replace(/[´`'"]/g, '').replace(/[^A-Z0-9/]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // jeitos de escrever que já apareceram → nome oficial
  var VARIANTES = {
    '13 SALARIO': '13º Salário', '13O SALARIO': '13º Salário', '13 O SALARIO': '13º Salário',
    'ADIANTAMENTO': 'Adiantamento Salarial', 'VALE': 'Adiantamento Salarial',
    'ALIMENTACAO': 'Alimentação Funcionários', 'ALIMENTACAO M O': 'Alimentação Funcionários', 'MARMITAS': 'Alimentação Funcionários',
    'LOCACAO': 'Aluguel', 'IFOOD MENSALIDADE COMISSAO': 'Aplicativo',
    'EQUIPAMENTO': 'Aquisição de Equipamentos', 'EQUIPAMENTOS': 'Aquisição de Equipamentos', 'MAQUINAS E EQUIPAMENTOS': 'Aquisição de Equipamentos',
    'AQUISICAO MATERIAL LIMPEZA/HIGIENE': 'Material de Limpeza/Higiene', 'HIGIENE E LIMPEZA': 'Material de Limpeza/Higiene', 'LIMPEZA': 'Material de Limpeza/Higiene',
    'BONIFICACOES': 'Bonificação', 'GRATIFICACOES': 'Bonificação',
    'COBERTURA': 'Cobertura de Conta', 'COBERTURA CONTA': 'Cobertura de Conta',
    'COMISSOES MOTOBOYS': 'Comissão Motoboys', 'COMISSOES': 'Comissões/Gorjetas',
    'CONSULTORIA / ASSESSORIA': 'Consultoria/Assessoria', 'CONTADOR': 'Contabilidade',
    'LAVAGEM DE VEICULO': 'Despesa com Veículo',
    'EMBALAGEM': 'Embalagens e Descartáveis', 'EMBALAGENS': 'Embalagens e Descartáveis',
    'EMPRESTIMO': 'Empréstimos', 'EMPRESTIMOS E FINANCIAMENTOS': 'Empréstimos',
    'FGTS FUNCIONARIOS': 'FGTS', 'FREE LANCER': 'Freelancer',
    'IMPOSTO': 'Impostos', 'DARE': 'Impostos', 'DARE SP': 'Impostos', 'DARF UNIFICADO': 'Impostos', 'ISS': 'Impostos', 'SIMPLES NACIONAL': 'Impostos',
    'IPTU E TFF': 'IPTU', 'INSUMOQ': 'Insumos',
    'INTERNET': 'Internet e Telefone', 'TELEFONE': 'Internet e Telefone', 'TELEFONE E INTERNET': 'Internet e Telefone',
    'MANUTENCOES': 'Manutenções', 'ADS': 'Marketing', 'SERVICOS GRAFICOS': 'Marketing',
    'MATERIAL PRMOCIONAL': 'Material Promocional', 'MOTOBOYS': 'Motoboy',
    'OBRA': 'Obra e Reformas', 'OUTROS': 'Outras Despesas', 'CONSUMO': 'Outras Despesas',
    'PENSAO ALIMENTICIA FUNCIONARIO': 'Pensão Alimentícia',
    'SAUDE': 'Plano de Saúde', 'SEGURO SAUDE': 'Plano de Saúde',
    'PRESTADOR DE SERVICOS': 'Prestação de Serviços', 'SERVICO PRESTADO POR TERCEIRO': 'Prestação de Serviços', 'SERVICO DE LIMPEZA': 'Prestação de Serviços',
    'PRO LABORE': 'Pró-labore', 'SALARIO SOCIOS': 'Pró-labore',
    'RETIRADA MENSAL': 'Retirada', 'FOLHA PAGTO': 'Salário dos Funcionários', 'FUNCIONARIO': 'Salário dos Funcionários',
    'TAXA SINDICAL': 'Sindicato', 'GESTAO DE PONTO': 'Sistemas e Softwares',
    'SANTANDER': 'Tarifas Bancárias', 'DEBITO AUTOMATICO': 'Tarifas Bancárias',
    'TAXA': 'Taxas', 'DESPESAS FINANCEIRAS TAXAS DE CARTAO ALUGUEL MAQUINAS': 'Taxas',
    'TRANSFERENCIA': 'Transferência entre Contas', 'TRANSFERENCIA DE CONTAS': 'Transferência entre Contas', 'EMPRESTIMOS/TRANSFERENCIAS ENTRE CONTAS': 'Transferência entre Contas',
    'CARRETO': 'Transporte de Terceiros', 'TRANSPORTE M O VT UBER E ETC': 'Vale Transporte', 'VT': 'Vale Transporte',
    'VALE TRANSPORTE E ALIMENTACAO': 'Vale Transporte',
    'DESPESA COM FUNCIONARIO': 'Outras Despesas', 'MENSALIDADE': 'Outras Despesas', 'PACOTE MENSAL': 'Outras Despesas',
    'PIX': 'Sem categoria', 'SEM CATEGORIA': 'Sem categoria'
  };
  // regras para os erros de digitação que ainda vão aparecer
  var REGRAS = [
    [/^SALARIO SOCIO|^PRO LABORE/, 'Pró-labore'], [/^DEBITO AUTOMATICO/, 'Tarifas Bancárias'], [/^SALA ?R?I?O|^SALARO/, 'Salário dos Funcionários'],
    [/DIA ?S? ?TRAB/, 'Dias Trabalhados'], [/^TARIFA/, 'Tarifas Bancárias'], [/^SISTEMA/, 'Sistemas e Softwares'],
    [/^VALE TRA/, 'Vale Transporte'], [/^FGTS RE/, 'FGTS Rescisório'], [/^EMBALAGE/, 'Embalagens e Descartáveis'],
    [/^RESCIS/, 'Rescisão'], [/^PRESTA/, 'Prestação de Serviços'], [/^FREE ?LANCE/, 'Freelancer'], [/^CURSO/, 'Cursos e Treinamentos'],
    [/DESPESAS? (COM )?VEICULO/, 'Despesa com Veículo'], [/^SEGURO/, 'Seguros'], [/^MARKETING/, 'Marketing'],
    [/^REFORMA|^OBRA/, 'Obra e Reformas'], [/^EMPRESTIMO.*(MOTOBOY|FUNCIONARIO)/, 'Empréstimos a Funcionários'], [/^EMPRESTIMO/, 'Empréstimos'],
    [/^TRANSFERENCIA/, 'Transferência entre Contas'], [/^TRANSPORTE/, 'Transporte de Terceiros'], [/^COMISS.*MOTOBOY/, 'Comissão Motoboys'],
    [/^BONIFICA/, 'Bonificação'], [/^ADIANTAMENTO/, 'Adiantamento Salarial'], [/^ALIMENTACAO FUNC/, 'Alimentação Funcionários'],
    [/^PENSAO/, 'Pensão Alimentícia'], [/^MATERIAL PR/, 'Material Promocional'], [/^INSUMO/, 'Insumos'], [/^IMPOSTO/, 'Impostos'],
    [/^REVENDA/, 'Revenda de Mercadorias'], [/^AQUISICAO DE EQUIP/, 'Aquisição de Equipamentos'], [/^AQUISICAO DE MATER/, 'Aquisição de Material']
  ];
  var OFICIAL = {};
  LISTA.forEach(function (n) { OFICIAL[chave(n)] = n; });
  function unifica(txt) {
    var k = chave(txt);
    if (!k) return 'Sem categoria';
    if (OFICIAL[k]) return OFICIAL[k];
    if (VARIANTES[k]) return VARIANTES[k];
    for (var i = 0; i < REGRAS.length; i++) if (REGRAS[i][0].test(k)) return REGRAS[i][1];
    // desconhecida: mantém o nome digitado, só arrumando maiúsculas
    return String(txt).trim().toLowerCase().replace(/(^|[\s/(])([a-zà-ú])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  window.JbCategorias = { LISTA: LISTA, unifica: unifica, chave: chave };
})();
