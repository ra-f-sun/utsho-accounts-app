import { Module } from '@nestjs/common';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { StaffModule } from './staff/staff.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [StudentsModule, TeachersModule, StaffModule, PaymentsModule],
  exports: [StudentsModule, TeachersModule, StaffModule, PaymentsModule],
})
export class UacModule {}
