import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed verisi yükleniyor...');

  // ─── Asset Types ─────────────────────────────────────────────────────────
  const assetTypes = await Promise.all([
    prisma.assetType.upsert({ where: { code: 'DESKTOP' }, update: {}, create: { name: 'Masaüstü Bilgisayar', code: 'DESKTOP', icon: 'monitor' } }),
    prisma.assetType.upsert({ where: { code: 'LAPTOP' }, update: {}, create: { name: 'Dizüstü Bilgisayar', code: 'LAPTOP', icon: 'laptop' } }),
    prisma.assetType.upsert({ where: { code: 'TABLET' }, update: {}, create: { name: 'Tablet', code: 'TABLET', icon: 'tablet' } }),
    prisma.assetType.upsert({ where: { code: 'PRINTER' }, update: {}, create: { name: 'Yazıcı', code: 'PRINTER', icon: 'printer' } }),
    prisma.assetType.upsert({ where: { code: 'CAMERA' }, update: {}, create: { name: 'Güvenlik Kamerası', code: 'CAMERA', icon: 'camera' } }),
    prisma.assetType.upsert({ where: { code: 'SWITCH' }, update: {}, create: { name: 'Network Switch', code: 'SWITCH', icon: 'network' } }),
    prisma.assetType.upsert({ where: { code: 'UPS' }, update: {}, create: { name: 'UPS', code: 'UPS', icon: 'battery' } }),
    prisma.assetType.upsert({ where: { code: 'SCANNER' }, update: {}, create: { name: 'Tarayıcı', code: 'SCANNER', icon: 'scan' } }),
  ]);

  // ─── Order Types ─────────────────────────────────────────────────────────
  const orderTypes = await Promise.all([
    prisma.orderType.upsert({ where: { code: 'FAULT' }, update: {}, create: { name: 'Arıza', code: 'FAULT' } }),
    prisma.orderType.upsert({ where: { code: 'MAINTENANCE' }, update: {}, create: { name: 'Bakım', code: 'MAINTENANCE' } }),
    prisma.orderType.upsert({ where: { code: 'INSTALLATION' }, update: {}, create: { name: 'Kurulum', code: 'INSTALLATION' } }),
    prisma.orderType.upsert({ where: { code: 'REPLACEMENT' }, update: {}, create: { name: 'Değişim', code: 'REPLACEMENT' } }),
    prisma.orderType.upsert({ where: { code: 'WARRANTY' }, update: {}, create: { name: 'Garanti', code: 'WARRANTY' } }),
  ]);

  // ─── Cargo Companies ─────────────────────────────────────────────────────
  const cargoCompanies = await Promise.all([
    prisma.cargoCompany.upsert({ where: { code: 'PTT' }, update: {}, create: { name: 'PTT Kargo', code: 'PTT', trackingUrl: 'https://www.ptt.gov.tr/Home/Kargo' } }),
    prisma.cargoCompany.upsert({ where: { code: 'MNG' }, update: {}, create: { name: 'MNG Kargo', code: 'MNG', trackingUrl: 'https://www.mngkargo.com.tr/gonderi-sorgula' } }),
    prisma.cargoCompany.upsert({ where: { code: 'YURTICI' }, update: {}, create: { name: 'Yurtiçi Kargo', code: 'YURTICI', trackingUrl: 'https://www.yurticikargo.com/tr/online-islemler/gonderi-sorgula' } }),
    prisma.cargoCompany.upsert({ where: { code: 'ARAS' }, update: {}, create: { name: 'Aras Kargo', code: 'ARAS', trackingUrl: 'https://www.araskargo.com.tr/anasayfa' } }),
    prisma.cargoCompany.upsert({ where: { code: 'SURAT' }, update: {}, create: { name: 'Sürat Kargo', code: 'SURAT', trackingUrl: 'https://www.suratkargo.com.tr' } }),
  ]);

  // ─── Municipalities ───────────────────────────────────────────────────────
  const ankara = await prisma.municipality.upsert({
    where: { code: '06ANK' },
    update: {},
    create: {
      name: 'Ankara Büyükşehir Belediyesi',
      code: '06ANK',
      city: 'Ankara',
      phone: '+90 312 507 11 00',
      email: 'info@ankara.bel.tr',
      address: 'Kızılay, Ankara',
    },
  });

  const istanbul = await prisma.municipality.upsert({
    where: { code: '34IST' },
    update: {},
    create: {
      name: 'İstanbul Büyükşehir Belediyesi',
      code: '34IST',
      city: 'İstanbul',
      phone: '+90 212 455 13 00',
      email: 'info@ibb.gov.tr',
      address: 'Saraçhane, İstanbul',
    },
  });

  const izmir = await prisma.municipality.upsert({
    where: { code: '35IZM' },
    update: {},
    create: {
      name: 'İzmir Büyükşehir Belediyesi',
      code: '35IZM',
      city: 'İzmir',
      phone: '+90 232 293 10 00',
      email: 'info@izmir.bel.tr',
      address: 'Konak, İzmir',
    },
  });

  // ─── SLA Definitions ─────────────────────────────────────────────────────
  await prisma.slaDefinition.upsert({
    where: { municipalityId: ankara.id },
    update: {},
    create: {
      municipalityId: ankara.id,
      slaDays: 25,
      farePrice: 78.5,
      dailyPenaltyCount: 3,
    },
  });

  await prisma.slaDefinition.upsert({
    where: { municipalityId: istanbul.id },
    update: {},
    create: {
      municipalityId: istanbul.id,
      slaDays: 25,
      farePrice: 84.25,
      dailyPenaltyCount: 3,
    },
  });

  await prisma.slaDefinition.upsert({
    where: { municipalityId: izmir.id },
    update: {},
    create: {
      municipalityId: izmir.id,
      slaDays: 25,
      farePrice: 65.0,
      dailyPenaltyCount: 2,
    },
  });

  // ─── Operators ───────────────────────────────────────────────────────────
  const techServis = await prisma.operator.upsert({
    where: { code: 'TECHSERVIS' },
    update: {},
    create: {
      name: 'TechServis A.Ş.',
      code: 'TECHSERVIS',
      phone: '+90 312 444 00 01',
      email: 'servis@techservis.com.tr',
      municipalities: {
        create: [
          { municipalityId: ankara.id },
          { municipalityId: istanbul.id },
        ],
      },
    },
  });

  const digitechBilisim = await prisma.operator.upsert({
    where: { code: 'DIGITECH' },
    update: {},
    create: {
      name: 'Digitech Bilişim Ltd.',
      code: 'DIGITECH',
      phone: '+90 232 444 00 02',
      email: 'info@digitech.com.tr',
      municipalities: {
        create: [{ municipalityId: izmir.id }],
      },
    },
  });

  // ─── Chronic Fault Configs ────────────────────────────────────────────────
  const desktopType = assetTypes.find((a) => a.code === 'DESKTOP')!;
  const tabletType  = assetTypes.find((a) => a.code === 'TABLET')!;
  const printerType = assetTypes.find((a) => a.code === 'PRINTER')!;

  await Promise.all([
    prisma.chronicFaultConfig.upsert({ where: { assetTypeId: desktopType.id }, update: {}, create: { assetTypeId: desktopType.id, thresholdCount: 3, periodDays: 365 } }),
    prisma.chronicFaultConfig.upsert({ where: { assetTypeId: tabletType.id  }, update: {}, create: { assetTypeId: tabletType.id,  thresholdCount: 3, periodDays: 365 } }),
    prisma.chronicFaultConfig.upsert({ where: { assetTypeId: printerType.id }, update: {}, create: { assetTypeId: printerType.id, thresholdCount: 4, periodDays: 365 } }),
  ]);

  // ─── Users ────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const passwordExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sistem.com' },
    update: {},
    create: {
      userCode: '000000000001',
      name: 'Sistem Admin',
      email: 'admin@sistem.com',
      password: await hash('Test1234!'),
      role: 'admin',
      phone: '+90 555 000 00 01',
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: [
          'dashboard.view', 'faults.view', 'faults.create', 'faults.edit', 'faults.delete',
          'faults.assign', 'faults.approve', 'faults.change_status',
          'users.view', 'users.create', 'users.edit', 'users.delete', 'users.permissions',
          'definitions.view', 'definitions.municipalities', 'definitions.operators',
          'definitions.asset_types', 'definitions.order_types', 'definitions.cargo_companies',
          'reports.view', 'reports.export', 'notifications.view',
          'settings.view', 'settings.system', 'sla.view', 'sla.manage',
          'assets.view', 'assets.edit', 'stock.view', 'stock.manage',
        ].map((p) => ({ permission: p })),
      },
    },
  });

  const ayse = await prisma.user.upsert({
    where: { email: 'ankara@belediye.com' },
    update: {},
    create: {
      userCode: '000000000002',
      name: 'Ayşe Yılmaz',
      email: 'ankara@belediye.com',
      password: await hash('Test1234!'),
      role: 'municipality',
      phone: '+90 555 000 00 02',
      municipalityId: ankara.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: [
          'dashboard.view', 'faults.view', 'faults.create', 'faults.edit',
          'faults.change_status', 'reports.view', 'notifications.view', 'settings.view',
          'assets.view', 'sla.view',
        ].map((p) => ({ permission: p })),
      },
    },
  });

  const istanbul_user = await prisma.user.upsert({
    where: { email: 'istanbul@belediye.com' },
    update: {},
    create: {
      userCode: '000000000003',
      name: 'Mehmet Kaya',
      email: 'istanbul@belediye.com',
      password: await hash('Test1234!'),
      role: 'municipality',
      phone: '+90 555 000 00 03',
      municipalityId: istanbul.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: ['dashboard.view', 'faults.view', 'faults.create', 'reports.view', 'notifications.view', 'settings.view'].map((p) => ({ permission: p })),
      },
    },
  });

  // BilgiTek operatörü (yeni)
  const bilgitek = await prisma.operator.upsert({
    where: { code: 'BILGITEK' },
    update: {},
    create: {
      name: 'BilgiTek Ltd.',
      code: 'BILGITEK',
      phone: '+90 212 444 00 02',
      email: 'info@bilgitek.com.tr',
      municipalities: {
        create: [
          { municipalityId: istanbul.id },
          { municipalityId: izmir.id },
        ],
      },
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@techservis.com' },
    update: {},
    create: {
      userCode: '000000000004',
      name: 'Ali Çelik',
      email: 'operator@techservis.com',
      password: await hash('Test1234!'),
      role: 'operator',
      phone: '+90 555 000 00 04',
      operatorId: techServis.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: ['faults.view', 'faults.assign', 'faults.change_status', 'reports.view', 'notifications.view', 'settings.view', 'assets.view'].map((p) => ({ permission: p })),
      },
    },
  });

  const hasanOperator = await prisma.user.upsert({
    where: { email: 'operator@bilgitek.com' },
    update: {},
    create: {
      userCode: '000000000006',
      name: 'Hasan Öztürk',
      email: 'operator@bilgitek.com',
      password: await hash('Test1234!'),
      role: 'operator',
      phone: '+90 555 000 00 06',
      operatorId: bilgitek.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: ['faults.view', 'faults.assign', 'faults.change_status', 'reports.view', 'notifications.view', 'settings.view', 'assets.view'].map((p) => ({ permission: p })),
      },
    },
  });

  const ahmetTech = await prisma.user.upsert({
    where: { email: 'ahmet@techservis.com' },
    update: {},
    create: {
      userCode: '000000000007',
      name: 'Ahmet Teknisyen',
      email: 'ahmet@techservis.com',
      password: await hash('Test1234!'),
      role: 'technician',
      phone: '+90 555 000 00 07',
      operatorId: techServis.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: ['faults.view', 'faults.change_status', 'notifications.view', 'settings.view', 'assets.view'].map((p) => ({ permission: p })),
      },
    },
  });

  const veliTech = await prisma.user.upsert({
    where: { email: 'veli@bilgitek.com' },
    update: {},
    create: {
      userCode: '000000000008',
      name: 'Veli Usta',
      email: 'veli@bilgitek.com',
      password: await hash('Test1234!'),
      role: 'technician',
      phone: '+90 555 000 00 08',
      operatorId: bilgitek.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: ['faults.view', 'faults.change_status', 'notifications.view', 'settings.view', 'assets.view'].map((p) => ({ permission: p })),
      },
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'teknisyen@techservis.com' },
    update: {},
    create: {
      userCode: '000000000005',
      name: 'Fatma Çelik',
      email: 'teknisyen@techservis.com',
      password: await hash('Test1234!'),
      role: 'technician',
      phone: '+90 555 000 00 05',
      operatorId: techServis.id,
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      permissions: {
        create: ['faults.view', 'faults.change_status', 'notifications.view', 'settings.view', 'assets.view'].map((p) => ({ permission: p })),
      },
    },
  });

  // ─── Assets ───────────────────────────────────────────────────────────────
  const assets = await Promise.all([
    prisma.asset.upsert({
      where: { serialNo: 'SN-ANK-001' },
      update: {},
      create: {
        serialNo: 'SN-ANK-001', macAddress: 'AA:BB:CC:11:22:33',
        assetTypeId: desktopType.id, municipalityId: ankara.id,
        status: 'active', depotType: 'field',
        stockItem: { create: { depotType: 'field' } },
      },
    }),
    prisma.asset.upsert({
      where: { serialNo: 'SN-ANK-002' },
      update: {},
      create: {
        serialNo: 'SN-ANK-002', macAddress: 'AA:BB:CC:11:22:34',
        assetTypeId: desktopType.id, municipalityId: ankara.id,
        status: 'active', depotType: 'field',
        stockItem: { create: { depotType: 'field' } },
      },
    }),
    prisma.asset.upsert({
      where: { serialNo: 'SN-ANK-003' },
      update: {},
      create: {
        serialNo: 'SN-ANK-003', simNo: 'SIM-001', samNo: 'SAM-001',
        assetTypeId: tabletType.id, municipalityId: ankara.id,
        status: 'faulty', depotType: 'field',
        stockItem: { create: { depotType: 'field' } },
      },
    }),
    prisma.asset.upsert({
      where: { serialNo: 'SN-IST-001' },
      update: {},
      create: {
        serialNo: 'SN-IST-001',
        assetTypeId: printerType.id, municipalityId: istanbul.id,
        status: 'in_repair', depotType: 'supplier_depot',
        stockItem: { create: { depotType: 'supplier_depot' } },
      },
    }),
    prisma.asset.upsert({
      where: { serialNo: 'SN-STK-001' },
      update: {},
      create: {
        serialNo: 'SN-STK-001',
        assetTypeId: desktopType.id,
        status: 'in_stock', depotType: 'ptt_depot',
        stockItem: { create: { depotType: 'ptt_depot' } },
      },
    }),
  ]);

  // ─── Faults ───────────────────────────────────────────────────────────────
  const faultOrderType = orderTypes.find((o) => o.code === 'FAULT')!;
  const maintenanceOrderType = orderTypes.find((o) => o.code === 'MAINTENANCE')!;

  const fault1 = await prisma.fault.upsert({
    where: { workOrderNo: 'IE-2026-00001' },
    update: {},
    create: {
      formNo: '06ANK202600001',
      workOrderNo: 'IE-2026-00001',
      status: 'assigned',
      priority: 'urgent',
      warrantyScope: 'out_of_warranty',
      municipalityId: ankara.id,
      orderTypeId: faultOrderType.id,
      assetId: assets[2].id,
      description: 'Tablet cihazı açılmıyor, şarj girişi arızalı. Acil müdahale gerekiyor.',
      reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      assignedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      operatorId: techServis.id,
      assignedToId: technician.id,
      assignmentNotes: 'Öncelikli olarak incelenecek.',
      createdById: ayse.id,
    },
  });

  await prisma.faultStatusHistory.createMany({
    data: [
      { faultId: fault1.id, status: 'new', changedById: ayse.id, notes: 'Arıza kaydı oluşturuldu.' },
      { faultId: fault1.id, status: 'approved', changedById: admin.id, notes: 'Onaylandı.' },
      { faultId: fault1.id, status: 'assigned', changedById: admin.id, notes: 'TechServis\'e atandı.' },
    ],
  });

  const fault2 = await prisma.fault.upsert({
    where: { workOrderNo: 'IE-2026-00002' },
    update: {},
    create: {
      formNo: '34IST202600001',
      workOrderNo: 'IE-2026-00002',
      status: 'new',
      priority: 'normal',
      warrantyScope: 'in_warranty',
      municipalityId: istanbul.id,
      orderTypeId: faultOrderType.id,
      assetId: assets[3].id,
      description: 'Yazıcı kağıt sıkıştırıyor ve baskı kalitesi düşük. Garanti kapsamında.',
      reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdById: istanbul_user.id,
    },
  });

  await prisma.faultStatusHistory.createMany({
    data: [
      { faultId: fault2.id, status: 'new', changedById: istanbul_user.id, notes: 'Arıza kaydı oluşturuldu.' },
    ],
  });

  const fault3 = await prisma.fault.upsert({
    where: { workOrderNo: 'IE-2026-00003' },
    update: {},
    create: {
      formNo: '06ANK202600002',
      workOrderNo: 'IE-2026-00003',
      status: 'closed',
      priority: 'high',
      warrantyScope: 'out_of_warranty',
      municipalityId: ankara.id,
      orderTypeId: maintenanceOrderType.id,
      assetId: assets[0].id,
      description: 'Masaüstü bilgisayar yavaş çalışıyor, RAM ve disk temizliği gerekiyor.',
      reportedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      assignedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      repairedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      operatorId: techServis.id,
      assignedToId: technician.id,
      cargoCompanyId: cargoCompanies[0].id,
      cargoTrackingNo: 'PTT-2026-123456',
      shippedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      createdById: ayse.id,
    },
  });

  await prisma.faultStatusHistory.createMany({
    data: [
      { faultId: fault3.id, status: 'new', changedById: ayse.id },
      { faultId: fault3.id, status: 'approved', changedById: admin.id },
      { faultId: fault3.id, status: 'assigned', changedById: admin.id },
      { faultId: fault3.id, status: 'shipped', changedById: ayse.id, notes: 'Kargo gönderildi.' },
      { faultId: fault3.id, status: 'delivered', changedById: operatorUser.id },
      { faultId: fault3.id, status: 'repaired', changedById: technician.id, notes: 'Tamir tamamlandı.' },
      { faultId: fault3.id, status: 'closed', changedById: admin.id, notes: 'İş emri kapatıldı.' },
    ],
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'fault_created',
        title: 'Yeni Arıza Bildirimi',
        message: `${fault2.workOrderNo} nolu yeni arıza kaydedildi.`,
        faultId: fault2.id,
      },
      {
        userId: ayse.id,
        type: 'fault_assigned',
        title: 'Arıza Üstlenildi',
        message: `${fault1.workOrderNo} nolu arıza TechServis\'e atandı.`,
        faultId: fault1.id,
        read: true,
        readAt: new Date(),
      },
    ],
  });

  console.log('✅ Seed verisi başarıyla yüklendi!');
  console.log('\n📋 Demo Hesaplar:');
  console.log('  Sistem Admin    : admin@sistem.com          / Test1234!');
  console.log('  Belediye (ANK)  : ankara@belediye.com       / Test1234!');
  console.log('  Belediye (IST)  : istanbul@belediye.com     / Test1234!');
  console.log('  Operatör (TECH) : operator@techservis.com   / Test1234!');
  console.log('  Operatör (BLGT) : operator@bilgitek.com     / Test1234!');
  console.log('  Teknisyen (TECH): ahmet@techservis.com      / Test1234!');
  console.log('  Teknisyen (BLGT): veli@bilgitek.com         / Test1234!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
