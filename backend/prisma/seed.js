"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding database...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const users = await Promise.all([
        prisma.user.upsert({
            where: { email: 'admin@utsho.com' },
            update: {},
            create: {
                email: 'admin@utsho.com',
                passwordHash,
                fullName: 'Super Admin',
                role: client_1.Role.SUPER_ADMIN,
            },
        }),
        prisma.user.upsert({
            where: { email: 'director@utsho.com' },
            update: {},
            create: {
                email: 'director@utsho.com',
                passwordHash,
                fullName: 'Director',
                role: client_1.Role.DIRECTOR,
            },
        }),
        prisma.user.upsert({
            where: { email: 'uac@utsho.com' },
            update: {},
            create: {
                email: 'uac@utsho.com',
                passwordHash,
                fullName: 'UAC Accountant',
                role: client_1.Role.ACCOUNTANT_UAC,
            },
        }),
        prisma.user.upsert({
            where: { email: 'mbcs@utsho.com' },
            update: {},
            create: {
                email: 'mbcs@utsho.com',
                passwordHash,
                fullName: 'MBCS Accountant',
                role: client_1.Role.ACCOUNTANT_MBCS,
            },
        }),
        prisma.user.upsert({
            where: { email: 'mec@utsho.com' },
            update: {},
            create: {
                email: 'mec@utsho.com',
                passwordHash,
                fullName: 'MEC Accountant',
                role: client_1.Role.ACCOUNTANT_MEC,
            },
        }),
    ]);
    console.log('✅ Created 5 users');
    console.log('Creating UAC sample data...');
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
//# sourceMappingURL=seed.js.map