import { app } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';

async function main() {
  // Test DB connection
  await prisma.$connect();
  console.log('✓ Veritabanı bağlantısı kuruldu');

  app.listen(config.port, () => {
    console.log(`✓ Sunucu çalışıyor: http://localhost:${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`  API: http://localhost:${config.port}/api`);
  });
}

main().catch((err) => {
  console.error('Sunucu başlatılamadı:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
