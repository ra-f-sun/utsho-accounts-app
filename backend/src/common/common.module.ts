import { Module, Global } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { SharedTeachersService } from './services/teachers.service';
import { SharedStaffService } from './services/staff.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [InvoiceService, SharedTeachersService, SharedStaffService],
  exports: [InvoiceService, SharedTeachersService, SharedStaffService],
})
export class CommonModule {}
