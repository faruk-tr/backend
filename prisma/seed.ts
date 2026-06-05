/**
 * Seed — .NET DatabaseSeeder ile birebir eşleşen veri seti
 * Tüm şifreler: Test1234!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const HASH = (pw: string) => bcrypt.hash(pw, 12);
const now  = new Date();
const exp  = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

const dAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

function buildDescription(status: string, priority: string) {
  const pre = priority === 'urgent' ? 'ACİL: ' : priority === 'high' ? 'Yüksek öncelikli: ' : '';
  const map: Record<string, string> = {
    new:       `${pre}Cihaz arızası tespit edildi, inceleme bekleniyor.`,
    approved:  `${pre}Arıza onaylandı, operatör ataması yapılacak.`,
    assigned:  `${pre}Teknisyen sahaya yönlendirildi, müdahale sürüyor.`,
    repaired:  `${pre}Tamir tamamlandı, cihaz test edildi.`,
    shipped:   `${pre}Onarılan cihaz kargoya verildi.`,
    delivered: `${pre}Cihaz teslim edildi, kurulum yapıldı.`,
    closed:    `${pre}İş emri başarıyla kapatıldı.`,
    cancelled: 'Arıza kaydı iptal edildi.',
  };
  return map[status] ?? `${pre}Cihaz arızası.`;
}

async function main() {
  console.log('🌱 Seed verisi yükleniyor (.NET uyumlu)...');

  // ── 1. Asset Types ──────────────────────────────────────────────────────────
  await prisma.assetType.upsert({ where: { code: 'AEVL4'  }, update: {}, create: { id: 'ast-001', name: 'Validatör (AEVL4)',              code: 'AEVL4',  icon: 'credit-card' } });
  await prisma.assetType.upsert({ where: { code: 'AEVL7'  }, update: {}, create: { id: 'ast-002', name: 'Validatör (AEVL7)',              code: 'AEVL7',  icon: 'credit-card' } });
  await prisma.assetType.upsert({ where: { code: 'AESKP1' }, update: {}, create: { id: 'ast-003', name: 'Sürücü Kontrol Paneli (AESKP1)', code: 'AESKP1', icon: 'monitor'      } });
  await prisma.assetType.upsert({ where: { code: 'AESKP2' }, update: {}, create: { id: 'ast-004', name: 'Sürücü Kontrol Paneli (AESKP2)', code: 'AESKP2', icon: 'monitor'      } });

  // ── 2. Order Types ──────────────────────────────────────────────────────────
  await prisma.orderType.upsert({ where: { code: 'FAULT'        }, update: {}, create: { id: 'ort-001', name: 'Arıza',   code: 'FAULT'        } });
  await prisma.orderType.upsert({ where: { code: 'MAINTENANCE'  }, update: {}, create: { id: 'ort-002', name: 'Bakım',   code: 'MAINTENANCE'  } });
  await prisma.orderType.upsert({ where: { code: 'INSTALLATION' }, update: {}, create: { id: 'ort-003', name: 'Kurulum', code: 'INSTALLATION' } });
  await prisma.orderType.upsert({ where: { code: 'REPLACEMENT'  }, update: {}, create: { id: 'ort-004', name: 'Değişim', code: 'REPLACEMENT'  } });

  // ── 3. Cargo Companies ──────────────────────────────────────────────────────
  await prisma.cargoCompany.upsert({ where: { code: 'ARAS'    }, update: {}, create: { id: 'crg-001', name: 'Aras Kargo',    code: 'ARAS',    trackingUrl: 'https://www.araskargo.com.tr' } });
  await prisma.cargoCompany.upsert({ where: { code: 'YURTICI' }, update: {}, create: { id: 'crg-002', name: 'Yurtiçi Kargo', code: 'YURTICI', trackingUrl: 'https://www.yurticikargo.com.tr' } });
  await prisma.cargoCompany.upsert({ where: { code: 'MNG'     }, update: {}, create: { id: 'crg-003', name: 'MNG Kargo',     code: 'MNG',     trackingUrl: 'https://www.mngkargo.com.tr' } });
  await prisma.cargoCompany.upsert({ where: { code: 'PTT'     }, update: {}, create: { id: 'crg-004', name: 'PTT Kargo',     code: 'PTT',     trackingUrl: 'https://gonderitakip.ptt.gov.tr' } });
  await prisma.cargoCompany.upsert({ where: { code: 'SURAT'   }, update: {}, create: { id: 'crg-005', name: 'Sürat Kargo',   code: 'SURAT',   trackingUrl: 'https://www.suratkargo.com.tr' } });

  // ── 4. Municipalities ───────────────────────────────────────────────────────
  const munDefs = [
    { id: 'mun-001', name: 'İstanbul Büyükşehir Belediyesi', code: 'IST-001', city: 'İstanbul',  district: 'Fatih'     },
    { id: 'mun-002', name: 'Yozgat Belediyesi',              code: 'YOZ-001', city: 'Yozgat',    district: 'Merkez'    },
    { id: 'mun-003', name: 'Konya Büyükşehir Belediyesi',    code: 'KNY-001', city: 'Konya',     district: 'Selçuklu'  },
    { id: 'mun-004', name: 'Gümüşhane Belediyesi',           code: 'GMS-001', city: 'Gümüşhane', district: 'Merkez'    },
    { id: 'mun-005', name: 'Kayseri Büyükşehir Belediyesi',  code: 'KAY-001', city: 'Kayseri',   district: 'Melikgazi' },
    { id: 'mun-006', name: 'Rize Belediyesi',                code: 'RIZ-001', city: 'Rize',      district: 'Merkez'    },
    { id: 'mun-007', name: 'Sorgun Belediyesi',              code: 'YOZ-002', city: 'Yozgat',    district: 'Sorgun'    },
    { id: 'mun-008', name: 'Tekke Belediyesi',               code: 'GMS-002', city: 'Gümüşhane', district: 'Tekke'     },
    { id: 'mun-009', name: 'Bahçeli Belediyesi',             code: 'GMS-003', city: 'Gümüşhane', district: 'Bahçeli'   },
    { id: 'mun-010', name: 'Kahta Belediyesi',               code: 'ADY-001', city: 'Adıyaman',  district: 'Kahta'     },
    { id: 'mun-011', name: 'Yüksekova Belediyesi',           code: 'HAK-001', city: 'Hakkari',   district: 'Yüksekova' },
    { id: 'mun-013', name: 'Çankırı Belediyesi',             code: 'CNK-001', city: 'Çankırı',   district: 'Merkez'    },
    { id: 'mun-014', name: 'Kağızman Belediyesi',            code: 'KAR-001', city: 'Kars',      district: 'Kağızman'  },
    { id: 'mun-015', name: 'Eldivan Belediyesi',             code: 'CNK-002', city: 'Çankırı',   district: 'Eldivan'   },
  ];
  for (const m of munDefs) {
    await prisma.municipality.upsert({ where: { code: m.code }, update: {}, create: m });
  }

  // ── 5. Operators ────────────────────────────────────────────────────────────
  const oprDefs = [
    { id: 'opr-001', name: 'E-Kent Sistemleri A.Ş.',         code: 'EKT-001', email: 'info@ekent.com.tr',   phone: '0312 425 0000' },
    { id: 'opr-002', name: 'Minova Teknoloji A.Ş.',          code: 'MNV-001', email: 'info@minova.com.tr',  phone: '0332 320 0000' },
    { id: 'opr-003', name: 'KentKart Ödeme Sistemleri A.Ş.', code: 'KKT-001', email: 'info@kentkart.com',   phone: '0212 350 0000' },
    { id: 'opr-004', name: 'Asis Elektronik A.Ş.',           code: 'ASS-001', email: 'info@asis.com.tr',    phone: '0312 386 0000' },
    { id: 'opr-005', name: 'Belbim A.Ş.',                    code: 'BLB-001', email: 'info@belbim.com.tr',  phone: '0212 449 0000' },
  ];
  for (const o of oprDefs) {
    await prisma.operator.upsert({ where: { code: o.code }, update: {}, create: o });
  }

  await prisma.operatorMunicipality.createMany({
    skipDuplicates: true,
    data: [
      { operatorId: 'opr-001', municipalityId: 'mun-004' },
      { operatorId: 'opr-001', municipalityId: 'mun-006' },
      { operatorId: 'opr-001', municipalityId: 'mun-007' },
      { operatorId: 'opr-001', municipalityId: 'mun-008' },
      { operatorId: 'opr-001', municipalityId: 'mun-009' },
      { operatorId: 'opr-001', municipalityId: 'mun-010' },
      { operatorId: 'opr-001', municipalityId: 'mun-011' },
      { operatorId: 'opr-001', municipalityId: 'mun-013' },
      { operatorId: 'opr-001', municipalityId: 'mun-014' },
      { operatorId: 'opr-001', municipalityId: 'mun-015' },
      { operatorId: 'opr-002', municipalityId: 'mun-003' },
      { operatorId: 'opr-003', municipalityId: 'mun-002' },
      { operatorId: 'opr-003', municipalityId: 'mun-005' },
      { operatorId: 'opr-005', municipalityId: 'mun-001' },
    ],
  });

  // ── 6. Users + Permissions ──────────────────────────────────────────────────
  const pw = await HASH('Test1234!');

  const userDefs = [
    { id: 'usr-001', userCode: '000000000001', name: 'Sistem Admin',    email: 'admin@sistem.com',       role: 'admin',        munId: null,      oprId: null      },
    { id: 'usr-002', userCode: '000000000002', name: 'Ali Demir',       email: 'yozgat@belediye.com',    role: 'municipality', munId: 'mun-002', oprId: null      },
    { id: 'usr-003', userCode: '000000000003', name: 'Ahmet Yıldız',    email: 'gumushane@belediye.com', role: 'municipality', munId: 'mun-004', oprId: null      },
    { id: 'usr-004', userCode: '000000000004', name: 'Ayşe Çelik',      email: 'rize@belediye.com',      role: 'municipality', munId: 'mun-006', oprId: null      },
    { id: 'usr-005', userCode: '000000000005', name: 'Mehmet Arslan',   email: 'operator@ekart.com',     role: 'operator',     munId: null,      oprId: 'opr-001' },
    { id: 'usr-006', userCode: '000000000006', name: 'Elif Şahin',      email: 'operator@minova.com',    role: 'operator',     munId: null,      oprId: 'opr-002' },
    { id: 'usr-007', userCode: '000000000007', name: 'Ahmet Teknisyen', email: 'teknisyen@ekart.com',    role: 'technician',   munId: null,      oprId: 'opr-001' },
    { id: 'usr-008', userCode: '000000000008', name: 'Veli Usta',       email: 'teknisyen2@ekart.com',   role: 'technician',   munId: null,      oprId: 'opr-001' },
    { id: 'usr-010', userCode: '000000000010', name: 'Kemal Yılmaz',    email: 'sorgun@belediye.com',    role: 'municipality', munId: 'mun-007', oprId: null      },
  ];

  for (const u of userDefs) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id, userCode: u.userCode, name: u.name, email: u.email,
        password: pw, role: u.role, active: true,
        municipalityId: u.munId ?? undefined,
        operatorId:     u.oprId ?? undefined,
        passwordChangedAt: now, passwordExpiresAt: exp,
      },
    });
  }

  const adminPerms = [
    'dashboard.view','dashboard.map','dashboard.asset_summary','dashboard.fault_summary','dashboard.recent_faults',
    'faults.view','faults.create','faults.edit','faults.delete','faults.assign','faults.approve','faults.change_status','faults.import',
    'assignments.view','assignments.create','assignments.edit',
    'users.view','users.create','users.edit','users.delete','users.permissions','users.roles',
    'definitions.view','definitions.municipalities','definitions.operators','definitions.asset_types',
    'definitions.order_types','definitions.cargo_companies','definitions.user_institutions',
    'reports.view','reports.export','notifications.view',
    'settings.view','settings.system',
    'sla.view','sla.manage','sla.definitions','sla.email',
    'chronic.view','chronic.manage',
    'assets.view','assets.manage','assets.import',
    'logs.view','logs.export',
  ];
  const munPerms  = [
    'dashboard.view','dashboard.map','dashboard.asset_summary','dashboard.fault_summary','dashboard.recent_faults',
    'faults.view','faults.create','faults.import',
    'assets.view','reports.view','reports.export','notifications.view',
    'settings.view','sla.view','sla.definitions','chronic.view','logs.view',
  ];
  const oprPerms  = [
    'dashboard.view','dashboard.map','dashboard.fault_summary','dashboard.recent_faults',
    'faults.view','faults.change_status',
    'assignments.view','assignments.create','assignments.edit',
    'assets.view','reports.view','notifications.view','settings.view',
  ];
  const techPerms = [
    'dashboard.view','dashboard.fault_summary','dashboard.recent_faults',
    'faults.view','faults.change_status',
    'assignments.view','assignments.edit',
    'notifications.view','settings.view',
  ];

  const permMap: Record<string, string[]> = {
    'usr-001': adminPerms,
    'usr-002': munPerms, 'usr-003': munPerms, 'usr-004': munPerms, 'usr-010': munPerms,
    'usr-005': oprPerms, 'usr-006': oprPerms,
    'usr-007': techPerms, 'usr-008': techPerms,
  };
  for (const [userId, perms] of Object.entries(permMap)) {
    await prisma.userPermission.createMany({
      data: perms.map((p) => ({ userId, permission: p })),
      skipDuplicates: true,
    });
  }

  // ── 7. SLA Definitions ──────────────────────────────────────────────────────
  await prisma.slaDefinition.upsert({ where: { municipalityId: 'mun-002' }, update: {}, create: { id: 'sla-001', municipalityId: 'mun-002', slaDays: 25, farePrice: 100, dailyPenaltyCount: 1 } });
  await prisma.slaDefinition.upsert({ where: { municipalityId: 'mun-004' }, update: {}, create: { id: 'sla-002', municipalityId: 'mun-004', slaDays: 25, farePrice: 100, dailyPenaltyCount: 1 } });
  await prisma.slaDefinition.upsert({ where: { municipalityId: 'mun-006' }, update: {}, create: { id: 'sla-003', municipalityId: 'mun-006', slaDays: 30, farePrice: 80,  dailyPenaltyCount: 1 } });

  // ── 8. Assets (140 — 10 × 14 belediye) ─────────────────────────────────────
  const munList = [
    { id: 'mun-001', code: 'IST' }, { id: 'mun-002', code: 'YOZ' },
    { id: 'mun-003', code: 'KNY' }, { id: 'mun-004', code: 'GMS' },
    { id: 'mun-005', code: 'KAY' }, { id: 'mun-006', code: 'RIZ' },
    { id: 'mun-007', code: 'SRG' }, { id: 'mun-008', code: 'TEK' },
    { id: 'mun-009', code: 'BHC' }, { id: 'mun-010', code: 'KHT' },
    { id: 'mun-011', code: 'YKS' }, { id: 'mun-013', code: 'CNK' },
    { id: 'mun-014', code: 'KGZ' }, { id: 'mun-015', code: 'ELD' },
  ];
  const assetPattern = [
    { typeId: 'ast-001', status: 'active',    depot: 'field'     },
    { typeId: 'ast-001', status: 'active',    depot: 'field'     },
    { typeId: 'ast-001', status: 'faulty',    depot: 'field'     },
    { typeId: 'ast-002', status: 'active',    depot: 'field'     },
    { typeId: 'ast-002', status: 'active',    depot: 'field'     },
    { typeId: 'ast-002', status: 'faulty',    depot: 'field'     },
    { typeId: 'ast-003', status: 'active',    depot: 'field'     },
    { typeId: 'ast-003', status: 'in_repair', depot: 'field'     },
    { typeId: 'ast-004', status: 'active',    depot: 'field'     },
    { typeId: 'ast-004', status: 'in_stock',  depot: 'ptt_depot' },
  ];

  for (const mun of munList) {
    const lc = mun.code.toLowerCase();
    for (let i = 0; i < assetPattern.length; i++) {
      const p  = assetPattern[i];
      const n  = (i + 1).toString().padStart(2, '0');
      const sn = `SN-${mun.code}-${(i + 1).toString().padStart(4, '0')}`;
      await prisma.asset.upsert({
        where: { serialNo: sn },
        update: {},
        create: { id: `a-${lc}-${n}`, serialNo: sn, assetTypeId: p.typeId, municipalityId: mun.id, status: p.status, depotType: p.depot },
      });
    }
  }

  // ── 9. Faults (140 — 10 × 14 belediye) ─────────────────────────────────────
  const munConfigs: [string, string, string, string, string][] = [
    ['mun-001','IST','opr-005','usr-001','usr-001'],
    ['mun-002','YOZ','opr-003','usr-002','usr-001'],
    ['mun-003','KNY','opr-002','usr-001','usr-006'],
    ['mun-004','GMS','opr-001','usr-003','usr-007'],
    ['mun-005','KAY','opr-003','usr-001','usr-001'],
    ['mun-006','RIZ','opr-001','usr-004','usr-007'],
    ['mun-007','SRG','opr-001','usr-010','usr-008'],
    ['mun-008','TEK','opr-001','usr-001','usr-007'],
    ['mun-009','BHC','opr-001','usr-001','usr-008'],
    ['mun-010','KHT','opr-001','usr-001','usr-007'],
    ['mun-011','YKS','opr-001','usr-001','usr-008'],
    ['mun-013','CNK','opr-001','usr-001','usr-007'],
    ['mun-014','KGZ','opr-001','usr-001','usr-008'],
    ['mun-015','ELD','opr-001','usr-001','usr-007'],
  ];

  let seq = 1;

  for (const [munId, cityCode, oprId, createdById, assignedToId] of munConfigs) {
    const lc = cityCode.toLowerCase();
    const A  = (n: number) => `a-${lc}-${n.toString().padStart(2, '0')}`;

    type FaultCase = {
      status: string; priority: string; ai: number; tid: string; oid: string;
      oper?: string; asgn?: string; note?: string; cargo?: string; trk?: string;
      rep: number; apr?: number; asgd?: number; rprd?: number; shp?: number; del?: number; cls?: number; can?: number; cancelReason?: string;
    };

    const cases: FaultCase[] = [
      { status:'new',       priority:'normal',  ai:1,  tid:'ast-001', oid:'ort-001', rep:2  },
      { status:'new',       priority:'high',    ai:6,  tid:'ast-002', oid:'ort-001', rep:1  },
      { status:'approved',  priority:'normal',  ai:2,  tid:'ast-001', oid:'ort-002', rep:8,  apr:7 },
      { status:'assigned',  priority:'urgent',  ai:8,  tid:'ast-003', oid:'ort-001', oper:oprId, asgn:assignedToId, note:'Acil müdahale yapılacak.', rep:15, apr:14, asgd:13 },
      { status:'assigned',  priority:'high',    ai:4,  tid:'ast-002', oid:'ort-001', oper:oprId, asgn:assignedToId, note:'İnceleniyor.',              rep:10, apr:9,  asgd:8  },
      { status:'repaired',  priority:'normal',  ai:3,  tid:'ast-001', oid:'ort-001', oper:oprId, asgn:assignedToId, note:'Parça değiştirildi.',        rep:30, apr:29, asgd:28, rprd:7  },
      { status:'shipped',   priority:'high',    ai:5,  tid:'ast-002', oid:'ort-004', oper:oprId, asgn:assignedToId, note:'Değişim yapıldı.',
        cargo:'crg-001', trk:`ARAS-2026-${seq.toString().padStart(6,'0')}`,          rep:40, apr:39, asgd:38, rprd:20, shp:15 },
      { status:'delivered', priority:'normal',  ai:9,  tid:'ast-004', oid:'ort-001', oper:oprId, asgn:assignedToId,
        cargo:'crg-002', trk:`YIC-2026-${seq.toString().padStart(6,'0')}`,            rep:50, apr:49, asgd:48, rprd:30, shp:25, del:20 },
      { status:'closed',    priority:'normal',  ai:7,  tid:'ast-003', oid:'ort-002', oper:oprId, asgn:assignedToId,
        cargo:'crg-004', trk:`PTT-2026-${seq.toString().padStart(6,'0')}`,            rep:65, apr:64, asgd:63, rprd:50, shp:45, del:40, cls:38 },
      { status:'cancelled', priority:'low',     ai:10, tid:'ast-004', oid:'ort-001',             rep:5,  can:4, cancelReason:'Cihaz garanti kapsamına alındı.' },
    ];

    for (const c of cases) {
      const fid = `f-${lc}-${seq.toString().padStart(3,'0')}`;
      const wo  = `IE-2026-${seq.toString().padStart(5,'0')}`;
      const rep = dAgo(c.rep);

      await prisma.fault.upsert({
        where: { workOrderNo: wo },
        update: {},
        create: {
          id: fid, formNo: `${cityCode}2026${seq.toString().padStart(5,'0')}`, workOrderNo: wo,
          status: c.status, priority: c.priority, warrantyScope: 'out_of_warranty',
          orderTypeId: c.oid, municipalityId: munId, assetId: A(c.ai), assetTypeId: c.tid,
          description:    buildDescription(c.status, c.priority),
          reportedAt:     rep,
          approvedAt:     c.apr  ? dAgo(c.apr)  : undefined,
          assignedAt:     c.asgd ? dAgo(c.asgd) : undefined,
          repairedAt:     c.rprd ? dAgo(c.rprd) : undefined,
          shippedAt:      c.shp  ? dAgo(c.shp)  : undefined,
          deliveredAt:    c.del  ? dAgo(c.del)  : undefined,
          closedAt:       c.cls  ? dAgo(c.cls)  : undefined,
          cancelledAt:    c.can  ? dAgo(c.can)  : undefined,
          cancelReason:   c.cancelReason,
          operatorId:     c.oper, assignedToId: c.asgn, assignmentNotes: c.note,
          cargoCompanyId: c.cargo, cargoTrackingNo: c.trk,
          createdById, createdAt: rep,
        },
      });

      await prisma.faultStatusHistory.createMany({
        skipDuplicates: true,
        data: [
          { faultId: fid, status: 'new',       changedById: createdById,        notes: 'Arıza kaydı oluşturuldu.', changedAt: rep },
          ...(c.apr  ? [{ faultId: fid, status: 'approved',  changedById: 'usr-001',    notes: undefined,                changedAt: dAgo(c.apr)  }] : []),
          ...(c.asgd ? [{ faultId: fid, status: 'assigned',  changedById: 'usr-001',    notes: c.note,                   changedAt: dAgo(c.asgd) }] : []),
          ...(c.rprd ? [{ faultId: fid, status: 'repaired',  changedById: c.asgn ?? 'usr-001', notes: 'Tamir tamamlandı.', changedAt: dAgo(c.rprd) }] : []),
          ...(c.shp  ? [{ faultId: fid, status: 'shipped',   changedById: createdById,  notes: 'Kargo gönderildi.',      changedAt: dAgo(c.shp)  }] : []),
          ...(c.del  ? [{ faultId: fid, status: 'delivered', changedById: c.asgn ?? 'usr-001', notes: undefined,          changedAt: dAgo(c.del)  }] : []),
          ...(c.cls  ? [{ faultId: fid, status: 'closed',    changedById: 'usr-001',    notes: 'İş emri kapatıldı.',     changedAt: dAgo(c.cls)  }] : []),
          ...(c.can  ? [{ faultId: fid, status: 'cancelled', changedById: createdById,  notes: c.cancelReason,           changedAt: dAgo(c.can)  }] : []),
        ],
      });

      seq++;
    }
  }

  console.log('✅ Seed tamamlandı!');
  console.log('\n📋 Hesaplar (şifre hepsi: Test1234!)');
  console.log('  Admin       : admin@sistem.com');
  console.log('  Belediye    : yozgat@belediye.com | gumushane@belediye.com | rize@belediye.com | sorgun@belediye.com');
  console.log('  Operatör    : operator@ekart.com | operator@minova.com');
  console.log('  Teknisyen   : teknisyen@ekart.com | teknisyen2@ekart.com');
  console.log(`\n  📦 140 cihaz + 📋 140 arıza (10 × 14 belediye)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
