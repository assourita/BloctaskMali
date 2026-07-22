export const environment = {
  production: true,
  apiUrl: 'https://bloctaskmali.onrender.com/api',
  wsUrl: 'wss://bloctaskmali.onrender.com/ws',

  // Blockchain — Sepolia (ancrage escrow / démo)
  ethereum: {
    chainId: '0xaa36a7', // Sepolia 11155111
    chainName: 'Sepolia Test Network',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18
    }
  },

  // Remplies après `npm run deploy:sepolia:full` (ou via API /escrow/blockchain/status/)
  contracts: {
    escrow: '',
    reputation: '',
    litigation: ''
  },

  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },

  googleClientId: '',
  enableGoogleSignIn: true,
  googleMapsApiKey: '',
};
