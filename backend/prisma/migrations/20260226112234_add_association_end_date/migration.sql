-- AlterTable
ALTER TABLE "mbcs_staff" ADD COLUMN     "associationEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mbcs_students" ADD COLUMN     "associationEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mbcs_teachers" ADD COLUMN     "associationEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mec_students" ADD COLUMN     "associationEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "uac_staff" ADD COLUMN     "associationEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "uac_students" ADD COLUMN     "associationEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "uac_teachers" ADD COLUMN     "associationEndDate" TIMESTAMP(3);
