import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { PrismaClient, QuotationStatus } from '../src/generated/prisma/client.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateQuotation } from '../src/modules/quotations/quotation-calculator.js';

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
if (!databaseUrl || !adminEmail) {
  throw new Error('DATABASE_URL y SEED_ADMIN_EMAIL son obligatorios para los datos de demo.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const categories = [
  ['Tubería PVC presión', 'Tubería para redes de agua a presión.'],
  ['Tubería PVC sanitaria', 'Tubería y conducción para redes sanitarias.'],
  ['Tubería PEAD', 'Soluciones de polietileno de alta densidad.'],
  ['Accesorios de unión', 'Uniones, adaptadores y acoples.'],
  ['Válvulas y control', 'Válvulas para regulación y control de flujo.'],
] as const;

const products = [
  ['TP-PVC-050', 'Tubo PVC presión 1/2 pulgada', 'Tubería RDE 21, tramo de 6 m.', 'tramo', '24500', 0],
  ['TP-PVC-100', 'Tubo PVC presión 1 pulgada', 'Tubería RDE 21, tramo de 6 m.', 'tramo', '48900', 0],
  ['TP-PVC-200', 'Tubo PVC presión 2 pulgadas', 'Tubería RDE 21, tramo de 6 m.', 'tramo', '112500', 0],
  ['TS-PVC-200', 'Tubo PVC sanitario 2 pulgadas', 'Tubería sanitaria, tramo de 6 m.', 'tramo', '53700', 1],
  ['TS-PVC-300', 'Tubo PVC sanitario 3 pulgadas', 'Tubería sanitaria, tramo de 6 m.', 'tramo', '96800', 1],
  ['TS-PVC-400', 'Tubo PVC sanitario 4 pulgadas', 'Tubería sanitaria, tramo de 6 m.', 'tramo', '148900', 1],
  ['TP-PEAD-032', 'Tubo PEAD 32 mm', 'Rollo de polietileno de alta densidad.', 'metro', '8200', 2],
  ['TP-PEAD-063', 'Tubo PEAD 63 mm', 'Tubería PEAD para conducción.', 'metro', '18700', 2],
  ['TP-PEAD-090', 'Tubo PEAD 90 mm', 'Tubería PEAD para conducción.', 'metro', '36200', 2],
  ['AC-UN-050', 'Unión PVC presión 1/2 pulgada', 'Unión para tubería de presión.', 'unidad', '2100', 3],
  ['AC-AD-100', 'Adaptador macho 1 pulgada', 'Adaptador roscado para PVC presión.', 'unidad', '4800', 3],
  ['AC-COD-200', 'Codo PVC presión 2 pulgadas', 'Codo de 90 grados para presión.', 'unidad', '9300', 3],
  ['VC-ESF-050', 'Válvula de esfera 1/2 pulgada', 'Válvula de control de PVC.', 'unidad', '18200', 4],
  ['VC-CHE-100', 'Válvula cheque 1 pulgada', 'Válvula de retención para agua.', 'unidad', '46800', 4],
  ['VC-COM-200', 'Válvula compuerta 2 pulgadas', 'Válvula de compuerta para redes.', 'unidad', '139500', 4],
] as const;

const clients = [
  ['NIT', '901740201-1', 'Constructora Horizonte S.A.S.', 'Área de compras', 'compras@horizonte.example.test', '6015550101', 'Calle 72 # 10-34', 'Bogotá', 'Cundinamarca'],
  ['NIT', '901740202-9', 'Infraestructura del Valle S.A.S.', 'Coordinación de obra', 'obras@infra-valle.example.test', '6025550102', 'Carrera 5 # 18-40', 'Cali', 'Valle del Cauca'],
  ['NIT', '901740203-7', 'Proyectos Hidráulicos del Norte S.A.S.', 'Departamento técnico', 'proyectos@hidronorte.example.test', '6055550103', 'Calle 45 # 52-16', 'Barranquilla', 'Atlántico'],
  ['NIT', '901740204-5', 'Desarrollos Urbanos del Café S.A.S.', 'Administración de proyectos', 'suministros@urbanoscafe.example.test', '6065550104', 'Carrera 23 # 31-20', 'Manizales', 'Caldas'],
  ['NIT', '901740205-2', 'Acueductos Regionales S.A.S.', 'Compras y abastecimiento', 'compras@acueductos.example.test', '6085550105', 'Avenida 26 # 14-52', 'Bucaramanga', 'Santander'],
  ['NIT', '901740206-0', 'Obras Civiles del Pacífico S.A.S.', 'Oficina de proyectos', 'licitaciones@obraspacifico.example.test', '6025550106', 'Calle 9 # 28-60', 'Popayán', 'Cauca'],
] as const;

const statusPlans = [
  { status: QuotationStatus.BORRADOR, month: 0, client: 0, product: 0 },
  { status: QuotationStatus.PENDIENTE, month: 0, client: 1, product: 1 },
  { status: QuotationStatus.ENVIADA, month: 1, client: 2, product: 2 },
  { status: QuotationStatus.APROBADA, month: 2, client: 3, product: 3 },
  { status: QuotationStatus.RECHAZADA, month: 3, client: 4, product: 4 },
  { status: QuotationStatus.VENCIDA, month: 4, client: 5, product: 5 },
  { status: QuotationStatus.BORRADOR, month: 5, client: 1, product: 6 },
  { status: QuotationStatus.PENDIENTE, month: 6, client: 2, product: 7 },
  { status: QuotationStatus.ENVIADA, month: 7, client: 3, product: 8 },
  { status: QuotationStatus.APROBADA, month: 8, client: 4, product: 9 },
  { status: QuotationStatus.RECHAZADA, month: 10, client: 5, product: 12 },
  { status: QuotationStatus.VENCIDA, month: 11, client: 0, product: 14 },
] as const;

function monthStart(monthsAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 8));
}

