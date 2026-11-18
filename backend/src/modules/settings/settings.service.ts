import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../errors/app-error.js';
import type { SettingsUpdateInput } from './settings.validation.js';
import { settingsRepository } from './settings.repository.js';

function validateLogoData(value: string | null | undefined): void {
  if (!value) return;
  const encoded = value.slice('data:image/png;base64,'.length);
  const image = Buffer.from(encoded, 'base64');
  const isPng =
    image.length >= 24 &&
    image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    image.toString('ascii', 12, 16) === 'IHDR';
  if (!isPng) {
    throw new AppError(422, 'INVALID_LOGO', 'El logotipo no contiene una imagen PNG válida.');
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 2500 || height > 1500 || width * height > 2_500_000) {
    throw new AppError(
      422,
      'INVALID_LOGO_DIMENSIONS',
      'El logotipo supera las dimensiones permitidas.',
    );
  }
}

export const settingsService = {
  async get() {
    const settings = await settingsRepository.get();
    if (!settings) {
      throw new AppError(
        503,
        'SETTINGS_UNAVAILABLE',
        'La configuración de empresa no está inicializada.',
      );
    }
    return settings;
  },

  async update(input: SettingsUpdateInput) {
    validateLogoData(input.logoData);
    const current = await settingsRepository.get();
    if (!current) {
      throw new AppError(
        503,
        'SETTINGS_UNAVAILABLE',
        'La configuración de empresa no está inicializada.',
      );
    }
    const data: Prisma.CompanySettingsUpdateInput = {};
    for (const key of [
      'commercialName',
      'taxIdentification',
      'logoData',
      'email',
      'phone',
      'address',
      'city',
      'department',
      'currency',
      'defaultValidityDays',
      'defaultTerms',
      'discountsEnabled',
      'quotationPrefix',
    ] as const) {
      const value = input[key];
      if (value !== undefined) Object.assign(data, { [key]: value });
    }
    if (input.taxRate !== undefined) data.taxRate = new Prisma.Decimal(input.taxRate);
    return settingsRepository.update(data);
  },
};
