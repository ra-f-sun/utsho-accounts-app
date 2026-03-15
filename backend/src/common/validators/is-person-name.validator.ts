import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPersonName', async: false })
class IsPersonNameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^\p{L}+(?:\s+\p{L}+)*$/u.test(trimmed);
  }

  defaultMessage(): string {
    return 'Name can contain letters and spaces only';
  }
}

export function IsPersonName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPersonName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsPersonNameConstraint,
    });
  };
}
