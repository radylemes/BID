export const environment = {
  production: false,
  msalConfig: {
    auth: {
      // IMPORTANTE: Coloque aqui o ID NOVO da Real Arenas que criamos
      clientId: '90ac8301-8401-4287-9e69-287a4cdcbc2b',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: 'https://bid.allianzparque.intra',// Alterado para multi-tenant (aceita WTorre e Real Arenas)
    },
  },
  apiUri: '/api',
};
