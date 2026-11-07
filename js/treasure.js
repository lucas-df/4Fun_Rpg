/**
 * Módulo de dados de tesouros
 */
const TreasureDataModule = {
    generationType: null,
    resources: null,

    // Civilizado: valor total (DO) = rolagem × VALOR_POR_ROLAGEM × dificuldade do covil
    VALOR_POR_ROLAGEM: 50,
    // Civilizado: a cada VALOR_POR_ITEM DO do valor total, um item de categoria aleatória
    VALOR_POR_ITEM: 100,

    // ===== Dados e interface =====

    /**
     * Rola um dado (d6 por padrão)
     */
    rolarDado(lados = 6) {
        return Math.floor(Math.random() * lados) + 1;
    },

    /**
     * Rola dados em notação "NdM" (ex.: "1d6", "2d6") e retorna cada rolagem
     */
    rolarNotacao(notacao) {
        const partes = /^(\d*)d(\d+)$/.exec(notacao);
        if (!partes) throw new Error(`Notação de dados inválida: "${notacao}"`);

        const quantidade = parseInt(partes[1]) || 1;
        const lados = parseInt(partes[2]);
        return Array.from({ length: quantidade }, () => this.rolarDado(lados));
    },

    /**
     * Importa e carrega a tabela de dados de recursos do JSON
     */
    async importarTabelaRecursos() {
        if (this.resources) return this.resources;
        try {
            const response = await fetch('src/resources.json');
            this.resources = await response.json();
            return this.resources;
        } catch (error) {
            console.error('Erro ao importar tabela de recursos:', error);
            throw error;
        }
    },

    /**
     * Define o tipo de geração e atualiza a interface
     */
    setGenerationType(type) {
        this.generationType = type;

        document.querySelectorAll('#treasure .tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${type}Tab`).classList.add('active');

        const btn = document.getElementById('gerarTesouroBtn');
        if (btn) btn.disabled = false;
    },

    /**
     * Lê um campo numérico do formulário (mínimo 1)
     */
    lerNumero(id) {
        return parseInt(document.getElementById(id).value) || 1;
    },

    /**
     * Mostra as linhas no painel de resultado
     */
    exibirResultado(linhas) {
        const resultDiv = document.getElementById('treasureResult');
        resultDiv.innerHTML = linhas.join('<br> ');
        resultDiv.style.display = 'block';
    },

    // ===== Tabelas =====

    /**
     * Nome exibido de uma entrada (entradas usam "name" ou "desc")
     */
    nomeDe(entrada) {
        return entrada.desc || entrada.name;
    },

    /**
     * Retorna a tabela do JSON pelo nome (null se não existir)
     */
    buscarTabela(nome) {
        return this.resources?.find(tabela => tabela.name === nome) || null;
    },

    /**
     * Sorteia uma entrada da lista, todas com a mesma chance
     */
    sortearAleatorio(entradas) {
        return entradas[Math.floor(Math.random() * entradas.length)];
    },

    /**
     * Sorteia uma entrada da lista com chances proporcionais ao campo "weight"
     * (entradas sem "weight" têm peso 1)
     */
    sortearPonderado(entradas) {
        const pesoDe = entrada => entrada.weight ?? 1;
        const pesoTotal = entradas.reduce((soma, entrada) => soma + pesoDe(entrada), 0);

        let alvo = Math.random() * pesoTotal;
        for (const entrada of entradas) {
            alvo -= pesoDe(entrada);
            if (alvo < 0) return entrada;
        }
        return entradas.at(-1);
    },

    /**
     * Escolhe a entrada da tabela correspondente à dificuldade do covil
     */
    escolherPorDificuldade(tabela, dificuldade) {
        const indice = Math.min(Math.max(dificuldade - 1, 0), tabela.length - 1);
        return tabela[indice];
    },

    /**
     * Escolhe uma entrada da tabela conforme o seu campo "selection":
     * "random" sorteia com chances iguais; "weightedRandom" sorteia conforme o "weight"
     * de cada entrada; "difficulty" segue a dificuldade do covil.
     * Entradas cujo campo "table" está em tabelasVisitadas não participam da escolha.
     * Retorna null se não sobrar nenhuma entrada.
     */
    escolherEntrada(tabela, dificuldade, tabelasVisitadas = new Set()) {
        const entradas = tabela.entries.filter(entrada => !tabelasVisitadas.has(entrada.table));
        if (entradas.length === 0) return null;

        switch (tabela.selection) {
            case 'random':
                return this.sortearAleatorio(entradas);
            case 'weightedRandom':
                return this.sortearPonderado(entradas);
            case 'difficulty':
                return this.escolherPorDificuldade(entradas, dificuldade);
            default:
                throw new Error(`Seleção desconhecida "${tabela.selection}" na tabela "${tabela.name}"`);
        }
    },

    /**
     * Se a entrada tem o campo "table", escolhe uma entrada nessa tabela e repete o processo
     * com a nova entrada. Retorna a cadeia completa, da entrada inicial até a última.
     *
     * Failsafe contra loops: a tabela de origem (tabelaInicial) e as já percorridas não podem ser
     * revisitadas, pois as entradas que apontam para elas deixam de ser sorteáveis
     * (ex.: natural <-> civilized).
     * Exceção: uma entrada que aponta para a própria tabela em que foi sorteada manda rolar
     * de novo nela (ex.: "Equipamento Intacto" em equipment). A tabela só entra na lista de
     * visitadas depois do primeiro sorteio, então essa entrada pode sair uma vez; na nova rolagem
     * a tabela já está visitada e a entrada deixa de ser sorteável, evitando repetição.
     * Para também se a tabela não existe ou se não sobra nenhuma entrada a sortear.
     */
    resolverCadeia(entrada, dificuldade, tabelaInicial) {
        const entradas = [entrada];
        const visitadas = new Set(tabelaInicial ? [tabelaInicial] : []);
        let tabelaAtual = tabelaInicial;

        while (entrada.table && (entrada.table === tabelaAtual || !visitadas.has(entrada.table))) {
            const tabela = this.buscarTabela(entrada.table);
            if (!tabela?.entries.length) break;

            entrada = this.escolherEntrada(tabela, dificuldade, visitadas);
            if (!entrada) break;

            visitadas.add(tabela.name);
            entradas.push(entrada);
            tabelaAtual = tabela.name;
        }
        return entradas;
    },

    /**
     * Quantidade definida por uma cadeia: vale o último "quantity" encontrado nela
     * (um "quantity" mais adiante na cadeia substitui o anterior).
     * Retorna null se nenhuma entrada da cadeia define "quantity".
     */
    rolarQuantidadeDaCadeia(entradas) {
        const origem = entradas.findLast(entrada => entrada.quantity);
        if (!origem) return null;

        const total = this.rolarNotacao(origem.quantity).reduce((soma, rolagem) => soma + rolagem, 0);
        return { origem, total };
    },

    /**
     * Texto da quantidade obtida a partir das rolagens (vazio se não houve rolagem)
     */
    descreverQuantidade(rolagens) {
        if (rolagens.length === 0) return '';

        const soma = rolagens.reduce((total, rolagem) => total + rolagem, 0);
        return rolagens.length === 1
            ? ` (quantidade: ${soma})`
            : ` (quantidade: ${rolagens.join(' + ')} = ${soma})`;
    },

    // ===== Geração =====

    /**
     * Gera um tesouro do tipo escolhido e exibe o resultado na interface
     */
    async gerar() {
        await this.importarTabelaRecursos();

        if (this.generationType === 'civilizado') {
            this.gerarCivilizado();
        } else if (this.generationType === 'selvagem') {
            this.gerarSelvagem();
        }
    },

    /**
     * Civilizado: a rolagem define o valor total. A cada VALOR_POR_ITEM DO desse valor,
     * sorteia-se uma categoria de item. Categorias com o campo "quantity" (ex.: "1d6")
     * rolam esses dados para cada item sorteado, definindo a quantidade obtida.
     * (Futuro: usar o valor para escolher itens específicos a partir da categoria,
     * seguindo o campo "table" com resolverCadeia.)
     */
    gerarCivilizado() {
        const tabela = this.buscarTabela('civilized');
        if (!tabela?.entries.length) {
            this.exibirResultado(['Nenhuma categoria encontrada']);
            return;
        }

        const dificuldade = this.lerNumero('covilDificuldade');
        const rolagem = this.rolarDado();
        const valorTotal = rolagem * this.VALOR_POR_ROLAGEM * dificuldade;
        const quantidadeItens = Math.floor(valorTotal / this.VALOR_POR_ITEM);

        const linhas = [`Rolagem: ${rolagem}`, `Valor total: ${valorTotal} DO`];

        if (quantidadeItens === 0) {
            linhas.push(`Nenhum item (valor abaixo de ${this.VALOR_POR_ITEM} DO)`);
            this.exibirResultado(linhas);
            return;
        }

        // categoria -> { itens: nº de itens sorteados, rolagens: dados de quantidade rolados }
        const resultados = new Map();
        for (let i = 0; i < quantidadeItens; i++) {
            const categoria = this.escolherEntrada(tabela, dificuldade);
            if (!resultados.has(categoria)) resultados.set(categoria, { itens: 0, rolagens: [] });

            const resultado = resultados.get(categoria);
            resultado.itens++;
            if (categoria.quantity) resultado.rolagens.push(...this.rolarNotacao(categoria.quantity));
        }

        linhas.push(`Itens: ${quantidadeItens}`);
        [...resultados]
            .sort(([a], [b]) => tabela.entries.indexOf(a) - tabela.entries.indexOf(b))
            .forEach(([categoria, { itens, rolagens }]) => {
                linhas.push(`${this.nomeDe(categoria)} x ${itens}${this.descreverQuantidade(rolagens)}`);
            });

        this.exibirResultado(linhas);
    },

    /**
     * Selvagem: a rolagem define a quantidade de recursos (cada 6 rola outro dado, limitado
     * ao andar do covil). Uma categoria é sorteada e o recurso vem de seguir a cadeia de
     * tabelas (campo "table"). Se a cadeia define "quantity", ele substitui a quantidade rolada.
     */
    gerarSelvagem() {
        const tabela = this.buscarTabela('natural');
        if (!tabela?.entries.length) {
            this.exibirResultado(['Nenhuma categoria encontrada']);
            return;
        }

        const dificuldade = this.lerNumero('covilDificuldade');
        const andar = this.lerNumero('covilAndar');
        const rolagens = [this.rolarDado()];
        while (rolagens.length < andar && rolagens.at(-1) === 6) {
            rolagens.push(this.rolarDado());
        }
        const quantidade = rolagens.reduce((soma, rolagem) => soma + rolagem, 0);

        const categoria = this.escolherEntrada(tabela, dificuldade);
        const entradas = this.resolverCadeia(categoria, dificuldade, tabela.name);
        const recurso = entradas.length > 1 ? entradas.at(-1) : null;

        const linhas = [
            `Rolagens: ${rolagens.join(' + ')}`,
            `Tipo: ${this.nomeDe(categoria)}${recurso ? '' : ` (sem itens) x ${quantidade}`}`
        ];

        if (recurso) {
            const definida = this.rolarQuantidadeDaCadeia(entradas);
            const quantidadeFinal = definida ? definida.total : quantidade;

            if (entradas.length > 2) {
                linhas.push(`Caminho: ${entradas.map(entrada => this.nomeDe(entrada)).join(' > ')}`);
            }
            if (definida) {
                linhas.push(`Quantidade: ${definida.total} (${definida.origem.quantity} de ${this.nomeDe(definida.origem)})`);
            }
            linhas.push(`Recurso: ${this.nomeDe(recurso)} x ${quantidadeFinal}`);

            if (recurso.value !== undefined) {
                linhas.push(
                    `Preço unitário: ${recurso.value} DO`,
                    `Preço total: ${recurso.value * quantidadeFinal} DO`
                );
            }
        }

        this.exibirResultado(linhas);
    }
};