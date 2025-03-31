export {
  UCEF,
  UCEFOwned,
  UCEFRegulated,
  UCEFSharable,
  // Extensions
  UCEFBurnable,
  UCEFCapped,
  UCEFFlashMint,
  UCEFPausable,
  UCEFPermit,
  UCEFVotes,
  UCEFWrapper,
  ERC1363,
  ERC4626,
} from './types'

interface ContractJSON {
  _format: string;
  contractName: string;
  sourcename: string;
  abi: any[];
  bytecode: string;
  deployedBytecode: string;
  linkReferences: any;
}

export namespace UCEFContracts {
  export const UCEF: ContractJSON
  export const UCEFOwned: ContractJSON
  export const UCEFRegulated: ContractJSON
  export const UCEFSharable: ContractJSON
}
