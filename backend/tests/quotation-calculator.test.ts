import { describe, expect, it } from 'vitest';
import { calculateQuotation } from '../src/modules/quotations/quotation-calculator.js';

describe('calculateQuotation', () => {
  it('uses decimal-safe line arithmetic and rounds tax per line', () => {
    const result = calculateQuotation(
      [
        { quantity: '3', unitPrice: '0.10' },
        { quantity: '1', unitPrice: '0.10' },
      ],
      '19',
    );

    expect(result.subtotal).toBe('0.40');
    expect(result.taxTotal).toBe('0.08');
    expect(result.total).toBe('0.48');
  });

  it('rejects discounts larger than a line subtotal', () => {
    expect(() =>
      calculateQuotation([{ quantity: '1', unitPrice: '10.00', discountAmount: '10.01' }], '19'),
    ).toThrow('La cantidad, el precio, el descuento o el impuesto no son válidos.');
  });
});
