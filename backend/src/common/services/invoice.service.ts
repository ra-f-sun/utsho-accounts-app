import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique invoice number with format: {ORG_PREFIX}-{YEAR}-{SEQUENCE}
   * Examples: UAC-2024-0001, MBCS-2024-0123, MEC-2024-0045
   *
   * Counter is scoped per organization per year, so each org has its
   * own independent sequence (UAC-2024-0001 and MBCS-2024-0001 can both exist).
   *
   * Uses atomic transaction to prevent duplicate invoice numbers.
   */
  async generateInvoiceNumber(
    organization: 'uac' | 'mbcs' | 'mec',
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = organization.toUpperCase();

    // Use transaction to atomically increment counter
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert counter for current year + organization
      const counter = await tx.invoiceCounter.upsert({
        where: { year_organization: { year, organization } },
        create: { year, organization, sequence: 1 },
        update: { sequence: { increment: 1 } },
      });

      return counter;
    });

    // Format: UAC-2024-0001
    const sequence = result.sequence.toString().padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
  }
}
