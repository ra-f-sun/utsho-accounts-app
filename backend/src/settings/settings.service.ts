import { Injectable } from '@nestjs/common';
import { Prisma, OrgSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all settings for an organisation */
  async getAll(organization: string): Promise<OrgSettings[]> {
    return this.prisma.orgSettings.findMany({
      where: { organization },
      orderBy: { settingKey: 'asc' },
    });
  }

  /** Get a specific setting by org + key */
  async get(organization: string, key: string): Promise<OrgSettings | null> {
    return this.prisma.orgSettings.findUnique({
      where: { organization_settingKey: { organization, settingKey: key } },
    });
  }

  /** Create or update a single setting */
  async upsert(
    organization: string,
    key: string,
    value: unknown,
  ): Promise<OrgSettings> {
    return this.prisma.orgSettings.upsert({
      where: { organization_settingKey: { organization, settingKey: key } },
      update: { settingValue: value as Prisma.InputJsonValue },
      create: {
        organization,
        settingKey: key,
        settingValue: value as Prisma.InputJsonValue,
      },
    });
  }

  /** Atomically create/update multiple settings for an org */
  async bulkUpsert(
    organization: string,
    settings: Array<{ key: string; value: unknown }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      settings.map(({ key, value }) =>
        this.prisma.orgSettings.upsert({
          where: { organization_settingKey: { organization, settingKey: key } },
          update: { settingValue: value as Prisma.InputJsonValue },
          create: {
            organization,
            settingKey: key,
            settingValue: value as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }

  /** Delete a specific setting */
  async delete(organization: string, key: string): Promise<void> {
    await this.prisma.orgSettings.delete({
      where: { organization_settingKey: { organization, settingKey: key } },
    });
  }
}
