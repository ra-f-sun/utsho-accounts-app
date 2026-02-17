import { Module, Global } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class CommonModule {}
