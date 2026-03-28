import { Injectable } from '@nestjs/common';
import { SharedStudentsService } from '../../common/services/students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PromoteMbcsBulkDto, PromoteMbcsStudentDto } from './dto/promote-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StudentsService {
  constructor(private shared: SharedStudentsService) {}

  create(dto: CreateStudentDto) { return this.shared.create('mbcs', dto); }
  importBulk(students: CreateStudentDto[]) { return this.shared.importBulk('mbcs', students); }
  findAll(filters?: FilterStudentDto, pagination?: PaginationDto) { return this.shared.findAll('mbcs', filters, pagination); }
  findOne(id: string) { return this.shared.findOne('mbcs', id); }
  update(id: string, dto: UpdateStudentDto) { return this.shared.update('mbcs', id, dto); }
  remove(id: string) { return this.shared.remove('mbcs', id); }
  disassociate(id: string) { return this.shared.disassociate('mbcs', id); }
  reassociate(id: string) { return this.shared.reassociate('mbcs', id); }
  syncFeesFromSettings() { return this.shared.syncFeesFromSettings('mbcs'); }
  promote(id: string, dto: PromoteMbcsStudentDto, promotedBy: string) { return this.shared.promote('mbcs', id, dto, promotedBy); }
  promoteBulk(dto: PromoteMbcsBulkDto, promotedBy: string) { return this.shared.promoteBulk('mbcs', dto, promotedBy); }
}
