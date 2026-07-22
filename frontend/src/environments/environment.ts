export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  wsUrl: 'ws://localhost:8000',
  
  // Blockchain — Sepolia testnet (ancrage escrow Mali, phase 1)
  ethereum: {
    chainId: '0xaa36a7', // Sepolia
    chainName: 'Sepolia Test Network',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  
  // Adresses contrats (après `npm run deploy:sepolia:full`)
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

  /** Client OAuth Web Google — Console Google Cloud.
   * Ajoutez http://localhost:4200 dans « Origines JavaScript autorisées »
   * sinon le bouton Google échoue (GSI_LOGGER origin not allowed). */
  googleClientId: '1059308452820-13u2j1q4ltb969nmvtubpf6nr9acvaos.apps.googleusercontent.com',
  /** false = pas de bouton GSI (évite l’erreur « origin not allowed » en local). Remettre true après avoir ajouté http://localhost:4200 dans Google Cloud Console. */
  enableGoogleSignIn: false,

  /** Clé Google Maps JavaScript / Directions (Console Google Cloud). */
  googleMapsApiKey: '',
};
