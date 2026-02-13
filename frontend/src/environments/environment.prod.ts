export const environment = {
  production: false,
  msalConfig: {
    auth: {
      // IMPORTANTE: Coloque aqui o ID NOVO da Real Arenas que criamos
      clientId: '90ac8301-8401-4287-9e69-287a4cdcbc2b',
      authority: 'https://login.microsoftonline.com/d8f53599-c486-4c3c-aafb-22a7f3c83f7e', // ID da WTorre
    },
  },
  apiUri: 'http://localhost:3005/api',
};
