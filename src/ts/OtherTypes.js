import { z, ZodType } from "zod";
const skillSchema = z.object({
    skillName: z.string().optional,
    skillEffect: z.string(),
});
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
class reference {
    constructor(data) {
        this.data = data;
        this.result = () => {
            return { quantity: this.data.quantity, result: this.data.result };
        };
    }
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
const itemSchema = z.object({
    type: z.string("item"),
    id: z.string(),
    name: z.string(),
    value: z.number(),
    flavor: z.string(),
    effects: z.array(skillSchema),
});
const listSchema = z.object({
    type: z.string("list"),
    listId: z.string(),
    name: z.string(),
    entries: z.array(itemSchema),
});
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
/** Referencia do resultado da tabela.*/
export class Reference {
    constructor(description) {
        this.description = description;
        this.quantity = 1;
        this.rolls = 0;
        this.weight = 1;
    }
}
export class ItemRef extends Reference {
    constructor(description, reference) {
        super(description);
        this.description = description;
        this.reference = reference;
        this.next = () => {
            return new Array(this.quantity).fill(this.reference);
        };
    }
}
export class TableRef extends Reference {
    constructor(description, reference) {
        super(description);
        this.description = description;
        this.reference = reference;
        this.next = () => {
            return new Array(this.quantity).fill(this.reference);
        };
    }
}
/** Lista de itens */
export class List {
    constructor(id, name, category, list) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.list = list;
    }
}
export class Item {
    constructor(id, name, value, flavour, effects) {
        this.id = id;
        this.name = name;
        this.value = value;
        this.flavour = flavour;
        this.effects = effects;
    }
}
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
//# sourceMappingURL=OtherTypes.js.map