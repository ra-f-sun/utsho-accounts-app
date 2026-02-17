import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeacherAttendanceModule } from '../teacher-attendance/teacher-attendance.module';

@Module({
  imports: [PrismaModule, TeacherAttendanceModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
