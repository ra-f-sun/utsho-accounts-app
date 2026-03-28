import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPersonName } from '../../../common/validators/is-person-name.validator';
import { TeacherSalaryType } from '@prisma/client';

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsPersonName()
  name: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsEnum(TeacherSalaryType)
  paymentType: TeacherSalaryType;

  @ValidateIf((o) => o.paymentType === TeacherSalaryType.fixed)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  monthlySalary?: number;

  @ValidateIf((o) => o.paymentType === TeacherSalaryType.lecture_based)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  perLectureRate?: number;

  @IsOptional()
  @IsArray()
  subjects?: { class: number; subject: string }[];
}
