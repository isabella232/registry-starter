import {
  EventPayload,
  MutationContext,
  MutationResolvers,
  MutationState,
  StateBuilder
} from "../mutations-package"
import { ethers, providers } from 'ethers'
import {
  AsyncSendable,
  Web3Provider
} from "ethers/providers"

import { applySignedWithAttribute, setAttribute } from './utils'

const IpfsClient = require('ipfs-http-client')

interface UploadImageEvent extends EventPayload {
  value: boolean
}

interface UploadChallengeEvent extends EventPayload {
  challengeHash: string
}

interface UploadMetadataEvent extends EventPayload {
  metadataHash: string
}

type EventMap = {
  'UPLOAD_IMAGE': UploadImageEvent
  'UPLOAD_METADATA': UploadMetadataEvent
  'UPLOAD_CHALLENGE': UploadChallengeEvent
}

interface State {
  imageUploaded: boolean
  metadataUploaded: boolean
  metadataHash: string
  challengeUploaded: boolean
  challengeHash: string
}

const stateBuilder: StateBuilder<State, EventMap> = {
  getInitialState(): State {
    return {
      imageUploaded: false,
      metadataUploaded: false,
      metadataHash: '',
      challengeUploaded: false,
      challengeHash: ''
    }
  },
  reducers: {
    'UPLOAD_IMAGE': async (state: MutationState<State>, payload: UploadImageEvent) => {
      return {
        imageUploaded: payload.value
      }
    },
    'UPLOAD_METADATA': async (state: MutationState<State>, payload: UploadMetadataEvent) => {
      return {
        metadataUploaded: true,
        metadataHash: payload.metadataHash
      }
    },
    'UPLOAD_CHALLENGE': async (state: MutationState<State>, payload: UploadChallengeEvent) => {
      return {
        challengeUploaded: true,
        challengeHash: payload.challengeHash
      }
    }
  }
}

const contractAddress = "0x970e8f18ebfEa0B08810f33a5A40438b9530FBCF"

const mnemonic = "myth like bonus scare over problem client lizard pioneer submit female collect"
const accountPath = index => `m/44'/60'/0'/0/${index}`

const config = {
  ethereum: (provider: AsyncSendable): Web3Provider => {
    return new Web3Provider(provider)
  },
  ipfs: (endpoint: string) => {
    return new IpfsClient(endpoint)
  }
}

type Config = typeof config

type Context = MutationContext<Config, State, EventMap>

async function getContract(context: Context, name: string, signer) {
  const abi = require(`../../contracts/build/contracts/${name}.json`).abi

  if (!abi || !contractAddress) {
    throw Error(`Missing the DataSource '${name}'`)
  }

  const { ethereum } = context.graph.config

  const contract = new ethers.Contract(
    contractAddress, abi, signer
  )
  contract.connect(ethereum)

  return contract
}

async function addToken(_, { options }: any, context: Context) {

  const { ipfs, ethereum } = context.graph.config

  const { state } = context.graph

  const { symbol, description, image, decimals } = options

  const { path: imageHash }: { path: string } = await uploadToIpfs(ipfs, image)
  
  await state.dispatch("UPLOAD_IMAGE", { value: true })

  const metadata = JSON.stringify(
    {
      symbol,
      description,
      image: imageHash,
      decimals
    }
  )

  const { path: metadataHash }: { path: string } = await uploadToIpfs(ipfs, metadata)

  await state.dispatch("UPLOAD_METADATA", { metadataHash })

  // const userWallet = await ethers.Wallet.fromMnemonic(mnemonic, accountPath(0)).connect(ethereum)
  // const ownerWallet = await ethers.Wallet.fromMnemonic(mnemonic, accountPath(1)).connect(ethereum)

  // const tokenRegistryContract = await getContract(context, "TokenRegistry", userWallet)
  // const ethereumDIDContract = await getContract(context, "EthereumDIDRegistry", userWallet)

  // const daiContract = await getContract(context, "Dai", userWallet)

  // try{
  //   await applySignedWithAttribute(
  //     userWallet,
  //     ownerWallet,
  //     tokenRegistryContract,
  //     ethereumDIDContract,
  //     daiContract
  //   )
  // }catch(err) {
  //   console.log(err)
  // }

}

async function editToken(_, { options }: any, context: Context) {

  const { ipfs, ethereum } = context.graph.config

  const { symbol, description, image, decimals } = options

  const { path: imageHash }: { path: string } = await uploadToIpfs(ipfs, image)

  const metadata = JSON.stringify(
    {
      symbol,
      description,
      image: imageHash,
      decimals
    }
  )

  const { path: metadataHash }: { path: string } = await uploadToIpfs(ipfs, metadata)

  const memberWallet = await ethers.Wallet.fromMnemonic(mnemonic, accountPath(0)).connect(ethereum)
  const ownerWallet = await ethers.Wallet.fromMnemonic(mnemonic, accountPath(1)).connect(ethereum)

  const memberAddress = await memberWallet.getAddress()

  const ethereumDIDRegistry = await getContract(context, "EthereumDIDRegistry", ethereum.getSigner())

  try{
    await setAttribute(memberAddress, ownerWallet, ethereumDIDRegistry)
  }catch(err) {
    console.log(err)
  }
  
  return null
}

async function deleteToken(_, args: any, context: Context) {

  const { ethereum } = context.graph.config

  const tokenRegistry = await getContract(context, "TokenRegistry", ethereum.getSigner())
  const address = await ethereum.getSigner().getAddress()

  try{
    await tokenRegistry.memberExit(address)
  }catch(err){
    console.log(err)
  }

  return true
}

async function challengeToken(_, { options: { description, token } }: any, context: Context) {

  const { ipfs, ethereum } = context.graph.config

  const { state } = context.graph

  const challenge = JSON.stringify({
    description,
    token
  })

  const { path: challengeHash }: { path: string } = await uploadToIpfs(ipfs, challenge)

  await state.dispatch('UPLOAD_CHALLENGE', { challengeHash })

  const tokenRegistry = await getContract(context, "TokenRegistry", ethereum.getSigner())
  
  //tokenRegistry.challenge( ... )

  return true
}

async function voteChallenge(_, args: any, context: Context) {

  const { ethereum } = context.graph.config

  const tokenRegistry = await getContract(context, "TokenRegistry", ethereum.getSigner())
  
  //tokenRegistry.submitVotes( ... )

  return true
}



const resolvers: MutationResolvers<Config, State, EventMap>= {
  Mutation: {
    addToken,
    editToken,
    deleteToken,
    challengeToken,
    voteChallenge
  }
}

export default {
  resolvers,
  config,
  stateBuilder
}

export {
  State,
  EventMap,
  UploadImageEvent,
  UploadMetadataEvent
}

const uploadToIpfs = async (ipfs: any, element: string) => {
  let result;

  for await (const returnedValue of ipfs.add(element)) {
    result = returnedValue
  }

  return result
}