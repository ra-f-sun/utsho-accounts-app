import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  PromoteMbcsBulkDto,
  PromoteMbcsStudentDto,
} from './dto/promote-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto) {
    const data: Prisma.MbcsStudentCreateInput = {
      ...createStudentDto,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : undefined,
    };

    return this.prisma.mbcsStudent.create({ data });
  }

  async importBulk(students: CreateStudentDto[]) {
    return this.prisma.$transaction(
      students.map((dto) =>
        this.prisma.mbcsStudent.create({
          data: {
            ...dto,
            dateOfBirth: new Date(dto.dateOfBirth),
            admissionDate: dto.admissionDate
              ? new Date(dto.admissionDate)
              : undefined,
          },
        }),
      ),
    );
  }

  async findAll(filters?: FilterStudentDto, pagination?: PaginationDto) {
    const where: Prisma.MbcsStudentWhereInput = {
      isActive: true,
      associationEndDate: null,
    };

    if (filters?.class) {
      where.class = filters.class;
    }

    if (filters?.shift) {
      where.shift = filters.shift;
    }

    if (filters?.branch) {
      where.branch = {
        contains: filters.branch,
        mode: 'insensitive',
      };
    }

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
      this.prisma.mbcsStudent.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.mbcsStudent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const student = await this.prisma.mbcsStudent.findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    await this.findOne(id);

    const data: Prisma.MbcsStudentUpdateInput = { ...updateStudentDto };

    if (updateStudentDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateStudentDto.dateOfBirth);
    }
    if (updateStudentDto.admissionDate) {
      data.admissionDate = new Date(updateStudentDto.admissionDate);
    }

    return this.prisma.mbcsStudent.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.mbcsStudent.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async disassociate(id: string) {
    await this.findOne(id);
    return this.prisma.mbcsStudent.update({
      where: { id },
      data: { associationEndDate: new Date() },
    });
  }

  async reassociate(id: string) {
    const student = await this.prisma.mbcsStudent.findUnique({ where: { id } });
    if (!student)
      throw new NotFoundException(`Student with ID ${id} not found`);
    return this.prisma.mbcsStudent.update({
      where: { id },
      data: { associationEndDate: null },
    });
  }

  async syncFeesFromSettings(): Promise<{ updated: number }> {
    // Load all MBCS org settings
    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'mbcs' },
    });

    const settingMap = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) {
        settingMap.set(row.settingKey, numVal);
      }
    }

    const resolveOrDefault = (
      overrideKey: string,
      defaultKey: string,
    ): number => settingMap.get(overrideKey) ?? settingMap.get(defaultKey) ?? 0;

    // Load all active students
    const students = await this.prisma.mbcsStudent.findMany({
      where: { isActive: true },
      select: { id: true, class: true, isPromoted: true },
    });

    if (students.length === 0) return { updated: 0 };

    const updates = students.map((s) =>
      this.prisma.mbcsStudent.update({
        where: { id: s.id },
        data: {
          monthlyTuitionFee: resolveOrDefault(
            `tuition_override_${s.class}`,
            'tuition_default',
          ),
          admissionFee: resolveOrDefault(
            `admission_override_${s.class}`,
            'admission_default',
          ),
          // Only promoted students get readmission fee; new admissions get 0
          readmissionFee: s.isPromoted
            ? resolveOrDefault(
                `readmission_override_${s.class}`,
                'readmission_default',
              )
            : 0,
        },
      }),
    );

    await this.prisma.$transaction(updates);
    return { updated: students.length };
  }

  async promote(id: string, dto: PromoteMbcsStudentDto, promotedBy: string) {
    const student = await this.findOne(id);

    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'mbcs' },
    });
    const settingMap = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) settingMap.set(row.settingKey, numVal);
    }
    const resolve = (overrideKey: string, defaultKey: string) =>
      settingMap.get(overrideKey) ?? settingMap.get(defaultKey) ?? 0;

    const newTuition =
      resolve(`tuition_override_${dto.toClass}`, 'tuition_default') ||
      student.monthlyTuitionFee;
    const newReadmission = resolve(
      `readmission_override_${dto.toClass}`,
      'readmission_default',
    );

    const [, updatedStudent] = await this.prisma.$transaction([
      this.prisma.promotionLog.create({
        data: {
          organization: 'mbcs',
          studentId: id,
          fromClass: student.class,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.prisma.mbcsStudent.update({
        where: { id },
        data: {
          class: dto.toClass,
          monthlyTuitionFee: newTuition,
          isPromoted: true,
          ...(newReadmission > 0 && { readmissionFee: newReadmission }),
        },
      }),
    ]);
    return updatedStudent;
  }

  async promoteBulk(
    dto: PromoteMbcsBulkDto,
    promotedBy: string,
  ): Promise<{ promoted: number }> {
    const students = await this.prisma.mbcsStudent.findMany({
      where: { isActive: true, associationEndDate: null, class: dto.fromClass },
      select: { id: true, monthlyTuitionFee: true },
    });
    if (students.length === 0) return { promoted: 0 };

    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'mbcs' },
    });
    const settingMap = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) settingMap.set(row.settingKey, numVal);
    }
    const resolve = (overrideKey: string, defaultKey: string) =>
      settingMap.get(overrideKey) ?? settingMap.get(defaultKey) ?? 0;

    const newTuition = resolve(
      `tuition_override_${dto.toClass}`,
      'tuition_default',
    );
    const newReadmission = resolve(
      `readmission_override_${dto.toClass}`,
      'readmission_default',
    );

    const ops = students.flatMap((s) => [
      this.prisma.promotionLog.create({
        data: {
          organization: 'mbcs',
          studentId: s.id,
          fromClass: dto.fromClass,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.prisma.mbcsStudent.update({
        where: { id: s.id },
        data: {
          class: dto.toClass,
          isPromoted: true,
          ...(newTuition > 0 && { monthlyTuitionFee: newTuition }),
          ...(newReadmission > 0 && { readmissionFee: newReadmission }),
        },
      }),
    ]);

    await this.prisma.$transaction(ops);
    return { promoted: students.length };
  }
}
