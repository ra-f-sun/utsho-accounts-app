import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import { IsPersonName } from '../../common/validators/is-person-name.validator';

export class RegisterDto {
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
}
