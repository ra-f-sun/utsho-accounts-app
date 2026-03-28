import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMecStudentDto } from './dto/create-student.dto';
import { UpdateMecStudentDto } from './dto/update-student.dto';
import { FilterMecStudentDto } from './dto/filter-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  PromoteMecBulkDto,
  PromoteMecStudentDto,
} from './dto/promote-student.dto';

@Injectable()
export class MecStudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateMecStudentDto) {
    const normalizedGroup =
      typeof createStudentDto.class === 'number' && createStudentDto.class < 9
        ? undefined
        : createStudentDto.group;
    const data: Prisma.MecStudentCreateInput = {
      ...createStudentDto,
      group: normalizedGroup,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : undefined,
    };

    return this.prisma.mecStudent.create({ data });
  }

  async importBulk(students: CreateMecStudentDto[]) {
    return this.prisma.$transaction(
      students.map((dto) =>
        this.prisma.mecStudent.create({
          data: {
            ...dto,
            group:
              typeof dto.class === 'number' && dto.class < 9
                ? undefined
                : dto.group,
            dateOfBirth: new Date(dto.dateOfBirth),
            admissionDate: dto.admissionDate
              ? new Date(dto.admissionDate)
              : undefined,
          },
        }),
      ),
    );
  }

  async findAll(filters?: FilterMecStudentDto, pagination?: PaginationDto) {
    const where: Prisma.MecStudentWhereInput = {
      isActive: true,
      associationEndDate: null,
    };

    if (filters?.class) {
      where.class = filters.class;
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
      this.prisma.mecStudent.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.mecStudent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const student = await this.prisma.mecStudent.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateMecStudentDto) {
    const existing = await this.findOne(id);

    const data: Prisma.MecStudentUpdateInput = { ...updateStudentDto };

    if (updateStudentDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateStudentDto.dateOfBirth);
    }
    if (updateStudentDto.admissionDate) {
      data.admissionDate = new Date(updateStudentDto.admissionDate);
    }

    const effectiveClass = updateStudentDto.class ?? existing.class;
    if (typeof effectiveClass === 'number' && effectiveClass < 9) {
      data.group = undefined;
    }

    return this.prisma.mecStudent.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mecStudent.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async disassociate(id: string) {
    await this.findOne(id);
    return this.prisma.mecStudent.update({
      where: { id },
      data: { associationEndDate: new Date() },
    });
  }

  async reassociate(id: string) {
    const student = await this.prisma.mecStudent.findUnique({ where: { id } });
    if (!student)
      throw new NotFoundException(`Student with ID ${id} not found`);
    return this.prisma.mecStudent.update({
      where: { id },
      data: { associationEndDate: null },
    });
  }

  async syncFeesFromSettings(): Promise<{ updated: number }> {
    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'mec' },
    });

    const settingMap = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) {
        settingMap.set(row.settingKey, numVal);
      }
    }

    const tuitionDefault = settingMap.get('tuition_default') ?? 0;
    if (!tuitionDefault) return { updated: 0 };

    const students = await this.prisma.mecStudent.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (students.length === 0) return { updated: 0 };

    const updates = students.map((s) =>
      this.prisma.mecStudent.update({
        where: { id: s.id },
        data: { monthlyTuitionFee: tuitionDefault },
      }),
    );

    await this.prisma.$transaction(updates);
    return { updated: students.length };
  }

  async promote(id: string, dto: PromoteMecStudentDto, promotedBy: string) {
    const student = await this.findOne(id);

    if (dto.toClass !== undefined && student.class !== null && dto.toClass <= student.class) {
      throw new BadRequestException(`Target class (${dto.toClass}) must be higher than current class (${student.class})`);
    }

    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'mec' },
    });
    const settingMap = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) settingMap.set(row.settingKey, numVal);
    }
    const newTuition =
      settingMap.get('tuition_default') || student.monthlyTuitionFee;

    const [, updatedStudent] = await this.prisma.$transaction([
      this.prisma.promotionLog.create({
        data: {
          organization: 'mec',
          studentId: id,
          fromClass: student.class ?? 0,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.prisma.mecStudent.update({
        where: { id },
        data: { class: dto.toClass, monthlyTuitionFee: newTuition },
      }),
    ]);
    return updatedStudent;
  }

  async promoteBulk(
    dto: PromoteMecBulkDto,
    promotedBy: string,
  ): Promise<{ promoted: number }> {
    if (dto.toClass !== undefined && dto.fromClass !== undefined && dto.toClass <= dto.fromClass) {
      throw new BadRequestException(`Target class (${dto.toClass}) must be higher than source class (${dto.fromClass})`);
    }

    const students = await this.prisma.mecStudent.findMany({
      where: { isActive: true, associationEndDate: null, class: dto.fromClass },
      select: { id: true },
    });
    if (students.length === 0) return { promoted: 0 };

    const rows = await this.prisma.orgSettings.findMany({
      where: { organization: 'mec' },
    });
    const settingMap = new Map<string, number>();
    for (const row of rows) {
      const val = row.settingValue as { value?: number } | null;
      const numVal = val?.value;
      if (numVal && numVal > 0) settingMap.set(row.settingKey, numVal);
    }
    const newTuition = settingMap.get('tuition_default');

    const ops = students.flatMap((s) => [
      this.prisma.promotionLog.create({
        data: {
          organization: 'mec',
          studentId: s.id,
          fromClass: dto.fromClass,
          toClass: dto.toClass,
          promotedBy,
          notes: dto.notes,
        },
      }),
      this.prisma.mecStudent.update({
        where: { id: s.id },
        data: {
          class: dto.toClass,
          ...(newTuition &&
            newTuition > 0 && { monthlyTuitionFee: newTuition }),
        },
      }),
    ]);

    await this.prisma.$transaction(ops);
    return { promoted: students.length };
  }
}
