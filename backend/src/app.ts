import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { clientsRoutes } from './modules/clients/clients.routes.js';
import { quotationsRoutes } from './modules/quotations/quotations.routes.js';
import { categoriesRoutes } from './modules/categories/categories.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { pdfRoutes } from './modules/pdf/pdf.routes.js';
import { historyRoutes } from './modules/history/history.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', clientsRoutes);
app.use('/api/v1/quotations', quotationsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1', pdfRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportsRoutes);

app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
    },
  });
});

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Ruta no encontrada',
    },
  });
});

app.use(errorHandler);

export default app;
