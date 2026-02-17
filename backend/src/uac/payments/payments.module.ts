import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceService } from '../../common/services/invoice.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, InvoiceService],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}
