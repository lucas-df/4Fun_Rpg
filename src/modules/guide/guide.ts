import { ViewModule as view } from "../view.js";
import { GuideContent } from "./guide.model.js";
import type { Guide, Section } from "./guide.model.js";

const defaultContent = [
  {
    id: "",
    type: "section",
    title: "Título genérico",
    text: "Texto genérico de exemplo para testar a exibição do conteúdo.",
  },
];

export const GuideModule = {
  partial: "src/modules/guide/guide.html",
  content: defaultContent as Section[],

  async init(): Promise<void> {
    // Fluxo: 1) carrega o partial em #content  2) preenche os campos data-field
    const target = await view.renderPartialPage(this.partial);
    this.content = (await GuideContent.init()) ?? this.content;
    this.content.forEach((el) => view.fillContent(target, el))   ;
  },
};
