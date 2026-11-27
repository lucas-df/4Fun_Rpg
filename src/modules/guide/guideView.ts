/**
 * Controle de visualização do módulo Guide
 */

import type { Guide, Section } from "./guide.js";

export interface Topic {
  btn: HTMLButtonElement;
  section: HTMLElement;
}

export const GuideView = {
  // ===== Elements =====
  getElement(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento #${id} não encontrado`);
    return el;
  },

  createButton(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  },

  /** Topic title with its icon, when there is one */
  titleOf(guide: Guide): string {
    return [guide.icon, guide.title].filter(Boolean).join(' ');
  },

  /** Strips the [[id:text]] markup, keeping only the text, and preserves line breaks */
  plainText(text: string): DocumentFragment {
    const clean = text.replace(/\[\[[^:\]]+:([^\]]*)\]\]/g, '$1');
    const fragment = document.createDocumentFragment();

    clean.split('\n').forEach((line, i) => {
      if (i > 0) fragment.append(document.createElement('br'));
      fragment.append(line.trim());
    });
    return fragment;
  },

  showTip(text: string): void {
    const tip = document.createElement('p');
    tip.className = 'guide-hint';
    tip.textContent = text;
    this.getElement('guideContent').replaceChildren(tip);
  },

  // ===== Categories =====

  renderCategories(sections: Section[], onSelect: (section: Section) => void): void {
    const container = this.getElement('guideCategories');

    container.replaceChildren(
      ...sections.map((section) => {
        const btn = this.createButton(section.title, 'guide-button guide-category', () => {
          container.querySelectorAll('button').forEach((other) => {
            other.classList.toggle('active', other === btn);
            other.setAttribute('aria-pressed', String(other === btn));
          });
          onSelect(section);
        });
        btn.setAttribute('aria-pressed', 'false');
        return btn;
      }),
    );
  },

  /** Builds the category page (title, nav and sections) and returns the created topics */
  renderPage(
    category: Section,
    onTopicClick: (topic: Topic) => void,
  ): { nav: HTMLElement; topics: Topic[] } {
    const title = document.createElement('h3');
    title.className = 'guide-page-title';
    title.textContent = category.title;

    const nav = document.createElement('nav');
    nav.className = 'guide-nav';
    nav.setAttribute('aria-label', `Tópicos: ${category.title}`);

    const topicsContainer = document.createElement('div');
    topicsContainer.className = 'guide-topics';

    const topics = category.list.map((guide) => {
      const topic: Topic = {
        section: this.createSection(guide),
        btn: this.createButton(this.titleOf(guide), 'guide-button guide-term', () =>
          onTopicClick(topic),
        ),
      };
      return topic;
    });

    nav.append(...topics.map((t) => t.btn));
    topicsContainer.append(...topics.map((t) => t.section));
    this.getElement('guideContent').replaceChildren(title, nav, topicsContainer);

    return { nav, topics };
  },

  /** Creates a topic's section, with its title and description */
  createSection(guide: Guide): HTMLElement {
    const section = document.createElement('article');
    section.className = 'guide-topic';

    const title = document.createElement('h4');
    title.textContent = this.titleOf(guide);

    const description = document.createElement('p');
    description.append(this.plainText(guide.desc));

    section.append(title, description);
    return section;
  },

  // ===== Sticky nav =====

  /** The nav sticks to the top; sections adjust their scroll margin to its height */
  observeNavHeight(nav: HTMLElement): ResizeObserver {
    const content = this.getElement('guideContent');
    const observer = new ResizeObserver(() => {
      content.style.setProperty('--guide-nav-height', `${nav.offsetHeight}px`);
    });
    observer.observe(nav);
    return observer;
  },

  /** Highlights the current topic's button */
  highlightTopic(topics: Topic[], current: Topic): void {
    topics.forEach((topic) => {
      const active = topic === current;
      topic.btn.classList.toggle('active', active);
      if (active) topic.btn.setAttribute('aria-current', 'true');
      else topic.btn.removeAttribute('aria-current');
    });
  },

  /** Keeps the button visible inside the nav */
  keepButtonVisible(btn: HTMLButtonElement): void {
    const nav = btn.parentElement;
    if (!nav) return;

    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    if (btnRect.top < navRect.top) {
      nav.scrollTop -= navRect.top - btnRect.top + 4;
    } else if (btnRect.bottom > navRect.bottom) {
      nav.scrollTop += btnRect.bottom - navRect.bottom + 4;
    }
  },

  /** Finds the topic being read: the last one that has passed the sticky nav */
  topicInReading(topics: Topic[]): Topic | undefined {
    const nav = document.querySelector<HTMLElement>('#guideContent .guide-nav');
    if (!nav?.offsetParent || topics.length === 0) return undefined;

    const atEnd =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) return topics.at(-1);

    const limit = nav.getBoundingClientRect().bottom + 20;
    let current = topics[0];
    for (const topic of topics) {
      if (topic.section.getBoundingClientRect().top > limit) break;
      current = topic;
    }
    return current;
  },
};