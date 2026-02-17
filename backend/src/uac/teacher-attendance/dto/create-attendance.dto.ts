import {
  IsUUID,
  IsInt,
  IsString,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  teacherId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  class?: number; // Which class they taught (1-12)

  @IsOptional()
  @IsString()
  subject?: string; // Subject taught

  @IsDateString()
  attendanceDate: string;

  @IsInt()
  @Min(1)
  lecturesTaken: number; // Number of lectures given on this date
}
