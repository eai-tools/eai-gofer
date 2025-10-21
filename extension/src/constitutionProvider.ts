import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ConstitutionArticle {
  number: number;
  title: string;
  sections: ConstitutionSection[];
}

interface ConstitutionSection {
  number: string;
  title: string;
  content: string;
}

class ConstitutionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly article?: ConstitutionArticle,
    public readonly section?: ConstitutionSection,
    public readonly isInfo?: boolean
  ) {
    super(label, collapsibleState);

    if (isInfo) {
      this.iconPath = new vscode.ThemeIcon('info');
      this.contextValue = 'info';
    } else if (article && !section) {
      // This is an article item
      this.iconPath = new vscode.ThemeIcon('law');
      this.contextValue = 'article';
      this.tooltip = `Article ${article.number}: ${article.title}`;
    } else if (section) {
      // This is a section item
      this.iconPath = new vscode.ThemeIcon('chevron-right');
      this.contextValue = 'section';
      this.tooltip = section.content.substring(0, 200) + '...';
      this.description = section.number;
    }
  }
}

/**
 * Provides a tree view of the project constitution
 */
export class ConstitutionProvider implements vscode.TreeDataProvider<ConstitutionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ConstitutionItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private articles: ConstitutionArticle[] = [];
  private constitutionPath: string;
  private loadError: string | null = null;
  private version: string = '';
  private lastUpdated: string = '';

  constructor(workspacePath: string) {
    console.log(`[SpecGofer] ConstitutionProvider initialized for workspace: ${workspacePath}`);
    this.constitutionPath = path.join(workspacePath, '.specify', 'memory', 'constitution.md');
    this.loadConstitution();
  }

  refresh(): void {
    this.loadConstitution();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConstitutionItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ConstitutionItem): Promise<ConstitutionItem[]> {
    // Check for load errors
    if (this.loadError && !element) {
      const errorItem = new ConstitutionItem(
        `Error: ${this.loadError}`,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        true
      );
      errorItem.iconPath = new vscode.ThemeIcon('error');
      errorItem.tooltip = `Constitution path: ${this.constitutionPath}\n\nError: ${this.loadError}`;
      return [errorItem];
    }

    if (!element) {
      // Root level - show version info and articles
      const items: ConstitutionItem[] = [];

      if (this.version) {
        const versionItem = new ConstitutionItem(
          `Version ${this.version}`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          true
        );
        versionItem.description = `Updated ${this.lastUpdated}`;
        items.push(versionItem);
      }

      if (this.articles.length === 0) {
        const noArticlesItem = new ConstitutionItem(
          'No constitution found',
          vscode.TreeItemCollapsibleState.None,
          undefined,
          undefined,
          true
        );
        noArticlesItem.tooltip = `Constitution file not found at: ${this.constitutionPath}`;
        return [noArticlesItem];
      }

      // Add articles
      items.push(
        ...this.articles.map(
          (article) =>
            new ConstitutionItem(
              `Article ${article.number}: ${article.title}`,
              vscode.TreeItemCollapsibleState.Collapsed,
              article,
              undefined
            )
        )
      );

      return items;
    } else if (element.article && !element.section) {
      // Article level - show sections
      return element.article.sections.map(
        (section) =>
          new ConstitutionItem(
            section.title,
            vscode.TreeItemCollapsibleState.None,
            element.article,
            section
          )
      );
    }

    return [];
  }

  private async loadConstitution(): Promise<void> {
    try {
      const content = await fs.readFile(this.constitutionPath, 'utf-8');
      this.parseConstitution(content);
      this.loadError = null;
      console.log(`[SpecGofer] Loaded constitution with ${this.articles.length} article(s)`);
    } catch (error) {
      console.error('Error loading constitution:', error);
      this.loadError = error instanceof Error ? error.message : 'Unknown error';
      this.articles = [];
    }
  }

  private parseConstitution(content: string): void {
    const lines = content.split('\n');
    this.articles = [];

    // Parse metadata
    for (const line of lines) {
      const versionMatch = line.match(/\*\*Version:\*\*\s+(.+)/);
      if (versionMatch) {
        this.version = versionMatch[1].trim();
      }

      const updatedMatch = line.match(/\*\*Last Updated:\*\*\s+(.+)/);
      if (updatedMatch) {
        this.lastUpdated = updatedMatch[1].trim();
      }
    }

    let currentArticle: ConstitutionArticle | null = null;
    let currentSection: ConstitutionSection | null = null;
    let sectionContent: string[] = [];

    for (const line of lines) {
      // Match article headers: ## Article I: Code Quality
      const articleMatch = line.match(/^##\s+Article\s+([IVX]+):\s+(.+)$/);
      if (articleMatch) {
        // Save previous section if exists
        if (currentSection && currentArticle) {
          currentSection.content = sectionContent.join('\n').trim();
          currentArticle.sections.push(currentSection);
          currentSection = null;
          sectionContent = [];
        }

        // Save previous article if exists
        if (currentArticle) {
          this.articles.push(currentArticle);
        }

        currentArticle = {
          number: this.romanToNumber(articleMatch[1]),
          title: articleMatch[2].trim(),
          sections: [],
        };
        continue;
      }

      // Match section headers: ### 1.1 Language Standards
      const sectionMatch = line.match(/^###\s+([\d.]+)\s+(.+)$/);
      if (sectionMatch && currentArticle) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = sectionContent.join('\n').trim();
          currentArticle.sections.push(currentSection);
          sectionContent = [];
        }

        currentSection = {
          number: sectionMatch[1],
          title: sectionMatch[2].trim(),
          content: '',
        };
        continue;
      }

      // Collect section content
      if (currentSection && line.trim() && !line.startsWith('#')) {
        sectionContent.push(line);
      }
    }

    // Save last section and article
    if (currentSection && currentArticle) {
      currentSection.content = sectionContent.join('\n').trim();
      currentArticle.sections.push(currentSection);
    }
    if (currentArticle) {
      this.articles.push(currentArticle);
    }
  }

  private romanToNumber(roman: string): number {
    const romanNumerals: Record<string, number> = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
    };
    return romanNumerals[roman] || 0;
  }

  /**
   * Get all articles
   */
  getArticles(): ConstitutionArticle[] {
    return this.articles;
  }

  /**
   * Get article by number
   */
  getArticle(number: number): ConstitutionArticle | undefined {
    return this.articles.find((a) => a.number === number);
  }
}
