/**
 * Módulo de dados de tesouros
 */
const TreasureDataModule = {
    generationType: null,
    resources: null,

    /**
     * Rol um número aleatório de 1 a 6, simulando um dado
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
     * Carrega os recursos do JSON
     */
    async carregarRecursos() {
        return this.importarTabelaRecursos();
    },

    /**
     * Define o tipo de geração e atualiza a interface
     */
    setGenerationType(type) {
        this.generationType = type;

        document.querySelectorAll('#treasure .tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(type === 'civilizado' ? 'civilizadoTab' : 'selvagemTab').classList.add('active');

        const btn = document.getElementById('gerarTesouroBtn');
        if (btn) btn.disabled = false;
    },

    /**
     * Gera um tesouro e exibe o resultado na interface
     */
    async gerar() {

        await this.importarTabelaRecursos();

        let result = this.rolarDado();
        const rolagens = [result];

        if ((result === 6) && (this.generationType === 'selvagem')) {
            const andar = parseInt(document.getElementById('covilAndar').value) || 1;


            let dadosRolados = 1;
            while (dadosRolados < andar) {
                result = this.rolarDado();
                dadosRolados++

                rolagens.push(result)

                if (result < 6) {
                    break
                }
            }
        }

        let total = 0

        for (var i in rolagens) {
            total += rolagens[i];
        }

        const resultDiv = document.getElementById('treasureResult');

        if (this.generationType === 'civilizado') {
            const diff = parseInt(document.getElementById('covilDificuldade').value) || 1;
            resultDiv.innerHTML = `Tesouro: ${total * 50 * diff} DO`;
        } else {
            const naturalResources = this.resources?.naturalResources || [];
            if (naturalResources.length === 0) {
                resultDiv.innerHTML = `Rolagens: ${rolagens.join(' + ')}<br> Recursos selvagens: Nenhum recurso encontrado`;
                resultDiv.style.display = 'block';
                return;
            }
            const tipoDado = this.rolarDado();
            const tipoIndice = tipoDado - 1;
            const tipoRecurso = naturalResources[tipoIndice >= 0 && tipoIndice < naturalResources.length ? tipoIndice : 0];
            const tipoChave = tipoRecurso.value;
            const listaRecursos = this.resources?.[tipoChave] || [];
            if (listaRecursos.length === 0) {
                resultDiv.innerHTML = `Rolagens: ${rolagens.join(' + ')}<br> Tipo: ${tipoRecurso.name} (sem itens) x ${total}`;
                resultDiv.style.display = 'block';
                return;
            }
            const dificuldadeCovil = parseInt(document.getElementById('covilDificuldade').value) || 1;
            const recursoIndice = Math.min(Math.max(dificuldadeCovil - 1, 0), listaRecursos.length - 1);
            const recurso = listaRecursos[recursoIndice];
            const precoUnitario = recurso.value !== undefined ? recurso.value : 0;
            const precoTotal = precoUnitario * total;
            resultDiv.innerHTML = `Rolagens: ${rolagens.join(' + ')}<br> Tipo: ${tipoRecurso.name}<br> Recurso: ${recurso.desc || recurso.name} x ${total}<br> Preço unitário: ${precoUnitario} DO<br> Preço total: ${precoTotal} DO`;
        }

        resultDiv.style.display = 'block';
    }
};
