import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NUXT_ENV_NETWORK !== 'public'

export default {
  mode: 'spa',
  dev: isDev,
  env: {
    authUrl: isDev ? 'https://localhost:4000/auth' : isTest ? 'https://api-testnet.stellarauth.com/auth' : 'https://api.stellarauth.com/auth',
    usersUrl: isDev ? 'https://localhost:5000/users' : 'https://j3a04aa894.execute-api.us-east-1.amazonaws.com/dev/users',
    stellarGuardUrl: isTest ? 'https://test.stellarguard.me/api/transactions' : 'https://stellarguard.me/api/transactions',
    lobstrVaultUrl: isTest ? 'https://vault-staging.lobstr.co/api/transactions/' : 'https://vault.lobstr.co/api/transactions/',
    horizonUrl: isTest ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org',
    bip32Path: isDev ? `44'/148'/500'` : `44'/148'/0'`,
    network: isTest ? 'TESTNET' : 'PUBLIC',
    authAccount: 'GDOOANUSKSOZJKQ7TGZPDTEXPRLFSX5FSH22JY2SKESDPWRGGR6PAUTH',
    stellarGuardAccount: 'GCVHEKSRASJBD6O2Z532LWH4N2ZLCBVDLLTLKSYCSMBLOYTNMEEGUARD',
    lobstrVaultAccount: 'GA2T6GR7VXXXBETTERSAFETHANSORRYXXXPROTECTEDBYLOBSTRVAULT',
    isTest
  },

  /*
  ** Headers of the page
  */
  head: {
    title: 'StellarAuth',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Login with your Stellar account' }
    ],
    link: [
      // { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  /*
  ** Customize the progress-bar color
  */
  loading: false,

  /*
  ** Global CSS
  */
  css: [
    '~/assets/scss/style.scss'
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
  ],

  /*
  ** Nuxt.js modules
  */
  modules: [
    '@nuxtjs/axios',
  ],

  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend(config, ctx) {
    }
  },

  axios: {
    
  },

  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, './certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, './certs/cert.pem'))
    }
  }
}
