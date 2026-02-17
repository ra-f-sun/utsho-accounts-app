import { Injectable, NotFoundException } from '@nestjs/common';
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
    const where: any = {};

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

    const data: any = { ...updateAttendanceDto };
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
