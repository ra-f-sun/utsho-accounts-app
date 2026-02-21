import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum Organization {
  UAC = 'uac',
  MBCS = 'mbcs',
  MEC = 'mec',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(Organization)
  organization?: Organization;

  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD
}
