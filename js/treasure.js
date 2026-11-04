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
     * Carrega os recursos do JSON
     */
    async carregarRecursos() {
        if (this.resources) return this.resources;
        const response = await fetch('src/resources.json');
        this.resources = await response.json();
        return this.resources;
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
    gerar() {

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
            const tabelaSelvagem = [
                'Recurso Medicinal',
                'Espada Rústica',
                'Escudo de Madeira',
                'Anel de Cobre',
                'Mochila de Couro',
                'Tocha Acesa'
            ];
            const recursosSelecionados = [];
            for (let i = 0; i < 6; i++) {
                const indice = this.rolarDado() % tabelaSelvagem.length;
                recursosSelecionados.push(tabelaSelvagem[indice]);
            }
            const listaRecursos = recursosSelecionados.join(', ');
            resultDiv.innerHTML = `Rolagens: ${rolagens.join(' + ')}<br>Total: ${total}<br>Recursos selvagens: ${listaRecursos}`;
        }

        resultDiv.style.display = 'block';
    }
};
