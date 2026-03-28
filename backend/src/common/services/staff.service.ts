import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../dto/pagination.dto';

type OrgType = 'uac' | 'mbcs';

interface CreateStaffDto {
  name: string;
  contactNumber: string;
  designation?: string;
  monthlySalary: number;
}

interface UpdateStaffDto {
  name?: string;
  contactNumber?: string;
  designation?: string;
  monthlySalary?: number;
}

@Injectable()
export class SharedStaffService {
  constructor(private prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model(org: OrgType): any {
    return org === 'uac' ? this.prisma.uacStaff : this.prisma.mbcsStaff;
  }

  async create(org: OrgType, dto: CreateStaffDto) {
    return this.model(org).create({ data: dto });
  }

  async findAll(org: OrgType, search?: string, pagination?: PaginationDto) {
    const where: { isActive: boolean; associationEndDate: null; OR?: unknown[] } = {
      isActive: true,
      associationEndDate: null,
    };

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
      this.model(org).findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.model(org).count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(org: OrgType, id: string) {
    const staff = await this.model(org).findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    return staff;
  }

  async update(org: OrgType, id: string, dto: UpdateStaffDto) {
    await this.findOne(org, id);
    return this.model(org).update({ where: { id }, data: dto });
  }

  async remove(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.model(org).update({ where: { id }, data: { isActive: false } });
  }

  async disassociate(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.model(org).update({
      where: { id },
      data: { associationEndDate: new Date() },
    });
  }

  async reassociate(org: OrgType, id: string) {
    const staff = await this.model(org).findUnique({ where: { id } });
    if (!staff) throw new NotFoundException(`Staff with ID ${id} not found`);
    return this.model(org).update({
      where: { id },
      data: { associationEndDate: null },
    });
  }
}
