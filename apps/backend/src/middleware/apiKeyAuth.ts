import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  try {
    // 1. Cari user pertama
    let user = await prisma.user.findFirst({ select: { id: true } });
    
    // 💡 JALUR BYPASS: Jika database kosong, buatkan User & Akun otomatis saat ini juga!
    if (!user) {
      console.log('Database kosong. Membuat user & akun default otomatis...');
      user = await prisma.user.create({
        data: {
          email: 'admin@pocketmint.com',
          name: 'User Utama',
          password: 'securepassword123', // Hanya dummy placeholder
        },
        select: { id: true }
      });

      await prisma.wallet.create({
        data: {
          userId: user.id,
          name: 'Dompet Utama',
          type: 'CASH',
          balance: 0
        }
      });
      console.log('User dan Wallet default berhasil dibuat otomatis oleh backend!');
    }

    // 2. Suntikkan ID ke request
    (req as any).userId = user.id;
    (req.query as any).userId = user.id;

    if (!req.body) req.body = {};
    req.body.userId = user.id;

    // 3. Cari dan pasang walletId default
    const defaultWallet = await prisma.wallet.findFirst({ where: { userId: user.id } });
    if (defaultWallet && !req.body.walletId) {
      req.body.walletId = defaultWallet.id;
    }

    next();
  } catch (err) {
    console.error('apiKeyAuth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}