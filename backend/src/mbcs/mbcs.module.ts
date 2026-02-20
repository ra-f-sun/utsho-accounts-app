import { Module } from '@nestjs/common';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { StaffModule } from './staff/staff.module';
import { PaymentsModule } from './payments/payments.module';
import { TeacherAttendanceModule } from './teacher-attendance/teacher-attendance.module';
import { PayrollModule } from './payroll/payroll.module';

@Module({
  imports: [
    StudentsModule,
    TeachersModule,
    StaffModule,
    PaymentsModule,
    TeacherAttendanceModule,
    PayrollModule,
  ],
  exports: [
    StudentsModule,
    TeachersModule,
    StaffModule,
    PaymentsModule,
    TeacherAttendanceModule,
    PayrollModule,
  ],
})
export class MbcsModule {}
