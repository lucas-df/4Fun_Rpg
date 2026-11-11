/**
 * Módulo de tooltips
 * Mostra a descrição de um termo do jogo (tooltips.json) ao passar o mouse, focar ou tocar
 * em qualquer elemento marcado com o atributo data-tooltip.
 *
 * Uso no HTML: <span data-tooltip="stunned">atordoados</span>
 * O valor é o "id" do termo no tooltips.json; o texto visível pode ser qualquer palavra.
 */
const TooltipModule = {
    ARQUIVO: 'src/tooltips.json',
    MARGEM: 8,

    categorias: [],
    termos: new Map(),      // id do termo -> termo
    promessa: null,
    caixa: null,
    alvoAtual: null,
    tipoPonteiro: null,
    avisados: new Set(),

    // ===== Dados =====

    /**
     * Carrega o tooltips.json uma única vez e indexa os termos pelo id.
     * Retorna as categorias (também usadas pelo guia de regras).
     */
    carregar() {
        this.promessa ??= fetch(this.ARQUIVO)
            .then(response => response.json())
            .then(categorias => {
                this.categorias = categorias;
                this.termos = new Map();
                categorias.flatMap(categoria => categoria.list).forEach(termo => {
                    if (this.termos.has(termo.id)) console.warn(`Tooltip: id de termo duplicado "${termo.id}"`);
                    this.termos.set(termo.id, termo);
                });
                return categorias;
            })
            .catch(error => {
                this.promessa = null;
                throw error;
            });
        return this.promessa;
    },

    // ===== Inicialização =====

    /**
     * Cria a caixa de tooltip, registra os eventos e prepara os elementos marcados
     */
    init() {
        this.caixa = document.createElement('div');
        this.caixa.className = 'tooltip-box';
        this.caixa.id = 'tooltipBox';
        this.caixa.setAttribute('role', 'tooltip');
        document.body.appendChild(this.caixa);

        const alvoDe = evento => evento.target.closest?.('[data-tooltip]');

        // Um toque dispara vários eventos (mouseover emulado, foco, clique). Por isso o último tipo de
        // interação ('mouse', 'touch', 'pen' ou 'teclado') decide quais eventos mostram ou escondem
        // o tooltip: no toque, só o clique, que alterna entre mostrar e esconder.
        ['pointerover', 'pointerdown'].forEach(tipo => {
            document.addEventListener(tipo, evento => { this.tipoPonteiro = evento.pointerType; });
        });

        document.addEventListener('mouseover', evento => {
            const alvo = alvoDe(evento);
            if (alvo && this.tipoPonteiro !== 'touch') this.mostrar(alvo);
        });
        document.addEventListener('mouseout', evento => {
            const alvo = alvoDe(evento);
            if (alvo && !alvo.contains(evento.relatedTarget) && this.tipoPonteiro !== 'touch') this.esconder();
        });
        document.addEventListener('focusin', evento => {
            const alvo = alvoDe(evento);
            if (alvo && this.tipoPonteiro !== 'touch') this.mostrar(alvo);
        });
        document.addEventListener('focusout', evento => {
            if (alvoDe(evento) && this.tipoPonteiro !== 'touch') this.esconder();
        });
        document.addEventListener('click', evento => {
            if (this.tipoPonteiro !== 'touch') return;

            const alvo = alvoDe(evento);
            if (alvo && alvo !== this.alvoAtual) {
                this.mostrar(alvo);
            } else if (alvo || evento.target !== this.alvoAtual?.closest('label')?.control) {
                // (o clique que um <label> repassa ao seu campo não conta como toque fora)
                this.esconder();
            }
        });
        document.addEventListener('keydown', evento => {
            this.tipoPonteiro = 'teclado';
            if (evento.key === 'Escape') this.esconder();
        });
        window.addEventListener('scroll', () => this.esconder(), { passive: true, capture: true });
        window.addEventListener('resize', () => this.esconder());

        this.preparar(document.body);
        new MutationObserver(mutacoes => {
            mutacoes.forEach(mutacao => mutacao.addedNodes.forEach(no => {
                if (no.nodeType === Node.ELEMENT_NODE) this.preparar(no);
            }));
        }).observe(document.body, { childList: true, subtree: true });

        this.carregar().catch(error => console.error('Erro ao carregar os tooltips:', error));
    },

    /**
     * Torna os elementos marcados alcançáveis pelo teclado (os que já são focáveis ficam como estão)
     */
    preparar(raiz) {
        const marcados = [...raiz.querySelectorAll('[data-tooltip]')];
        if (raiz.matches('[data-tooltip]')) marcados.push(raiz);

        marcados.forEach(elemento => {
            if (!elemento.matches('a[href], button, input, select, textarea, [tabindex]')) {
                elemento.tabIndex = 0;
            }
        });
    },

    // ===== Exibição =====

    /**
     * Mostra o tooltip do termo indicado em data-tooltip, perto do elemento
     */
    mostrar(alvo) {
        const id = alvo.dataset.tooltip;
        const termo = this.termos.get(id);

        if (!termo) {
            if (this.termos.size > 0 && !this.avisados.has(id)) {
                this.avisados.add(id);
                console.warn(`Tooltip: termo "${id}" não encontrado no tooltips.json`);
            }
            return;
        }
        if (alvo === this.alvoAtual) return;
        this.esconder();

        const titulo = document.createElement('strong');
        titulo.textContent = [termo.icon, termo.name].filter(Boolean).join(' ');
        const descricao = document.createElement('p');
        descricao.textContent = termo.description;
        this.caixa.replaceChildren(titulo, descricao);

        this.alvoAtual = alvo;
        alvo.setAttribute('aria-describedby', this.caixa.id);
        this.posicionar(alvo);
    },

    /**
     * Posiciona a caixa abaixo do elemento (ou acima, se faltar espaço), dentro da tela
     */
    posicionar(alvo) {
        const caixa = this.caixa;
        caixa.style.display = 'block';

        const area = alvo.getBoundingClientRect();
        const { width, height } = caixa.getBoundingClientRect();

        const esquerda = Math.min(
            Math.max(area.left + area.width / 2 - width / 2, this.MARGEM),
            window.innerWidth - width - this.MARGEM
        );
        let topo = area.bottom + this.MARGEM;
        if (topo + height > window.innerHeight - this.MARGEM && area.top - height - this.MARGEM >= this.MARGEM) {
            topo = area.top - height - this.MARGEM;
        }

        topo = Math.max(this.MARGEM, Math.min(topo, window.innerHeight - height - this.MARGEM));

        caixa.style.left = `${esquerda}px`;
        caixa.style.top = `${topo}px`;
    },

    /**
     * Esconde o tooltip
     */
    esconder() {
        if (!this.alvoAtual) return;
        this.alvoAtual.removeAttribute('aria-describedby');
        this.alvoAtual = null;
        this.caixa.style.display = 'none';
    }
};
