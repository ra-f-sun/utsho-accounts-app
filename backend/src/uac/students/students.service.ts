import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Gender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PromoteBulkDto, PromoteStudentDto } from './dto/promote-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto) {
    const normalizedGroup = createStudentDto.class < 9 ? undefined : createStudentDto.group;
    const data: Prisma.UacStudentCreateInput = {
      ...createStudentDto,
      gender: createStudentDto.gender as Gender,
      group: normalizedGroup,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : undefined,
    };

    return this.prisma.uacStudent.create({
      data,
    });
  }

  async importBulk(students: CreateStudentDto[]) {
    return this.prisma.$transaction(
      students.map((dto) =>
        this.prisma.uacStudent.create({
          data: {
            ...dto,
            gender: dto.gender as Gender,
            group: dto.class < 9 ? undefined : dto.group,
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
    const where: Prisma.UacStudentWhereInput = {
      isActive: true,
      associationEndDate: null,
    };

    // Apply filters
    if (filters?.class) {
      where.class = filters.class;
    }

    if (filters?.group) {
      where.group = filters.group;
    }

    if (filters?.school) {
      where.school = {
        contains: filters.school,
        mode: 'insensitive',
      };
    }

    // Apply search across multiple fields
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
      this.prisma.uacStudent.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.uacStudent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const student = await this.prisma.uacStudent.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    // Check if student exists
    const existing = await this.findOne(id);

    const { gender, ...rest } = updateStudentDto;
    const data: Prisma.UacStudentUpdateInput = {
      ...rest,
      ...(gender && { gender: gender as Gender }),
    };

    // Convert date strings to Date objects if provided
    if (updateStudentDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateStudentDto.dateOfBirth);
    }
    if (updateStudentDto.admissionDate) {
      data.admissionDate = new Date(updateStudentDto.admissionDate);
    }

    const effectiveClass = updateStudentDto.class ?? existing.class;
    if (effectiveClass < 9) {
      data.group = undefined;
    }

    return this.prisma.uacStudent.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Check if student exists
    await this.findOne(id);

    // Soft delete
    return this.prisma.uacStudent.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async disassociate(id: string) {
    await this.findOne(id);
    return this.prisma.uacStudent.update({
      where: { id },
      data: { associationEndDate: new Date() },
    });
  }

  async reassociate(id: string) {
    const student = await this.prisma.uacStudent.findUnique({ where: { id } });
    if (!student)
      throw new NotFoundException(`Student with ID ${id} not found`);
    return this.prisma.uacStudent.update({
      where: { id },
      data: { associationEndDate: null },
    });
  }

  async syncFeesFromSettings(): Promise<{ updated: number }> {
    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'uac' },
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

    const students = await this.prisma.uacStudent.findMany({
      where: { isActive: true },
      select: { id: true, class: true, isPromoted: true },
    });

    if (students.length === 0) return { updated: 0 };

    const updates = students.map((s) =>
      this.prisma.uacStudent.update({
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

  async promote(id: string, dto: PromoteStudentDto, promotedBy: string) {
    const student = await this.findOne(id);

    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'uac' },
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
          organization: 'uac',
          studentId: id,
          fromClass: student.class,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.prisma.uacStudent.update({
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
    dto: PromoteBulkDto,
    promotedBy: string,
  ): Promise<{ promoted: number }> {
    const selectedIds = dto.studentIds?.length
      ? Array.from(new Set(dto.studentIds))
      : undefined;

    const students = await this.prisma.uacStudent.findMany({
      where: {
        isActive: true,
        associationEndDate: null,
        class: dto.fromClass,
        ...(selectedIds ? { id: { in: selectedIds } } : {}),
      },
      select: { id: true, monthlyTuitionFee: true },
    });
    if (students.length === 0) return { promoted: 0 };

    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'uac' },
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
          organization: 'uac',
          studentId: s.id,
          fromClass: dto.fromClass,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.prisma.uacStudent.update({
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
