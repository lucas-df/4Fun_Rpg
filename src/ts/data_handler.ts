/**
 * Módulo de importação/exportação de dados
 * Lida com todos os dados que vem de arquivos JSON
 * Trata erros de Save. Erros de load devem ser tratados localmente.
 */
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";

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

async function load(file: string): Promise<unknown> {
  let data: string;
  try {
    data = await readFile(file, "utf-8");
  } catch (error) {
    throw new Error(`Não foi possível ler ${file}`, { cause: error });
  }
export async function loadFile(file: string): Promise<unknown> {
    let data: string;
    try {
        data = await readFile(file, "utf-8")
    } catch (error) {
        throw new Error(`Não foi possível ler ${file}`, { cause: error })
    }

  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`JSON inválido em ${file}`, { cause: error });
  }
}

async function selectFile(type: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null); // suportado em navegadores recentes
    input.click(); // precisa ocorrer dentro de um clique do usuário
  });
}

export function localSave<T>(key: string, schema: z.ZodType<T>, data: T) {
  try {
    let validate = schema.parse(data);
    localStorage.setItem(key, JSON.stringify(validate));
  } catch (error) {
    throw new Error(`Erro de formato em ${key}`, { cause: error });
  }
}

export function localLoad<T>(key: string, schema: z.ZodType<T>) : T | [] {
  const raw = localStorage.getItem(key);
  return raw ? schema.parse(raw) : [];
}


export async function importData<T>(schema: z.ZodType<T>): Promise<T | null> {
  let file = await selectFile(".json,application/json");
  if (!file) return null; /* usuário fechou a janela */

  let raw = JSON.parse(await file.text());

  return schema.parse(raw);
}
/*
async function exportData<T>(file: string, schema: z.ZodType<T>): Promise<T> {

    const text = await loadFile(file)

    return schema.parse(text)
}*/
