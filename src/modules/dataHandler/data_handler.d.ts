/**
 * Módulo de importação/exportação de dados
 * Lida com todos os dados que vem de arquivos JSON
 * Trata erros de Save. Erros de load devem ser tratados localmente.
 */
import { z } from "zod";
export declare const DataHandlerModule: {
    loadFile(file: Response): Promise<unknown>;
};
export declare function loadFile(file: string): Promise<unknown>;
export declare function localSave<T>(key: string, schema: z.ZodType<T>, data: T): void;
export declare function localLoad<T>(key: string, schema: z.ZodType<T>): T | [];
export declare function importData<T>(schema: z.ZodType<T>): Promise<T | null>;
//# sourceMappingURL=data_handler.d.ts.map