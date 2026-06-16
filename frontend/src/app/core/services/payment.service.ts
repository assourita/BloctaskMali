import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentMethod {
  id?: string;
  type: 'mobile_money' | 'card' | 'bank_account';
  is_default: boolean;
  is_verified: boolean;
  phone_number?: string;
  operator?: 'orange' | 'wave' | 'mtn' | 'moov';
  card_last_four?: string;
  card_brand?: string;
  account_number?: string;
  bank_name?: string;
  display_name?: string;
}

export interface Payment {
  id: string;
  mission: string;
  amount: number;
  platform_fee: number;
  escrow_amount: number;
  provider_amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  operator?: string;
  phone_number?: string;
  escrow_tx_hash?: string;
  is_escrow_funded: boolean;
  created_at: string;
}

export interface PaymentCreateData {
  payment_method: string;
  phone_number?: string;
  operator?: string;
}

export interface MobileMoneyOperator {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('access_token')}`
    });
  }

  // Payment Methods
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(
      `${this.apiUrl}/payments/payment-methods/`,
      { headers: this.getHeaders() }
    );
  }

  createPaymentMethod(data: Partial<PaymentMethod>): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(
      `${this.apiUrl}/payments/payment-methods/`,
      data,
      { headers: this.getHeaders() }
    );
  }

  setDefaultPaymentMethod(id: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/payments/payment-methods/${id}/set_default/`,
      {},
      { headers: this.getHeaders() }
    );
  }

  deletePaymentMethod(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/payments/payment-methods/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Payments
  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(
      `${this.apiUrl}/payments/payments/`,
      { headers: this.getHeaders() }
    );
  }

  getPayment(id: string): Observable<Payment> {
    return this.http.get<Payment>(
      `${this.apiUrl}/payments/payments/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  confirmPayment(id: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/payments/payments/${id}/confirm_payment/`,
      {},
      { headers: this.getHeaders() }
    );
  }

  requestRefund(paymentId: string, reason: string, details?: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/payments/payments/${paymentId}/request_refund/`,
      { reason, reason_details: details },
      { headers: this.getHeaders() }
    );
  }

  // Mobile Money Operators
  getMobileMoneyOperators(): MobileMoneyOperator[] {
    return [
      { id: 'orange', name: 'Orange Money', icon: 'phone_android', color: '#FF6600' },
      { id: 'wave', name: 'Wave', icon: 'waves', color: '#00BFFF' },
      { id: 'mtn', name: 'MTN Mobile Money', icon: 'phone_android', color: '#FFD700' },
      { id: 'moov', name: 'Moov Money', icon: 'phone_android', color: '#4169E1' }
    ];
  }

  // Calculations
  calculateFees(amount: number): { platformFee: number; escrowAmount: number; providerAmount: number } {
    const platformFee = amount * 0.05; // 5%
    const escrowAmount = amount; // 100% blocked
    const providerAmount = amount * 0.95; // 95% to provider

    return {
      platformFee: Math.round(platformFee),
      escrowAmount: Math.round(escrowAmount),
      providerAmount: Math.round(providerAmount)
    };
  }
}
