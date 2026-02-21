import { Module } from '@nestjs/common';
import { MecStudentsService } from './students.service';
import { MecStudentsController } from './students.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MecStudentsController],
  providers: [MecStudentsService],
  exports: [MecStudentsService],
})
export class MecStudentsModule {}
