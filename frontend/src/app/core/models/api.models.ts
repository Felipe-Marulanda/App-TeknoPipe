export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export type UserRole = 'ADMINISTRADOR' | 'EMPLEADO';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface Client {
  id: string;
  identificationType: string;
  identificationNumber: string;
  legalName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: Pick<Category, 'id' | 'name' | 'active'> | null;
  unit: string;
  unitPrice: string;
  active: boolean;
}

export type QuotationStatus =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'VENCIDA';

export interface QuotationSummary {
  id: string;
  number: string;
  status: QuotationStatus;
  clientNameSnapshot: string;
  issueDate: string;
  expirationDate: string;
  total: string;
  currency: string;
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  productId: string;
  productReference: string;
  productName: string;
  description: string | null;
  unit: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
}

export interface Quotation extends QuotationSummary {
  clientId: string;
  clientIdentificationType: string;
  clientIdentificationSnapshot: string;
  clientContactSnapshot: string | null;
  clientEmailSnapshot: string | null;
  clientPhoneSnapshot: string | null;
  clientAddressSnapshot: string | null;
  clientCitySnapshot: string | null;
  clientDepartmentSnapshot: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  taxRate: string;
  observations: string | null;
  commercialTerms: string | null;
  revisionOfId: string | null;
  revisionNumber: number | null;
  items: QuotationItem[];
  statusHistory: QuotationHistoryEntry[];
}

export interface QuotationHistoryEntry {
  id: string;
  previousStatus: QuotationStatus | null;
  newStatus: QuotationStatus;
  observation: string | null;
  changedAt: string;
  changedBy: { id: string; fullName: string };
}

export interface CompanySettings {
  commercialName: string | null;
  taxIdentification: string | null;
  logoData: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  currency: string;
  taxRate: string;
  defaultValidityDays: number | null;
  defaultTerms: string | null;
  discountsEnabled: boolean;
  quotationPrefix: string;
}

export interface DashboardSummary {
  totals: {
    quotations: number;
    valueQuoted: string;
    byStatus: Record<QuotationStatus, number>;
  };
  recentQuotations: QuotationSummary[];
  recentActivity: QuotationHistoryEntry[];
  quotationsByMonth: {
    month: string;
    quotationCount: number;
    total: string;
  }[];
}

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: { name: UserRole };
  active: boolean;
  createdAt: string;
}
