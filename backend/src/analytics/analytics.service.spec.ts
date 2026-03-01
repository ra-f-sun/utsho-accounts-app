import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { Organization } from './dto/analytics-query.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            uacPayment: {
              aggregate: jest.fn(),
            },
            mbcsPayment: {
              aggregate: jest.fn(),
            },
            mecPayment: {
              aggregate: jest.fn(),
            },
            uacPayroll: {
              aggregate: jest.fn(),
            },
            mbcsPayroll: {
              aggregate: jest.fn(),
            },
            expense: {
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            uacStudent: {
              findMany: jest.fn(),
            },
            mbcsStudent: {
              findMany: jest.fn(),
            },
            mecStudent: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRevenueStats', () => {
    it('should return revenue stats for a single organization', async () => {
      const mockDate = new Date('2026-01-01');
      jest.spyOn(prismaService.uacPayment, 'aggregate').mockResolvedValue({
        _sum: { amount: 100000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });
      jest.spyOn(prismaService.uacPayroll, 'aggregate').mockResolvedValue({
        _sum: { amount: 30000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });
      jest.spyOn(prismaService.expense, 'aggregate').mockResolvedValue({
        _sum: { amount: 10000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      const result = await service.getRevenueStats({
        organization: Organization.UAC,
        startDate: mockDate.toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(false);
      if (!Array.isArray(result)) {
        expect(result.organization).toBe('uac');
        expect(result.studentPayments).toBe(100000);
        expect(result.netRevenue).toBe(60000); // 100000 - 30000 - 10000
      }
    });

    it('should return all organizations stats when no filter provided', async () => {
      const mockDate = new Date('2026-01-01');

      // Mock aggregates for all organizations
      jest.spyOn(prismaService.uacPayment, 'aggregate').mockResolvedValue({
        _sum: { amount: 100000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });
      jest.spyOn(prismaService.mbcsPayment, 'aggregate').mockResolvedValue({
        _sum: { amount: 80000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });
      jest.spyOn(prismaService.mecPayment, 'aggregate').mockResolvedValue({
        _sum: { amount: 50000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      jest.spyOn(prismaService.uacPayroll, 'aggregate').mockResolvedValue({
        _sum: { amount: 30000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });
      jest.spyOn(prismaService.mbcsPayroll, 'aggregate').mockResolvedValue({
        _sum: { amount: 25000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      jest.spyOn(prismaService.expense, 'aggregate').mockResolvedValue({
        _sum: { amount: 10000 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      const result = await service.getRevenueStats({
        startDate: mockDate.toISOString(),
        endDate: new Date('2026-12-31').toISOString(),
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(3);
        expect(result[0].organization).toBe('uac');
        expect(result[1].organization).toBe('mbcs');
        expect(result[2].organization).toBe('mec');
      }
    });
  });

  describe('getExpenseBreakdown', () => {
    it('should return expense breakdown by type', async () => {
      const mockExpenses = [
        {
          organization: 'uac',
          expenseType: 'rent',
          _sum: { amount: 50000 },
        },
        {
          organization: 'uac',
          expenseType: 'electricity',
          _sum: { amount: 10000 },
        },
      ];

      jest
        .spyOn(prismaService.expense, 'groupBy')
        .mockResolvedValue(mockExpenses as any);

      const result = await service.getExpenseBreakdown({
        organization: Organization.UAC,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(result).toHaveLength(2);
      expect(result[0].expenseType).toBe('rent');
      expect(result[0].total).toBe(50000);
    });
  });
});
