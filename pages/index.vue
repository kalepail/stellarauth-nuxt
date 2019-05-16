<template>
<section>
  <form class="submit-form" @submit.prevent="submitForm">
    <h1>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-key"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
      StellarAuth Demo
    </h1>

    <p class="success" v-if="user">Successfully authenticated!</p>
    <p class="error" v-if="error" v-html="error_parsed"></p>

    <p class="info" v-if="!user && !transaction">This is a proof of concept demo using the Stellar network as an authentication method. Use your Stellar account to prove your identity by submitting a transaction to the network. This demo utilizes the Stellar testnet so feel free to <a href="https://www.stellar.org/laboratory/#account-creator?network=test" target="_blank">create and fund a fresh dummy account</a> to try it out.</p>
   
    <div v-if="!user && !transaction">
      <label class="label">
        Stellar account
        <div class="actions">
          <input type="text" placeholder="GCVU2 ... 7CJDJ" v-model="account">

          <button class="button" type="submit" @mousedown="useLedger = false">
            <vue-loader v-show="!useLedger && loading" />
            {{hasWebAuthn ? 'Use Key' : 'Begin'}}
          </button>
        </div>
      </label>

      <label class="label" v-if="hasWebAuthn">
        Ledger path

        <div class="actions">
          <input type="text" placeholder="44'/148'/0'" v-model="bip32Path">
          <button class="button" type="submit" @mousedown="useLedger = true">
            <vue-loader v-show="useLedger && loading" />
            Use Ledger
          </button>
        </div>
      </label>
    </div>

    <div v-else-if="!user">
      <div class="label">
        Login transaction XDR
        <span>Sign and submit (e.g. <a :href="transaction.link" target="_blank">Stellar.org</a>) before verifying below.</span>
        <pre v-html="transaction.transaction" v-if="transaction"></pre>
        <button class="button copy" @click="copy" type="button"> {{copied ? '✔︎ Copied' : 'Copy'}}</button>
      </div>

      <div class="actions">
        <button class="button max" type="submit" v-if="transaction">
          <vue-loader v-show="loading" />
          Verify &amp; Sign In
        </button>
      </div>
    </div>
  </form>

  <form class="update-user" @submit.prevent="putUser" v-if="user">
    <label class="label">
      First name
      <input type="text" v-model="user.fname" placeholder="Johnny">
    </label>

    <label class="label">
      Last name
      <input type="text" v-model="user.lname" placeholder="Appleseed">
    </label>

    <label class="label">
      Email address
      <input type="text" v-model="user.email" placeholder="johnny@appleseed.com">
    </label>

    <label class="label">
      Notes
      <textarea v-model="user.note" placeholder="I like turtles."></textarea>
    </label>

    <div class="actions">
      <button class="button max" type="submit">
        <vue-loader v-show="loading" />
        Save
      </button>
      <button class="button plain" @click="signOut" type="button">Sign Out</button>
    </div>

    <ul class="previous-auth">
      <h2>Previous authorizations</h2>
      
      <ul v-for="transaction in parsedTransactions(transactions)" :key="transaction.id">
        <li v-for="(operation, i) in parsedRecords(transaction.operations)" :key="i">
          <a :href="transaction._links.self.href" v-html="authText(transaction)" target="_blank"></a>
        </li>
      </ul>
    </ul>
  </form>
</section>
</template>

<script>
import moment from 'moment'
import _ from 'lodash-es'
import bluebird from 'bluebird'

import {copy, loadScript} from '~/assets/js/misc'
import {signLedgerTransaction, getLedgerAccount} from '~/assets/js/ledger'

import $loader from '~/components/loader'

let server

const data = {
  jwt: localStorage.getItem('StellarAuth'),

  error: false,
  loading: false,
  copied: false,

  account: null,
  transaction: null,
  user: null,

  useLedger: false,
  bip32Path: process.env.bip32Path,
  hasWebAuthn: !!navigator.credentials,

  transactions: null
}

