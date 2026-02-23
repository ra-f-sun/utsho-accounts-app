import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FilterTeacherDto } from './dto/filter-teacher.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(createTeacherDto: CreateTeacherDto) {
    // Validate payment type requirements
    if (
      createTeacherDto.paymentType === 'fixed' &&
      !createTeacherDto.monthlySalary
    ) {
      throw new BadRequestException(
        'Monthly salary is required for fixed payment type',
      );
    }

    if (
      createTeacherDto.paymentType === 'lecture_based' &&
      !createTeacherDto.perLectureRate
    ) {
      throw new BadRequestException(
        'Per lecture rate is required for lecture-based payment type',
      );
    }

    return this.prisma.uacTeacher.create({
      data: createTeacherDto,
    });
  }

  async findAll(filters?: FilterTeacherDto, pagination?: PaginationDto) {
    const where: Prisma.UacTeacherWhereInput = {
      isActive: true,
    };

    // Filter by payment type
    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    // Search by name or contact
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
      this.prisma.uacTeacher.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.uacTeacher.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.uacTeacher.findUnique({
      where: { id },
      include: {
        attendance: {
          orderBy: { attendanceDate: 'desc' },
          take: 10, // Last 10 attendance records
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    // Check if teacher exists
    await this.findOne(id);

    // Validate payment type requirements if being updated
    if (
      updateTeacherDto.paymentType === 'fixed' &&
      !updateTeacherDto.monthlySalary
    ) {
      throw new BadRequestException(
        'Monthly salary is required for fixed payment type',
      );
    }

    if (
      updateTeacherDto.paymentType === 'lecture_based' &&
      !updateTeacherDto.perLectureRate
    ) {
      throw new BadRequestException(
        'Per lecture rate is required for lecture-based payment type',
      );
    }

    return this.prisma.uacTeacher.update({
      where: { id },
      data: updateTeacherDto,
    });
  }

  async remove(id: string) {
    // Check if teacher exists
    await this.findOne(id);

    // Soft delete
    return this.prisma.uacTeacher.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
