import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { BulkUpsertSettingsDto } from './dto/upsert-setting.dto';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** GET /api/settings/:org — Get all settings for an org */
  @Get(':org')
  getAll(@Param('org') org: string) {
    return this.settingsService.getAll(org);
  }

  /** GET /api/settings/:org/:key — Get a specific setting */
  @Get(':org/:key')
  get(@Param('org') org: string, @Param('key') key: string) {
    return this.settingsService.get(org, key);
  }

  /** PUT /api/settings/:org/bulk — Bulk upsert settings */
  @Put(':org/bulk')
  @HttpCode(HttpStatus.OK)
  bulkUpsert(@Param('org') org: string, @Body() dto: BulkUpsertSettingsDto) {
    return this.settingsService.bulkUpsert(org, dto.settings);
  }

  /** PUT /api/settings/:org/:key — Upsert a single setting */
  @Put(':org/:key')
  @HttpCode(HttpStatus.OK)
  upsert(
    @Param('org') org: string,
    @Param('key') key: string,
    @Body('value') value: any,
  ) {
    return this.settingsService.upsert(org, key, value);
  }

  /** DELETE /api/settings/:org/:key — Delete a setting */
  @Delete(':org/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('org') org: string, @Param('key') key: string) {
    return this.settingsService.delete(org, key);
  }
}
