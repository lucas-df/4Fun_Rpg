/** Tabela para rolagens */
export interface Table {
  id: string;
  name: string;
  entries: [Reference];
}

export interface JSONData {
  type: ObjectTypes;
}

export type ObjectTypes =
  | "table"
  | "list"
  | "item"
  | "ref"
  | "skill"
  | "guideText";

/** Referencia do resultado da tabela.*/
export class Reference {
  quantity = 1;
  rolls = 0;
  weight = 1;
  constructor(public description: string) {}
}

export class ItemRef extends Reference {
  constructor(
    public description: string,
    public reference: Item,
  ) {
    super(description);
  }

  next: () => Item[] = () => {
    return new Array(this.quantity).fill(this.reference);
  };
}

export class TableRef extends Reference {
  constructor(
    public description: string,
    public reference: Table | List,
  ) {
    super(description);
  }

  next: () => Item[] = () => {
    return new Array(this.quantity).fill(this.reference);
  };
}

/** Lista de itens */
export class List {
  constructor(
    public id: string,
    public name: string,
    public category: string,
    public list: Item[],
  ) {}
}

export class Item {
  constructor(
    public id: string,
    public name: string,
    public value: number,
    public flavour: string,
    public effects: Skill[],
  ) {}
}

/** Tabela para rolagens */
export interface Skill {
  name?: string;
  effect: string[];
  tags?: Tag[];
}

export type Tag =
  | "Ação"
  | "Reação"
  | "Fabricação"
  | "+"
  | "1Rest"
  | "Consumível"
  | "Recurso"
  | "Mágico";

/** Monstro do bestiário (os valores vêm de campos de formulário, por isso são texto) */
/*export class Creature {
  name: string;
  type: string; // Armadilha, Lacaio, Oponente, Chefe ou Colosso
  diff: string;
  attack: string;
  defense: string;
  description: string;
  strategy: string;
  skills: Skill[];
}*/
