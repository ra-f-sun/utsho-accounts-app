import { IsString, IsNotEmpty } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  @IsNotEmpty()
  settingKey: string;

  // settingValue is flexible JSON — no strict validation, any valid JSON is accepted
  settingValue: any;
}

export class BulkUpsertSettingsDto {
  settings: Array<{ key: string; value: any }>;
}
