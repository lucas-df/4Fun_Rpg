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
export async function renderPartialPage(
    partialPath: string,
  ): Promise<HTMLElement> {
    const target = document.getElementById("content");
    if (!target) throw new Error(`Elemento não encontrado`);

    const response = await fetch(partialPath);
    if (!response.ok) throw new Error(`Falha ao carregar ${partialPath}`);
    target.innerHTML = await response.text();

    return target
}
