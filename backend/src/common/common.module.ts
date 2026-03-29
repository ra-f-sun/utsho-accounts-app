import { Module, Global } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { SharedTeachersService } from './services/teachers.service';
import { SharedStaffService } from './services/staff.service';
import { SharedTeacherAttendanceService } from './services/teacher-attendance.service';
import { SharedPayrollService } from './services/payroll.service';
import { SharedStudentsService } from './services/students.service';
import { SharedPaymentsService } from './services/payments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    InvoiceService,
    SharedTeachersService,
    SharedStaffService,
    SharedTeacherAttendanceService,
    SharedPayrollService,
    SharedStudentsService,
    SharedPaymentsService,
  ],
  exports: [
    InvoiceService,
    SharedTeachersService,
    SharedStaffService,
    SharedTeacherAttendanceService,
    SharedPayrollService,
    SharedStudentsService,
    SharedPaymentsService,
  ],
})
export class CommonModule {}
