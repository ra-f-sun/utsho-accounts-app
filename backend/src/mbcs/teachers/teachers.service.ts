import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FilterTeacherDto } from './dto/filter-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(createTeacherDto: CreateTeacherDto) {
    return this.prisma.mbcsTeacher.create({ data: createTeacherDto });
  }

  async findAll(filters?: FilterTeacherDto) {
    const where: Prisma.MbcsTeacherWhereInput = { isActive: true };

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    return this.prisma.mbcsTeacher.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.mbcsTeacher.findUnique({ where: { id } });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    await this.findOne(id);

    return this.prisma.mbcsTeacher.update({
      where: { id },
      data: updateTeacherDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.mbcsTeacher.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
