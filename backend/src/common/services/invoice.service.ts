import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique invoice number with format: {ORG_PREFIX}/{YEAR}/{SEQUENCE}
   * Examples: UAC/2024/0001, MBCS/2024/0123, MEC/2024/0045
   *
   * Uses atomic transaction to prevent duplicate invoice numbers
   */
  async generateInvoiceNumber(
    organization: 'uac' | 'mbcs' | 'mec',
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = organization.toUpperCase();

    // Use transaction to atomically increment counter
    const result = await this.prisma.$transaction(async (tx) => {
      // Get or create counter for current year
      let counter = await tx.invoiceCounter.findUnique({
        where: { year },
      });

      if (!counter) {
        counter = await tx.invoiceCounter.create({
          data: {
            year,
            sequence: 1,
          },
        });
      } else {
        counter = await tx.invoiceCounter.update({
          where: { year },
          data: {
            sequence: {
              increment: 1,
            },
          },
        });
      }

      return counter;
    });

    // Format: UAC/2024/0001
    const sequence = result.sequence.toString().padStart(4, '0');
    return `${prefix}/${year}/${sequence}`;
  }
}