export default {
  components: {
    'vue-loader': $loader
  },
  data() {
    return JSON.parse(JSON.stringify(data))
  },
  computed: {
    error_parsed() {
      return _.get(this, 'error.detail') && _.get(this, 'error.extras.reason')
      ? `${this.error.detail}: ${this.error.extras.reason}.`
      :_.get(this, 'error.title') && _.get(this, 'error.extras.result_codes')
      ? `${this.error.title}: ${JSON.stringify(this.error.extras.result_codes)}.`
      : _.get(this, 'error.title') && _.get(this, 'error.resource')
      ? `${this.error.title}: ${this.error.resource}.`
      : _.get(this, 'error.detail')
      ? `${this.error.detail}.`
      : _.get(this, 'error.message')
      ? `${this.error.message}.`
      : 'Something went wrong please try again.'
    }
  },
  created() {
    if (this.jwt) 
      this.getUser()
  },
  mounted() {
    this.loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/stellar-sdk/1.0.1/stellar-sdk.min.js',
      () => {
        StellarSdk.Network.use(
          new StellarSdk.Network(StellarSdk.Networks[process.env.network])
        )
        server = new StellarSdk.Server(process.env.horizonUrl)
      }
    )
  },
  watch: {
    copied() {
      if (this.copied)
        setTimeout(() => this.copied = false, 2000)
    },
    'transaction.auth'() {
      const auth = _.get(this, 'transaction.auth')

      if (auth) {
        this.jwt = auth
        localStorage.setItem('StellarAuth', auth)
      }
    },
    user() {
      if (
        this.user
        && !this.transactions
      ) server
      .transactions()
      .forAccount(this.user.id)
      .limit(100)
      .call()
      .then(async (page) => {
        this.transactions = await bluebird.map(page.records, async (record) => {
          const envelope = new StellarSdk.Transaction(record.envelope_xdr)
          record.operations = envelope.operations
          return record
        })
      })
      .catch((err) => console.error(err))
    }
  },
  methods: {
    copy,
    loadScript,
    signLedgerTransaction,
    getLedgerAccount,

    signOut() {
      localStorage.removeItem('StellarAuth')
      _.each(data, (value, key) => {this.$set(this, key, value)})
    },

    async submitForm() {
      this.error = null
      this.loading = true

      if (
        !this.transaction 
        && this.useLedger
      ) try {
        this.account = await this.getLedgerAccount(this.bip32Path)
      } catch(err) {
        this.loading = false
        return this.handleError(err)
      }

      this.$axios.get(process.env.authUrl, {
        headers: this.transaction ? {
          Authorization: `Bearer ${this.jwt || this.transaction.auth}`
        } : null,
        params: {
          timeout: 3600,
          account: this.account
        }
      })
      .then(async ({data}) => {
        if (data.memo)
          await this.getUser()

        else {
          await this.postUser()

          if (this.useLedger) this.signLedgerTransaction(this.bip32Path, this.account, data.transaction)
          .then((transaction) => {
            this.loading = true
            data.transaction = transaction.toEnvelope().toXDR().toString('base64')
            return server.submitTransaction(transaction)
          })
          .then(() => new bluebird((resolve) => setTimeout(() => resolve(this.getUser()), 2000)))
          .catch(this.handleError)
          .finally(() => this.loading = false)

          this.transaction = data
        }
      })
      .catch(this.handleError)
      .finally(() => this.loading = false)
    },

    getUser() {
      this.error = null
      this.loading = true

      return this.$axios.get(process.env.usersUrl, {
        params: {
          auth: this.jwt || this.transaction.auth,
        }
      })
      .then(({data}) => this.user = data)
      .catch(this.handleError)
      .finally(() => this.loading = false)
    },
    postUser() {
      this.error = null
      this.loading = true

      return this.$axios.post(process.env.usersUrl, {
        id: this.account
      })
      .then(({data}) => console.log(data))
      .catch((this.handleError))
      .finally(() => this.loading = false)
    },
    putUser() {
      this.error = null
      this.loading = true

      return this.$axios.put(process.env.usersUrl, {
        auth: this.jwt || this.transaction.auth,
        email: this.user.email,
        fname: this.user.fname,
        lname: this.user.lname,
        note: this.user.note
      })
      .then(({data}) => console.log(data))
      .catch(this.handleError)
      .finally(() => this.loading = false)
    },

    handleError(err) {
      console.error(err)

      if (_.get(err, 'response.data.message', '').indexOf('expired') !== -1) {
        this.signOut()
        this.error = {message: 'Session has expired, please sign in again'}
      }

      else if (err.statusCode)
        this.error = {message: err.message || err.name || err.statusText || err.statusCode}

      else if (
        _.get(err, 'response.data.message', '').indexOf('duplicate') !== -1 // Don't show errors for dup users 
        || ( // Don't show pending errors until we have a transaction
          !this.transaction 
          && _.get(err, 'response.data.type', []).indexOf('not_found') !== -1
          && _.get(err, 'response.data.resource', []).indexOf('transaction') !== -1
        )
      ) return

      else
        this.error = _.get(err, 'response.data')
    },

    parsedTransactions(transactions) {
      return _.orderBy(transactions, 'created_at', 'desc')
    },
    parsedRecords(operations) {
      return _.filter(operations, (operation) => operation.source && operation.source.indexOf('AUTH') !== -1)
    },
    authText(transaction) {
      return `
        ${moment(transaction.created_at).format('MMMM Do YYYY, h:mma')}
        — ${moment(transaction.valid_before).format('MMMM Do YYYY, h:mma')}
      `
    }
  }
}
</script>

