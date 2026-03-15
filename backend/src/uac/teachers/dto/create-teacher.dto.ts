import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { IsPersonName } from '../../../common/validators/is-person-name.validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  @IsPersonName()
  name: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsEnum(['fixed', 'lecture_based'])
  paymentType: string;

  // Required if paymentType is 'fixed'
  @ValidateIf((o) => o.paymentType === 'fixed')
  @IsNumber()
  @Min(0)
  monthlySalary?: number;

  // Required if paymentType is 'lecture_based'
  @ValidateIf((o) => o.paymentType === 'lecture_based')
  @IsNumber()
  @Min(0)
  perLectureRate?: number;

  @IsOptional()
  @IsString()
  subjects?: string; // Comma-separated subjects: "Math, Physics, Chemistry"
}
