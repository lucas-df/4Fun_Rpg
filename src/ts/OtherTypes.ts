import { z, ZodType } from "zod";
const skillSchema = z.object({
  skillName: z.string().optional,
  skillEffect: z.string(),
});

type SkillSchema = z.infer<typeof skillSchema>;

const referenceSchema = z.object({
  type: z.string("ref"),
  quantity: z.number().default(1),
  rolls: z.number().default(0),
  weight: z.number().default(1),
  description: z.string(),
  get result() {
    return z.xor([tableSchema, listSchema, itemSchema]);
  },
});

type ReferenceSchema = z.infer<typeof referenceSchema>;

class reference {
  constructor(private readonly data: ReferenceSchema) {}

  result: () => {
    quantity: number;
    result: TableSchema | ListSchema | ItemSchema;
  } = () => {
    return { quantity: this.data.quantity, result: this.data.result };
  };

  roll(dice = 6) {
    return Math.floor(Math.random() * dice) + 1;
  }
}

const tableSchema = z.object({
  type: z.string("table"),
  tableId: z.string(),
  get entries() {
    return z.array(referenceSchema);
  },
});

type TableSchema = z.infer<typeof tableSchema>;

const itemSchema = z.object({
  type: z.string("item"),
  id: z.string(),
  name: z.string(),
  value: z.number(),
  flavor: z.string(),
  effects: z.array(skillSchema),
});

type ItemSchema = z.infer<typeof itemSchema>;

const listSchema = z.object({
  type: z.string("list"),
  listId: z.string(),
  name: z.string(),
  entries: z.array(itemSchema),
});

type ListSchema = z.infer<typeof listSchema>;

const monsterSchema = z.object({
  id: z.string(),
  type: z.string(),
  diff: z.number(),
  attack: z.string(),
  defense: z.string(),
  description: z.string(),
  strategy: z.string(),
  skills: z.array(skillSchema).max(3),
});

type Monster = z.infer<typeof monsterSchema>;


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