import { z } from "zod";
import { GuideView, type Topic } from "./guideView.js";


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

export const GuideModule = {
  sections: [] as Section[],
  topics: [] as Topic[],
  currentTopic: null as Topic | null,
  observer: null as ResizeObserver | null,
  updating: false,

  /** Loads the guide, shows the categories and tracks page scrolling */
  async init(url = 'guide.json'): Promise<void> {
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
  openCategory(category: Section): void {
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
  onScroll(): void {
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
};