-- AlterTable
ALTER TABLE "mbcs_students" ADD COLUMN     "discountAdmission" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountReadmission" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountTuition" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "readmissionFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "mec_students" ADD COLUMN     "discountAdmission" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountReadmission" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountTuition" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "readmissionFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "uac_students" ADD COLUMN     "discountAdmission" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountReadmission" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountTuition" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "readmissionFee" DOUBLE PRECISION;
