import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, Organization } from './dto/analytics-query.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue')
  @Roles(
    Role.SUPER_ADMIN,
    Role.DIRECTOR,
    Role.ACCOUNTANT_UAC,
    Role.ACCOUNTANT_MBCS,
    Role.ACCOUNTANT_MEC,
  )
  async getRevenueStats(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    // Filter by organization based on user role
    const filters = this.applyRoleBasedFilter(query, user);
    return this.analyticsService.getRevenueStats(filters);
  }

  @Get('revenue/trend')
  @Roles(
    Role.SUPER_ADMIN,
    Role.DIRECTOR,
    Role.ACCOUNTANT_UAC,
    Role.ACCOUNTANT_MBCS,
    Role.ACCOUNTANT_MEC,
  )
  async getMonthlyRevenueTrend(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    const filters = this.applyRoleBasedFilter(query, user);
    return this.analyticsService.getMonthlyRevenueTrend(filters);
  }

  @Get('outstanding')
  @Roles(
    Role.SUPER_ADMIN,
    Role.DIRECTOR,
    Role.ACCOUNTANT_UAC,
    Role.ACCOUNTANT_MBCS,
    Role.ACCOUNTANT_MEC,
  )
  async getOutstandingPayments(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    const filters = this.applyRoleBasedFilter(query, user);
    return this.analyticsService.getOutstandingPayments(filters);
  }

  @Get('expenses/breakdown')
  @Roles(
    Role.SUPER_ADMIN,
    Role.DIRECTOR,
    Role.ACCOUNTANT_UAC,
    Role.ACCOUNTANT_MBCS,
    Role.ACCOUNTANT_MEC,
  )
  async getExpenseBreakdown(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    const filters = this.applyRoleBasedFilter(query, user);
    return this.analyticsService.getExpenseBreakdown(filters);
  }

  /**
   * Apply organization filter based on user role
   * - SUPER_ADMIN & DIRECTOR: Can see all orgs or filter by org
   * - ACCOUNTANT_*: Can only see their own org
   */
  private applyRoleBasedFilter(
    query: AnalyticsQueryDto,
    user: JwtUser,
  ): AnalyticsQueryDto {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.DIRECTOR) {
      // Can access all organizations or filter by specific org
      return query;
    }

    // Accountants can only see their own organization
    if (user.role === Role.ACCOUNTANT_UAC) {
      return { ...query, organization: 'uac' as Organization };
    } else if (user.role === Role.ACCOUNTANT_MBCS) {
      return { ...query, organization: 'mbcs' as Organization };
    } else if (user.role === Role.ACCOUNTANT_MEC) {
      return { ...query, organization: 'mec' as Organization };
    }

    return query;
  }
}
