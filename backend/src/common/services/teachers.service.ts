import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TeacherSalaryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../dto/pagination.dto';

type OrgType = 'uac' | 'mbcs';

interface FilterTeacherDto {
  paymentType?: TeacherSalaryType;
  search?: string;
}

interface CreateTeacherDto {
  name: string;
  contactNumber: string;
  paymentType: TeacherSalaryType;
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: unknown;
}

interface UpdateTeacherDto {
  name?: string;
  contactNumber?: string;
  paymentType?: TeacherSalaryType;
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: unknown;
}

@Injectable()
export class SharedTeachersService {
  constructor(private prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model(org: OrgType): any {
    return org === 'uac' ? this.prisma.uacTeacher : this.prisma.mbcsTeacher;
  }

  async create(org: OrgType, dto: CreateTeacherDto) {
    if (dto.paymentType === TeacherSalaryType.fixed && !dto.monthlySalary) {
      throw new BadRequestException(
        'Monthly salary is required for fixed payment type',
      );
    }
    if (
      dto.paymentType === TeacherSalaryType.lecture_based &&
      !dto.perLectureRate
    ) {
      throw new BadRequestException(
        'Per lecture rate is required for lecture-based payment type',
      );
    }

    return this.model(org).create({ data: dto });
  }

  async findAll(org: OrgType, filters?: FilterTeacherDto, pagination?: PaginationDto) {
    const where: { isActive: boolean; associationEndDate: null; paymentType?: TeacherSalaryType; OR?: unknown[] } = {
      isActive: true,
      associationEndDate: null,
    };

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contactNumber: { contains: filters.search } },
      ];
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model(org).findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.model(org).count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(org: OrgType, id: string) {
    const teacher = await this.model(org).findUnique({
      where: { id },
      include: {
        attendance: {
          orderBy: { attendanceDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async update(org: OrgType, id: string, dto: UpdateTeacherDto) {
    await this.findOne(org, id);

    if (dto.paymentType === TeacherSalaryType.fixed && !dto.monthlySalary) {
      throw new BadRequestException(
        'Monthly salary is required for fixed payment type',
      );
    }
    if (
      dto.paymentType === TeacherSalaryType.lecture_based &&
      !dto.perLectureRate
    ) {
      throw new BadRequestException(
        'Per lecture rate is required for lecture-based payment type',
      );
    }

    const { paymentType, ...rest } = dto;
    return this.model(org).update({
      where: { id },
      data: {
        ...rest,
        ...(paymentType && { paymentType }),
      },
    });
  }

  async remove(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.model(org).update({
      where: { id },
      data: { isActive: false },
    });
  }

  async disassociate(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.model(org).update({
      where: { id },
      data: { associationEndDate: new Date() },
    });
  }

  async reassociate(org: OrgType, id: string) {
    const teacher = await this.model(org).findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException(`Teacher with ID ${id} not found`);
    return this.model(org).update({
      where: { id },
      data: { associationEndDate: null },
    });
  }
}
