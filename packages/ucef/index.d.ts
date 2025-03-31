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

export type Abi = any[];
export interface Artifact<AbiT extends Abi = Abi> {
    contractName: string;
    sourceName: string;
    bytecode: string;
    abi: AbiT;
    linkReferences: Record<string, Record<string, Array<{
        length: number;
        start: number;
    }>>>;
}

export namespace UCEFContracts {
  export const UCEF: Artifact
  export const UCEFOwned: Artifact
  export const UCEFRegulated: Artifact
  export const UCEFSharable: Artifact
}
