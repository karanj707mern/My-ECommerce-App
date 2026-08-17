import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly templateDir: string;
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.templateDir = path.join(
      process.cwd(),
      'src',
      'common',
      'email-templates',
    );
  }

  render(templateName: string, context: Record<string, unknown>): string {
    const compiled = this.getTemplate(templateName);

    if (!compiled) {
      this.logger.warn(`Email template not found: ${templateName}`);
      return '';
    }

    try {
      return compiled(context);
    } catch (error) {
      this.logger.error(
        `Failed to render email template: ${templateName}`,
        error instanceof Error ? error.stack : undefined,
      );
      return '';
    }
  }

  private getTemplate(
    templateName: string,
  ): Handlebars.TemplateDelegate | undefined {
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    const filePath = path.join(this.templateDir, `${templateName}.hbs`);

    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    try {
      const source = fs.readFileSync(filePath, 'utf-8');
      const compiled = Handlebars.compile(source, { noEscape: false });
      this.cache.set(templateName, compiled);
      return compiled;
    } catch (error) {
      this.logger.error(
        `Failed to load email template: ${templateName}`,
        error instanceof Error ? error.stack : undefined,
      );
      return undefined;
    }
  }
}
