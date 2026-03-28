-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bkash', 'nagad', 'bank_transfer');

-- CreateEnum
CREATE TYPE "PayableType" AS ENUM ('teacher', 'staff');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('morning', 'day');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('rent', 'electricity', 'water', 'internet', 'salary', 'other');

-- CreateEnum
CREATE TYPE "TeacherSalaryType" AS ENUM ('fixed', 'lecture_based');

-- CreateEnum
CREATE TYPE "UacPaymentType" AS ENUM ('tuition', 'admission', 'readmission', 'exam', 'sheet', 'session_charge', 'study_materials', 'study_tour', 'other');

-- CreateEnum
CREATE TYPE "MbcsPaymentType" AS ENUM ('tuition', 'admission', 'readmission', 'late_fee', 'exam', 'session_charge', 'study_materials', 'study_tour', 'stationary', 'other');

-- AlterTable uac_students
ALTER TABLE "uac_students"
  ALTER COLUMN "gender" TYPE "Gender" USING "gender"::"Gender";

-- AlterTable uac_teachers
ALTER TABLE "uac_teachers"
  ALTER COLUMN "paymentType" TYPE "TeacherSalaryType" USING "paymentType"::"TeacherSalaryType";

-- AlterTable uac_payments
ALTER TABLE "uac_payments"
  ALTER COLUMN "paymentType" TYPE "UacPaymentType" USING "paymentType"::"UacPaymentType",
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";

-- AlterTable uac_payroll
ALTER TABLE "uac_payroll"
  ALTER COLUMN "payableType" TYPE "PayableType" USING "payableType"::"PayableType",
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";

-- AlterTable mbcs_students
ALTER TABLE "mbcs_students"
  ALTER COLUMN "gender" TYPE "Gender" USING "gender"::"Gender",
  ALTER COLUMN "shift" TYPE "Shift" USING "shift"::"Shift";

-- AlterTable mbcs_teachers
ALTER TABLE "mbcs_teachers"
  ALTER COLUMN "paymentType" TYPE "TeacherSalaryType" USING "paymentType"::"TeacherSalaryType";

-- AlterTable mbcs_payments
ALTER TABLE "mbcs_payments"
  ALTER COLUMN "paymentType" TYPE "MbcsPaymentType" USING "paymentType"::"MbcsPaymentType",
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";

-- AlterTable mbcs_payroll
ALTER TABLE "mbcs_payroll"
  ALTER COLUMN "payableType" TYPE "PayableType" USING "payableType"::"PayableType",
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";

-- AlterTable mec_students
ALTER TABLE "mec_students"
  ALTER COLUMN "gender" TYPE "Gender" USING "gender"::"Gender";

-- AlterTable mec_payments
ALTER TABLE "mec_payments"
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";

-- AlterTable expenses
ALTER TABLE "expenses"
  ALTER COLUMN "expenseType" TYPE "ExpenseType" USING "expenseType"::"ExpenseType",
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";

-- Recreate indexes (unchanged, but needed for migration tracking)
DROP INDEX IF EXISTS "mbcs_students_class_shift_idx";
CREATE INDEX "mbcs_students_class_shift_idx" ON "mbcs_students"("class", "shift");

DROP INDEX IF EXISTS "uac_payroll_payableType_payableId_paymentMonth_idx";
CREATE INDEX "uac_payroll_payableType_payableId_paymentMonth_idx" ON "uac_payroll"("payableType", "payableId", "paymentMonth");

DROP INDEX IF EXISTS "mbcs_payroll_payableType_payableId_paymentMonth_idx";
CREATE INDEX "mbcs_payroll_payableType_payableId_paymentMonth_idx" ON "mbcs_payroll"("payableType", "payableId", "paymentMonth");
