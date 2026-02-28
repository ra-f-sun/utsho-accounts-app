import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSettingDto {
  @IsString()
  @IsNotEmpty()
  settingKey: string;

  // settingValue is flexible JSON — no strict validation, any valid JSON is accepted
  @IsOptional()
  settingValue: any;
}

export class SettingItemDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  // value is unrestricted JSON — allow any shape
  @IsOptional()
  value: any;
}

export class BulkUpsertSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}

export class OrgParamDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['uac', 'mbcs', 'mec'])
  org: string;
}