async function seedDemo(): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { email: adminEmail }, include: { role: true } });
  if (!admin || admin.role.name !== 'ADMINISTRADOR') {
    throw new Error('Ejecuta primero el seed inicial para crear el administrador.');
  }
  const settings = await prisma.companySettings.upsert({
    where: { id: 1 },
    update: { discountsEnabled: true },
    create: { id: 1, commercialName: 'TEKNOPIPE', currency: 'COP', taxRate: '19.00', quotationPrefix: 'COT', discountsEnabled: true },
  });

  const categoryRows = await Promise.all(categories.map(([name, description]) => prisma.category.upsert({
    where: { name }, update: { description, active: true }, create: { name, description },
  })));
  const productRows = await Promise.all(products.map(async ([reference, name, description, unit, unitPrice, categoryIndex]) => {
    const category = categoryRows[categoryIndex];
    if (!category) throw new Error(`Categoría no encontrada para ${reference}.`);
    return prisma.product.upsert({
      where: { reference },
      update: { categoryId: category.id, name, description, unit, unitPrice, active: true },
      create: { reference, categoryId: category.id, name, description, unit, unitPrice },
    });
  }));
  const clientRows = await Promise.all(clients.map(([identificationType, identificationNumber, legalName, contactName, email, phone, address, city, department]) => prisma.client.upsert({
    where: { identificationType_identificationNumber: { identificationType, identificationNumber } },
    update: { legalName, contactName, email, phone, address, city, department, active: true },
    create: { identificationType, identificationNumber, legalName, contactName, email, phone, address, city, department },
  })));

  for (const [index, plan] of statusPlans.entries()) {
    const product = productRows[plan.product];
    const client = clientRows[plan.client];
    if (!product || !client) throw new Error('Falta un producto o cliente para la cotización demo.');
    const quantity = String(2 + (index % 7));
    const discountAmount = index % 3 === 0
      ? String(Math.min(10000, Math.round(Number(product.unitPrice) * Number(quantity) * 0.1)))
      : '0';
    const calculation = calculateQuotation([{ quantity, unitPrice: product.unitPrice.toString(), discountAmount }], settings.taxRate.toString());
    const line = calculation.lines[0];
    if (!line) throw new Error('No fue posible calcular la línea de cotización demo.');
    const issued = monthStart(plan.month);
    const expiration = new Date(issued);
    expiration.setUTCDate(expiration.getUTCDate() + 30);
    const chain: QuotationStatus[] = [QuotationStatus.BORRADOR];
    if (plan.status !== QuotationStatus.BORRADOR) chain.push(QuotationStatus.PENDIENTE);
    if ([QuotationStatus.ENVIADA, QuotationStatus.APROBADA, QuotationStatus.RECHAZADA].includes(plan.status)) chain.push(QuotationStatus.ENVIADA);
    if ([QuotationStatus.APROBADA, QuotationStatus.RECHAZADA, QuotationStatus.VENCIDA].includes(plan.status)) chain.push(plan.status);
    const history = chain.map((newStatus, historyIndex) => ({
      changedById: admin.id,
      previousStatus: historyIndex === 0 ? null : chain[historyIndex - 1] ?? null,
      newStatus,
      changedAt: new Date(issued.getTime() + historyIndex * 60 * 60 * 1000),
      observation: historyIndex === 0 ? 'Creación de cotización.' : `Cambio de estado a ${newStatus}.`,
    }));
    const number = `DEMO-${String(index + 1).padStart(6, '0')}`;
    await prisma.quotation.upsert({
      where: { number },
      update: {},
      create: {
        number, clientId: client.id, createdById: admin.id, status: plan.status,
        issueDate: issued, expirationDate: expiration,
        clientIdentificationType: client.identificationType,
        clientIdentificationSnapshot: client.identificationNumber,
        clientNameSnapshot: client.legalName,
        clientContactSnapshot: client.contactName,
        clientEmailSnapshot: client.email,
        clientPhoneSnapshot: client.phone,
        clientAddressSnapshot: client.address,
        clientCitySnapshot: client.city,
        clientDepartmentSnapshot: client.department,
        currency: settings.currency, taxRate: settings.taxRate,
        subtotal: calculation.subtotal, discountTotal: calculation.discountTotal,
        taxTotal: calculation.taxTotal, total: calculation.total,
        observations: 'Cotización de demostración para recorridos locales.',
        commercialTerms: 'Precios expresados en pesos colombianos. Vigencia de 30 días.',
        items: { create: [{
          productId: product.id, lineNumber: 1, productReference: product.reference,
          productName: product.name, description: product.description, unit: product.unit,
          quantity, unitPrice: product.unitPrice, subtotal: line.subtotal,
          discountAmount: line.discountAmount, taxableBase: line.taxableBase,
          taxRate: line.taxRate, taxAmount: line.taxAmount, total: line.total,
        }] },
        statusHistory: { create: history },
      },
    });
  }
  console.info('Datos de demo verificados: 5 categorías, 15 productos, 6 clientes y 12 cotizaciones.');
}

try {
  await seedDemo();
} catch (error) {
  console.error('No fue posible cargar los datos de demo.', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
