-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT_UAC', 'ACCOUNTANT_MBCS', 'ACCOUNTANT_MEC');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uac_students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "class" INTEGER NOT NULL,
    "group" TEXT,
    "section" TEXT,
    "school" TEXT,
    "serialNo" TEXT,
    "nationality" TEXT DEFAULT 'Bangladeshi',
    "religion" TEXT,
    "bloodGroup" TEXT,
    "healthCondition" TEXT,
    "presentAddress" TEXT,
    "studentLivingWith" TEXT,
    "lastSchoolAttended" TEXT,
    "fatherName" TEXT,
    "fatherMobile" TEXT,
    "fatherOccupation" TEXT,
    "fatherEmail" TEXT,
    "motherName" TEXT,
    "motherMobile" TEXT,
    "motherOccupation" TEXT,
    "motherEmail" TEXT,
    "guardianName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "monthlyTuitionFee" DOUBLE PRECISION NOT NULL,
    "admissionFee" DOUBLE PRECISION,
    "admissionDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uac_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uac_teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "monthlySalary" DOUBLE PRECISION,
    "perLectureRate" DOUBLE PRECISION,
    "subjects" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uac_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uac_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "designation" TEXT,
    "monthlySalary" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uac_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uac_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMonth" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uac_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uac_teacher_attendance" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "class" INTEGER,
    "subject" TEXT,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "lecturesTaken" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uac_teacher_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uac_payroll" (
    "id" TEXT NOT NULL,
    "payableType" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "paymentMonth" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "totalLectures" INTEGER,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uac_payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbcs_students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "class" INTEGER NOT NULL,
    "shift" TEXT,
    "section" TEXT,
    "branch" TEXT,
    "serialNo" TEXT,
    "nationality" TEXT DEFAULT 'Bangladeshi',
    "religion" TEXT,
    "bloodGroup" TEXT,
    "healthCondition" TEXT,
    "presentAddress" TEXT,
    "studentLivingWith" TEXT,
    "lastSchoolAttended" TEXT,
    "fatherName" TEXT,
    "fatherMobile" TEXT,
    "fatherOccupation" TEXT,
    "fatherEmail" TEXT,
    "motherName" TEXT,
    "motherMobile" TEXT,
    "motherOccupation" TEXT,
    "motherEmail" TEXT,
    "guardianName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "monthlyTuitionFee" DOUBLE PRECISION NOT NULL,
    "admissionFee" DOUBLE PRECISION,
    "admissionDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mbcs_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbcs_teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "monthlySalary" DOUBLE PRECISION,
    "perLectureRate" DOUBLE PRECISION,
    "subjects" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mbcs_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbcs_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "designation" TEXT,
    "monthlySalary" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mbcs_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbcs_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMonth" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mbcs_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbcs_teacher_attendance" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "class" INTEGER,
    "subject" TEXT,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "lecturesTaken" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mbcs_teacher_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbcs_payroll" (
    "id" TEXT NOT NULL,
    "payableType" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "paymentMonth" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "totalLectures" INTEGER,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mbcs_payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mec_students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "class" INTEGER,
    "group" TEXT,
    "section" TEXT,
    "serialNo" TEXT,
    "nationality" TEXT DEFAULT 'Bangladeshi',
    "religion" TEXT,
    "bloodGroup" TEXT,
    "healthCondition" TEXT,
    "presentAddress" TEXT,
    "studentLivingWith" TEXT,
    "lastSchoolAttended" TEXT,
    "fatherName" TEXT,
    "fatherMobile" TEXT,
    "fatherOccupation" TEXT,
    "fatherEmail" TEXT,
    "motherName" TEXT,
    "motherMobile" TEXT,
    "motherOccupation" TEXT,
    "motherEmail" TEXT,
    "guardianName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "monthlyTuitionFee" DOUBLE PRECISION NOT NULL,
    "admissionFee" DOUBLE PRECISION,
    "admissionDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mec_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mec_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMonth" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mec_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expenseMonth" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_counters" (
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "uac_students_class_group_idx" ON "uac_students"("class", "group");

-- CreateIndex
CREATE INDEX "uac_students_school_idx" ON "uac_students"("school");

-- CreateIndex
CREATE INDEX "uac_students_isActive_idx" ON "uac_students"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "uac_payments_invoiceNumber_key" ON "uac_payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "uac_payments_studentId_paymentMonth_idx" ON "uac_payments"("studentId", "paymentMonth");

-- CreateIndex
CREATE INDEX "uac_payments_paymentDate_idx" ON "uac_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "uac_teacher_attendance_teacherId_attendanceDate_idx" ON "uac_teacher_attendance"("teacherId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "uac_payroll_invoiceNumber_key" ON "uac_payroll"("invoiceNumber");

-- CreateIndex
CREATE INDEX "uac_payroll_payableType_payableId_paymentMonth_idx" ON "uac_payroll"("payableType", "payableId", "paymentMonth");

-- CreateIndex
CREATE INDEX "mbcs_students_class_shift_idx" ON "mbcs_students"("class", "shift");

-- CreateIndex
CREATE INDEX "mbcs_students_branch_idx" ON "mbcs_students"("branch");

-- CreateIndex
CREATE INDEX "mbcs_students_isActive_idx" ON "mbcs_students"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "mbcs_payments_invoiceNumber_key" ON "mbcs_payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "mbcs_payments_studentId_paymentMonth_idx" ON "mbcs_payments"("studentId", "paymentMonth");

-- CreateIndex
CREATE INDEX "mbcs_payments_paymentDate_idx" ON "mbcs_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "mbcs_teacher_attendance_teacherId_attendanceDate_idx" ON "mbcs_teacher_attendance"("teacherId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "mbcs_payroll_invoiceNumber_key" ON "mbcs_payroll"("invoiceNumber");

-- CreateIndex
CREATE INDEX "mbcs_payroll_payableType_payableId_paymentMonth_idx" ON "mbcs_payroll"("payableType", "payableId", "paymentMonth");

-- CreateIndex
CREATE INDEX "mec_students_isActive_idx" ON "mec_students"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "mec_payments_invoiceNumber_key" ON "mec_payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "mec_payments_studentId_paymentMonth_idx" ON "mec_payments"("studentId", "paymentMonth");

-- CreateIndex
CREATE INDEX "mec_payments_paymentDate_idx" ON "mec_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "expenses_organization_expenseMonth_idx" ON "expenses"("organization", "expenseMonth");

-- AddForeignKey
ALTER TABLE "uac_payments" ADD CONSTRAINT "uac_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "uac_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uac_teacher_attendance" ADD CONSTRAINT "uac_teacher_attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "uac_teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mbcs_payments" ADD CONSTRAINT "mbcs_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "mbcs_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mbcs_teacher_attendance" ADD CONSTRAINT "mbcs_teacher_attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "mbcs_teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mec_payments" ADD CONSTRAINT "mec_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "mec_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
