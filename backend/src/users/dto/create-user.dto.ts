import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Role } from '@prisma/client';
import { IsPersonName } from '../../common/validators/is-person-name.validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  @IsPersonName()
  fullName: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
