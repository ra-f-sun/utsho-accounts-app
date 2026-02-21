import { Module } from '@nestjs/common';
import { MecStudentsModule } from './students/students.module';
import { MecPaymentsModule } from './payments/payments.module';

@Module({
  imports: [MecStudentsModule, MecPaymentsModule],
  exports: [MecStudentsModule, MecPaymentsModule],
})
export class MecModule {}
