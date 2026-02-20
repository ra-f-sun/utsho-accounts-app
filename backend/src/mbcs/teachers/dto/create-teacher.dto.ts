import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  MinLength,
  Matches,
  IsArray,
  ValidateIf,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsEnum(['fixed', 'lecture_based'])
  paymentType: string;

  @ValidateIf((o) => o.paymentType === 'fixed')
  @IsNumber()
  @Min(0)
  monthlySalary?: number;

  @ValidateIf((o) => o.paymentType === 'lecture_based')
  @IsNumber()
  @Min(0)
  perLectureRate?: number;

  @IsOptional()
  @IsArray()
  subjects?: { class: number; subject: string }[];
}
