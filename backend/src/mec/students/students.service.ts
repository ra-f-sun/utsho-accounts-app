import { Injectable } from '@nestjs/common';
import { SharedStudentsService } from '../../common/services/students.service';
import { CreateMecStudentDto } from './dto/create-student.dto';
import { UpdateMecStudentDto } from './dto/update-student.dto';
import { FilterMecStudentDto } from './dto/filter-student.dto';
import { PromoteMecBulkDto, PromoteMecStudentDto } from './dto/promote-student.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class MecStudentsService {
  constructor(private shared: SharedStudentsService) {}

  create(dto: CreateMecStudentDto) { return this.shared.create('mec', dto); }
  importBulk(students: CreateMecStudentDto[]) { return this.shared.importBulk('mec', students); }
  findAll(filters?: FilterMecStudentDto, pagination?: PaginationDto) { return this.shared.findAll('mec', filters, pagination); }
  findOne(id: string) { return this.shared.findOne('mec', id); }
  update(id: string, dto: UpdateMecStudentDto) { return this.shared.update('mec', id, dto); }
  remove(id: string) { return this.shared.remove('mec', id); }
  disassociate(id: string) { return this.shared.disassociate('mec', id); }
  reassociate(id: string) { return this.shared.reassociate('mec', id); }
  syncFeesFromSettings() { return this.shared.syncFeesFromSettings('mec'); }
  promote(id: string, dto: PromoteMecStudentDto, promotedBy: string) { return this.shared.promote('mec', id, dto, promotedBy); }
  promoteBulk(dto: PromoteMecBulkDto, promotedBy: string) { return this.shared.promoteBulk('mec', dto, promotedBy); }
}
