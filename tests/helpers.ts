import request from 'supertest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/middleware/auth.js';

export const api = () => request(createApp());
export const adminToken = () => `Bearer ${signToken({ id: 1, email: 'a@b.co' })}`;
export const result = <T extends object>(rows: T[], rowCount = rows.length) => ({ rows, rowCount });