<style lang="scss" scoped>
@import '~assets/scss/vamp';

section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 100vw;
  min-height: 100vh;
  padding: 40px 10px;
}
form {
  max-width: 510px;
  width: 100%;
  display: flex;
  flex-direction: column;
}
h1 {
  font-size: 25px;
  margin-bottom: 40px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  
  svg {
    width: auto;
    margin-right: 15px;
  }
}
p {
  font-size: 14px;
  color: $ui-3;
  margin-bottom: 20px;
  font-weight: 400;
  text-align: center;
  line-height: 1.3;

  &.success {
    color: $bm-green;
  }
  &.error {
    color: $bm-red;
  }
  &.info {
    color: $ui-3;
    text-align: left;

    a {
      color: $bm-blue;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
.label {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;

  &:last-of-type {
    margin-bottom: 0;
  }

  span {
    font-size: 14px;
    color: $ui-3;
    margin-top: 5px;
    line-height: 1.5;
  }
  a {
    background-color: $bm-blue;
    color: $ui-9;
    border-radius: $radius;
    padding: 4px 8px 6px;

    &:hover {
      background-color: darken($bm-blue, 5%);
    }
  }
  .copy {
    background-color: $ui-4;
    color: $ui-2;
    font-size: 12px;
    margin: 10px 0 0;
    align-self: flex-end;
    padding: 4px 8px 6px;
    text-transform: none;
    height: 25px;

    &:hover {
      background-color: darken($ui-4, 5%);
    }
  }
  .actions {
    display: flex;
    margin-top: 5px;
  }
}
input,
textarea {
  border: 1px solid $ui-5;
  border-radius: $radius;
  background-color: $ui-9;
  width: 100%;
  padding: 15px;
  font-size: 14px;

  &:focus {
    border-color: rgba($bm-blue, 0.4);
  }
}
input {
  margin-right: 10px;
  height: 50px;
  text-overflow: ellipsis;
}
textarea {
  resize: none;
  height: 120px;
}
pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 14px;
  color: $ui-3;
  line-height: 1.2;
  margin-top: 20px;
}
.button {
  background-color: $bm-blue;
  color: $ui-9;
  border-radius: $radius;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  height: 50px;

  &:hover {
    background-color: darken($bm-blue, 5%);
  }

  &.plain {
    background-color: $ui-3;
    flex-shrink: 0;

    &:hover {
      background-color: darken($ui-3, 5%);
    }
  }
  &.max {
    width: 100%;
    flex-shrink: 1;
  }
}
.loader {
  margin-right: 10px;
  flex-shrink: 0;
}

.submit-form {

}

.update-user {

  .label {
    
    input,
    textarea {
      margin-top: 5px;
    }
  }
  .actions {
    display: flex;
    margin-top: 20px;

    .plain {
      margin-left: 10px;
    }
  }
  .previous-auth {
    margin-top: 40px;

    h2 {
      margin-bottom: 10px;
    }
    ul {
      list-style: disc;
      line-height: 1.5;

      &:first-of-type a {
        color: $bm-green;
      }
    }
    li {
      font-size: 14px;
      color: $ui-3;
      margin-bottom: 5px;

      a {
        color: inherit;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}
</style>