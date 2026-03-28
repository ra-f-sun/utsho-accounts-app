import { Injectable } from '@nestjs/common';
import { SharedTeachersService } from '../../common/services/teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { FilterTeacherDto } from './dto/filter-teacher.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class TeachersService {
  constructor(private shared: SharedTeachersService) {}

  create(dto: CreateTeacherDto) { return this.shared.create('uac', dto); }
  findAll(filters?: FilterTeacherDto, pagination?: PaginationDto) { return this.shared.findAll('uac', filters, pagination); }
  findOne(id: string) { return this.shared.findOne('uac', id); }
  update(id: string, dto: UpdateTeacherDto) { return this.shared.update('uac', id, dto); }
  remove(id: string) { return this.shared.remove('uac', id); }
  disassociate(id: string) { return this.shared.disassociate('uac', id); }
  reassociate(id: string) { return this.shared.reassociate('uac', id); }
}
