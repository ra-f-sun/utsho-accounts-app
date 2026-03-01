import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateMecStudentDto } from './create-student.dto';

export class ImportMecStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateMecStudentDto)
  students: CreateMecStudentDto[];
}
