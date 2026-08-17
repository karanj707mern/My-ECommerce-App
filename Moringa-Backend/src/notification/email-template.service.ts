import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export interface EmailTemplateRecord {
  id: number;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmailTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<EmailTemplateRecord[]> {
    return this.prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    }) as Promise<EmailTemplateRecord[]>;
  }

  async getById(id: number): Promise<EmailTemplateRecord> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Email template with id ${id} not found`);
    }

    return template as EmailTemplateRecord;
  }

  async getByName(name: string): Promise<EmailTemplateRecord | null> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { name },
    });

    return template as EmailTemplateRecord | null;
  }

  async create(data: {
    name: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    variables?: Prisma.InputJsonValue;
    isActive?: boolean;
  }): Promise<EmailTemplateRecord> {
    try {
      return (await this.prisma.emailTemplate.create({
        data: {
          name: data.name,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody ?? null,
          variables: data.variables ?? Prisma.JsonNull,
          isActive: data.isActive ?? true,
        },
      })) as EmailTemplateRecord;
    } catch {
      throw new ConflictException(
        `Email template with name "${data.name}" already exists`,
      );
    }
  }

  async update(
    id: number,
    data: {
      name?: string;
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      variables?: Prisma.InputJsonValue;
      isActive?: boolean;
    },
  ): Promise<EmailTemplateRecord> {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Email template with id ${id} not found`);
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.emailTemplate.findUnique({
        where: { name: data.name },
      });

      if (duplicate) {
        throw new ConflictException(
          `Email template with name "${data.name}" already exists`,
        );
      }
    }

    try {
      return (await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          name: data.name,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
          variables: data.variables,
          isActive: data.isActive,
        },
      })) as EmailTemplateRecord;
    } catch {
      throw new NotFoundException(`Email template with id ${id} not found`);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.emailTemplate.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Email template with id ${id} not found`);
    }
  }

  async renderTemplate(
    templateName: string,
    variables: Record<string, unknown>,
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { name: templateName, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(
        `Email template "${templateName}" not found or is inactive`,
      );
    }

    const subject = this.replacePlaceholders(template.subject, variables);
    const htmlBody = this.replacePlaceholders(template.htmlBody, variables);
    const textBody = template.textBody
      ? this.replacePlaceholders(template.textBody, variables)
      : this.sanitizeHtml(template.htmlBody);

    return { subject, htmlBody, textBody };
  }

  private replacePlaceholders(
    content: string,
    variables: Record<string, unknown>,
  ): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      const record = variables as Record<string, string | number | boolean>;
      const value = record[key];
      if (value === undefined) return _match;
      return String(value);
    });
  }

  private sanitizeHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
