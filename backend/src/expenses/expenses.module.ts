import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { UacExpensesController } from './uac-expenses.controller';
import { MbcsExpensesController } from './mbcs-expenses.controller';
import { MecExpensesController } from './mec-expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExpensesController,
    UacExpensesController,
    MbcsExpensesController,
    MecExpensesController,
  ],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
