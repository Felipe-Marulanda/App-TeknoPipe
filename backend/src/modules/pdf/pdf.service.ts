import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import pdfmake from 'pdfmake';
import type { Content, TableCell } from 'pdfmake';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.js';
import { AppError } from '../../errors/app-error.js';
import { quotationsService } from '../quotations/quotations.service.js';
import { settingsService } from '../settings/settings.service.js';

const require = createRequire(import.meta.url);
const robotoDirectory = join(dirname(require.resolve('pdfmake/fonts/Roboto')), 'Roboto');
type TDocumentDefinitions = Parameters<typeof pdfmake.createPdf>[0];
const fonts = {
  Roboto: {
    normal: join(robotoDirectory, 'Roboto-Regular.ttf'),
    bold: join(robotoDirectory, 'Roboto-Medium.ttf'),
    italics: join(robotoDirectory, 'Roboto-Italic.ttf'),
    bolditalics: join(robotoDirectory, 'Roboto-MediumItalic.ttf'),
  },
} satisfies Parameters<typeof pdfmake.addFonts>[0];

pdfmake.addFonts(fonts);
pdfmake.setUrlAccessPolicy(() => false);
const allowedFontFiles = new Set(Object.values(fonts.Roboto));
pdfmake.setLocalAccessPolicy((path) => allowedFontFiles.has(path));

function formatAmount(value: string, currency: string): string {
  const [whole = '0', fraction = '00'] = new Prisma.Decimal(value).toFixed(2).split('.');
  const safeFraction = fraction.padEnd(2, '0').slice(0, 2);
  const integer = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(
    BigInt(whole),
  );
  const currencySymbol = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value;
  const decimalSeparator =
    new Intl.NumberFormat('es-CO').formatToParts(1.1).find((part) => part.type === 'decimal')
      ?.value ?? ',';
  if (!currencySymbol) {
    throw new AppError(422, 'INVALID_CURRENCY', 'La moneda configurada no es válida para el PDF.');
  }
  return `${currency} ${currencySymbol}\u00a0${integer}${decimalSeparator}${safeFraction}`;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('es-CO', { timeZone: 'UTC' });
}

