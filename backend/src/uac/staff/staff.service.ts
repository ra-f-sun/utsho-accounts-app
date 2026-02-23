import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.uacStaff.create({
      data: createStaffDto,
    });
  }

  async findAll(search?: string, pagination?: PaginationDto) {
    const where: Prisma.UacStaffWhereInput = {
      isActive: true,
    };

    // Search by name, contact, or designation
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.uacStaff.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.uacStaff.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const staff = await this.prisma.uacStaff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    // Check if staff exists
    await this.findOne(id);

    return this.prisma.uacStaff.update({
      where: { id },
      data: updateStaffDto,
    });
  }

  async remove(id: string) {
    // Check if staff exists
    await this.findOne(id);

    // Soft delete
    return this.prisma.uacStaff.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
