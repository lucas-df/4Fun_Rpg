/*import { z } from "zod";


const guideSchema = z.object({
  id: z.string(),
  type: z.literal("guideText"),
  title: z.string(),
  desc: z.string(),
  icon: z.string().optional(),
});

export type Guide = z.infer<typeof guideSchema>;

const sectionSchema = z.object({
  id: z.string(),
  type: z.literal("section"),
  title: z.string(),
  list: z.array(guideSchema),
});

export type Section = z.infer<typeof sectionSchema>;
*/




import { renderPartialPage } from "../view.js";

// Formato do conteúdo para exibição no guia. As chaves devem coincidir
// com os valores dos atributos data-field do guide.html.
export type GuideContent = {
  title: string;
  text: string;
}

const defaultContent: GuideContent = {
  title: "Título genérico",
  text: "Texto genérico de exemplo para testar a exibição do conteúdo.",
};

export const GuideModule = {
  partial: "src/modules/guide/guide.html",
  content: defaultContent,

  async init(): Promise<void> {
    // Fluxo: 1) carrega o partial em #content  2) preenche os campos data-field
    const target = await renderPartialPage(this.partial);
     
    this.fillContent(target)
  },

    
  fillContent(target: HTMLElement, content: Record<string, string> =  defaultContent ) {
    // Para cada elemento com data-field="x", troca o texto por content["x"].
  // Campos sem valor correspondente em content ficam com o texto original do HTML.
    target.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
      const value = content[el.dataset.field ?? ""];
      if (value !== undefined) el.textContent = value; // textContent evita injeção de HTML
    })
    console.log("Conteúdo injetado") 
  }
};

/*
export const GuideModule = {
  sections: [] as Section[],
  topics: [] as Topic[],
  currentTopic: null as Topic | null,
  observer: null as ResizeObserver | null,
  updating: false,

  /** Loads the guide, shows the categories and tracks page scrolling */
/* async init(url = 'guide.json'): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.sections = z.array(sectionSchema).parse(await response.json());
    } catch (error) {
      console.error('Erro ao carregar o guia de regras:', error);
      this.showTip('Não foi possível carregar o guia de regras.');
      return;
    }

    GuideView.renderCategories(this.sections, (section) => this.openCategory(section));
    this.showTip('Escolha uma categoria para começar.');
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
  },

  showTip(text: string): void {
    GuideView.showTip(text);
    this.topics = [];
    this.currentTopic = null;
  },

  /** Shows all topics of the category on a single page, with button navigation */
/*openCategory(category: Section): void {
    const { nav, topics } = GuideView.renderPage(category, (topic) => this.goToTopic(topic));
    this.topics = topics;

    this.observer?.disconnect();
    this.observer = GuideView.observeNavHeight(nav);

    this.currentTopic = null;
    this.updateCurrentTopic();
  },

  // ===== Navigation =====

  goToTopic(topic: Topic): void {
    this.markTopic(topic);
    topic.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  markTopic(current: Topic | undefined): void {
    if (!current || current === this.currentTopic) return;
    this.currentTopic = current;
    GuideView.highlightTopic(this.topics, current);
    GuideView.keepButtonVisible(current.btn);
  },

  /** Batches scroll events into one update per frame */
/* onScroll(): void {
    if (this.updating) return;
    this.updating = true;
    requestAnimationFrame(() => {
      this.updating = false;
      this.updateCurrentTopic();
    });
  },

  updateCurrentTopic(): void {
    this.markTopic(GuideView.topicInReading(this.topics));
  },
};*/
