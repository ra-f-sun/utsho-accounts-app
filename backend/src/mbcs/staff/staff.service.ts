import { Injectable } from '@nestjs/common';
import { SharedStaffService } from '../../common/services/staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StaffService {
  constructor(private shared: SharedStaffService) {}

  create(dto: CreateStaffDto) { return this.shared.create('mbcs', dto); }
  findAll(pagination?: PaginationDto) { return this.shared.findAll('mbcs', undefined, pagination); }
  findOne(id: string) { return this.shared.findOne('mbcs', id); }
  update(id: string, dto: UpdateStaffDto) { return this.shared.update('mbcs', id, dto); }
  remove(id: string) { return this.shared.remove('mbcs', id); }
  disassociate(id: string) { return this.shared.disassociate('mbcs', id); }
  reassociate(id: string) { return this.shared.reassociate('mbcs', id); }
}
