# TRKart ServiceOps — Backend API

**Node.js + Express + TypeScript + Prisma (SQLite)**

## Hızlı Başlangıç

### 1. Bağımlılıkları Yükle

```bash
cd backend
npm install
```

### 2. Ortam Değişkenleri

`.env` dosyası zaten oluşturuldu. Gerekirse düzenle:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="güvenli-bir-secret-en-az-32-karakter"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
DEMO_OTP_ENABLED=true
```

### 3. Veritabanını Hazırla

```bash
# Prisma client'ı üret
npm run db:generate

# Veritabanı tabloları oluştur
npm run db:push

# Demo verilerini yükle
npm run db:seed
```

### 4. Sunucuyu Başlat

```bash
# Geliştirme modu (hot reload)
npm run dev
```

API çalışıyor: `http://localhost:3001/api`

---

## Demo Hesaplar

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Sistem Admin | admin@sistem.com | admin123 |
| Belediye (Ankara) | ankara@belediye.com | ankara123 |
| Belediye (İstanbul) | istanbul@belediye.com | istanbul123 |
| Operatör | operatör@techservis.com | techservis123 |
| Teknisyen | teknisyen@techservis.com | teknisyen123 |

> **Demo Modu**: `DEMO_OTP_ENABLED=true` ayarıyla OTP kodu login response'unda döner (gerçek SMS gönderilmez).

---

## API Endpoint Listesi

### Auth
| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/auth/login` | Giriş (OTP başlatır) |
| POST | `/api/auth/verify-otp` | OTP doğrulama + token |
| GET | `/api/auth/me` | Mevcut kullanıcı |
| POST | `/api/auth/change-password` | Şifre değiştir |
| POST | `/api/auth/logout` | Çıkış |

### Users
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/users` | Kullanıcı listesi |
| POST | `/api/users` | Kullanıcı oluştur |
| GET | `/api/users/:id` | Kullanıcı detay |
| PUT | `/api/users/:id` | Güncelle |
| DELETE | `/api/users/:id` | Sil |
| GET/PUT | `/api/users/:id/permissions` | İzinler |
| GET/PUT | `/api/users/:id/menu-permissions` | Menü izinleri |
| POST | `/api/users/:id/reset-password` | Şifre sıfırla |

### Faults
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/faults` | Arıza listesi (filtreli) |
| POST | `/api/faults` | Arıza oluştur |
| GET | `/api/faults/stats` | İstatistikler |
| GET | `/api/faults/:id` | Arıza detay |
| PUT | `/api/faults/:id` | Güncelle |
| PATCH | `/api/faults/:id/status` | Durum değiştir |
| DELETE | `/api/faults/:id` | Sil |

### Assets & Stock
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/assets` | Varlık listesi |
| POST | `/api/assets` | Varlık ekle |
| GET | `/api/assets/stats` | İstatistikler |
| GET | `/api/assets/serial/:sn` | Seri no ile ara |
| PUT | `/api/assets/:id` | Güncelle |
| POST | `/api/assets/:id/move` | Depo transferi |
| POST | `/api/assets/:id/scrap-request` | Hurda talebi |
| POST | `/api/assets/:id/scrap-approve` | Hurda onayı |
| GET | `/api/assets/stock/movements` | Transfer hareketleri |

### Definitions
| Method | Path |
|--------|------|
| CRUD | `/api/definitions/municipalities` |
| CRUD | `/api/definitions/operators` |
| CRUD | `/api/definitions/asset-types` |
| CRUD | `/api/definitions/order-types` |
| CRUD | `/api/definitions/cargo-companies` |

### SLA
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/sla` | Tüm SLA tanımları |
| GET | `/api/sla/violations` | İhlaller |
| GET/PUT | `/api/sla/municipality/:id` | Belediye SLA'sı |
| POST/DELETE | `/api/sla/definition/:id/recipients` | E-posta alıcıları |

### Reports
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/reports/dashboard` | Dashboard istatistikleri |
| GET | `/api/reports` | Raporlama verileri |
| GET | `/api/reports/chronic` | Kronik arızalı cihazlar |
| GET/PUT | `/api/reports/chronic/configs` | Kronik arıza parametreleri |

### Notifications
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/notifications` | Bildirimler |
| PATCH | `/api/notifications/:id/read` | Okundu işaretle |
| PATCH | `/api/notifications/read-all` | Tümünü okundu işaretle |
| DELETE | `/api/notifications/:id` | Sil |

---

## Veritabanı Yönetimi

```bash
# Prisma Studio (görsel DB yöneticisi)
npm run db:studio

# Tüm sıfırla + yeniden seed
npm run db:reset

# Yeni migration oluştur (şema değiştiğinde)
npm run db:migrate
```

---

## Frontend Entegrasyonu

`src/.env` veya `src/.env.local` dosyasına ekle:

```
VITE_API_URL=http://localhost:3001/api
```

Frontend'de `src/lib/api.ts` kullanılarak tüm API çağrıları yapılır:

```ts
import { faultsApi, authApi } from './lib/api';

// Arıza listesi
const { data, pagination } = await faultsApi.list({ page: '1', limit: '20' });

// Giriş
const { demoOtp } = await authApi.login('admin@sistem.com', 'admin123');
const { token, user } = await authApi.verifyOtp('admin@sistem.com', demoOtp!);
```
