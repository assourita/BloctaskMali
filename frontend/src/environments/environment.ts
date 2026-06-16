export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  wsUrl: 'ws://localhost:8000/ws',
  
  // Blockchain
  ethereum: {
    chainId: '0xaa36a7', // Sepolia
    chainName: 'Sepolia Test Network',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  
  // Smart Contract Addresses
  contracts: {
    escrow: '',
    reputation: '',
    litigation: ''
  },
  
  // Firebase
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
