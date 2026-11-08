/**
 * Módulo de dados de tesouros
 *
 * Estrutura dos dados (JSON):
 * - Tabelas de geração (loot_tables.json): "tableId" + "entries". Cada entrada referencia um item
 *   ("item") ou uma tabela/lista seguinte ("nextTable"), com o método de seleção nela
 *   ("selection") e a quantidade obtida ("quantity").
 * - Listas de itens (demais arquivos): "listId" + "list".
 * - Itens: identificados pelo campo "item".
 */
const TreasureDataModule = {
    generationType: null,
    dados: null,

    PASTA_DADOS: 'src/',
    ARQUIVO_TABELAS: 'loot_tables.json',
    ARQUIVOS_ITENS: ['resources.json', 'equipment.json', 'supplies.json', 'weapons.json', 'rare.json'],

    // Tabelas onde começa cada tipo de geração
    TABELA_CIVILIZADA: 'civilizedTable',
    TABELA_SELVAGEM: 'naturalTable',

    // Métodos de seleção aceitos no campo "selection"
    SELECOES: ['random', 'weightedRandom', 'difficulty'],

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
     * Carrega as tabelas de geração e as listas de itens, e indexa tudo pelos identificadores
     */
    async importarDados() {
        if (this.dados) return this.dados;
        try {
            const arquivos = [this.ARQUIVO_TABELAS, ...this.ARQUIVOS_ITENS];
            const [tabelas, ...arquivosItens] = await Promise.all(
                arquivos.map(async arquivo => (await fetch(this.PASTA_DADOS + arquivo)).json())
            );

            this.dados = this.indexarDados(tabelas, arquivosItens.flat());

            const problemas = this.validarDados();
            if (problemas.length > 0) {
                console.warn(`Problemas nos dados de tesouro:\n- ${problemas.join('\n- ')}`);
            }
            return this.dados;
        } catch (error) {
            console.error('Erro ao importar dados de tesouro:', error);
            throw error;
        }
    },

    /**
     * Monta os índices por identificador: tabelas (tableId), listas (listId, inclusive as
     * aninhadas dentro de outras listas) e itens (item).
     */
    indexarDados(tabelas, listas) {
        const dados = { tabelas: new Map(), listas: new Map(), itens: new Map() };

        const registrar = (mapa, id, valor, tipo) => {
            if (mapa.has(id)) console.warn(`Id duplicado (${tipo}): "${id}"`);
            mapa.set(id, valor);
        };

        const registrarLista = lista => {
            const itens = [];
            for (const elemento of lista.list) {
                if (elemento.listId) {
                    registrarLista(elemento);
                } else {
                    itens.push(elemento);
                    registrar(dados.itens, elemento.item, elemento, 'item');
                }
            }
            registrar(dados.listas, lista.listId, itens, 'lista');
        };

        tabelas.forEach(tabela => registrar(dados.tabelas, tabela.tableId, tabela, 'tabela'));
        listas.forEach(registrarLista);
        return dados;
    },

    /**
     * Procura referências quebradas e valores inválidos nas tabelas de geração.
     * Retorna a lista de problemas encontrados (vazia se está tudo certo).
     */
    validarDados() {
        const { tabelas, listas, itens } = this.dados;
        const problemas = [];
        const selecaoInvalida = selecao => selecao !== undefined && !this.SELECOES.includes(selecao);

        for (const tabela of tabelas.values()) {
            if (selecaoInvalida(tabela.selection)) {
                problemas.push(`Tabela "${tabela.tableId}": selection inválido "${tabela.selection}"`);
            }

            for (const entrada of tabela.entries) {
                const onde = `Tabela "${tabela.tableId}", entrada "${this.nomeDe(entrada) || entrada.item}"`;

                if (entrada.item && !itens.has(entrada.item)) {
                    problemas.push(`${onde}: item "${entrada.item}" não encontrado`);
                }
                if (entrada.nextTable && !tabelas.has(entrada.nextTable) && !listas.has(entrada.nextTable)) {
                    problemas.push(`${onde}: nextTable "${entrada.nextTable}" não encontrada`);
                }
                if (selecaoInvalida(entrada.selection)) {
                    problemas.push(`${onde}: selection inválido "${entrada.selection}"`);
                }
                if (entrada.value !== undefined && typeof entrada.value !== 'number') {
                    problemas.push(`${onde}: value deveria ser número, mas é "${entrada.value}"`);
                }
            }
        }
        return problemas;
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

    // ===== Seleção =====

    /**
     * Nome exibido de uma entrada ou item (usam "desc" ou "name")
     */
    nomeDe(registro) {
        return registro.desc || registro.name;
    },

    /**
     * Valor em DO de uma entrada ou item (undefined se não tem valor numérico)
     */
    valorDe(registro) {
        return typeof registro?.value === 'number' ? registro.value : undefined;
    },

    /**
     * Sorteia um candidato da lista, todos com a mesma chance
     */
    sortearAleatorio(candidatos) {
        return candidatos[Math.floor(Math.random() * candidatos.length)];
    },

    /**
     * Sorteia um candidato da lista com chances proporcionais ao campo "weight"
     * (candidatos sem "weight" têm peso 1)
     */
    sortearPonderado(candidatos) {
        const pesoDe = candidato => candidato.weight ?? 1;
        const pesoTotal = candidatos.reduce((soma, candidato) => soma + pesoDe(candidato), 0);

        let alvo = Math.random() * pesoTotal;
        for (const candidato of candidatos) {
            alvo -= pesoDe(candidato);
            if (alvo < 0) return candidato;
        }
        return candidatos.at(-1);
    },

    /**
     * Escolhe o candidato da lista correspondente à dificuldade do covil
     */
    escolherPorDificuldade(candidatos, dificuldade) {
        const indice = Math.min(Math.max(dificuldade - 1, 0), candidatos.length - 1);
        return candidatos[indice];
    },

    /**
     * Escolhe um candidato (entrada de tabela ou item de lista) conforme o método de seleção:
     * "random" sorteia com chances iguais (padrão); "weightedRandom" sorteia conforme o "weight"
     * de cada candidato; "difficulty" segue a dificuldade do covil.
     * Candidatos cujo "nextTable" está em tabelasProibidas não participam da escolha.
     * Retorna null se não sobrar nenhum candidato.
     */
    escolherEntre(candidatos, selecao, dificuldade, tabelasProibidas = new Set()) {
        const opcoes = candidatos.filter(candidato => !tabelasProibidas.has(candidato.nextTable));
        if (opcoes.length === 0) return null;

        switch (selecao ?? 'random') {
            case 'random':
                return this.sortearAleatorio(opcoes);
            case 'weightedRandom':
                return this.sortearPonderado(opcoes);
            case 'difficulty':
                return this.escolherPorDificuldade(opcoes, dificuldade);
            default:
                throw new Error(`Seleção desconhecida: "${selecao}"`);
        }
    },

    /**
     * Procura o destino de um "nextTable": uma tabela de geração (tableId) ou uma lista de
     * itens (listId). "selection" é o método próprio da tabela, quando ela define um.
     */
    buscarDestino(id) {
        const tabela = this.dados.tabelas.get(id);
        if (tabela) return { tipo: 'tabela', candidatos: tabela.entries, selection: tabela.selection };

        const lista = this.dados.listas.get(id);
        if (lista) return { tipo: 'lista', candidatos: lista };

        return null;
    },

    /**
     * Segue a entrada até um item. Se a entrada tem "item", ele é buscado pelo identificador.
     * Se tem "nextTable", escolhe um candidato nessa tabela/lista e repete o processo:
     * o método de seleção é o "selection" da própria tabela ou, se ela não define, o da entrada.
     * Retorna as entradas de tabela percorridas (da inicial até a última) e o item obtido
     * (null se a cadeia terminou sem item).
     *
     * Failsafe contra loops: a tabela de origem (tabelaInicial) e as já percorridas não podem ser
     * revisitadas, pois as entradas que apontam para elas deixam de ser sorteáveis
     * (ex.: natural <-> civilized).
     * Exceção: uma entrada que aponta para a própria tabela em que foi sorteada manda rolar
     * de novo nela (ex.: "Equipamento Intacto" em equipment). A tabela só entra na lista de
     * visitadas depois do primeiro sorteio, então essa entrada pode sair uma vez; na nova rolagem
     * a tabela já está visitada e a entrada deixa de ser sorteável, evitando repetição.
     * Para também se o destino não existe ou se não sobra nenhum candidato nele.
     */
    resolverCadeia(entrada, dificuldade, tabelaInicial) {
        const entradas = [entrada];
        const visitadas = new Set(tabelaInicial ? [tabelaInicial] : []);
        let tabelaAtual = tabelaInicial;
        let item = null;

        while (entrada.nextTable && (entrada.nextTable === tabelaAtual || !visitadas.has(entrada.nextTable))) {
            const destino = this.buscarDestino(entrada.nextTable);
            if (!destino?.candidatos.length) break;

            const escolhido = this.escolherEntre(
                destino.candidatos, destino.selection ?? entrada.selection, dificuldade, visitadas
            );
            if (!escolhido) break;

            if (destino.tipo === 'lista') {
                item = escolhido;
                break;
            }

            visitadas.add(entrada.nextTable);
            tabelaAtual = entrada.nextTable;
            entradas.push(escolhido);
            entrada = escolhido;
        }

        if (!item && entrada.item) item = this.dados.itens.get(entrada.item) ?? null;
        return { entradas, item };
    },

    /**
     * Nomes do caminho percorrido (entradas e item final), sem repetir nomes seguidos
     */
    caminhoDe(entradas, item) {
        const nomes = [...entradas, item].filter(Boolean).map(registro => this.nomeDe(registro));
        return nomes.filter((nome, i) => nome !== nomes[i - 1]);
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
        await this.importarDados();

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
     * seguindo o campo "nextTable" com resolverCadeia.)
     */
    gerarCivilizado() {
        const tabela = this.dados.tabelas.get(this.TABELA_CIVILIZADA);
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
            const categoria = this.escolherEntre(tabela.entries, tabela.selection, dificuldade);
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
     * tabelas (campo "nextTable"). Se a cadeia define "quantity", ele substitui a quantidade rolada.
     */
    gerarSelvagem() {
        const tabela = this.dados.tabelas.get(this.TABELA_SELVAGEM);
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

        const categoria = this.escolherEntre(tabela.entries, tabela.selection, dificuldade);
        const { entradas, item } = this.resolverCadeia(categoria, dificuldade, this.TABELA_SELVAGEM);
        const recurso = item ?? (entradas.length > 1 ? entradas.at(-1) : null);

        const linhas = [
            `Rolagens: ${rolagens.join(' + ')}`,
            `Tipo: ${this.nomeDe(categoria)}${recurso ? '' : ` (sem itens) x ${quantidade}`}`
        ];

        if (recurso) {
            const definida = this.rolarQuantidadeDaCadeia(entradas);
            const quantidadeFinal = definida ? definida.total : quantidade;
            const caminho = this.caminhoDe(entradas, item);

            if (caminho.length > 2) {
                linhas.push(`Caminho: ${caminho.join(' > ')}`);
            }
            if (definida) {
                linhas.push(`Quantidade: ${definida.total} (${definida.origem.quantity} de ${this.nomeDe(definida.origem)})`);
            }
            linhas.push(`Recurso: ${this.nomeDe(recurso)} x ${quantidadeFinal}`);

            const valor = this.valorDe(recurso) ?? this.valorDe(entradas.at(-1));
            if (valor !== undefined) {
                linhas.push(
                    `Preço unitário: ${valor} DO`,
                    `Preço total: ${valor * quantidadeFinal} DO`
                );
            }
        }

        this.exibirResultado(linhas);
    }
};
