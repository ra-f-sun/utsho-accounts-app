import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.uacStaff.create({
      data: createStaffDto,
    });
  }

  async findAll(search?: string) {
    const where: any = {
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

    return this.prisma.uacStaff.findMany({
      where,
      orderBy: { name: 'asc' },
    });
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
