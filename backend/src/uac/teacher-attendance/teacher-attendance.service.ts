import { Injectable } from '@nestjs/common';
import { SharedTeacherAttendanceService } from '../../common/services/teacher-attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class TeacherAttendanceService {
  constructor(private shared: SharedTeacherAttendanceService) {}

  create(dto: CreateAttendanceDto) { return this.shared.create('uac', dto); }
  findAll(teacherId?: string, startDate?: string, endDate?: string) { return this.shared.findAll('uac', teacherId, startDate, endDate); }
  findOne(id: string) { return this.shared.findOne('uac', id); }
  update(id: string, dto: UpdateAttendanceDto) { return this.shared.update('uac', id, dto); }
  remove(id: string) { return this.shared.remove('uac', id); }
  createMonthlySummary(data: { teacherId: string; month: string; totalLectures: number }) { return this.shared.createMonthlySummary('uac', data); }
  getMonthlySummary(teacherId: string, month: string) { return this.shared.getMonthlySummary('uac', teacherId, month); }
}
