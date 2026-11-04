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

    // ===== Auxiliares de geração =====

    /**
     * Nome exibido de uma categoria ou item (categorias usam "name" ou "desc", itens usam "desc")
     */
    nomeDe(entrada) {
        return entrada.desc || entrada.name;
    },

    /**
     * Retorna a tabela de categorias (categoryTables) pelo nome
     */
    categoriasDe(nome) {
        return this.resources?.categoryTables?.[nome] || [];
    },

    /**
     * Sorteia uma categoria da tabela pelo campo "roll"
     */
    sortearCategoria(categorias) {
        const dado = this.rolarDado();
        return categorias.find(c => c.roll === dado) || categorias[0];
    },

    /**
     * Escolhe em itemTables o item correspondente à dificuldade do covil.
     * Retorna null se a categoria não tem tabela de itens.
     */
    escolherItem(tabelaChave, dificuldade) {
        const lista = this.resources?.itemTables?.[tabelaChave];
        if (!lista?.length) return null;

        const indice = Math.min(Math.max(dificuldade - 1, 0), lista.length - 1);
        return lista[indice];
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
     * sorteia-se uma categoria de item. (Futuro: usar o valor para escolher itens específicos.)
     */
    gerarCivilizado() {
        const categorias = this.categoriasDe('civilized');
        if (categorias.length === 0) {
            this.exibirResultado(['Nenhuma categoria encontrada']);
            return;
        }

        const rolagem = this.rolarDado();
        const valorTotal = rolagem * this.VALOR_POR_ROLAGEM * this.lerNumero('covilDificuldade');
        const quantidadeItens = Math.floor(valorTotal / this.VALOR_POR_ITEM);

        const linhas = [`Rolagem: ${rolagem}`, `Valor total: ${valorTotal} DO`];

        if (quantidadeItens === 0) {
            linhas.push(`Nenhum item (valor abaixo de ${this.VALOR_POR_ITEM} DO)`);
            this.exibirResultado(linhas);
            return;
        }

        const contagem = new Map();
        for (let i = 0; i < quantidadeItens; i++) {
            const categoria = this.sortearCategoria(categorias);
            contagem.set(categoria, (contagem.get(categoria) || 0) + 1);
        }

        linhas.push(`Itens: ${quantidadeItens}`);
        [...contagem]
            .sort(([a], [b]) => a.roll - b.roll)
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
        const categorias = this.categoriasDe('natural');
        if (categorias.length === 0) {
            this.exibirResultado(['Nenhuma categoria encontrada']);
            return;
        }

        const andar = this.lerNumero('covilAndar');
        const rolagens = [this.rolarDado()];
        while (rolagens.length < andar && rolagens.at(-1) === 6) {
            rolagens.push(this.rolarDado());
        }
        const quantidade = rolagens.reduce((soma, rolagem) => soma + rolagem, 0);

        const categoria = this.sortearCategoria(categorias);
        const recurso = this.escolherItem(categoria.table, this.lerNumero('covilDificuldade'));

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