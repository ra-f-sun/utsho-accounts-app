import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Gender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../dto/pagination.dto';

type OrgType = 'uac' | 'mbcs' | 'mec';

interface OrgConfig {
  maxClass?: number;
  groupRequiresMinClass?: number;
  hasFeeClassSync: boolean; // true = class-based tuition/admission/readmission; false = simple tuition_default
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac:  { maxClass: 12,        groupRequiresMinClass: 9,         hasFeeClassSync: true  },
  mbcs: { maxClass: undefined, groupRequiresMinClass: undefined, hasFeeClassSync: true  },
  mec:  { maxClass: undefined, groupRequiresMinClass: 9,         hasFeeClassSync: false },
};

interface CreateStudentDto {
  name: string;
  contactNumber: string;
  guardianName?: string;
  gender?: string;
  dateOfBirth: string;
  admissionDate?: string;
  class?: number;
  group?: string;
  school?: string;
  shift?: string;
  branch?: string;
  monthlyTuitionFee?: number;
  admissionFee?: number;
  readmissionFee?: number;
}

interface UpdateStudentDto {
  class?: number;
  group?: string;
  gender?: string;
  shift?: string;
  dateOfBirth?: string;
  admissionDate?: string;
}

interface FilterStudentDto {
  class?: number;
  group?: string;
  school?: string;
  shift?: string;
  branch?: string;
  search?: string;
}

interface PromoteStudentDto {
  toClass: number;
  notes?: string;
}

interface PromoteBulkDto {
  fromClass: number;
  toClass: number;
  notes?: string;
  studentIds?: string[];
}

