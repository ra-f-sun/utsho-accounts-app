import { IsEmail, IsString, MinLength, IsEnum, Matches } from 'class-validator';
import { Role } from '@prisma/client';
import { IsPersonName } from '../../common/validators/is-person-name.validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Password must be at least 8 characters and contain uppercase, lowercase, and a number',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @IsPersonName()
  fullName: string;

  @IsEnum(Role)
  role: Role;
}
