import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ExpenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto, createdBy: string) {
    return this.prisma.expense.create({
      data: {
        ...createExpenseDto,
        expenseMonth: new Date(createExpenseDto.expenseMonth),
        paymentDate: new Date(createExpenseDto.paymentDate),
        createdBy,
      },
    });
  }

  async findAll(
    organization?: string,
    expenseType?: ExpenseType,
    expenseMonth?: string,
    pagination?: PaginationDto,
  ) {
    const where: Prisma.ExpenseWhereInput = { isActive: true };

    if (organization) {
      where.organization = organization;
    }

    if (expenseType) {
      where.expenseType = expenseType;
    }

    if (expenseMonth) {
      where.expenseMonth = new Date(expenseMonth);
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, isActive: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async findOneForOrg(id: string, organization: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, isActive: true },
    });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    if (expense.organization !== organization) {
      throw new ForbiddenException(
        `This expense does not belong to ${organization.toUpperCase()}`,
      );
    }
    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto) {
    // Check if expense exists
    await this.findOne(id);

    const data: Prisma.ExpenseUpdateInput = { ...updateExpenseDto };
    if (updateExpenseDto.expenseMonth) {
      data.expenseMonth = new Date(updateExpenseDto.expenseMonth);
    }
    if (updateExpenseDto.paymentDate) {
      data.paymentDate = new Date(updateExpenseDto.paymentDate);
    }

    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Check if expense exists
    await this.findOne(id);

    return this.prisma.expense.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get expense summary by organization and month
   */
  async getOrganizationSummary(organization: string, month: string) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const expenses = await this.prisma.expense.findMany({
      where: {
        organization,
        isActive: true,
        expenseMonth: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Group by expense type
    const byType: Record<string, number> = {};
    expenses.forEach((exp) => {
      byType[exp.expenseType] = (byType[exp.expenseType] || 0) + exp.amount;
    });

    return {
      organization,
      month,
      totalAmount,
      expenseCount: expenses.length,
      byType,
      expenses,
    };
  }
}
