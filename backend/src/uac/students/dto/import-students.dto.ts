import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class ImportStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateStudentDto)
  students: CreateStudentDto[];
}
