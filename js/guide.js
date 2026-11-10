/**
 * Módulo do guia de regras
 * Carrega os termos do jogo (tooltips.json) e exibe cada categoria como uma página única,
 * com um botão de navegação para cada tópico
 */
const GuideModule = {
    ARQUIVO: 'src/tooltips.json',

    categorias: [],
    topicos: [],          // { botao, secao } de cada tópico da categoria aberta
    topicoAtual: null,
    observador: null,
    atualizando: false,

    /**
     * Carrega os termos, mostra as categorias e acompanha a rolagem da página
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
        window.addEventListener('scroll', () => this.aoRolar(), { passive: true });
    },

    // ===== Elementos =====

    /**
     * Cria um botão que chama aoClicar() quando clicado
     */
    criarBotao(texto, classe, aoClicar) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = classe;
        botao.textContent = texto;
        botao.addEventListener('click', aoClicar);
        return botao;
    },

    /**
     * Nome do termo com o ícone, quando houver
     */
    tituloDe(termo) {
        return [termo.icon, termo.name].filter(Boolean).join(' ');
    },

    /**
     * Mostra uma mensagem no lugar do conteúdo
     */
    mostrarDica(texto) {
        const dica = document.createElement('p');
        dica.className = 'guide-hint';
        dica.textContent = texto;

        document.getElementById('guideContent').replaceChildren(dica);
        this.topicos = [];
        this.topicoAtual = null;
    },

    // ===== Categorias =====

    /**
     * Mostra um botão para cada categoria
     */
    renderizarCategorias() {
        const container = document.getElementById('guideCategories');

        container.replaceChildren(...this.categorias.map(categoria => {
            const botao = this.criarBotao(categoria.title, 'guide-button guide-category', () => {
                container.querySelectorAll('button').forEach(outro => {
                    outro.classList.toggle('active', outro === botao);
                    outro.setAttribute('aria-pressed', String(outro === botao));
                });
                this.abrirCategoria(categoria);
            });
            botao.setAttribute('aria-pressed', 'false');
            return botao;
        }));
    },

    /**
     * Mostra todos os tópicos da categoria numa página só, com a navegação por botões
     */
    abrirCategoria(categoria) {
        const conteudo = document.getElementById('guideContent');

        const titulo = document.createElement('h3');
        titulo.className = 'guide-page-title';
        titulo.textContent = categoria.title;

        const navegacao = document.createElement('nav');
        navegacao.className = 'guide-nav';
        navegacao.setAttribute('aria-label', `Tópicos: ${categoria.title}`);

        const secoes = document.createElement('div');
        secoes.className = 'guide-topics';

        this.topicos = categoria.list.map(termo => {
            const item = { secao: this.criarSecao(termo) };
            item.botao = this.criarBotao(this.tituloDe(termo), 'guide-button guide-term', () => this.irParaTopico(item));
            return item;
        });

        navegacao.append(...this.topicos.map(item => item.botao));
        secoes.append(...this.topicos.map(item => item.secao));
        conteudo.replaceChildren(titulo, navegacao, secoes);

        // a navegação fica fixa no topo; as seções ajustam a margem de rolagem à altura dela
        this.observador?.disconnect();
        this.observador = new ResizeObserver(() => {
            conteudo.style.setProperty('--guide-nav-height', `${navegacao.offsetHeight}px`);
        });
        this.observador.observe(navegacao);

        this.topicoAtual = null;
        this.atualizarTopicoAtual();
    },

    /**
     * Cria a seção de um tópico, com o nome e a descrição
     */
    criarSecao(termo) {
        const secao = document.createElement('article');
        secao.className = 'guide-topic';

        const titulo = document.createElement('h4');
        titulo.textContent = this.tituloDe(termo);

        const descricao = document.createElement('p');
        descricao.textContent = termo.description;

        secao.append(titulo, descricao);
        return secao;
    },

    // ===== Navegação =====

    /**
     * Rola suavemente até o tópico e o destaca na navegação
     */
    irParaTopico(item) {
        this.marcarTopico(item);
        item.secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Destaca o botão do tópico atual e o mantém visível dentro da navegação
     */
    marcarTopico(atual) {
        if (!atual || atual === this.topicoAtual) return;
        this.topicoAtual = atual;

        this.topicos.forEach(item => {
            const ativo = item === atual;
            item.botao.classList.toggle('active', ativo);
            ativo ? item.botao.setAttribute('aria-current', 'true') : item.botao.removeAttribute('aria-current');
        });

        const navegacao = atual.botao.parentElement;
        const areaNav = navegacao.getBoundingClientRect();
        const areaBotao = atual.botao.getBoundingClientRect();
        if (areaBotao.top < areaNav.top) {
            navegacao.scrollTop -= areaNav.top - areaBotao.top + 4;
        } else if (areaBotao.bottom > areaNav.bottom) {
            navegacao.scrollTop += areaBotao.bottom - areaNav.bottom + 4;
        }
    },

    /**
     * Agrupa os eventos de rolagem em uma atualização por quadro
     */
    aoRolar() {
        if (this.atualizando) return;
        this.atualizando = true;
        requestAnimationFrame(() => {
            this.atualizando = false;
            this.atualizarTopicoAtual();
        });
    },

    /**
     * Descobre qual tópico está sendo lido: o último que já passou da navegação fixa
     * (o primeiro, se nenhum passou; o último, se a página chegou ao fim)
     */
    atualizarTopicoAtual() {
        const navegacao = document.querySelector('#guideContent .guide-nav');
        if (!navegacao?.offsetParent || this.topicos.length === 0) return;

        const limite = navegacao.getBoundingClientRect().bottom + 20;
        let atual = this.topicos[0];
        for (const item of this.topicos) {
            if (item.secao.getBoundingClientRect().top > limite) break;
            atual = item;
        }

        const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        this.marcarTopico(noFim ? this.topicos.at(-1) : atual);
    }
};
