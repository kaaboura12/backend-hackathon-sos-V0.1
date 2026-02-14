import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create roles with permissions based on SOS Village requirements
  const roles = [
    {
      name: 'SuperAdmin',
      description: 'Full system access - can manage roles and permissions',
      permissions: [
        // All permissions
        'REPORT_CREATE',
        'REPORT_READ',
        'REPORT_UPDATE',
        'REPORT_DELETE',
        'REPORT_CLASSIFY',
        'REPORT_ASSIGN',
        'CASE_CLOSE',
        'DOC_UPLOAD_FICHE_INITIAL',
        'DOC_UPLOAD_DPE',
        'DOC_UPLOAD_EVALUATION',
        'DOC_UPLOAD_PLAN_ACTION',
        'DOC_UPLOAD_SUIVI',
        'DOC_UPLOAD_RAPPORT_FINAL',
        'DOC_UPLOAD_CLOTURE',
        'DOC_READ',
        'DOC_DELETE',
        'USER_READ',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DELETE',
        'USER_MANAGE',
        'ROLE_CREATE',
        'ROLE_READ',
        'ROLE_UPDATE',
        'ROLE_DELETE',
        'VILLAGE_CREATE',
        'VILLAGE_READ',
        'VILLAGE_UPDATE',
        'VILLAGE_DELETE',
        'AUDIT_READ',
        'STATS_VIEW',
      ],
    },
    {
      name: 'Mère SOS',
      description: 'SOS Mother - can create reports and view basic information',
      permissions: [
        'REPORT_CREATE', // Create incident reports
        'REPORT_READ', // View reports they created
      ],
    },
    {
      name: 'Psychologue',
      description: 'Psychologist - can handle DPE and evaluations',
      permissions: [
        'REPORT_READ',
        'REPORT_UPDATE',
        'REPORT_CLASSIFY', // Can mark as false/closed
        'DOC_UPLOAD_DPE', // Upload DPE report
        'DOC_UPLOAD_EVALUATION',
        'DOC_READ',
        'STATS_VIEW',
      ],
    },
    {
      name: 'Assistant Social',
      description: 'Social Worker - can create action plans and follow-ups',
      permissions: [
        'REPORT_READ',
        'REPORT_UPDATE',
        'DOC_UPLOAD_PLAN_ACTION',
        'DOC_UPLOAD_SUIVI',
        'DOC_READ',
        'STATS_VIEW',
      ],
    },
    {
      name: 'Directeur',
      description: 'Director - full report management and oversight',
      permissions: [
        'REPORT_READ',
        'REPORT_UPDATE',
        'REPORT_ASSIGN',
        'REPORT_CLASSIFY',
        'CASE_CLOSE', // Close and archive with formal decision
        'DOC_UPLOAD_RAPPORT_FINAL',
        'DOC_UPLOAD_CLOTURE',
        'DOC_READ',
        'DOC_DELETE',
        'USER_READ',
        'AUDIT_READ',
        'STATS_VIEW',
      ],
    },
    {
      name: 'Direction Nationale',
      description: 'National Bureau - oversight and formal closure decisions',
      permissions: [
        'REPORT_READ',
        'CASE_CLOSE', // Formal closure and archival
        'DOC_READ',
        'USER_READ',
        'AUDIT_READ',
        'STATS_VIEW',
      ],
    },
  ];

  // Create roles
  for (const roleData of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      console.log(`✓ Role "${roleData.name}" already exists`);
      continue;
    }

    await prisma.role.create({
      data: roleData,
    });

    console.log(`✓ Created role: ${roleData.name}`);
  }

  // Default villages (SuperAdmin can add more via API)
  const defaultVillages = [
    { name: 'Gammarth (Tunis)', description: 'Programme SOS - Tunis' },
    { name: 'Akouda (Sousse)', description: 'Programme SOS - Sousse' },
    { name: 'Mahrès (Sfax)', description: 'Programme SOS - Sfax' },
    { name: 'Siliana', description: 'Programme SOS - Siliana' },
  ];
  for (const v of defaultVillages) {
    const existing = await prisma.village.findUnique({
      where: { name: v.name },
    });
    if (!existing) {
      await prisma.village.create({ data: v });
      console.log(`✓ Created village: ${v.name}`);
    }
  }

  // Test users (one per role) – same password for all: Test1234
  const testPassword = await bcrypt.hash('Test1234', 10);
  const allRoles = await prisma.role.findMany();
  const firstVillage = await prisma.village.findFirst();
  const villageId = firstVillage?.id ?? null;

  const testUsers = [
    { email: 'mere.sos@sos.tn', firstName: 'Marie', lastName: 'Dupont', roleName: 'Mère SOS' },
    { email: 'psychologue@sos.tn', firstName: 'Sophie', lastName: 'Martin', roleName: 'Psychologue' },
    { email: 'assistant.social@sos.tn', firstName: 'Karim', lastName: 'Ben Ali', roleName: 'Assistant Social' },
    { email: 'directeur@sos.tn', firstName: 'Ahmed', lastName: 'Trabelsi', roleName: 'Directeur' },
    { email: 'direction.nationale@sos.tn', firstName: 'Nadia', lastName: 'Jlassi', roleName: 'Direction Nationale' },
    { email: 'superadmin@sos.tn', firstName: 'Super', lastName: 'Admin', roleName: 'SuperAdmin' },
  ];

  for (const u of testUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`✓ Test user "${u.email}" already exists`);
      continue;
    }
    const role = allRoles.find((r) => r.name === u.roleName);
    if (!role) continue;
    await prisma.user.create({
      data: {
        email: u.email,
        password: testPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: role.id,
        villageId,
        status: 'APPROVED',
      },
    });
    console.log(`✓ Created test user: ${u.email} (${u.roleName})`);
  }

  // Optional: create initial SuperAdmin from env (if different from test user)
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminEmail !== 'superadmin@sos.tn') {
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SuperAdmin' },
    });
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (superAdminRole && !existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
          roleId: superAdminRole.id,
          status: 'APPROVED',
        },
      });
      console.log(`✓ Created initial SuperAdmin: ${adminEmail}`);
    }
  }

  console.log('✅ Seeding completed!');
  console.log('\n📋 Created roles:');
  allRoles.forEach((role) => {
    console.log(`   - ${role.name} (ID: ${role.id})`);
  });
  console.log('\n📄 See TEST_USERS.txt for login credentials and permissions.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
