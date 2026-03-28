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
    const prefix = organization.toUpperCase();

    // Compute year inside the transaction so the year used for counter lookup
    // and the year embedded in the invoice number are always consistent, even
    // across the Dec 31 → Jan 1 boundary.
    const result = await this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();

      const counter = await tx.invoiceCounter.upsert({
        where: { year_organization: { year, organization } },
        create: { year, organization, sequence: 1 },
        update: { sequence: { increment: 1 } },
      });

      return counter;
    });

    // Format: UAC-2024-0001
    const sequence = result.sequence.toString().padStart(4, '0');
    return `${prefix}-${result.year}-${sequence}`;
  }
}
