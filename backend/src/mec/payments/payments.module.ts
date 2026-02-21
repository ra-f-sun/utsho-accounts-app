import { Module } from '@nestjs/common';
import { MecPaymentsService } from './payments.service';
import { MecPaymentsController } from './payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [MecPaymentsController],
  providers: [MecPaymentsService],
  exports: [MecPaymentsService],
})
export class MecPaymentsModule {}
