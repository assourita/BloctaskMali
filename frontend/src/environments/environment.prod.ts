export const environment = {
  production: true,
  apiUrl: 'https://bloctaskmali.onrender.com/api',
  wsUrl: 'wss://bloctaskmali.onrender.com/ws',
  
  // Blockchain
  ethereum: {
    chainId: '0x1', // Mainnet
    chainName: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
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
  },

  /** Client OAuth Web Google — Console Google Cloud */
  googleClientId: '',
  enableGoogleSignIn: true,
  googleMapsApiKey: '',
};
