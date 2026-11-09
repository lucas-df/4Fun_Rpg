/**
 * Módulo do guia de regras
 * Carrega os termos do jogo (tooltips.json) e os exibe em categorias de botões interativos
 */
const GuideModule = {
    ARQUIVO: 'src/tooltips.json',

    // Nome exibido de cada categoria (ids do tooltips.json)
    NOMES_CATEGORIAS: {
        conditions: 'Condições',
        rolls: 'Testes e Rolagens',
        basicCombat: 'Combate',
        exploration: 'Exploração'
    },

    categorias: [],

    /**
     * Carrega os termos e mostra as categorias
     */
    async init() {
        try {
            const response = await fetch(this.ARQUIVO);
            this.categorias = await response.json();
        } catch (error) {
            console.error('Erro ao carregar o guia de regras:', error);
            this.mostrarDica('Não foi possível carregar o guia de regras.');
            return;
        }

        this.renderizarCategorias();
        this.mostrarDica('Escolha uma categoria para começar.');
    },

    // ===== Elementos =====

    /**
     * Cria um botão que chama aoClicar(botao) quando clicado
     */
    criarBotao(texto, classe, aoClicar) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = classe;
        botao.textContent = texto;
        botao.setAttribute('aria-pressed', 'false');
        botao.addEventListener('click', () => aoClicar(botao));
        return botao;
    },

    /**
     * Destaca o botão escolhido dentro do container e remove o destaque dos demais
     */
    marcarSelecionado(container, selecionado) {
        container.querySelectorAll('button').forEach(botao => {
            const ativo = botao === selecionado;
            botao.classList.toggle('active', ativo);
            botao.setAttribute('aria-pressed', String(ativo));
        });
    },

    // ===== Renderização =====

    /**
     * Mostra um botão para cada categoria
     */
    renderizarCategorias() {
        const container = document.getElementById('guideCategories');

        container.replaceChildren(...this.categorias.map(categoria => {
            const nome = this.NOMES_CATEGORIAS[categoria.id] ?? categoria.id;
            return this.criarBotao(`${nome} (${categoria.list.length})`, 'guide-button guide-category', botao => {
                this.marcarSelecionado(container, botao);
                this.renderizarTermos(categoria);
            });
        }));
    },

    /**
     * Mostra um botão para cada termo da categoria
     */
    renderizarTermos(categoria) {
        const container = document.getElementById('guideTerms');

        container.replaceChildren(...categoria.list.map(termo =>
            this.criarBotao(this.tituloDe(termo), 'guide-button guide-term', botao => {
                this.marcarSelecionado(container, botao);
                this.mostrarDescricao(termo);
            })
        ));
        this.mostrarDica('Escolha um termo para ver a descrição.');
    },

    /**
     * Mostra o nome e a descrição de um termo
     */
    mostrarDescricao(termo) {
        const titulo = document.createElement('h3');
        titulo.textContent = this.tituloDe(termo);

        const descricao = document.createElement('p');
        descricao.textContent = termo.description;

        document.getElementById('guideDetail').replaceChildren(titulo, descricao);
    },

    /**
     * Mostra uma mensagem no painel de descrição
     */
    mostrarDica(texto) {
        const dica = document.createElement('p');
        dica.className = 'guide-hint';
        dica.textContent = texto;

        document.getElementById('guideDetail').replaceChildren(dica);
    },

    /**
     * Nome do termo com o ícone, quando houver
     */
    tituloDe(termo) {
        return [termo.icon, termo.name].filter(Boolean).join(' ');
    }
};