@Injectable()
export class SharedStudentsService {
  constructor(private prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model(org: OrgType): any {
    if (org === 'uac') return this.prisma.uacStudent;
    if (org === 'mbcs') return this.prisma.mbcsStudent;
    return this.prisma.mecStudent;
  }

  private buildSettingMap(rows: { settingKey: string; settingValue: unknown }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) map.set(row.settingKey, numVal);
    }
    return map;
  }

  private normalizeGroup(cls: number | null | undefined, groupRequiresMinClass: number | undefined, group: unknown): unknown {
    if (groupRequiresMinClass === undefined) return group;
    if (typeof cls === 'number' && cls < groupRequiresMinClass) return undefined;
    return group;
  }

  async create(org: OrgType, dto: CreateStudentDto) {
    const config = ORG_CONFIG[org];
    const normalizedGroup = this.normalizeGroup(dto.class, config.groupRequiresMinClass, dto.group);

    const data: Record<string, unknown> = {
      ...dto,
      group: normalizedGroup,
      ...(dto.gender && { gender: dto.gender as Gender }),
      ...(dto.shift && { shift: dto.shift }),
      dateOfBirth: new Date(dto.dateOfBirth),
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
    };

    return this.model(org).create({ data });
  }

  async importBulk(org: OrgType, students: CreateStudentDto[]) {
    const config = ORG_CONFIG[org];
    return this.prisma.$transaction(
      students.map((dto) => {
        const normalizedGroup = this.normalizeGroup(dto.class, config.groupRequiresMinClass, dto.group);
        const data: Record<string, unknown> = {
          ...dto,
          group: normalizedGroup,
          ...(dto.gender && { gender: dto.gender as Gender }),
          ...(dto.shift && { shift: dto.shift }),
          dateOfBirth: new Date(dto.dateOfBirth),
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
        };
        return this.model(org).create({ data });
      }),
    );
  }

  async findAll(org: OrgType, filters?: FilterStudentDto, pagination?: PaginationDto) {
    const where: Record<string, unknown> = {
      isActive: true,
      associationEndDate: null,
    };

    if (filters?.class !== undefined) where.class = filters.class;
    if (filters?.group) where.group = filters.group;
    if (filters?.school) where.school = { contains: filters.school, mode: 'insensitive' };
    if (filters?.shift) where.shift = filters.shift;
    if (filters?.branch) where.branch = { contains: filters.branch, mode: 'insensitive' };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contactNumber: { contains: filters.search } },
        { guardianName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model(org).findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      this.model(org).count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(org: OrgType, id: string) {
    const student = await this.model(org).findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(org: OrgType, id: string, dto: UpdateStudentDto) {
    const existing = await this.findOne(org, id);
    const config = ORG_CONFIG[org];

    const { gender, shift, ...rest } = dto;
    const data: Record<string, unknown> = {
      ...rest,
      ...(gender && { gender: gender as Gender }),
      ...(shift && { shift }),
    };

    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.admissionDate) data.admissionDate = new Date(dto.admissionDate);

    if (config.groupRequiresMinClass !== undefined) {
      const effectiveClass = dto.class ?? (existing as Record<string, unknown>).class;
      if (typeof effectiveClass === 'number' && effectiveClass < config.groupRequiresMinClass) {
        data.group = undefined;
      }
    }

    return this.model(org).update({ where: { id }, data });
  }

  async remove(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.model(org).update({ where: { id }, data: { isActive: false } });
  }

  async disassociate(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.model(org).update({ where: { id }, data: { associationEndDate: new Date() } });
  }

  async reassociate(org: OrgType, id: string) {
    const student = await this.model(org).findUnique({ where: { id } });
    if (!student) throw new NotFoundException(`Student with ID ${id} not found`);
    return this.model(org).update({ where: { id }, data: { associationEndDate: null } });
  }

  async syncFeesFromSettings(org: OrgType): Promise<{ updated: number }> {
    const config = ORG_CONFIG[org];
    const rows = await this.prisma.orgSettings.findMany({ where: { organization: org } });
    const settingMap = this.buildSettingMap(rows);

    if (!config.hasFeeClassSync) {
      // MEC: apply single tuition_default to all active students
      const tuitionDefault = settingMap.get('tuition_default') ?? 0;
      if (!tuitionDefault) return { updated: 0 };

      const students = await this.model(org).findMany({
        where: { isActive: true },
        select: { id: true },
      });
      if (students.length === 0) return { updated: 0 };

      await this.prisma.$transaction(
        students.map((s: { id: string }) =>
          this.model(org).update({ where: { id: s.id }, data: { monthlyTuitionFee: tuitionDefault } }),
        ),
      );
      return { updated: students.length };
    }

    // UAC/MBCS: class-based fee resolution
    const resolve = (overrideKey: string, defaultKey: string): number =>
      settingMap.get(overrideKey) ?? settingMap.get(defaultKey) ?? 0;

    const students = await this.model(org).findMany({
      where: { isActive: true },
      select: { id: true, class: true, isPromoted: true },
    });
    if (students.length === 0) return { updated: 0 };

    await this.prisma.$transaction(
      students.map((s: { id: string; class: number; isPromoted: boolean }) =>
        this.model(org).update({
          where: { id: s.id },
          data: {
            monthlyTuitionFee: resolve(`tuition_override_${s.class}`, 'tuition_default'),
            admissionFee: resolve(`admission_override_${s.class}`, 'admission_default'),
            readmissionFee: s.isPromoted
              ? resolve(`readmission_override_${s.class}`, 'readmission_default')
              : 0,
          },
        }),
      ),
    );
    return { updated: students.length };
  }

  async promote(org: OrgType, id: string, dto: PromoteStudentDto, promotedBy: string) {
    const config = ORG_CONFIG[org];
    const student = await this.findOne(org, id);
    const currentClass = (student as Record<string, unknown>).class as number | null;

    if (config.maxClass !== undefined && dto.toClass > config.maxClass) {
      throw new BadRequestException(`Cannot promote beyond class ${config.maxClass}`);
    }
    if (currentClass !== null && dto.toClass <= currentClass) {
      throw new BadRequestException(
        `Target class (${dto.toClass}) must be higher than current class (${currentClass})`,
      );
    }

    const rows = await this.prisma.orgSettings.findMany({ where: { organization: org } });
    const settingMap = this.buildSettingMap(rows);
    const currentFee = (student as Record<string, unknown>).monthlyTuitionFee as number;

    let newTuition = currentFee;
    let newReadmission = 0;

    if (config.hasFeeClassSync) {
      const resolve = (ok: string, dk: string) => settingMap.get(ok) ?? settingMap.get(dk) ?? 0;
      newTuition = resolve(`tuition_override_${dto.toClass}`, 'tuition_default') || currentFee;
      newReadmission = resolve(`readmission_override_${dto.toClass}`, 'readmission_default');
    } else {
      newTuition = settingMap.get('tuition_default') || currentFee;
    }

    const [, updatedStudent] = await this.prisma.$transaction([
      this.prisma.promotionLog.create({
        data: {
          organization: org,
          studentId: id,
          fromClass: currentClass ?? 0,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.model(org).update({
        where: { id },
        data: {
          class: dto.toClass,
          monthlyTuitionFee: newTuition,
          ...(config.hasFeeClassSync && { isPromoted: true }),
          ...(newReadmission > 0 && { readmissionFee: newReadmission }),
        },
      }),
    ]);
    return updatedStudent;
  }

  async promoteBulk(org: OrgType, dto: PromoteBulkDto, promotedBy: string): Promise<{ promoted: number }> {
    const config = ORG_CONFIG[org];

    if (config.maxClass !== undefined && dto.toClass > config.maxClass) {
      throw new BadRequestException(`Cannot promote beyond class ${config.maxClass}`);
    }
    if (dto.toClass <= dto.fromClass) {
      throw new BadRequestException(
        `Target class (${dto.toClass}) must be higher than source class (${dto.fromClass})`,
      );
    }

    const selectedIds = dto.studentIds?.length
      ? Array.from(new Set(dto.studentIds))
      : undefined;

    const students = await this.model(org).findMany({
      where: {
        isActive: true,
        associationEndDate: null,
        class: dto.fromClass,
        ...(selectedIds ? { id: { in: selectedIds } } : {}),
      },
      select: { id: true, monthlyTuitionFee: true },
    });
    if (students.length === 0) return { promoted: 0 };

    const rows = await this.prisma.orgSettings.findMany({ where: { organization: org } });
    const settingMap = this.buildSettingMap(rows);

    let newTuition = 0;
    let newReadmission = 0;

    if (config.hasFeeClassSync) {
      const resolve = (ok: string, dk: string) => settingMap.get(ok) ?? settingMap.get(dk) ?? 0;
      newTuition = resolve(`tuition_override_${dto.toClass}`, 'tuition_default');
      newReadmission = resolve(`readmission_override_${dto.toClass}`, 'readmission_default');
    } else {
      newTuition = settingMap.get('tuition_default') ?? 0;
    }

    const ops = students.flatMap((s: { id: string }) => [
      this.prisma.promotionLog.create({
        data: {
          organization: org,
          studentId: s.id,
          fromClass: dto.fromClass,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.model(org).update({
        where: { id: s.id },
        data: {
          class: dto.toClass,
          ...(config.hasFeeClassSync && { isPromoted: true }),
          ...(newTuition > 0 && { monthlyTuitionFee: newTuition }),
          ...(newReadmission > 0 && { readmissionFee: newReadmission }),
        },
      }),
    ]);

    await this.prisma.$transaction(ops);
    return { promoted: students.length };
  }
}
