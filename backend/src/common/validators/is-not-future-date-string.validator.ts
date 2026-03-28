import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isNotFutureDateString', async: false })
class IsNotFutureDateStringConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;

    const inputDate = new Date(parsed);
    inputDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inputDate <= today;
  }

  defaultMessage(): string {
    return 'Date cannot be in the future';
  }
}

export function IsNotFutureDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDateString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsNotFutureDateStringConstraint,
    });
  };
}
