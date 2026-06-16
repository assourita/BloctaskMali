import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ethers } from 'ethers';
import { environment } from '../../../environments/environment';

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  isConnected: boolean;
}

export interface TransactionResult {
  hash: string;
  wait: () => Promise<any>;
}

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  
  private walletSubject = new BehaviorSubject<WalletInfo | null>(null);
  public wallet$ = this.walletSubject.asObservable();
  
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();
  
  // ABI des smart contracts (à remplacer avec les vrais ABIs)
  private escrowAbi = [
    "function createMission(string memory missionHash, uint256 deadline) external payable returns (uint256)",
    "function acceptMission(uint256 missionId) external payable",
    "function submitProof(uint256 missionId, string memory proofHash) external",
    "function validateMission(uint256 missionId) external",
    "function cancelMission(uint256 missionId) external",
    "function getMissionInfo(uint256 missionId) external view returns (tuple(uint256 id, string memory missionHash, address client, address provider, uint256 amount, uint256 deposit, uint256 deadline, uint8 status, string memory proofHash, uint256 createdAt, uint256 updatedAt))",
    "event MissionCreated(uint256 indexed missionId, string missionHash, address indexed client, uint256 amount, uint256 deadline)",
    "event MissionValidated(uint256 indexed missionId)"
  ];
  
  constructor() {
    this.checkExistingConnection();
  }
  
  private async checkExistingConnection(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          await this.connectWallet();
        }
      } catch (error) {
        console.log('No existing connection');
      }
    }
  }
  
  async connectWallet(): Promise<WalletInfo> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask or Web3 wallet not detected');
    }
    
    try {
      this.provider = new ethers.BrowserProvider((window as any).ethereum);
      
      // Request account access
      await this.provider.send('eth_requestAccounts', []);
      
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();
      
      // Check if correct network
      const expectedChainId = parseInt(environment.ethereum.chainId, 16);
      if (network.chainId !== BigInt(expectedChainId)) {
        await this.switchNetwork();
      }
      
      const walletInfo: WalletInfo = {
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        isConnected: true
      };
      
      this.walletSubject.next(walletInfo);
      this.isConnectedSubject.next(true);
      
      // Listen for account changes
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnectWallet();
        } else {
          this.connectWallet();
        }
      });
      
      (window as any).ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      
      return walletInfo;
      
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    }
  }
  
  disconnectWallet(): void {
    this.provider = null;
    this.signer = null;
    this.walletSubject.next(null);
    this.isConnectedSubject.next(false);
  }
  
  async switchNetwork(): Promise<void> {
    if (!this.provider) return;
    
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: environment.ethereum.chainId }]
      });
    } catch (switchError: any) {
      // Network not added, add it
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: environment.ethereum.chainId,
            chainName: environment.ethereum.chainName,
            rpcUrls: [environment.ethereum.rpcUrl],
            nativeCurrency: environment.ethereum.nativeCurrency,
            blockExplorerUrls: [environment.ethereum.explorerUrl]
          }]
        });
      }
    }
  }
  
  getEscrowContract(): ethers.Contract | null {
    if (!this.signer || !environment.contracts.escrow) return null;
    
    return new ethers.Contract(
      environment.contracts.escrow,
      this.escrowAbi,
      this.signer
    );
  }
  
  async createMissionOnChain(missionHash: string, deadline: number, amount: string): Promise<TransactionResult> {
    const contract = this.getEscrowContract();
    if (!contract) throw new Error('Escrow contract not available');
    
    const value = ethers.parseEther(amount);
    const tx = await contract['createMission'](missionHash, deadline, { value });
    
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }
  
  async acceptMissionOnChain(missionId: number, deposit: string): Promise<TransactionResult> {
    const contract = this.getEscrowContract();
    if (!contract) throw new Error('Escrow contract not available');
    
    const value = ethers.parseEther(deposit);
    const tx = await contract['acceptMission'](missionId, { value });
    
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }
  
  async submitProofOnChain(missionId: number, proofHash: string): Promise<TransactionResult> {
    const contract = this.getEscrowContract();
    if (!contract) throw new Error('Escrow contract not available');
    
    const tx = await contract['submitProof'](missionId, proofHash);
    
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }
  
  async validateMissionOnChain(missionId: number): Promise<TransactionResult> {
    const contract = this.getEscrowContract();
    if (!contract) throw new Error('Escrow contract not available');
    
    const tx = await contract['validateMission'](missionId);
    
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }
  
  async signMessage(message: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');
    return await this.signer.signMessage(message);
  }
  
  getAddress(): string | null {
    return this.walletSubject.value?.address || null;
  }
  
  isCorrectNetwork(): boolean {
    const wallet = this.walletSubject.value;
    if (!wallet) return false;
    return wallet.chainId === parseInt(environment.ethereum.chainId, 16);
  }
}
