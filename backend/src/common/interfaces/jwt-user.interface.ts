import { Role } from '@prisma/client';

export interface JwtUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}
