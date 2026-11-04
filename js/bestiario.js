/**
 * Módulo de dados do bestiário
 * Responsável por persistência, CRUD e importação/exportação
 */
const BestiarioDataModule = {
    /**
     * Carrega todos os monstros do localStorage
     */
    carregar() {
        const data = localStorage.getItem('monsters');
        return data ? JSON.parse(data) : [];
    },

    /**
     * Salva monstros no localStorage
     */
    salvar(monstros) {
        localStorage.setItem('monsters', JSON.stringify(monstros));
    },

    /**
     * Adiciona um novo monstro ao bestiário
     */
    adicionar(monstro) {
        const monstros = this.carregar();
        monstros.push(monstro);
        this.salvar(monstros);
    },

    /**
     * Remove um monstro pelo índice
     */
    remover(index) {
        const monstros = this.carregar();
        monstros.splice(index, 1);
        this.salvar(monstros);
    },

    /**
     * Limpa todos os monstros do bestiário
     */
    limpar() {
        this.salvar([]);
    },

    /**
     * Verifica se já existe um monstro duplicado
     */
    isDuplicado(novoMonstro) {
        const monstros = this.carregar();
        return monstros.some(m =>
            m.name === novoMonstro.name &&
            m.type === novoMonstro.type &&
            m.diff === novoMonstro.diff &&
            m.attack === novoMonstro.attack &&
            m.defense === novoMonstro.defense &&
            m.description === novoMonstro.description &&
            m.strategy === novoMonstro.strategy &&
            JSON.stringify(m.skills) === JSON.stringify(novoMonstro.skills)
        );
    },

    /**
     * Exporta todos os monstros para um arquivo JSON
     */
    exportar() {
        const monstros = this.carregar();

        if (monstros.length === 0) {
            alert('Nenhum monstro para exportar.');
            return;
        }

        const dataStr = JSON.stringify(monstros, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bestiario.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Importa monstros de um arquivo JSON
     */
    importar(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (!Array.isArray(imported)) {
                        reject(new Error('Arquivo inválido: deve ser um array de monstros.'));
                        return;
                    }
                    const current = this.carregar();
                    const merged = [...current, ...imported];
                    this.salvar(merged);
                    resolve();
                } catch (err) {
                    reject(new Error('Erro ao processar o arquivo JSON.'));
                }
            };
            reader.readAsText(file);
        });
    }
};