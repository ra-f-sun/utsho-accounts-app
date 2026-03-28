import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.mbcsStaff.create({ data: createStaffDto });
  }

  async findAll(pagination?: PaginationDto) {
    const where: { isActive: boolean; associationEndDate: null } = {
      isActive: true,
      associationEndDate: null,
    };
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.mbcsStaff.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.mbcsStaff.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async disassociate(id: string) {
    await this.findOne(id);
    return this.prisma.mbcsStaff.update({
      where: { id },
      data: { associationEndDate: new Date() },
    });
  }

  async reassociate(id: string) {
    const staff = await this.prisma.mbcsStaff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException(`Staff with ID ${id} not found`);
    return this.prisma.mbcsStaff.update({
      where: { id },
      data: { associationEndDate: null },
    });
  }
}
