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
import { MecStudentsService } from './students.service';
import { CreateMecStudentDto } from './dto/create-student.dto';
import { UpdateMecStudentDto } from './dto/update-student.dto';
import { FilterMecStudentDto } from './dto/filter-student.dto';
import { PromoteMecBulkDto, PromoteMecStudentDto } from './dto/promote-student.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { OrganizationGuard } from '../../guards/organization.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';

@Controller('mec/students')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_MEC)
export class MecStudentsController {
  constructor(private readonly studentsService: MecStudentsService) {}

  @Post('sync-fees-from-settings')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  syncFeesFromSettings() {
    return this.studentsService.syncFeesFromSettings();
  }

  @Post('promote-bulk')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  promoteBulk(@Body() dto: PromoteMecBulkDto, @CurrentUser() user: JwtUser) {
    return this.studentsService.promoteBulk(dto, user.id);
  }

  @Post()
  create(@Body() createStudentDto: CreateMecStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll(@Query() filters: FilterMecStudentDto) {
    const { page, limit, ...filterParams } = filters;
    return this.studentsService.findAll(filterParams, { page, limit });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateMecStudentDto,
  ) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.remove(id);
  }

  @Patch(':id/disassociate')
  disassociate(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.disassociate(id);
  }

  @Patch(':id/reassociate')
  reassociate(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.reassociate(id);
  }

  @Post(':id/promote')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  promote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PromoteMecStudentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.studentsService.promote(id, dto, user.id);
  }
}
