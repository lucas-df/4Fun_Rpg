/**
 * Módulo de dados do bestiário
 * Responsável por persistência, CRUD e importação/exportação
 */

import { z } from "zod";
import {loadFile, localSave, localLoad} from "./data_handler.js"

const skillSchema = z.object({
    skillName: z.string(),
    skillEffect: z.string()
});

const monsterSchema = z.object({
    id: z.string(),
    category: z.string(),
    diff: z.number(),
    attack: z.string(),
    defense: z.string(),
    flavor: z.string().optional,
    strategy: z.string(),
    skills: z.array(skillSchema).max(3)
});

type Monster = z.infer<typeof monsterSchema>;

/** Habilidade de um monstro */
interface Skill {
  name: string;
  tags: string; 
  effect: string;
  target: string
}

/** Monstro do bestiário (os valores vêm de campos de formulário, por isso são texto) */
interface Monster {
  name: string;
  type: string; // Armadilha, Lacaio, Oponente, Chefe ou Colosso
  diff: string;
  attack: string;
  defense: string;
  description: string;
  strategy: string;
  skills: Habilidade[];
}

const BestiarioDataModule = {
  /**
   * Carrega todos os monstros do localStorage
   */
  carregar() {
    return localLoad("monsters", monsterSchema)
  },

  /**
   * Salva monstros no localStorage
   */
  salvar(monstros: Monstro[]): void {
    localStorage.setItem("monsters", JSON.stringify(monstros));
  },

  /**
   * Adiciona um novo monstro ao bestiário
   */
  adicionar(monstro: Monstro): void {
    const monstros = this.carregar();
    monstros.push(monstro);
    this.salvar(monstros);
  },

  /**
   * Remove um monstro pelo índice
   */
  remover(index: number): void {
    const monstros = this.carregar();
    monstros.splice(index, 1);
    this.salvar(monstros);
  },

  /**
   * Limpa todos os monstros do bestiário
   */
  limpar(): void {
    this.salvar([]);
  },

  /**
   * Verifica se já existe um monstro duplicado
   */
  isDuplicado(novoMonstro: Monstro): boolean {
    const monstros = this.carregar();
    return monstros.some(
      (m) =>
        m.name === novoMonstro.name &&
        m.type === novoMonstro.type &&
        m.diff === novoMonstro.diff &&
        m.attack === novoMonstro.attack &&
        m.defense === novoMonstro.defense &&
        m.description === novoMonstro.description &&
        m.strategy === novoMonstro.strategy &&
        JSON.stringify(m.skills) === JSON.stringify(novoMonstro.skills),
    );
  },

  /**
   * Exporta todos os monstros para um arquivo JSON
   */
  exportar(): void {
    const monstros = this.carregar();

    if (monstros.length === 0) {
      alert("Nenhum monstro para exportar.");
      return;
    }

    const dataStr = JSON.stringify(monstros, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bestiario.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Importa monstros de um arquivo JSON
   */
  importar(file: File): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // readAsText sempre produz texto
          const imported: unknown = JSON.parse(reader.result as string);
          if (!Array.isArray(imported)) {
            reject(
              new Error("Arquivo inválido: deve ser um array de monstros."),
            );
            return;
          }
          const current = this.carregar();
          // os campos dos monstros importados não são validados
          const merged = [...current, ...(imported as Monstro[])];
          this.salvar(merged);
          resolve();
        } catch (err) {
          reject(new Error("Erro ao processar o arquivo JSON."));
        }
      };
      reader.readAsText(file);
    });
  },
};
