import { readFile } from 'fs/promises';
import { join } from 'path';
import * as handlebars from 'handlebars';

const cache = new Map<string, handlebars.TemplateDelegate>();

function templatePath(templateRef: string): string {
  const name = templateRef.replace(/^\.\//, '').replace(/\.hbs$/, '');
  return join(__dirname, 'templates', `${name}.hbs`);
}

export async function renderTemplate(templateRef: string, context: Record<string, unknown>): Promise<string> {
  const cacheKey = templateRef.replace(/^\.\//, '');
  let compiled = cache.get(cacheKey);
  if (!compiled) {
    const path = templatePath(templateRef);
    const src = await readFile(path, 'utf-8');
    compiled = handlebars.compile(src);
    cache.set(cacheKey, compiled);
  }
  return compiled(context);
}
