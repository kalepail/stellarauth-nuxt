import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV !== 'production'

export default {
  mode: 'spa',
  dev: isDev,
  env: {
    authUrl: isDev ? 'https://localhost:4000/auth' : 'https://api.stellarauth.com/auth',
    usersUrl: isDev ? 'https://localhost:5000/users' : 'https://j3a04aa894.execute-api.us-east-1.amazonaws.com/dev/users',
    stellarGuardUrl: isDev ? 'https://test.stellarguard.me/api/transactions' : 'https://test.stellarguard.me/api/transactions',
    horizonUrl: isDev ? 'https://horizon-testnet.stellar.org' : 'https://horizon-testnet.stellar.org',
    bip32Path: isDev ? `44'/148'/500'` : `44'/148'/0'`,
    network: isDev ? 'TESTNET' : 'TESTNET',
    authAccount: 'GDOOANUSKSOZJKQ7TGZPDTEXPRLFSX5FSH22JY2SKESDPWRGGR6PAUTH',
    stellarGuardAccount: 'GCVHEKSRASJBD6O2Z532LWH4N2ZLCBVDLLTLKSYCSMBLOYTNMEEGUARD'
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
