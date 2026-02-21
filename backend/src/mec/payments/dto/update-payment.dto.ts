import { PartialType } from '@nestjs/mapped-types';
import { CreateMecPaymentDto } from './create-payment.dto';

export class UpdateMecPaymentDto extends PartialType(CreateMecPaymentDto) {}
