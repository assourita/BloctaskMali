import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DEFAULT_COUNTRY,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_CURRENCY,
  DEFAULT_PHONE_PREFIX,
  MALI_CITIES,
  MALI_COUNTRY,
  MOBILE_MONEY_OPERATORS,
  getOperatorsForCountry,
} from '../constants/africa.constants';

export interface MarketConfig {
  market_scope: string;
  default_country: string;
  default_country_code: string;
  default_phone_prefix: string;
  default_currency: string;
  id_label: string;
  countries: typeof MALI_COUNTRY[];
  mobile_money_operators: typeof MOBILE_MONEY_OPERATORS;
  blockchain_mode?: string;
  blockchain_note?: string;
}

@Injectable({ providedIn: 'root' })
export class MarketService {
  private apiUrl = environment.apiUrl;
  private config: MarketConfig | null = null;

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<MarketConfig> {
    if (this.config) {
      return of(this.config);
    }
    return this.http.get<MarketConfig>(`${this.apiUrl}/config/market-config/`).pipe(
      tap((cfg) => { this.config = cfg; }),
      catchError(() => of(this.getLocalFallback())),
    );
  }

  getLocalFallback(): MarketConfig {
    return {
      market_scope: 'mali',
      default_country: DEFAULT_COUNTRY,
      default_country_code: DEFAULT_COUNTRY_CODE,
      default_phone_prefix: DEFAULT_PHONE_PREFIX,
      default_currency: DEFAULT_CURRENCY,
      id_label: 'NINA',
      countries: [MALI_COUNTRY],
      mobile_money_operators: MOBILE_MONEY_OPERATORS,
      blockchain_mode: 'hybrid',
      blockchain_note: 'Paiement FCFA + ancrage blockchain optionnel (Sepolia).',
    };
  }

  getMaliCities(): string[] {
    return MALI_CITIES;
  }

  getMobileMoneyOperators() {
    return getOperatorsForCountry();
  }
}
