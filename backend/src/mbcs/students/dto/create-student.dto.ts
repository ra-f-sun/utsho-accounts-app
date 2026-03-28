import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsEmail,
} from 'class-validator';
import { IsPersonName } from '../../../common/validators/is-person-name.validator';
import { IsNotFutureDateString } from '../../../common/validators/is-not-future-date-string.validator';
import { Gender, Shift } from '@prisma/client';

export class CreateStudentDto {
  // === Required fields ===
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsPersonName()
  name: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsDateString()
  @IsNotFutureDateString({ message: 'Date of birth cannot be in the future' })
  dateOfBirth: string;

  @IsInt()
  @Min(0)
  @Max(10)
  class: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsPersonName()
  guardianName: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  monthlyTuitionFee: number;

  // === MBCS-specific: shift (morning/day) instead of group ===
  @IsOptional()
  @IsEnum(Shift)
  shift?: Shift;

  // === MBCS-specific: branch instead of school ===
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  section?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  serialNo?: string;

  // === Optional personal fields ===
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  healthCondition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  presentAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentLivingWith?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastSchoolAttended?: string;

  // === Optional father information ===
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsPersonName()
  fatherName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Father mobile must be a valid Bangladesh mobile number',
  })
  fatherMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fatherOccupation?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  fatherEmail?: string;

  // === Optional mother information ===
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsPersonName()
  motherName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Mother mobile must be a valid Bangladesh mobile number',
  })
  motherMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motherOccupation?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  motherEmail?: string;

  // === Optional admission fields ===
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  admissionFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  readmissionFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  discountTuition?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  discountAdmission?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  discountReadmission?: number;

  @IsOptional()
  @IsDateString()
  @IsNotFutureDateString({ message: 'Admission date cannot be in the future' })
  admissionDate?: string;
}
