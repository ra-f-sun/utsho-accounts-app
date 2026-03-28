import { Injectable } from '@nestjs/common';
import { SharedTeacherAttendanceService } from '../../common/services/teacher-attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class TeacherAttendanceService {
  constructor(private shared: SharedTeacherAttendanceService) {}

  create(dto: CreateAttendanceDto) { return this.shared.create('mbcs', dto); }

  findAll(teacherId?: string, month?: string) {
    // MBCS filters by month (YYYY-MM); convert to startDate/endDate for shared service
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (month) {
      startDate = `${month}-01`;
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + 1);
      endDate = d.toISOString().slice(0, 10);
    }
    return this.shared.findAll('mbcs', teacherId, startDate, endDate);
  }

  findOne(id: string) { return this.shared.findOne('mbcs', id); }
  update(id: string, dto: UpdateAttendanceDto) { return this.shared.update('mbcs', id, dto); }
  remove(id: string) { return this.shared.remove('mbcs', id); }
  createMonthlySummary(data: { teacherId: string; month: string; totalLectures: number }) { return this.shared.createMonthlySummary('mbcs', data); }
  getMonthlySummary(teacherId: string, month: string) { return this.shared.getMonthlySummary('mbcs', teacherId, month); }
}
