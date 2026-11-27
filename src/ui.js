/**
 * Módulo de controle de visualização
 * Responsável pelo sistema de abas (com fragmentos HTML carregados sob demanda),
 * formulário, renderização e eventos
 */
const UIModule = {
    // ===== Abas =====

    PASTA_PARTIALS: 'partials/',
    ABA_INICIAL: 'guide',

    /**
     * Registro das abas. Cada aba corresponde ao arquivo partials/<id>.html.
     *  - init():   roda uma única vez, logo depois do fragmento entrar no DOM
     *  - onShow(): roda toda vez que a aba é exibida
     * Para criar uma aba nova: adicione o botão no index.html, o arquivo em partials/ e uma entrada aqui.
     */
    ABAS: {
        guide: {
            init: () => GuideModule.init()
        },
        create: {
            init: () => {
                UIModule.initForm();
                UIModule.initFormSubmit();
            }
        },
        bestiary: {
            init: () => UIModule.initBestiario(),
            onShow: () => UIModule.renderizarBestiario(document.getElementById('bestiaryList'))
        },
        treasure: {
            init: () => TreasureDataModule.setGenerationType('civilizado')
        }
    },

    _carregadas: {},   // id da aba -> Promise do carregamento
    _abaAtual: null,

    /**
     * Inicializa o sistema de abas e abre a aba inicial
     */
    initTabs() {
        document.querySelectorAll('.tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => this.showTab(tab.dataset.tab));
        });
        return this.showTab(this.ABA_INICIAL);
    },

    /**
     * Carrega o fragmento da aba (só na primeira vez) e roda o init dela
     */
    carregarAba(nome) {
        this._carregadas[nome] ??= (async () => {
            const resposta = await fetch(`${this.PASTA_PARTIALS}${nome}.html`);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const conteudo = document.createElement('div');
            conteudo.id = nome;
            conteudo.className = 'tab-content';
            conteudo.innerHTML = await resposta.text();
            document.getElementById('content').appendChild(conteudo);

            await this.ABAS[nome].init?.();
        })().catch(error => {
            delete this._carregadas[nome];   // permite tentar de novo no próximo clique
            document.getElementById(nome)?.remove();
            throw error;
        });
        return this._carregadas[nome];
    },

    /**
     * Mostra a aba especificada (carregando-a se necessário) e oculta as demais
     */
    async showTab(nome) {
        if (!this.ABAS[nome]) return;
        this._abaAtual = nome;

        try {
            await this.carregarAba(nome);
        } catch (error) {
            console.error(`Erro ao carregar a aba "${nome}":`, error);
            return;
        }
        if (this._abaAtual !== nome) return;   // o usuário já clicou em outra aba

        document.querySelectorAll('.tab[data-tab]').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === nome);
        });
        document.querySelectorAll('#content > .tab-content').forEach(c => {
            c.classList.toggle('active', c.id === nome);
        });
        this.ABAS[nome].onShow?.();
    },

    // ===== Formulário =====

    /**
     * Inicializa os event listeners do formulário
     */
    initForm() {
        this._buildSkillGroups();
        this._initDifficultyCalculator();
        this._initSkillToggler();
    },

    /**
     * Configura o handler de submit do formulário
     */
    initFormSubmit() {
        const form = document.getElementById('monsterForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const newMonster = this.getMonsterData();

            if (BestiarioDataModule.isDuplicado(newMonster)) {
                const resultDiv = document.getElementById('result');
                resultDiv.textContent = 'Erro: este monstro duplicado já existe no bestiário.';
                resultDiv.style.display = 'block';
                return;
            }

            BestiarioDataModule.adicionar(newMonster);

            const skillsList = newMonster.skills.map(s => `${s.name}: ${s.effect}`).join('\n  ');
            const result = `Monstro criado com sucesso!\n\n` +
                `Nome: ${newMonster.name}\n` +
                `Tipo: ${newMonster.type}\n` +
                `Dificuldade: ${newMonster.diff}\n` +
                `Ataque: ${newMonster.attack}\n` +
                `Defesa: ${newMonster.defense}\n` +
                `Descrição: ${newMonster.description || 'Nenhuma descrição fornecida.'}\n` +
                `Estratégia: ${newMonster.strategy || 'Nenhuma estratégia fornecida.'}\n` +
                `Habilidades:\n  ${skillsList || 'Nenhuma habilidade fornecida.'}`;

            const resultDiv = document.getElementById('result');
            resultDiv.textContent = result;
            resultDiv.style.display = 'block';
            // O bestiário se atualiza sozinho quando a aba é aberta (onShow).
        });
    },

    /**
     * Inicializa a interface (as abas carregam seus próprios módulos)
     */
    init() {
        return this.initTabs();
    },

    /**
     * Configura o cálculo automático de dificuldade
     */
    _initDifficultyCalculator() {
        const att = document.getElementById('attack');
        const def = document.getElementById('defense');
        const diff = document.getElementById('diff');

        const calculateDifficulty = () => {
            const attackValue = parseInt(att.value) || 0;
            const defenseValue = parseInt(def.value) || 0;
            const difficulty = Math.round((attackValue + defenseValue) / 2);
            diff.value = difficulty;
        };

        att.addEventListener('input', calculateDifficulty);
        def.addEventListener('input', calculateDifficulty);
    },

    /**
     * Configura o toggle de campos de habilidades por tipo
     */
    _initSkillToggler() {
        const type = document.getElementById('type');
        const container = document.getElementById('skillsContainer');

        const toggleSkillGroups = (selectedType) => {
            if (!selectedType) {
                container.style.display = 'none';
                return;
            }

            const show2 = selectedType === "Chefe" || selectedType === "Colosso" || selectedType === "Oponente";
            const show3 = selectedType === "Chefe" || selectedType === "Colosso";

            container.style.display = 'block';
            const group1 = document.getElementById('skillGroup1');
            const group2 = document.getElementById('skillGroup2');
            const group3 = document.getElementById('skillGroup3');
            if (group1) group1.style.display = 'block';
            if (group2) group2.style.display = show2 ? 'block' : 'none';
            if (group3) group3.style.display = show3 ? 'block' : 'none';
        };

        type.addEventListener("input", function() {
            toggleSkillGroups(type.value);
        });
    },

    /**
     * Gera o HTML dos grupos de habilidade
     */
    _buildSkillGroups() {
        const container = document.getElementById('skillsContainer');
        const skillTypes = [
            { value: '', label: 'Selecione...' },
            { value: '[Ação]', label: 'Ofensiva' },
            { value: '[Reação]', label: 'Defensiva' }
        ];

        const selectOptions = skillTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('');

        const buildGroup = (num, required) => `
            <div class="skill-group" id="skillGroup${num}">
                <div style="display: flex; gap: 10px;">
                    <div class="form-group" style="width: 60%; margin-bottom: 0;">
                        <label for="skillName${num}">Nome da Habilidade${num > 1 ? ` ${num}` : ''}:</label>
                        <input type="text" id="skillName${num}"${required ? ' required' : ''}>
                    </div>
                    <div class="form-group" style="width: 30%; margin-bottom: 0;">
                        <label for="skillType${num}">Tipo:</label>
                        <select id="skillType${num}"${required ? ' required' : ''}>
                            ${selectOptions}
                        </select>
                    </div>
                </div>
                <label for="skillEffect${num}">Efeito:</label>
                <textarea id="skillEffect${num}" rows="2"${required ? ' required' : ''}></textarea>
            </div>
        `;

        container.innerHTML = buildGroup(1, true) + buildGroup(2, false) + buildGroup(3, false);
    },

    /**
     * Coleta os dados do formulário e retorna um objeto monstro
     */
    getMonsterData() {
        const name = document.getElementById('name').value;
        const type = document.getElementById('type').value;
        const diff = document.getElementById('diff').value;
        const attack = document.getElementById('attack').value;
        const defense = document.getElementById('defense').value;
        const description = document.getElementById('description').value;
        const strategy = document.getElementById('strategy').value;
        const skillName1 = document.getElementById('skillName1').value;
        const skillType1 = document.getElementById('skillType1').value;
        const skillEffect1 = document.getElementById('skillEffect1').value;
        const skillName2 = document.getElementById('skillName2').value;
        const skillType2 = document.getElementById('skillType2').value;
        const skillEffect2 = document.getElementById('skillEffect2').value;
        const skillName3 = document.getElementById('skillName3').value;
        const skillType3 = document.getElementById('skillType3').value;
        const skillEffect3 = document.getElementById('skillEffect3').value;

        const skills = [{ name: skillName1, type: skillType1, effect: skillEffect1 }];
        if (skillName2 || skillType2 || skillEffect2) skills.push({ name: skillName2, type: skillType2, effect: skillEffect2 });
        if (skillName3 || skillType3 || skillEffect3) skills.push({ name: skillName3, type: skillType3, effect: skillEffect3 });

        return { name, type, diff, attack, defense, description, strategy, skills };
    },

    /**
     * Preenche o formulário com os dados de um monstro para edição
     */
    fillForm(monster) {
        document.getElementById('name').value = monster.name;
        document.getElementById('type').value = monster.type;
        document.getElementById('diff').value = monster.diff;
        document.getElementById('attack').value = monster.attack;
        document.getElementById('defense').value = monster.defense;
        document.getElementById('description').value = monster.description || '';
        document.getElementById('strategy').value = monster.strategy || '';
        document.getElementById('skillName1').value = monster.skills && monster.skills[0] ? monster.skills[0].name : '';
        document.getElementById('skillType1').value = monster.skills && monster.skills[0] ? monster.skills[0].type : '';
        document.getElementById('skillEffect1').value = monster.skills && monster.skills[0] ? monster.skills[0].effect : '';
        document.getElementById('skillName2').value = monster.skills && monster.skills[1] ? monster.skills[1].name : '';
        document.getElementById('skillType2').value = monster.skills && monster.skills[1] ? monster.skills[1].type : '';
        document.getElementById('skillEffect2').value = monster.skills && monster.skills[1] ? monster.skills[1].effect : '';
        document.getElementById('skillName3').value = monster.skills && monster.skills[2] ? monster.skills[2].name : '';
        document.getElementById('skillType3').value = monster.skills && monster.skills[2] ? monster.skills[2].type : '';
        document.getElementById('skillEffect3').value = monster.skills && monster.skills[2] ? monster.skills[2].effect : '';
    },

    // ===== Bestiário =====

    /**
     * Renderiza a lista de monstros no container especificado
     */
    renderizarBestiario(container) {
        const monstros = BestiarioDataModule.carregar();

        if (monstros.length === 0) {
            container.innerHTML = '<div class="empty">Nenhum monstro criado ainda.</div>';
            return;
        }

        container.innerHTML = monstros.map((monster, index) => `
            <div class="monster-card">
                <h3>${monster.name}</h3>
                <div class="monster-info">
                    <strong>Tipo:</strong> ${monster.type} |
                    <strong>Dificuldade:</strong> ${monster.diff} |
                    <strong>Ataque:</strong> ${monster.attack} |
                    <strong>Defesa:</strong> ${monster.defense}
                </div>
                ${monster.description ? `<div><strong>Descrição:</strong> ${monster.description}</div>` : ''}
                ${monster.strategy ? `<div><strong>Estratégia:</strong> ${monster.strategy}</div>` : ''}
                ${monster.skills && monster.skills.length > 0 ? `
                    <div><strong>Habilidades:</strong></div>
                    <ul>
                        ${monster.skills.map(s => `<li><strong>${s.name || 'Sem nome'}:</strong> ${s.effect || ''}</li>`).join('')}
                    </ul>
                ` : ''}
                <div class="monster-actions">
                    <button class="secondary" onclick="UIModule.editar(${index})">Editar</button>
                    <button class="danger" onclick="UIModule.remover(${index})">Remover</button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Remove um monstro e atualiza a lista
     */
    remover(index) {
        BestiarioDataModule.remover(index);
        this.renderizarBestiario(document.getElementById('bestiaryList'));
    },

    /**
     * Remove um monstro, preenche o formulário com seus dados e muda para a aba de criar
     */
    async editar(index) {
        const monstros = BestiarioDataModule.carregar();
        const monster = monstros[index];

        BestiarioDataModule.remover(index);
        await this.showTab('create');   // garante que o formulário já existe no DOM
        this.fillForm(monster);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Inicializa os event listeners dos botões da aba de bestiário
     */
    initBestiario() {
        const exportBtn = document.querySelector('button[data-action="exportar"]');
        const importBtn = document.querySelector('button[data-action="importar"]');
        const importFile = document.getElementById('importFile');
        const clearBtn = document.querySelector('button[data-action="limpar"]');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => BestiarioDataModule.exportar());
        }
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                BestiarioDataModule.importar(file)
                    .then(() => {
                        this.renderizarBestiario(document.getElementById('bestiaryList'));
                        alert('Monstros importados com sucesso!');
                    })
                    .catch((err) => {
                        alert(err.message || 'Erro ao processar o arquivo JSON.');
                    });
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                BestiarioDataModule.limpar();
                this.renderizarBestiario(document.getElementById('bestiaryList'));
            });
        }
    }
};
