# **Unopinionated Confidential ERC-20 Framework (UCEF)**

**Introduction**

The rapid growth of decentralised finance highlights a critical tension between transparency and privacy. ERC-20 tokens expose user balances and transaction amounts, which can deter mainstream adoption and compromise sensitive financial data. Numerous proposals for confidential ERC-20 tokens have emerged, all of which are firmly tied to a particular cryptographic approach be it TEE, FHE, MPC, or zero-knowledge proofs. This creates issues for interoperability of confidential tokens in addition this approach ties a contract developer to a specific cryptographic implementation.

**An unopinionated implementation**

To achieve a truly unopinionated implementation, cryptographic details should be abstracted away from the Solidity interface. This ensures that different cryptographic approaches can be swapped without altering the contract’s external behaviour. Furthermore, logic around permissions and visibility controls should be programmable using standard Solidity constructs, avoiding proprietary libraries or custom extensions. The UCEF approach preserves the ERC-20 standard’s simplicity and composability while enabling flexible privacy rules that can adapt to evolving security requirements and compliance needs.

***Features***

- The same ERC-20 interface
- No custom libraries
- Flexible implementation expressible in solidity

The UCEF implementation enforces privacy using standard Solidity authorisation checks, as demonstrated in the balanceOf function shown below, which requires the caller to be the account owner. This eliminates the need for custom libraries or cryptographic proofs, preserving compatibility with existing ERC-20 interfaces and maintaining gas efficiency. By leveraging native Solidity constructs, this approach simplifies auditing, enhances composability with decentralised applications, and keeps cryptographic complexity outside the smart contract. This minimalistic design ensures adaptability and maintainability while allowing developers to focus on enforcing data access rules through their preferred cryptographic technologies.

```solidity
    function balanceOf(address account) public view override returns (uint256) {
        require(msg.sender == account, "Unauthorized access to balance");
        return _balances[account];
    }
```

*A confidential balance implementation under UCEF - see full implementation examples at* https://github.com/appliedblockchain/unopinionated-confidential-erc-20-framework

I 

**Comparison with existing implementations**

|  | **UCEF by Applied Blockchain** | **fhEVM ERC-20 by Zama** | **Confidential ERC-20 Framework using FHE by Inco & Circle** | **COTI Private ERC-20**
 |
| --- | --- | --- | --- | --- |
| Confidential Balances | ✅ | ✅ | ✅ | ✅ |
| Fully Anonymous Accounts | ✅ | ❌ | ❌ | ❌ |
| Programmable Confidentiality | ✅ | 🟠 Partial Support | 🟠 Partial Support | ❌ |
| Unmodified ERC-20 Interface | ✅ | ❌ | ❌ | ❌ |
| Cryptography agnostic | ✅ | ❌ | ❌ | ❌ |

**Adopted By**

![sd-rollup-landscape-light.png](attachment:6f71133c-4d46-4f5c-83c7-0626493a4476:sd-rollup-landscape-light.png)