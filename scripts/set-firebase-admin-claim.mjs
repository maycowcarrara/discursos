import {
  callIdentityToolkit,
  readArgument,
  resolveServiceAccount,
} from './firebase-admin-rest.mjs'

const email = readArgument('--email')

if (!email) {
  throw new Error('Informe o e-mail administrativo com --email.')
}

const serviceAccount = resolveServiceAccount()
const lookupResult = await callIdentityToolkit(serviceAccount, 'lookup', {
  email: [email],
})
const user = lookupResult.users?.[0]

if (!user?.localId) {
  throw new Error(`Usuario nao encontrado no Firebase Auth: ${email}`)
}

await callIdentityToolkit(serviceAccount, 'update', {
  customAttributes: JSON.stringify({
    ...JSON.parse(user.customAttributes || '{}'),
    admin: true,
  }),
  localId: user.localId,
})

console.log(`Claim admin = true aplicada para ${email}.`)
