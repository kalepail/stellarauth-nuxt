// import Transport from '@ledgerhq/hw-transport-u2f'
// import Transport from '@ledgerhq/hw-transport-webusb'

import Transport from '@ledgerhq/hw-transport-webauthn'
import AppStellar from '@ledgerhq/hw-app-str'

// 500 plain
// 505 stellarguard

export function getLedgerAccount(bip32Path) {
  return Transport
  .create()
  .then((transport) => new AppStellar(transport))
  .then(async (ledgerApp) => {
    const connectionResult = await ledgerApp.getPublicKey(bip32Path)
    return connectionResult.publicKey
  })
}

export function signLedgerTransaction(bip32Path, publicKey, xdr) {
  return Transport
  .create()
  .then((transport) => new AppStellar(transport))
  .then(async (ledgerApp) => {
    const transaction = new StellarSdk.Transaction(xdr)
    const keypair = StellarSdk.Keypair.fromPublicKey(publicKey)
    const result = await ledgerApp.signTransaction(bip32Path, transaction.signatureBase())

    // add signature to transaction
    const hint = keypair.signatureHint()
    const decorated = new StellarSdk.xdr.DecoratedSignature({hint: hint, signature: result.signature})
    transaction.signatures.push(decorated)

    return transaction
  })
}