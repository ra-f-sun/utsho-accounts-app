import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  MinLength,
  IsOptional,
  Matches,
  IsEmail,
} from 'class-validator';

export class CreateMecStudentDto {
  // === Required fields ===
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(['male', 'female', 'other'])
  gender: string;

  @IsDateString()
  dateOfBirth: string;

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
  @IsInt()
  @Min(1)
  class?: number;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  section?: string;

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

  // === Optional admission fields ===
  @IsOptional()
  @IsNumber()
  @Min(0)
  admissionFee?: number;

  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  // === Fee & Discount fields ===
  @IsOptional()
  @IsNumber()
  @Min(0)
  readmissionFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTuition?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAdmission?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountReadmission?: number;
}
