import { Injectable } from '@nestjs/common';
import { SharedTeachersService } from '../../common/services/teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FilterTeacherDto } from './dto/filter-teacher.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class TeachersService {
  constructor(private shared: SharedTeachersService) {}

  create(dto: CreateTeacherDto) { return this.shared.create('mbcs', dto); }
  findAll(filters?: FilterTeacherDto, pagination?: PaginationDto) { return this.shared.findAll('mbcs', filters, pagination); }
  findOne(id: string) { return this.shared.findOne('mbcs', id); }
  update(id: string, dto: UpdateTeacherDto) { return this.shared.update('mbcs', id, dto); }
  remove(id: string) { return this.shared.remove('mbcs', id); }
  disassociate(id: string) { return this.shared.disassociate('mbcs', id); }
  reassociate(id: string) { return this.shared.reassociate('mbcs', id); }
}
