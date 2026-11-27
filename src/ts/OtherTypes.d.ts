/** Tabela para rolagens */
export interface Table {
    id: string;
    name: string;
    entries: [Reference];
}
export interface JSONData {
    type: ObjectTypes;
}
export type ObjectTypes = "table" | "list" | "item" | "ref" | "skill" | "guideText";
/** Referencia do resultado da tabela.*/
export declare class Reference {
    description: string;
    quantity: number;
    rolls: number;
    weight: number;
    constructor(description: string);
}
export declare class ItemRef extends Reference {
    description: string;
    reference: Item;
    constructor(description: string, reference: Item);
    next: () => Item[];
}
export declare class TableRef extends Reference {
    description: string;
    reference: Table | List;
    constructor(description: string, reference: Table | List);
    next: () => Item[];
}
/** Lista de itens */
export declare class List {
    id: string;
    name: string;
    category: string;
    list: Item[];
    constructor(id: string, name: string, category: string, list: Item[]);
}
export declare class Item {
    id: string;
    name: string;
    value: number;
    flavour: string;
    effects: Skill[];
    constructor(id: string, name: string, value: number, flavour: string, effects: Skill[]);
}
/** Tabela para rolagens */
export interface Skill {
    name?: string;
    effect: string[];
    tags?: Tag[];
}
export type Tag = "Ação" | "Reação" | "Fabricação" | "+" | "1Rest" | "Consumível" | "Recurso" | "Mágico";
/** Monstro do bestiário (os valores vêm de campos de formulário, por isso são texto) */
//# sourceMappingURL=OtherTypes.d.ts.map