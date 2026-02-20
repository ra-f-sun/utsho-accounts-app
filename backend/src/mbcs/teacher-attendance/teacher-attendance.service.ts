import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class TeacherAttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(createAttendanceDto: CreateAttendanceDto) {
    // Verify teacher exists
    const teacher = await this.prisma.mbcsTeacher.findUnique({
      where: { id: createAttendanceDto.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${createAttendanceDto.teacherId} not found`,
      );
    }

    return this.prisma.mbcsTeacherAttendance.create({
      data: {
        ...createAttendanceDto,
        attendanceDate: new Date(createAttendanceDto.attendanceDate),
      },
    });
  }

  async findAll(teacherId?: string, month?: string) {
    const where: {
      teacherId?: string;
      attendanceDate?: { gte: Date; lte: Date };
    } = {};

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (month) {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      where.attendanceDate = { gte: startDate, lte: endDate };
    }

    return this.prisma.mbcsTeacherAttendance.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const attendance = await this.prisma.mbcsTeacherAttendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with ID ${id} not found`);
    }

    return attendance;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    await this.findOne(id);

    const data = { ...updateAttendanceDto } as {
      attendanceDate?: Date;
      [key: string]: unknown;
    };

    if (updateAttendanceDto.attendanceDate) {
      data.attendanceDate = new Date(updateAttendanceDto.attendanceDate);
    }

    return this.prisma.mbcsTeacherAttendance.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mbcsTeacherAttendance.delete({ where: { id } });
  }

  /**
   * Simplified mode: Record total lectures for a month in one go
   */
  async createMonthlySummary(data: {
    teacherId: string;
    month: string; // YYYY-MM
    totalLectures: number;
  }) {
    const teacher = await this.prisma.mbcsTeacher.findUnique({
      where: { id: data.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${data.teacherId} not found`,
      );
    }

    const attendanceDate = new Date(`${data.month}-01`);

    return this.prisma.mbcsTeacherAttendance.create({
      data: {
        teacherId: data.teacherId,
        attendanceDate,
        lecturesTaken: data.totalLectures,
      },
      include: {
        teacher: { select: { id: true, name: true } },
      },
    });
  }

  async getMonthlySummary(teacherId: string, month: string) {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await this.prisma.mbcsTeacherAttendance.findMany({
      where: {
        teacherId,
        attendanceDate: { gte: startDate, lt: endDate },
      },
    });

    const totalLectures = records.reduce((sum, r) => sum + r.lecturesTaken, 0);

    return { teacherId, month, totalLectures, records };
  }
}
