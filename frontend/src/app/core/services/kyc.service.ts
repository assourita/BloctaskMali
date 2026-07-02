import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PhoneVerificationResponse {
  ok?: boolean;
  message: string;
  simulation_otp?: string;
  expires_in_seconds?: number;
  error?: string;
}

export interface PhoneConfirmResponse {
  ok?: boolean;
  message: string;
  phone_verified?: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class KycService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  requestPhoneVerification(nina: string, phoneNumber: string): Observable<PhoneVerificationResponse> {
    return this.http.post<PhoneVerificationResponse>(`${this.apiUrl}/users/kyc/verify-phone/`, {
      nina,
      phone_number: phoneNumber,
    });
  }

  confirmPhoneOtp(otp: string): Observable<PhoneConfirmResponse> {
    return this.http.post<PhoneConfirmResponse>(`${this.apiUrl}/users/kyc/confirm-phone/`, { otp });
  }

  submitKyc(formData: FormData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/kyc/submit/`, formData);
  }
}
