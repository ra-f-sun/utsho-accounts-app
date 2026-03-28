import { Injectable } from '@nestjs/common';
import { SharedStaffService } from '../../common/services/staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StaffService {
  constructor(private shared: SharedStaffService) {}

  create(dto: CreateStaffDto) { return this.shared.create('uac', dto); }
  findAll(search?: string, pagination?: PaginationDto) { return this.shared.findAll('uac', search, pagination); }
  findOne(id: string) { return this.shared.findOne('uac', id); }
  update(id: string, dto: UpdateStaffDto) { return this.shared.update('uac', id, dto); }
  remove(id: string) { return this.shared.remove('uac', id); }
  disassociate(id: string) { return this.shared.disassociate('uac', id); }
  reassociate(id: string) { return this.shared.reassociate('uac', id); }
}
