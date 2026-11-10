/**
 * Módulo de tooltips
 * Marca as palavras-chave do jogo (termos do tooltips.json) nos textos da página e mostra a
 * descrição do termo ao passar o mouse, focar ou tocar na palavra.
 *
 * Só são processados os elementos com o atributo "data-tooltips", inclusive o que for
 * adicionado a eles depois. Dentro deles, "data-tooltip-skip" com o id de um termo impede que
 * esse termo seja marcado no próprio texto (ex.: a seção do termo no guia de regras).
 * As palavras são reconhecidas com a mesma grafia do tooltips.json (maiúsculas incluídas),
 * no singular e no plural, e também pelos nomes extras do campo opcional "aliases" do termo.
 */
const TooltipModule = {
    ARQUIVO: 'src/tooltips.json',

    // Categorias cujos termos não são palavras-chave (são tópicos explicativos)
    CATEGORIAS_IGNORADAS: ['system'],

    // Elementos cujo texto nunca é marcado
    SELETOR_EXCLUIDO: 'button, a, h1, h2, h3, h4, h5, h6, textarea, input, select, script, style, code, pre, .tooltip-term',

    // Palavras que não vão para o plural em nomes compostos (ex.: "Ordem de Ação")
    PALAVRAS_DE_LIGACAO: ['a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'em'],

    ID_CAIXA: 'tooltipBox',

    termos: new Map(),    // id do termo -> termo
    formas: new Map(),    // palavra escrita no texto -> termo
    expressao: null,
    caixa: null,
    alvoAtual: null,
    observador: null,

    /**
     * Carrega os termos, prepara a caixa de tooltip e começa a marcar as palavras-chave
     */
    async init() {
        try {
            const response = await fetch(this.ARQUIVO);
            this.prepararTermos(await response.json());
        } catch (error) {
            console.error('Erro ao carregar os termos dos tooltips:', error);
            return;
        }

        this.caixa = this.criarCaixa();
        this.observador = new MutationObserver(registros => this.aoMudar(registros));
        document.querySelectorAll('[data-tooltips]').forEach(container => this.observar(container));
        this.registrarEventos();
    },

    // ===== Termos =====

    /**
     * Monta o índice de termos e a expressão que reconhece todas as palavras-chave
     */
    prepararTermos(categorias) {
        for (const categoria of categorias) {
            if (this.CATEGORIAS_IGNORADAS.includes(categoria.id)) continue;

            for (const termo of categoria.list) {
                this.termos.set(termo.id, termo);
                for (const forma of this.formasDe(termo)) {
                    if (!this.formas.has(forma)) this.formas.set(forma, termo);
                }
            }
        }

        // as formas mais longas primeiro, para "Acerto Crítico" vencer "Acerto"
        const alternativas = [...this.formas.keys()]
            .sort((a, b) => b.length - a.length)
            .map(forma => forma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // limites de palavra com letras acentuadas (o \b do JavaScript só conhece ASCII)
        this.expressao = new RegExp(`(^|[^\\p{L}\\p{N}])(${alternativas.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
    },

    /**
     * Palavras que representam o termo no texto: o nome, o plural, o feminino e o plural do
     * feminino (nomes de uma palavra terminados em "o") e os "aliases" do termo
     */
    formasDe(termo) {
        const formas = new Set([termo.name, ...(termo.aliases ?? [])]);
        const palavras = termo.name.split(' ');

        if (!termo.name.includes('-')) {
            formas.add(palavras
                .map(palavra => this.PALAVRAS_DE_LIGACAO.includes(palavra.toLowerCase()) ? palavra : this.plural(palavra))
                .join(' '));
        }
        if (palavras.length === 1 && termo.name.endsWith('o')) {
            const radical = termo.name.slice(0, -1);
            formas.add(`${radical}a`).add(`${radical}as`);
        }
        return formas;
    },

    /**
     * Plural de uma palavra (regras gerais do português)
     */
    plural(palavra) {
        if (palavra.endsWith('s')) return palavra;
        if (palavra.endsWith('ão')) return `${palavra.slice(0, -2)}ões`;
        if (palavra.endsWith('al') || palavra.endsWith('el') || palavra.endsWith('ol') || palavra.endsWith('ul')) {
            return `${palavra.slice(0, -1)}is`;
        }
        if (palavra.endsWith('il')) return `${palavra.slice(0, -2)}is`;
        if (palavra.endsWith('m')) return `${palavra.slice(0, -1)}ns`;
        if (/[rz]$/.test(palavra)) return `${palavra}es`;
        return `${palavra}s`;
    },

    // ===== Marcação do texto =====

    /**
     * Começa a marcar o texto do elemento, agora e a cada conteúdo adicionado a ele
     */
    observar(container) {
        this.aplicar(container);
        this.observador.observe(container, { childList: true, subtree: true });
    },

    /**
     * Marca o que foi adicionado à página (as marcações feitas aqui não disparam nova passagem)
     */
    aoMudar(registros) {
        registros.forEach(registro => registro.addedNodes.forEach(no => this.aplicar(no)));
        this.observador.takeRecords();
    },

    /**
     * Marca as palavras-chave de todos os textos dentro do nó
     */
    aplicar(raiz) {
        const nos = [];
        if (raiz.nodeType === Node.TEXT_NODE) {
            nos.push(raiz);
        } else if (raiz.nodeType === Node.ELEMENT_NODE) {
            const percurso = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
            while (percurso.nextNode()) nos.push(percurso.currentNode);
        }

        // a lista é montada antes de alterar a página, que muda durante a marcação
        nos.filter(no => this.podeMarcar(no)).forEach(no => this.marcarTexto(no));
    },

    /**
     * Um texto pode ser marcado se tem conteúdo e não está num elemento excluído
     */
    podeMarcar(no) {
        const pai = no.parentElement;
        return pai && no.nodeValue.trim() !== '' && !pai.closest(this.SELETOR_EXCLUIDO);
    },

    /**
     * Troca cada palavra-chave do texto por um elemento marcado
     */
    marcarTexto(no) {
        const texto = no.nodeValue;
        const proprio = no.parentElement.closest('[data-tooltip-skip]')?.dataset.tooltipSkip;
        const partes = [];
        let fim = 0;

        this.expressao.lastIndex = 0;
        let achado;
        while ((achado = this.expressao.exec(texto))) {
            const inicio = achado.index + achado[1].length;
            const termo = this.formas.get(achado[2]);
            if (termo.id === proprio) continue;

            partes.push(document.createTextNode(texto.slice(fim, inicio)), this.criarPalavra(achado[2], termo));
            fim = inicio + achado[2].length;
        }

        if (partes.length === 0) return;
        partes.push(document.createTextNode(texto.slice(fim)));
        no.replaceWith(...partes);
    },

    /**
     * Elemento que marca a palavra-chave no texto
     */
    criarPalavra(texto, termo) {
        const palavra = document.createElement('span');
        palavra.className = 'tooltip-term';
        palavra.dataset.tooltip = termo.id;
        palavra.tabIndex = 0;
        palavra.textContent = texto;
        return palavra;
    },

    // ===== Caixa de tooltip =====

    criarCaixa() {
        const caixa = document.createElement('div');
        caixa.id = this.ID_CAIXA;
        caixa.className = 'tooltip-box';
        caixa.setAttribute('role', 'tooltip');
        document.body.appendChild(caixa);
        return caixa;
    },

    /**
     * Mostra o nome e a descrição do termo ao lado da palavra
     */
    mostrar(alvo, evento) {
        const termo = this.termos.get(alvo.dataset.tooltip);
        if (!termo) return;
        this.esconder();

        const titulo = document.createElement('strong');
        titulo.textContent = [termo.icon, termo.name].filter(Boolean).join(' ');
        const descricao = document.createElement('span');
        descricao.textContent = termo.description;

        this.caixa.replaceChildren(titulo, descricao);
        this.caixa.style.display = 'block';
        this.posicionar(alvo, evento);

        this.alvoAtual = alvo;
        alvo.setAttribute('aria-describedby', this.ID_CAIXA);
    },

    esconder() {
        this.caixa.style.display = 'none';
        this.alvoAtual?.removeAttribute('aria-describedby');
        this.alvoAtual = null;
    },

    /**
     * Posiciona a caixa acima da palavra (ou abaixo, se não couber), dentro da tela.
     * Se a palavra quebra de linha, usa o trecho sob o mouse.
     */
    posicionar(alvo, evento) {
        const trechos = [...alvo.getClientRects()];
        const area = (evento && trechos.find(r =>
            evento.clientX >= r.left && evento.clientX <= r.right && evento.clientY >= r.top && evento.clientY <= r.bottom
        )) || trechos[0];

        const margem = 8;
        this.caixa.style.left = '0px';
        this.caixa.style.top = '0px';
        const { width, height } = this.caixa.getBoundingClientRect();

        const esquerda = area.left + area.width / 2 - width / 2;
        let topo = area.top - height - margem;
        if (topo < margem) topo = area.bottom + margem;

        this.caixa.style.left = `${Math.max(margem, Math.min(esquerda, window.innerWidth - width - margem))}px`;
        this.caixa.style.top = `${Math.max(margem, Math.min(topo, window.innerHeight - height - margem))}px`;
    },

    // ===== Eventos =====

    registrarEventos() {
        const palavraDe = evento => evento.target.closest?.('.tooltip-term');

        document.addEventListener('mouseover', evento => {
            const alvo = palavraDe(evento);
            if (alvo && alvo !== this.alvoAtual) this.mostrar(alvo, evento);
        });
        document.addEventListener('mouseout', evento => {
            const alvo = palavraDe(evento);
            if (alvo && !alvo.contains(evento.relatedTarget)) this.esconder();
        });
        document.addEventListener('focusin', evento => {
            const alvo = palavraDe(evento);
            if (alvo) this.mostrar(alvo);
        });
        document.addEventListener('focusout', evento => {
            if (palavraDe(evento)) this.esconder();
        });
        // toque: tocar na palavra mostra a descrição; tocar fora esconde
        document.addEventListener('click', evento => {
            const alvo = palavraDe(evento);
            alvo ? this.mostrar(alvo, evento) : this.esconder();
        });
        document.addEventListener('keydown', evento => {
            if (evento.key === 'Escape') this.esconder();
        });
        window.addEventListener('scroll', () => this.esconder(), { capture: true, passive: true });
        window.addEventListener('resize', () => this.esconder());
    }
};
