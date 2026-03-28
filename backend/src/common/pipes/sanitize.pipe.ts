import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitizeHtml = require('sanitize-html') as (
  dirty: string,
  opts?: import('sanitize-html').IOptions,
) => string;

/**
 * Globally strips all HTML tags from any string value (including nested objects/arrays).
 * Prevents stored XSS when user-supplied text is later rendered in the UI.
 * Runs before ValidationPipe so validators see the clean values.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>)) {
        sanitized[key] = this.sanitize(
          (value as Record<string, unknown>)[key],
        );
      }
      return sanitized;
    }
    return value;
  }
}
