import { Injectable } from '@nestjs/common';
import { SharedStudentsService } from '../../common/services/students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { PromoteBulkDto, PromoteStudentDto } from './dto/promote-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StudentsService {
  constructor(private shared: SharedStudentsService) {}

  create(dto: CreateStudentDto) { return this.shared.create('uac', dto); }
  importBulk(students: CreateStudentDto[]) { return this.shared.importBulk('uac', students); }
  findAll(filters?: FilterStudentDto, pagination?: PaginationDto) { return this.shared.findAll('uac', filters, pagination); }
  findOne(id: string) { return this.shared.findOne('uac', id); }
  update(id: string, dto: UpdateStudentDto) { return this.shared.update('uac', id, dto); }
  remove(id: string) { return this.shared.remove('uac', id); }
  disassociate(id: string) { return this.shared.disassociate('uac', id); }
  reassociate(id: string) { return this.shared.reassociate('uac', id); }
  syncFeesFromSettings() { return this.shared.syncFeesFromSettings('uac'); }
  promote(id: string, dto: PromoteStudentDto, promotedBy: string) { return this.shared.promote('uac', id, dto, promotedBy); }
  promoteBulk(dto: PromoteBulkDto, promotedBy: string) { return this.shared.promoteBulk('uac', dto, promotedBy); }
}
