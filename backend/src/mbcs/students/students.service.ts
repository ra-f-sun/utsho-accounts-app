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
    const data: Prisma.MbcsStudentCreateInput = {
      ...createStudentDto,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : undefined,
    };

    return this.prisma.mbcsStudent.create({ data });
  }

  async findAll(filters?: FilterStudentDto, pagination?: PaginationDto) {
    const where: Prisma.MbcsStudentWhereInput = { isActive: true };

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
}
