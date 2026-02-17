import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create users for all roles
  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@utsho.com' },
      update: {},
      create: {
        email: 'admin@utsho.com',
        passwordHash,
        fullName: 'Super Admin',
        role: Role.SUPER_ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { email: 'director@utsho.com' },
      update: {},
      create: {
        email: 'director@utsho.com',
        passwordHash,
        fullName: 'Director',
        role: Role.DIRECTOR,
      },
    }),
    prisma.user.upsert({
      where: { email: 'uac@utsho.com' },
      update: {},
      create: {
        email: 'uac@utsho.com',
        passwordHash,
        fullName: 'UAC Accountant',
        role: Role.ACCOUNTANT_UAC,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mbcs@utsho.com' },
      update: {},
      create: {
        email: 'mbcs@utsho.com',
        passwordHash,
        fullName: 'MBCS Accountant',
        role: Role.ACCOUNTANT_MBCS,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mec@utsho.com' },
      update: {},
      create: {
        email: 'mec@utsho.com',
        passwordHash,
        fullName: 'MEC Accountant',
        role: Role.ACCOUNTANT_MEC,
      },
    }),
  ]);

  console.log('✅ Created 5 users');

  // 2. Create UAC sample data
  console.log('Creating UAC sample data...');

  // UAC Students
  for (let i = 1; i <= 10; i++) {
    await prisma.uacStudent.create({
      data: {
        name: `UAC Student ${i}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        dateOfBirth: new Date(2008, i % 12, (i % 28) + 1),
        class: 8 + (i % 5),
        group: 8 + (i % 5) >= 9 ? (i % 2 === 0 ? 'science' : 'business') : null,
        school: `School ${(i % 3) + 1}`,
        guardianName: `Guardian ${i}`,
        contactNumber: `01712345${i.toString().padStart(3, '0')}`,
        monthlyTuitionFee: 3500,
      },
    });
  }

  // UAC Teachers
  await prisma.uacTeacher.createMany({
    data: [
      {
        name: 'Teacher Fixed Salary',
        contactNumber: '01711111111',
        paymentType: 'fixed',
        monthlySalary: 25000,
      },
      {
        name: 'Teacher Lecture Based',
        contactNumber: '01722222222',
        paymentType: 'lecture_based',
        perLectureRate: 500,
      },
    ],
  });

  // UAC Staff
  await prisma.uacStaff.createMany({
    data: [
      {
        name: 'Office Manager',
        contactNumber: '01733333333',
        designation: 'Manager',
        monthlySalary: 20000,
      },
      {
        name: 'Receptionist',
        contactNumber: '01744444444',
        designation: 'Receptionist',
        monthlySalary: 15000,
      },
    ],
  });

  console.log('✅ Created UAC data (10 students, 2 teachers, 2 staff)');

  // 3. Create MBCS sample data
  console.log('Creating MBCS sample data...');

  for (let i = 1; i <= 10; i++) {
    await prisma.mbcsStudent.create({
      data: {
        name: `MBCS Student ${i}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        dateOfBirth: new Date(2018, i % 12, (i % 28) + 1),
        class: 1 + (i % 5),
        shift: i % 2 === 0 ? 'morning' : 'day',
        branch: i % 2 === 0 ? 'Basabo Branch' : 'Main Branch',
        guardianName: `Guardian ${i}`,
        contactNumber: `01812345${i.toString().padStart(3, '0')}`,
        monthlyTuitionFee: 2000,
      },
    });
  }

  await prisma.mbcsTeacher.createMany({
    data: [
      {
        name: 'MBCS Teacher 1',
        contactNumber: '01755555555',
        paymentType: 'fixed',
        monthlySalary: 18000,
      },
      {
        name: 'MBCS Teacher 2',
        contactNumber: '01766666666',
        paymentType: 'lecture_based',
        perLectureRate: 300,
      },
    ],
  });

  await prisma.mbcsStaff.createMany({
    data: [
      {
        name: 'MBCS Coordinator',
        contactNumber: '01777777777',
        designation: 'Coordinator',
        monthlySalary: 16000,
      },
    ],
  });

  console.log('✅ Created MBCS data (10 students, 2 teachers, 1 staff)');

  // 4. Create MEC sample data
  console.log('Creating MEC sample data...');

  for (let i = 1; i <= 10; i++) {
    await prisma.mecStudent.create({
      data: {
        name: `MEC Student ${i}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        dateOfBirth: new Date(2010, i % 12, (i % 28) + 1),
        class: i % 3 === 0 ? 6 + (i % 5) : null,
        guardianName: `Guardian ${i}`,
        contactNumber: `01912345${i.toString().padStart(3, '0')}`,
        monthlyTuitionFee: 2500,
      },
    });
  }

  console.log('✅ Created MEC data (10 students)');

  console.log('🎉 Seeding completed successfully!');
  console.log('\n📋 Default credentials:');
  console.log('  Super Admin: admin@utsho.com / admin123');
  console.log('  Director: director@utsho.com / admin123');
  console.log('  UAC Accountant: uac@utsho.com / admin123');
  console.log('  MBCS Accountant: mbcs@utsho.com / admin123');
  console.log('  MEC Accountant: mec@utsho.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
