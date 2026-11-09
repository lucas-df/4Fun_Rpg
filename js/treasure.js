/**
 * Módulo de dados de tesouros
 *
 * Estrutura dos dados (JSON):
 * - Tabelas de geração (loot_tables.json): "tableId" + "entries". Cada entrada referencia um item
 *   ("item") ou uma tabela/lista seguinte ("nextTable"). O método de seleção na tabela/lista
 *   seguinte ("selection") e a quantidade obtida ("quantity") ficam na entrada que aponta para ela.
 *   O "desc" da entrada descreve esse passo e forma o caminho exibido (ex.: Item Mundano > Suprimento).
 * - Listas de itens (demais arquivos): "listId" + "list".
 * - Itens: identificados pelo campo "item".
 *
 * As tabelas não podem formar ciclos (uma tabela que, seguindo "nextTable", volta a si mesma).
 * Por isso existem versões restritas (ex.: naturalTableRestricted e civilizedTableRestricted),
 * sem as entradas que levariam de volta à tabela de origem. validarDados avisa se houver ciclos.
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
            if (tabela.selection !== undefined) {
                problemas.push(`Tabela "${tabela.tableId}": "selection" na tabela é ignorado; ele deve ficar na entrada que aponta para ela`);
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

        for (const ciclo of this.encontrarCiclos()) {
            problemas.push(`Ciclo entre tabelas: ${ciclo}`);
        }
        return problemas;
    },

    /**
     * Procura ciclos entre as tabelas de geração, seguindo o campo "nextTable".
     * Retorna o caminho de cada ciclo encontrado (ex.: "tabelaA > tabelaB > tabelaA").
     */
    encontrarCiclos() {
        const { tabelas } = this.dados;
        const ciclos = [];
        const estados = new Map(); // id da tabela -> 'visitando' | 'concluida'

        const visitar = (id, caminho) => {
            if (estados.get(id) === 'concluida') return;
            if (estados.get(id) === 'visitando') {
                ciclos.push([...caminho.slice(caminho.indexOf(id)), id].join(' > '));
                return;
            }

            estados.set(id, 'visitando');
            for (const entrada of tabelas.get(id).entries) {
                if (tabelas.has(entrada.nextTable)) visitar(entrada.nextTable, [...caminho, id]);
            }
            estados.set(id, 'concluida');
        };

        for (const id of tabelas.keys()) visitar(id, []);
        return ciclos;
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
     */
    escolherEntre(candidatos, selecao, dificuldade) {
        switch (selecao ?? 'random') {
            case 'random':
                return this.sortearAleatorio(candidatos);
            case 'weightedRandom':
                return this.sortearPonderado(candidatos);
            case 'difficulty':
                return this.escolherPorDificuldade(candidatos, dificuldade);
            default:
                throw new Error(`Seleção desconhecida: "${selecao}"`);
        }
    },

    /**
     * Procura o destino de um "nextTable": uma tabela de geração (tableId) ou uma lista de
     * itens (listId).
     */
    buscarDestino(id) {
        const tabela = this.dados.tabelas.get(id);
        if (tabela) return { tipo: 'tabela', candidatos: tabela.entries };

        const lista = this.dados.listas.get(id);
        if (lista) return { tipo: 'lista', candidatos: lista };

        return null;
    },

    /**
     * Segue a entrada até um item. Se a entrada tem "item", ele é buscado pelo identificador.
     * Se tem "nextTable", escolhe um candidato nessa tabela/lista, com o método de seleção
     * ("selection") da própria entrada, e repete o processo.
     * Retorna as entradas de tabela percorridas (da inicial até a última) e o item obtido
     * (null se a cadeia terminou sem item). Para se o destino não existe ou está vazio.
     */
    resolverCadeia(entrada, dificuldade) {
        const entradas = [entrada];
        let item = null;

        while (entrada.nextTable) {
            const destino = this.buscarDestino(entrada.nextTable);
            if (!destino?.candidatos.length) break;

            const escolhido = this.escolherEntre(destino.candidatos, entrada.selection, dificuldade);
            if (destino.tipo === 'lista') {
                item = escolhido;
                break;
            }

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
     * Segue a cadeia a partir de uma categoria sorteada e calcula o que foi obtido: o recurso final,
     * o caminho percorrido, a quantidade (a definida pela cadeia, se houver; senão quantidadeBase)
     * e o valor unitário em DO (undefined se o recurso não tem valor).
     * "recurso" é null quando a cadeia terminou na própria categoria, sem item.
     */
    obterRecurso(categoria, dificuldade, quantidadeBase) {
        const { entradas, item } = this.resolverCadeia(categoria, dificuldade);
        const recurso = item ?? (entradas.length > 1 ? entradas.at(-1) : null);
        const definida = recurso ? this.rolarQuantidadeDaCadeia(entradas) : null;

        return {
            recurso,
            definida,
            caminho: this.caminhoDe(entradas, item),
            quantidade: definida ? definida.total : quantidadeBase,
            valorUnitario: recurso ? (this.valorDe(recurso) ?? this.valorDe(entradas.at(-1))) : undefined
        };
    },

    /**
     * Monta uma linha por rolagem, na ordem em que ocorreram, com o caminho percorrido, a quantidade
     * e o valor em DO. Retorna as linhas e o valor total dos itens.
     */
    descreverObtidos(obtidos) {
        let valorItens = 0;

        const linhas = obtidos.map((obtido, i) => {
            const linha = `${i + 1}. ${obtido.caminho.join(' > ')}`;
            if (!obtido.recurso) return `${linha} (sem itens)`;

            const valor = (obtido.valorUnitario ?? 0) * obtido.quantidade;
            valorItens += valor;

            const dados = obtido.definida ? ` (${obtido.definida.origem.quantity})` : '';
            return `${linha} x ${obtido.quantidade}${dados}${valor > 0 ? ` — ${valor} DO` : ''}`;
        });
        return { linhas, valorItens };
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
     * Civilizado: a rolagem define o valor total (DO). A cada VALOR_POR_ITEM DO desse valor,
     * faz-se uma geração: sorteia-se uma categoria e segue-se a cadeia até o recurso, com a
     * quantidade definida pelo "quantity" da cadeia (1 se não houver). Depois de todas as gerações,
     * o valor dos itens é subtraído do valor total; se sobrar dinheiro, ele também faz parte do tesouro.
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
        const geracoes = Math.floor(valorTotal / this.VALOR_POR_ITEM);

        const obtidos = Array.from({ length: geracoes }, () => {
            const categoria = this.escolherEntre(tabela.entries, 'random', dificuldade);
            return this.obterRecurso(categoria, dificuldade, 1);
        });
        const { linhas: linhasItens, valorItens } = this.descreverObtidos(obtidos);

        const linhas = [`Rolagem: ${rolagem}`, `Valor total: ${valorTotal} DO`];

        if (geracoes === 0) {
            linhas.push(`Nenhum item (valor abaixo de ${this.VALOR_POR_ITEM} DO)`);
        } else {
            linhas.push(`Itens: ${geracoes}`, ...linhasItens, `Valor dos itens: ${valorItens} DO`);
        }

        const dinheiroRestante = valorTotal - valorItens;
        if (dinheiroRestante > 0) {
            linhas.push(`Dinheiro restante: ${dinheiroRestante} DO`);
        }

        this.exibirResultado(linhas);
    },

    /**
     * Categoria com "rolls" (ex.: "1d6"): rola-se esse número de vezes na tabela seguinte,
     * como nas gerações do modo civilizado, com quantidade 1 quando a cadeia não define "quantity".
     */
    gerarRolagensNaTabela(categoria, dificuldade) {
        const nome = this.nomeDe(categoria);
        const rolagens = this.rolarNotacao(categoria.rolls);
        const quantidadeRolagens = rolagens.reduce((soma, rolagem) => soma + rolagem, 0);

        const obtidos = Array.from({ length: quantidadeRolagens }, () => this.obterRecurso(categoria, dificuldade, 1));
        const { linhas, valorItens } = this.descreverObtidos(obtidos);

        this.exibirResultado([
            `Tipo: ${nome}`,
            `Rolagens: ${quantidadeRolagens} (${categoria.rolls} de ${nome})`,
            ...linhas,
            `Valor dos itens: ${valorItens} DO`
        ]);
    },

    /**
     * Selvagem: a rolagem define a quantidade de recursos (cada 6 rola outro dado, limitado
     * ao andar do covil). Uma categoria é sorteada e o recurso vem de seguir a cadeia de
     * tabelas (campo "nextTable"). Se a cadeia define "quantity", ele substitui a quantidade rolada.
     * Exceção: se a categoria tem o campo "rolls" (ex.: Item Mundano, "1d6"), a quantidade de
     * recursos é ignorada e a tabela seguinte é rolada esse número de vezes (ver gerarRolagensNaTabela).
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

        const categoria = this.escolherEntre(tabela.entries, 'random', dificuldade);
        if (categoria.rolls) {
            this.gerarRolagensNaTabela(categoria, dificuldade);
            return;
        }

        const { recurso, definida, caminho, quantidade: quantidadeFinal, valorUnitario } =
            this.obterRecurso(categoria, dificuldade, quantidade);

        const linhas = [
            `Rolagens: ${rolagens.join(' + ')}`,
            `Tipo: ${this.nomeDe(categoria)}${recurso ? '' : ` (sem itens) x ${quantidade}`}`
        ];

        if (recurso) {
            if (caminho.length > 2) {
                linhas.push(`Caminho: ${caminho.join(' > ')}`);
            }
            if (definida) {
                linhas.push(`Quantidade: ${definida.total} (${definida.origem.quantity} de ${this.nomeDe(definida.origem)})`);
            }
            linhas.push(`Recurso: ${this.nomeDe(recurso)} x ${quantidadeFinal}`);

            if (valorUnitario !== undefined) {
                linhas.push(
                    `Preço unitário: ${valorUnitario} DO`,
                    `Preço total: ${valorUnitario * quantidadeFinal} DO`
                );
            }
        }

        this.exibirResultado(linhas);
    }
};
