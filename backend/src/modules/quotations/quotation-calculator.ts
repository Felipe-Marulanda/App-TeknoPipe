import { Prisma } from '../../generated/prisma/client.js';

export interface QuotationLineInput {
  quantity: string;
  unitPrice: string;
  discountAmount?: string;
}

export interface CalculatedLine {
  subtotal: string;
  discountAmount: string;
  taxableBase: string;
  taxRate: string;
  taxAmount: string;
  total: string;
}

export interface QuotationCalculation {
  lines: CalculatedLine[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
}

const Decimal = Prisma.Decimal;
const rounding = Decimal.ROUND_HALF_UP;

function money(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, rounding);
}

export function calculateQuotation(
  input: QuotationLineInput[],
  taxRate: string,
): QuotationCalculation {
  if (input.length === 0) {
    throw new Error('Una cotización debe incluir al menos un producto.');
  }

  const rate = new Decimal(taxRate);
  const lines = input.map((item) => {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const subtotal = money(quantity.mul(unitPrice));
    const discountAmount = money(new Decimal(item.discountAmount ?? '0'));

    if (
      !quantity.greaterThan(0) ||
      unitPrice.isNegative() ||
      discountAmount.isNegative() ||
      discountAmount.greaterThan(subtotal) ||
      rate.isNegative() ||
      rate.greaterThan(100)
    ) {
      throw new Error('La cantidad, el precio, el descuento o el impuesto no son válidos.');
    }

    const taxableBase = money(subtotal.sub(discountAmount));
    const taxAmount = money(taxableBase.mul(rate).div(100));
    return {
      subtotal,
      discountAmount,
      taxableBase,
      taxRate: rate,
      taxAmount,
      total: money(taxableBase.add(taxAmount)),
    };
  });

  const subtotal = money(lines.reduce((sum, line) => sum.add(line.subtotal), new Decimal(0)));
  const discountTotal = money(
    lines.reduce((sum, line) => sum.add(line.discountAmount), new Decimal(0)),
  );
  const taxTotal = money(lines.reduce((sum, line) => sum.add(line.taxAmount), new Decimal(0)));
  const total = money(lines.reduce((sum, line) => sum.add(line.total), new Decimal(0)));

  return {
    lines: lines.map((line) => ({
      subtotal: line.subtotal.toFixed(2),
      discountAmount: line.discountAmount.toFixed(2),
      taxableBase: line.taxableBase.toFixed(2),
      taxRate: line.taxRate.toFixed(2),
      taxAmount: line.taxAmount.toFixed(2),
      total: line.total.toFixed(2),
    })),
    subtotal: subtotal.toFixed(2),
    discountTotal: discountTotal.toFixed(2),
    taxTotal: taxTotal.toFixed(2),
    total: total.toFixed(2),
  };
}
