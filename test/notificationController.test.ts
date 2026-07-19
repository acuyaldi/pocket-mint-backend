import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const h = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock('../src/services/notification.service', () => ({
  notificationService: h,
}));

import { NotificationController } from '../src/controllers/notification.controller';

beforeEach(() => vi.clearAllMocks());

function app(authenticated = true) {
  const instance = express();
  instance.use(express.json());
  if (authenticated) {
    instance.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: 'user-1' };
      next();
    });
  }
  instance.get('/notifications', NotificationController.getAll);
  instance.patch('/notifications/read-all', NotificationController.markAllRead);
  instance.patch('/notifications/:id/read', NotificationController.markRead);
  return instance;
}

const notification = {
  id: 'evt-1',
  templateId: 'rec-1',
  template: { id: 'rec-1', name: 'Netflix' },
  occurrenceDate: new Date('2026-08-01'),
  offsetDays: 3,
  reminderDate: new Date('2026-07-29'),
  readAt: null,
  createdAt: new Date('2026-07-20'),
};

describe('notification controller', () => {
  it('lists notifications for the authenticated user, serializing the template relation', async () => {
    h.listNotifications.mockResolvedValue([notification]);

    const response = await request(app()).get('/notifications');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({ id: 'evt-1', templateId: 'rec-1', templateName: 'Netflix' });
    expect(h.listNotifications).toHaveBeenCalledWith('user-1');
  });

  it('marks a notification as read by id', async () => {
    h.markNotificationRead.mockResolvedValue({ ...notification, readAt: new Date('2026-07-20') });

    const response = await request(app()).patch('/notifications/evt-1/read');

    expect(response.status).toBe(200);
    expect(h.markNotificationRead).toHaveBeenCalledWith({ userId: 'user-1', id: 'evt-1' });
  });

  it('marks all notifications as read', async () => {
    h.markAllNotificationsRead.mockResolvedValue({ count: 2 });

    const response = await request(app()).patch('/notifications/read-all');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ count: 2 });
    expect(h.markAllNotificationsRead).toHaveBeenCalledWith('user-1');
  });

  it('rejects a missing authenticated identity on every route', async () => {
    const instance = app(false);
    expect((await request(instance).get('/notifications')).status).toBe(401);
    expect((await request(instance).patch('/notifications/evt-1/read')).status).toBe(401);
    expect((await request(instance).patch('/notifications/read-all')).status).toBe(401);
    expect(h.markNotificationRead).not.toHaveBeenCalled();
    expect(h.markAllNotificationsRead).not.toHaveBeenCalled();
  });

  it('mounts the protected notifications router', () => {
    const route = readFileSync(join(process.cwd(), 'src', 'routes', 'notification.routes.ts'), 'utf8');
    const index = readFileSync(join(process.cwd(), 'src', 'routes', 'index.ts'), 'utf8');
    expect(route).toContain("notificationRouter.get('/', requireUser, NotificationController.getAll)");
    expect(index).toContain("router.use('/v1/notifications', notificationRouter)");
  });
});
