import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type OrgType = 'uac' | 'mbcs';

interface CreateAttendanceDto {
  teacherId: string;
  class?: number;
  subject?: string;
  attendanceDate: string;
  lecturesTaken?: number;
}

interface UpdateAttendanceDto {
  class?: number;
  subject?: string;
  attendanceDate?: string;
  lecturesTaken?: number;
}

@Injectable()
export class SharedTeacherAttendanceService {
  constructor(private prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private teacherModel(org: OrgType): any {
    return org === 'uac' ? this.prisma.uacTeacher : this.prisma.mbcsTeacher;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private attendanceModel(org: OrgType): any {
    return org === 'uac'
      ? this.prisma.uacTeacherAttendance
      : this.prisma.mbcsTeacherAttendance;
  }

  async create(org: OrgType, dto: CreateAttendanceDto) {
    const teacher = await this.teacherModel(org).findUnique({
      where: { id: dto.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${dto.teacherId} not found`);
    }

    return this.attendanceModel(org).create({
      data: {
        ...dto,
        attendanceDate: new Date(dto.attendanceDate),
      },
      include: {
        teacher: {
          select: { id: true, name: true, paymentType: true },
        },
      },
    });
  }

  async findAll(
    org: OrgType,
    teacherId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: {
      teacherId?: string;
      attendanceDate?: { gte?: Date; lte?: Date };
    } = {};

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (startDate || endDate) {
      where.attendanceDate = {};
      if (startDate) where.attendanceDate.gte = new Date(startDate);
      if (endDate) where.attendanceDate.lte = new Date(endDate);
    }

    return this.attendanceModel(org).findMany({
      where,
      include: {
        teacher: {
          select: { id: true, name: true, contactNumber: true },
        },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async findOne(org: OrgType, id: string) {
    const attendance = await this.attendanceModel(org).findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with ID ${id} not found`);
    }

    return attendance;
  }

  async update(org: OrgType, id: string, dto: UpdateAttendanceDto) {
    await this.findOne(org, id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.attendanceDate) {
      data.attendanceDate = new Date(dto.attendanceDate);
    }

    return this.attendanceModel(org).update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, name: true } },
      },
    });
  }

  async remove(org: OrgType, id: string) {
    await this.findOne(org, id);
    return this.attendanceModel(org).delete({ where: { id } });
  }

  async createMonthlySummary(
    org: OrgType,
    data: { teacherId: string; month: string; totalLectures: number },
  ) {
    const teacher = await this.teacherModel(org).findUnique({
      where: { id: data.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${data.teacherId} not found`);
    }

    const attendanceDate = new Date(`${data.month}-01`);

    return this.attendanceModel(org).create({
      data: {
        teacherId: data.teacherId,
        attendanceDate,
        lecturesTaken: data.totalLectures,
      },
      include: {
        teacher: { select: { id: true, name: true, paymentType: true } },
      },
    });
  }

  async getMonthlySummary(org: OrgType, teacherId: string, month: string) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const records = await this.attendanceModel(org).findMany({
      where: {
        teacherId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
    });

    const totalLectures = records.reduce(
      (sum: number, r: { lecturesTaken: number }) => sum + r.lecturesTaken,
      0,
    );

    return { teacherId, month, totalLectures, records };
  }
}
