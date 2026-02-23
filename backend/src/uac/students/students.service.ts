import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto) {
    const data: Prisma.UacStudentCreateInput = {
      ...createStudentDto,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : undefined,
    };

    return this.prisma.uacStudent.create({
      data,
    });
  }

  async findAll(filters?: FilterStudentDto, pagination?: PaginationDto) {
    const where: Prisma.UacStudentWhereInput = {
      isActive: true,
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
    await this.findOne(id);

    const data: Prisma.UacStudentUpdateInput = {
      ...updateStudentDto,
    };

    // Convert date strings to Date objects if provided
    if (updateStudentDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateStudentDto.dateOfBirth);
    }
    if (updateStudentDto.admissionDate) {
      data.admissionDate = new Date(updateStudentDto.admissionDate);
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
}
