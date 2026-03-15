import {
  IsString,
  IsNumber,
  Min,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { IsPersonName } from '../../../common/validators/is-person-name.validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  @IsPersonName()
  name: string;

  @IsString()
  @Matches(/^(\+880)?1[3-9]\d{8}$/, {
    message: 'Contact number must be a valid Bangladesh mobile number',
  })
  contactNumber: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsNumber()
  @Min(0)
  monthlySalary: number;
}
