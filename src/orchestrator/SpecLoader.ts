import fs from 'fs/promises';
import path from 'path';
import { Spec } from '../types.js';

export class SpecLoader {
  private specDir: string;

  constructor(specDir: string = '.specify') {
    this.specDir = specDir;
  }

  async loadAllSpecs(): Promise<Spec[]> {
    try {
      const files = await fs.readdir(this.specDir);
      const specFiles = files.filter(f => f.endsWith('.json') && f !== 'spec-schema.json');

      const specs = await Promise.all(
        specFiles.map(async (file) => {
          const content = await fs.readFile(path.join(this.specDir, file), 'utf-8');
          return JSON.parse(content) as Spec;
        })
      );

      return specs;
    } catch (error) {
      console.error('Error loading specs:', error);
      return [];
    }
  }

  async loadSpec(specId: string): Promise<Spec | null> {
    try {
      const specs = await this.loadAllSpecs();
      return specs.find(s => s.id === specId) || null;
    } catch (error) {
      console.error(`Error loading spec ${specId}:`, error);
      return null;
    }
  }

  async saveSpec(spec: Spec): Promise<void> {
    const filePath = path.join(this.specDir, `${spec.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(spec, null, 2));
  }

  async updateTaskStatus(specId: string, taskId: string, status: Spec['tasks'][0]['status']): Promise<void> {
    const spec = await this.loadSpec(specId);
    if (!spec) throw new Error(`Spec ${specId} not found`);

    const task = spec.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found in spec ${specId}`);

    task.status = status;
    await this.saveSpec(spec);
  }
}
