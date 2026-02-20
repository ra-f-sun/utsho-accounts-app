import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.mbcsStaff.create({ data: createStaffDto });
  }

  async findAll() {
    return this.prisma.mbcsStaff.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.mbcsStaff.findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    await this.findOne(id);

    return this.prisma.mbcsStaff.update({
      where: { id },
      data: updateStaffDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.mbcsStaff.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
