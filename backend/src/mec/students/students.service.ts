import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMecStudentDto } from './dto/create-student.dto';
import { UpdateMecStudentDto } from './dto/update-student.dto';
import { FilterMecStudentDto } from './dto/filter-student.dto';

@Injectable()
export class MecStudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateMecStudentDto) {
    const data: Prisma.MecStudentCreateInput = {
      ...createStudentDto,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : undefined,
    };

    return this.prisma.mecStudent.create({ data });
  }

  async findAll(filters?: FilterMecStudentDto) {
    const where: Prisma.MecStudentWhereInput = {
      isActive: true,
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

    return this.prisma.mecStudent.findMany({
      where,
      orderBy: { name: 'asc' },
    });
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
    await this.findOne(id);

    const data: Prisma.MecStudentUpdateInput = { ...updateStudentDto };

    if (updateStudentDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateStudentDto.dateOfBirth);
    }
    if (updateStudentDto.admissionDate) {
      data.admissionDate = new Date(updateStudentDto.admissionDate);
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
}
