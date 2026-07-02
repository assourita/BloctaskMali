import { apiRequest } from './client';
import type { Payment, PaymentMethod } from '../types';

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export async function getPayments(): Promise<Payment[]> {
  const data = await apiRequest<Payment[] | { results: Payment[] }>('/payments/payments/');
  return unwrap(data);
}

export async function getPayment(id: string): Promise<Payment> {
  return apiRequest<Payment>(`/payments/payments/${id}/`);
}

export async function confirmPayment(id: string, otp?: string): Promise<{
  detail: string;
  transaction_id?: string;
  mission_status?: string;
  sandbox?: boolean;
}> {
  return apiRequest(`/payments/payments/${id}/confirm_payment/`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export async function requestRefund(
  paymentId: string,
  reason: string,
  details = '',
): Promise<{ detail: string; refund_id: string }> {
  return apiRequest(`/payments/payments/${paymentId}/request_refund/`, {
    method: 'POST',
    body: JSON.stringify({ reason, reason_details: details }),
  });
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await apiRequest<PaymentMethod[] | { results: PaymentMethod[] }>(
    '/payments/payment-methods/',
  );
  return unwrap(data);
}

export interface CreatePaymentMethodPayload {
  type: 'mobile_money';
  phone_number: string;
  operator: string;
  is_default?: boolean;
}

export async function createPaymentMethod(
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethod> {
  return apiRequest<PaymentMethod>('/payments/payment-methods/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await apiRequest(`/payments/payment-methods/${id}/set_default/`, {
    method: 'POST',
    body: '{}',
  });
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await apiRequest(`/payments/payment-methods/${id}/`, { method: 'DELETE' });
}
