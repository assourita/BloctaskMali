import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { xofToTestEth } from '../constants/africa.constants';
import { Web3Service } from './web3.service';

export interface BlockchainStatus {
  connected: boolean;
  chain_id: number;
  network_name?: string;
  latest_block?: number | null;
  escrow_address: string;
  reputation_address: string;
  litigation_address: string;
  blockchain_enabled: boolean;
  contracts_loaded?: { escrow: boolean; reputation: boolean; litigation: boolean };
  deployment_ready?: boolean;
  explorer_base_url?: string;
}

export interface RecordMissionPayload {
  mission_id: string;
  tx_hash: string;
  mission_contract_id?: number;
  block_number?: number;
  gas_used?: number;
}

@Injectable({ providedIn: 'root' })
export class BlockchainService {
  private apiUrl = environment.apiUrl;
  private status: BlockchainStatus | null = null;

  constructor(
    private http: HttpClient,
    private web3: Web3Service,
  ) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getStatus(): Observable<BlockchainStatus> {
    return this.http.get<BlockchainStatus>(`${this.apiUrl}/escrow/blockchain/status/`, {
      headers: this.headers(),
    }).pipe(
      tap((s) => {
        this.status = s;
        this.web3.configureContracts({
          escrow: s.escrow_address,
          reputation: s.reputation_address,
          litigation: s.litigation_address,
        });
      }),
      catchError(() => of({
        connected: false,
        chain_id: parseInt(environment.ethereum.chainId, 16),
        escrow_address: environment.contracts.escrow,
        reputation_address: environment.contracts.reputation,
        litigation_address: environment.contracts.litigation,
        blockchain_enabled: !!environment.contracts.escrow,
      })),
    );
  }

  isEnabled(): boolean {
    return !!(
      this.status?.blockchain_enabled
      || environment.contracts.escrow
    );
  }

  recordMission(payload: RecordMissionPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/escrow/blockchain/record-mission/`, payload, {
      headers: this.headers(),
    });
  }

  recordProviderDeposit(payload: { mission_id: string; tx_hash: string; block_number?: number; gas_used?: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/escrow/blockchain/record-provider-deposit/`, payload, {
      headers: this.headers(),
    });
  }

  recordProof(payload: {
    mission_id: string;
    tx_hash: string;
    proof_hash?: string;
    block_number?: number;
  }): Observable<{ blockchain_status: string; etherscan_url: string }> {
    return this.http.post<{ blockchain_status: string; etherscan_url: string }>(
      `${this.apiUrl}/escrow/blockchain/record-proof/`,
      payload,
      { headers: this.headers() },
    );
  }

  syncEvents(fromBlock = 0): Observable<{ synced: number; by_event: Record<string, number> }> {
    return this.http.post<{ synced: number; by_event: Record<string, number> }>(
      `${this.apiUrl}/escrow/blockchain/sync-events/`,
      { from_block: fromBlock },
      { headers: this.headers() },
    );
  }

  fundDepositBalance(
    amount: number,
    mobileMoney?: { phone_number: string; operator: string; otp?: string },
  ): Observable<{
    deposit_balance: number;
    deposit_locked?: number;
    message: string;
    transaction_id?: string;
  }> {
    return this.http.post<{
      deposit_balance: number;
      deposit_locked?: number;
      message: string;
      transaction_id?: string;
    }>(
      `${this.apiUrl}/escrow/deposits/fund/`,
      { amount, ...mobileMoney },
      { headers: this.headers() },
    );
  }

  /** Montant symbolique Sepolia pour ancrer une mission payée en FCFA */
  xofToTestEth(xof: number): string {
    return xofToTestEth(xof);
  }

  buildMissionHash(missionId: string, title: string): string {
    return `blocktask-ml-${missionId}-${title}`.slice(0, 64);
  }

  buildProofHash(missionId: string): string {
    return `blocktask-proof-${missionId}-${Date.now()}`.slice(0, 64);
  }

  explorerTxUrl(txHash: string): string {
    return `${environment.ethereum.explorerUrl}/tx/${txHash}`;
  }
}
