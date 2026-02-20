import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttendanceDto {
  @IsString()
  teacherId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  class?: number;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsDateString()
  attendanceDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lecturesTaken?: number;
}
