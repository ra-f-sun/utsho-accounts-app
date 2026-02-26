import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { FilterStaffDto } from './dto/filter-staff.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { OrganizationGuard } from '../../guards/organization.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('uac/staff')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_UAC)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  findAll(@Query() filters: FilterStaffDto) {
    const { page, limit, ...rest } = filters;
    return this.staffService.findAll(rest.search, { page, limit });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.remove(id);
  }

  @Patch(':id/disassociate')
  disassociate(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.disassociate(id);
  }

  @Patch(':id/reassociate')
  reassociate(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.reassociate(id);
  }
}
