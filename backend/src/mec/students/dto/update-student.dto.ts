import { PartialType } from '@nestjs/mapped-types';
import { CreateMecStudentDto } from './create-student.dto';

export class UpdateMecStudentDto extends PartialType(CreateMecStudentDto) {}
