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
import { TeacherAttendanceService } from './teacher-attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { OrganizationGuard } from '../../guards/organization.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('uac/teacher-attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_UAC)
export class TeacherAttendanceController {
  constructor(
    private readonly teacherAttendanceService: TeacherAttendanceService,
  ) {}

  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.teacherAttendanceService.create(createAttendanceDto);
  }

  @Post('monthly-summary')
  createMonthlySummary(
    @Body() body: { teacherId: string; month: string; totalLectures: number },
  ) {
    return this.teacherAttendanceService.createMonthlySummary(body);
  }

  @Get()
  findAll(
    @Query('teacherId') teacherId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.teacherAttendanceService.findAll(teacherId, startDate, endDate);
  }

  @Get('summary/:teacherId/:month')
  getMonthlySummary(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Param('month') month: string, // Format: YYYY-MM
  ) {
    return this.teacherAttendanceService.getMonthlySummary(teacherId, month);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAttendanceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.teacherAttendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAttendanceService.remove(id);
  }
}
