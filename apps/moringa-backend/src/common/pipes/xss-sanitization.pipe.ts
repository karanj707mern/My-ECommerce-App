import { Injectable, PipeTransform } from '@nestjs/common';
import xss = require('xss');

@Injectable()
export class XssSanitizationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return xss(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item));
    }

    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.transform(val);
      }
      return sanitized;
    }

    return value;
  }
}
