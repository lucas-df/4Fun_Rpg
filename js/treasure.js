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
     * Rola um d6
     */
    rolarDado() {
        return Math.floor(Math.random() * 6) + 1;
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
     */
    escolherEntrada(tabela, dificuldade) {
        switch (tabela.selection) {
            case 'random':
                return this.sortearAleatorio(tabela.entries);
            case 'weightedRandom':
                return this.sortearPonderado(tabela.entries);
            case 'difficulty':
                return this.escolherPorDificuldade(tabela.entries, dificuldade);
            default:
                throw new Error(`Seleção desconhecida "${tabela.selection}" na tabela "${tabela.name}"`);
        }
    },

    /**
     * Se a entrada tem o campo "table", escolhe uma entrada nessa tabela e repete o processo
     * com a nova entrada. Retorna a cadeia completa, da entrada inicial até a última.
     * Para se a tabela não existe ou se um ciclo é detectado.
     */
    resolverCadeia(entrada, dificuldade) {
        const cadeia = [entrada];
        const visitadas = new Set();

        while (entrada.table && !visitadas.has(entrada.table)) {
            visitadas.add(entrada.table);

            const tabela = this.buscarTabela(entrada.table);
            if (!tabela?.entries.length) break;

            entrada = this.escolherEntrada(tabela, dificuldade);
            cadeia.push(entrada);
        }
        return cadeia;
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
     * sorteia-se uma categoria de item. (Futuro: usar o valor para escolher itens específicos
     * a partir da categoria, seguindo o campo "table" com resolverCadeia.)
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

        const contagem = new Map();
        for (let i = 0; i < quantidadeItens; i++) {
            const categoria = this.escolherEntrada(tabela, dificuldade);
            contagem.set(categoria, (contagem.get(categoria) || 0) + 1);
        }

        linhas.push(`Itens: ${quantidadeItens}`);
        [...contagem]
            .sort(([a], [b]) => tabela.entries.indexOf(a) - tabela.entries.indexOf(b))
            .forEach(([categoria, quantidade]) => {
                linhas.push(`${this.nomeDe(categoria)} x ${quantidade}`);
            });

        this.exibirResultado(linhas);
    },

    /**
     * Selvagem: a rolagem define a quantidade de recursos (cada 6 rola outro dado, limitado
     * ao andar do covil). Uma categoria é sorteada e o recurso vem da dificuldade do covil.
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
        const cadeia = this.resolverCadeia(categoria, dificuldade);
        const recurso = cadeia.length > 1 ? cadeia.at(-1) : null;

        const linhas = [
            `Rolagens: ${rolagens.join(' + ')}`,
            `Tipo: ${this.nomeDe(categoria)}${recurso ? '' : ` (sem itens) x ${quantidade}`}`
        ];

        if (recurso) {
            const precoUnitario = recurso.value ?? 0;
            linhas.push(
                `Recurso: ${this.nomeDe(recurso)} x ${quantidade}`,
                `Preço unitário: ${precoUnitario} DO`,
                `Preço total: ${precoUnitario * quantidade} DO`
            );
        }

        this.exibirResultado(linhas);
    }
};