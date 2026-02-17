import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsOptional,
  Matches,
  IsEmail,
} from 'class-validator';

export class CreateStudentDto {
  // === Required fields ===
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(['male', 'female', 'other'])
  gender: string;

  @IsDateString()
  dateOfBirth: string;

  @IsInt()
  @Min(8)
  @Max(12)
  class: number;

  @IsString()
  @MinLength(2)
  guardianName: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsNumber()
  @Min(0)
  monthlyTuitionFee: number;

  // === Optional academic fields ===
  @IsOptional()
  @IsEnum(['science', 'business'])
  group?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  serialNo?: string;

  // === Optional personal fields ===
  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  healthCondition?: string;

  @IsOptional()
  @IsString()
  presentAddress?: string;

  @IsOptional()
  @IsString()
  studentLivingWith?: string;

  @IsOptional()
  @IsString()
  lastSchoolAttended?: string;

  // === Optional father information ===
  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Father mobile must be a valid Bangladesh mobile number',
  })
  fatherMobile?: string;

  @IsOptional()
  @IsString()
  fatherOccupation?: string;

  @IsOptional()
  @IsEmail()
  fatherEmail?: string;

  // === Optional mother information ===
  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Mother mobile must be a valid Bangladesh mobile number',
  })
  motherMobile?: string;

  @IsOptional()
  @IsString()
  motherOccupation?: string;

  @IsOptional()
  @IsEmail()
  motherEmail?: string;
}
