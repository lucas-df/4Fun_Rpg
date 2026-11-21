/**
 * Módulo de importação/exportação de dados
 * Lida com todos os dados que vem de arquivos JSON
 * Trata erros de Save. Erros de load devem ser tratados localmente.
 */


import { z, ZodType } from "zod";
import { readFile, writeFile } from "node:fs/promises";

const skillSchema = z.object({
    skillName: z.string(),
    skillEffect: z.string()
});

const monsterSchema = z.object({
    id: z.string(),
    type: z.string(),
    diff: z.number(),
    attack: z.string(),
    defense: z.string(),
    description: z.string(),
    strategy: z.string(),
    skills: z.array(skillSchema).max(3)
});



type Monster = z.infer<typeof monsterSchema>;

async function load(file: string): Promise<unknown> {
    let data: string;
    try {
        data = await readFile(file, "utf-8")
    } catch (error) {
        throw new Error(`Não foi possível ler ${file}`, { cause: error })
    }

    try {
        return JSON.parse(data)
    } catch (error) {
        throw new Error(`JSON inválido em ${file}`, { cause: error })
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

function localSave<T>(key: string, schema: ZodType<T>, data: T) {
    try {
        let validate = schema.parse(data)
        localStorage.setItem(key, JSON.stringify(validate));
    } catch (error) {
        throw new Error(`Erro de formato em ${key}`, { cause: error })
    }
}

function localLoad<T>(key: string, schema: ZodType<T>, data: T) {
    const raw = localStorage.getItem(key);
    return data ? (schema.parse(raw)) : [];
}


async function importData<T>(schema: ZodType<T>): Promise<T | null> {
    let file = await selectFile(".json,application/json")
    if (!file) return null /* usuário fechou a janela */

    let raw = JSON.parse(await file.text())

    return schema.parse(raw)

}

async function exportData<T>(file: string, schema: ZodType<T>): Promise<T> {

    const text = await load(file)

    return schema.parse(text)
}