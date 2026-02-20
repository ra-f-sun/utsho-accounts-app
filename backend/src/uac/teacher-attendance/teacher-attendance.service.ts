import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class TeacherAttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(createAttendanceDto: CreateAttendanceDto) {
    // Verify teacher exists
    const teacher = await this.prisma.uacTeacher.findUnique({
      where: { id: createAttendanceDto.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${createAttendanceDto.teacherId} not found`,
      );
    }

    return this.prisma.uacTeacherAttendance.create({
      data: {
        ...createAttendanceDto,
        attendanceDate: new Date(createAttendanceDto.attendanceDate),
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            paymentType: true,
          },
        },
      },
    });
  }

  async findAll(teacherId?: string, startDate?: string, endDate?: string) {
    const where: Prisma.UacTeacherAttendanceWhereInput = {};

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (startDate || endDate) {
      where.attendanceDate = {};
      if (startDate) {
        where.attendanceDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.attendanceDate.lte = new Date(endDate);
      }
    }

    return this.prisma.uacTeacherAttendance.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            contactNumber: true,
          },
        },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const attendance = await this.prisma.uacTeacherAttendance.findUnique({
      where: { id },
      include: {
        teacher: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with ID ${id} not found`);
    }

    return attendance;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    // Check if attendance exists
    await this.findOne(id);

    const data: Prisma.UacTeacherAttendanceUpdateInput = {
      ...updateAttendanceDto,
    };
    if (updateAttendanceDto.attendanceDate) {
      data.attendanceDate = new Date(updateAttendanceDto.attendanceDate);
    }

    return this.prisma.uacTeacherAttendance.update({
      where: { id },
      data,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if attendance exists
    await this.findOne(id);

    // Hard delete (no isActive field in schema)
    return this.prisma.uacTeacherAttendance.delete({
      where: { id },
    });
  }

  /**
   * Simplified mode: Record total lectures for a month in one go
   * Creates a single attendance record on the 1st of the month
   */
  async createMonthlySummary(data: {
    teacherId: string;
    month: string; // YYYY-MM
    totalLectures: number;
  }) {
    const teacher = await this.prisma.uacTeacher.findUnique({
      where: { id: data.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${data.teacherId} not found`,
      );
    }

    // Use first day of the month as the attendance date
    const attendanceDate = new Date(`${data.month}-01`);

    return this.prisma.uacTeacherAttendance.create({
      data: {
        teacherId: data.teacherId,
        attendanceDate,
        lecturesTaken: data.totalLectures,
      },
      include: {
        teacher: {
          select: { id: true, name: true, paymentType: true },
        },
      },
    });
  }

  /**
   * Get monthly summary of lectures for a teacher
   * Used for calculating lecture-based payroll
   */
  async getMonthlySummary(teacherId: string, month: string) {
    // month should be in YYYY-MM format
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Last day of month

    const attendances = await this.prisma.uacTeacherAttendance.findMany({
      where: {
        teacherId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalLectures = attendances.reduce(
      (sum, record) => sum + record.lecturesTaken,
      0,
    );

    return {
      teacherId,
      month,
      totalLectures,
      attendanceCount: attendances.length,
      attendances,
    };
  }
}
