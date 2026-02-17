import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsOptional()
  @IsString()
  designation?: string; // e.g., "Office Assistant", "Cleaner", "Security Guard"

  @IsNumber()
  @Min(0)
  monthlySalary: number;
}
