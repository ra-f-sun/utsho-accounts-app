import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(
  OmitType(CreatePaymentDto, ['studentId'] as const),
) {}