export const pdfService = {
  async generateQuotation(id: string, user: AuthenticatedUser) {
    const [quotation, settings] = await Promise.all([
      quotationsService.get(id, user),
      settingsService.get(),
    ]);

    const currency = quotation.currency.trim();
    const itemRows: TableCell[][] = quotation.items.map((item): TableCell[] => [
      String(item.lineNumber),
      {
        stack: [
          { text: `${item.productReference} — ${item.productName}`, bold: true },
          ...(item.description ? [{ text: item.description, fontSize: 8, color: '#475569' }] : []),
        ],
      },
      { text: `${item.quantity.toString()} ${item.unit}`, alignment: 'right' },
      { text: formatAmount(item.unitPrice.toString(), currency), alignment: 'right' },
      { text: formatAmount(item.subtotal.toString(), currency), alignment: 'right' },
    ]);
    const itemHeader: TableCell[] = [
      { text: '#', style: 'tableHeader' },
      { text: 'Producto / descripción', style: 'tableHeader' },
      { text: 'Cantidad', style: 'tableHeader', alignment: 'right' },
      { text: 'Precio unitario', style: 'tableHeader', alignment: 'right' },
      { text: 'Subtotal', style: 'tableHeader', alignment: 'right' },
    ];
    const totals: TableCell[][] = [
      ['Subtotal', formatAmount(quotation.subtotal.toString(), currency)],
      [
        `IVA (${quotation.taxRate.toString()} %)`,
        formatAmount(quotation.taxTotal.toString(), currency),
      ],
      [
        { text: 'TOTAL', bold: true },
        { text: formatAmount(quotation.total.toString(), currency), bold: true },
      ],
    ];
    if (quotation.discountTotal.isPositive()) {
      totals.splice(1, 0, [
        'Descuentos',
        formatAmount(quotation.discountTotal.toString(), currency),
      ]);
    }

    const content: Content[] = [];
    const companyDetails: Content[] = [
      {
        text: settings.commercialName ?? 'Datos de empresa pendientes de configuración',
        style: 'companyName',
      },
      {
        text: [
          settings.taxIdentification ? `NIT: ${settings.taxIdentification}` : '',
          settings.email ?? '',
          settings.phone ?? '',
          settings.address ?? '',
          [settings.city, settings.department].filter(Boolean).join(', '),
        ]
          .filter(Boolean)
          .join('  |  '),
        style: 'companyDetails',
      },
    ];
    if (settings.logoData) {
      content.push({
        columns: [{ image: 'companyLogo', width: 90 }, { stack: companyDetails }],
        columnGap: 16,
        margin: [0, 0, 0, 8],
      });
    } else {
      content.push(...companyDetails);
    }
    content.push({ text: 'COTIZACIÓN', style: 'title', margin: [0, 14, 0, 4] });
    content.push({
      columns: [
        { text: `Número: ${quotation.number}`, bold: true },
        { text: `Elaboración: ${formatDate(quotation.issueDate)}`, alignment: 'right' },
      ],
    });
    content.push({
      text: `Vencimiento: ${formatDate(quotation.expirationDate)}`,
      margin: [0, 3, 0, 14],
    });
    content.push({ text: 'CLIENTE', style: 'sectionTitle' });
    content.push({
      text: [
        quotation.clientNameSnapshot,
        `${quotation.clientIdentificationType}: ${quotation.clientIdentificationSnapshot}`,
        quotation.clientContactSnapshot ?? '',
        quotation.clientPhoneSnapshot ?? '',
        quotation.clientEmailSnapshot ?? '',
        quotation.clientAddressSnapshot ?? '',
        [quotation.clientCitySnapshot, quotation.clientDepartmentSnapshot]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join('\n'),
      margin: [0, 0, 0, 12],
    });
    content.push({
      table: { headerRows: 1, widths: [22, '*', 48, 65, 75], body: [itemHeader, ...itemRows] },
      layout: 'lightHorizontalLines',
    });
    content.push({
      columns: [
        {
          text: quotation.observations ? `Observaciones: ${quotation.observations}` : '',
          width: '*',
        },
        {
          width: 190,
          table: { widths: ['*', 'auto'], body: totals },
          layout: 'noBorders',
        },
      ],
      margin: [0, 14, 0, 0],
    });
    if (quotation.commercialTerms) {
      content.push({
        text: 'CONDICIONES COMERCIALES',
        style: 'sectionTitle',
        margin: [0, 16, 0, 4],
      });
      content.push({ text: quotation.commercialTerms });
    }
    content.push({
      text: 'Aceptación del cliente',
      style: 'sectionTitle',
      margin: [0, 24, 0, 28],
    });
    content.push({
      text: 'Nombre: ____________________________________     Firma: ____________________________________',
    });

    const document: TDocumentDefinitions = {
      info: {
        title: `Cotización ${quotation.number}`,
        subject: 'Cotización TEKNOPIPE',
        creator: 'TEKNOPIPE',
      },
      pageSize: 'A4',
      pageMargins: [40, 42, 40, 48],
      content,
      ...(settings.logoData ? { images: { companyLogo: settings.logoData } } : {}),
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#172D4D' },
      styles: {
        companyName: { fontSize: 16, bold: true, color: '#172D4D' },
        companyDetails: { fontSize: 8, color: '#475569', margin: [0, 4, 0, 0] },
        title: { fontSize: 20, bold: true, color: '#2563EB' },
        sectionTitle: { fontSize: 10, bold: true, color: '#172D4D', margin: [0, 8, 0, 4] },
        tableHeader: { bold: true, color: '#FFFFFF', fillColor: '#172D4D', margin: [0, 4, 0, 4] },
      },
      footer: (currentPage, pageCount) => ({
        text: `TEKNOPIPE  •  ${quotation.number}  •  Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#64748B',
        margin: [40, 18, 40, 0],
      }),
    };

    return pdfmake.createPdf(document).getBuffer();
  },
};
