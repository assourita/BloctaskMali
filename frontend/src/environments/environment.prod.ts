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

  // Remplies après déploiement Sepolia (Remix MetaMask ou Hardhat) — pas Remix VM
  contracts: {
    escrow: '0x65412089E7242e8d4Ef627c3ff408B000675112d',
    reputation: '0x6Dda046F34E1Fef33210a5fEA25a0B22E50ed8E7',
    litigation: '0x40Ed2a277dAF12Da6bec5af312D0e68897dEd417'
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
