import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto) {
    return this.prisma.uacStudent.create({
      data: createStudentDto,
    });
  }

  async findAll(filters?: FilterStudentDto) {
    const where: any = {
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

    return this.prisma.uacStudent.findMany({
      where,
      orderBy: { name: 'asc' },
    });
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

    return this.prisma.uacStudent.update({
      where: { id },
      data: updateStudentDto,
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
