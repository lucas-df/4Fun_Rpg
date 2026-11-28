//Contém as funções para manipulação de DOM e elementos HTML

/**
 * Injeta um fragmento HTML (partial) em um elemento da página.
 * - partialPath: caminho do .html, relativo à URL da página (index.html), não ao arquivo .ts
 * - targetId: id do elemento que recebe o HTML
 * - Substitui TODO o conteúdo anterior do alvo (innerHTML)
 * - Retorna o elemento alvo, para o chamador (módulo) manipular o conteúdo recém-inserido
 * - Lança erro se o alvo não existir ou se o fetch falhar
 */

/**Função para inserir um html parcial no conteúdo da pagina index */
export const ViewModule = {
  async renderPartialPage(partialPath: string): Promise<HTMLElement> {
    const target = document.getElementById("content");
    if (!target) throw new Error(`Elemento não encontrado`);

    const response = await fetch(partialPath);
    if (!response.ok) throw new Error(`Falha ao carregar ${partialPath}`);
    target.innerHTML = await response.text();

    return target;
  },

  fillContent(target: HTMLElement, content: Record<string, unknown>) {
    // Filtra objetos para obter seus campos com string
    // Para cada elemento com data-field="x", troca o texto por content["x"].
    // Campos sem valor correspondente em content ficam com o texto original do HTML.
    const stringfields = this.onlyStrings(content)
    target.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
      const value = stringfields[el.dataset.field ?? ""];
      if (value !== undefined) el.textContent = value; // textContent evita injeção de HTML
    });
    console.log("Conteúdo injetado");
  },

  // Filtra objetos para obter apenas os campos com strings para utilização na interface
  onlyStrings(obj: Record<string, unknown>): Record<string, string> {
    const resultado: Record<string, string> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === "string") {
        resultado[key] = val;
      }
    }

    return resultado;
  },
};
