export { UCEF3643 } from './types'
export { Identity, Token, ClaimIssuer } from './types'

interface ContractJSON {
  _format: string;
  contractName: string;
  sourcename: string;
  abi: any[];
  bytecode: string;
  deployedBytecode: string;
  linkReferences: any;
}

export namespace UCEF3643Contracts {
  export const UCEF3643: ContractJSON
}
