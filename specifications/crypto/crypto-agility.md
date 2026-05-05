# Crypto-Agility Specification

> Galileo Luxury Standard - Post-Quantum Cryptography Readiness

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-30

---

## 1. Overview

### 1.1 Purpose

This specification defines the crypto-agile architecture for the Galileo Luxury Standard, enabling:

- **Signature scheme migration** without breaking deployed contracts
- **Post-quantum cryptography readiness** (NIST timeline: 2030 recommended full transition)
- **Hybrid signatures** during transition period (2027-2030)
- **10+ year product lifecycle support** - luxury products require crypto-agility from day one

### 1.2 Standards Referenced

| Standard | Name | Date |
|----------|------|------|
| NIST FIPS 203 | ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism) | August 2024 |
| NIST FIPS 204 | ML-DSA (Module-Lattice-Based Digital Signature Algorithm) | August 2024 |
| NIST FIPS 205 | SLH-DSA (Stateless Hash-Based Digital Signature Algorithm) | August 2024 |
| ERC-4337 | Account Abstraction | Ethereum |

### 1.3 Design Principles

| Principle | Description |
|-----------|-------------|
| **Never hardcode algorithms** | All crypto operations go through interfaces |
| **Configuration over code** | Algorithm selection via registry, not conditionals |
| **Graceful degradation** | If PQC unavailable, fall back to classical |
| **Fail-secure** | Unknown algorithm ID rejects signature, does not accept |

---

## 2. Algorithm Abstraction Interfaces

### 2.1 Signature Verification Interface

```typescript
/**
 * Abstract interface for signature verification.
 * Implementations exist for each supported algorithm family.
 */
interface ISignatureVerifier {
  /**
   * Verify a signature against a message hash.
   * @param hash - The message hash (always 32 bytes for interop)
   * @param signature - The signature bytes (format varies by algorithm)
   * @param publicKey - The public key bytes (format varies by algorithm)
   * @returns true if signature is valid, false otherwise
   */
  verify(hash: bytes32, signature: bytes, publicKey: bytes): boolean;

  /**
   * Return the algorithm identifier for this verifier.
   * Must match registry key exactly.
   */
  algorithmId(): string;

  /**
   * Return expected signature length in bytes.
   * Used for format validation before verification.
   */
  signatureLength(): uint256;

  /**
   * Return expected public key length in bytes.
   */
  publicKeyLength(): uint256;
}
```

### 2.2 Key Encapsulation Interface

```typescript
/**
 * Abstract interface for key encapsulation (key exchange).
 * Used for encrypted off-chain communication.
 */
interface IKeyEncapsulation {
  /**
   * Encapsulate a shared secret using recipient's public key.
   * @param publicKey - Recipient's public key
   * @returns ciphertext (to send) and sharedSecret (to use for encryption)
   */
  encapsulate(publicKey: bytes): { ciphertext: bytes, sharedSecret: bytes32 };

  /**
   * Decapsulate to recover shared secret using private key.
   * @param ciphertext - The encapsulated ciphertext
   * @param privateKey - Recipient's private key
   * @returns The shared secret (32 bytes)
   */
  decapsulate(ciphertext: bytes, privateKey: bytes): bytes32;

  /**
   * Return the algorithm identifier.
   */
  algorithmId(): string;

  /**
   * Return expected ciphertext length.
   */
  ciphertextLength(): uint256;
}
```

### 2.3 Crypto Registry Interface

```typescript
/**
 * Central registry for algorithm implementations.
 * Enables runtime algorithm selection without code changes.
 */
interface ICryptoRegistry {
  /**
   * Get verifier for a given algorithm ID.
   * @throws if algorithm not supported
   */
  getVerifier(algorithmId: string): ISignatureVerifier;

  /**
   * Get KEM for a given algorithm ID.
   * @throws if algorithm not supported
   */
  getKEM(algorithmId: string): IKeyEncapsulation;

  /**
   * Check if algorithm is supported.
   */
  isSupported(algorithmId: string): boolean;

  /**
   * List all supported algorithm IDs.
   */
  supportedAlgorithms(): string[];

  /**
   * Get the current default algorithm for new signatures.
   * Changes over time as migration progresses.
   */
  defaultSignatureAlgorithm(): string;

  /**
   * Get the current default algorithm for new key encapsulation.
   */
  defaultKEMAlgorithm(): string;
}
```

---

## 3. Algorithm Identifiers

### 3.1 Signature Algorithms

| Algorithm ID | Standard | Status | Key Size | Sig Size | Notes |
|--------------|----------|--------|----------|----------|-------|
| `ECDSA-secp256k1` | SEC 2 | Current default | 33 bytes | 65 bytes | Native EVM support |
| `ECDSA-P256` | NIST P-256 | Supported | 33 bytes | 64 bytes | Apple/Android hardware |
| `Ed25519` | RFC 8032 | Supported | 32 bytes | 64 bytes | High performance |
| `ML-DSA-44` | FIPS 204 | Future (2027+) | 1312 bytes | 2420 bytes | NIST Level 2 |
| `ML-DSA-65` | FIPS 204 | Future (2027+) | 1952 bytes | 3309 bytes | NIST Level 3 |
| `ML-DSA-87` | FIPS 204 | Future (2027+) | 2592 bytes | 4627 bytes | NIST Level 5 |
| `SLH-DSA-128s` | FIPS 205 | Backup option | 32 bytes | 7856 bytes | Hash-based (conservative) |

### 3.2 Key Encapsulation Algorithms

| Algorithm ID | Standard | Status | Ciphertext | Shared Secret | Notes |
|--------------|----------|--------|------------|---------------|-------|
| `ECDH-X25519` | RFC 7748 | Current default | 32 bytes | 32 bytes | High performance |
| `ECDH-P256` | NIST P-256 | Supported | 65 bytes | 32 bytes | Hardware support |
| `ML-KEM-512` | FIPS 203 | Future (2027+) | 768 bytes | 32 bytes | NIST Level 1 |
| `ML-KEM-768` | FIPS 203 | Future (2027+) | 1088 bytes | 32 bytes | NIST Level 3 |
| `ML-KEM-1024` | FIPS 203 | Future (2027+) | 1568 bytes | 32 bytes | NIST Level 5 |

### 3.3 Recommended Security Levels

| Use Case | Current (2026) | Transition (2027-2029) | Target (2030+) |
|----------|----------------|------------------------|----------------|
| Standard products | ECDSA-secp256k1 | Hybrid (ECDSA + ML-DSA-65) | ML-DSA-65 |
| High-value items | Ed25519 | Hybrid (Ed25519 + ML-DSA-87) | ML-DSA-87 |
| Off-chain encryption | ECDH-X25519 | Hybrid (X25519 + ML-KEM-768) | ML-KEM-768 |

---

## 4. Migration Roadmap

### 4.1 Timeline Overview

```
                    2026        2027        2028        2029        2030+
                     |           |           |           |           |
Phase 1:         [=========]
Classical Only    ECDSA-secp256k1 or Ed25519 for all operations

Phase 2:                     [=======================]
Hybrid Signatures            ECDSA + ML-DSA dual-signature required
                             All new signatures use hybrid format

Phase 3:                                                 [=========>
PQC Primary                                              ML-DSA primary
                                                         Classical optional
```

### 4.2 Phase 1: Classical Only (Current - 2026)

**Configuration:**
```json
{
  "signaturePolicy": {
    "required": ["ECDSA-secp256k1"],
    "optional": [],
    "default": "ECDSA-secp256k1"
  },
  "kemPolicy": {
    "required": ["ECDH-X25519"],
    "optional": [],
    "default": "ECDH-X25519"
  }
}
```

**Verification Logic:**
- Accept: Single valid ECDSA signature
- Reject: Any other format

### 4.3 Phase 2: Hybrid Signatures (2027-2029)

**Rationale:**
- Hedge against both classical break AND PQC implementation bugs
- "Belt and suspenders" - signature valid only if BOTH algorithms verify
- Industry standard transition approach (NIST recommendation)

**Configuration:**
```json
{
  "signaturePolicy": {
    "required": ["ECDSA-secp256k1", "ML-DSA-65"],
    "optional": [],
    "default": "hybrid"
  },
  "kemPolicy": {
    "required": ["ECDH-X25519", "ML-KEM-768"],
    "optional": [],
    "default": "hybrid"
  }
}
```

**Verification Logic:**
- Accept: Both ECDSA AND ML-DSA signatures present and valid
- Reject: Only one signature present OR either signature invalid

### 4.4 Phase 3: PQC Primary (2030+)

**Configuration:**
```json
{
  "signaturePolicy": {
    "required": ["ML-DSA-65"],
    "optional": ["ECDSA-secp256k1"],
    "default": "ML-DSA-65"
  },
  "kemPolicy": {
    "required": ["ML-KEM-768"],
    "optional": ["ECDH-X25519"],
    "default": "ML-KEM-768"
  }
}
```

**Verification Logic:**
- Accept: Valid ML-DSA signature (with or without ECDSA)
- Reject: Only ECDSA present (classical-only not accepted)

---

## 5. Hybrid Signature Format

### 5.1 Signature Envelope

```typescript
/**
 * Hybrid signature envelope containing multiple algorithm signatures.
 * Each signature signs the SAME message hash.
 */
interface HybridSignature {
  /**
   * Version of the envelope format.
   * Enables future format evolution.
   */
  version: uint8;  // Current: 1

  /**
   * Array of algorithm-signature pairs.
   * Order: classical first, then PQC.
   */
  signatures: SignatureEntry[];
}

interface SignatureEntry {
  /**
   * Algorithm identifier from registry.
   */
  algorithmId: string;

  /**
   * Signature bytes for this algorithm.
   */
  signature: bytes;

  /**
   * Public key bytes (included for verification).
   */
  publicKey: bytes;
}
```

### 5.2 Wire Encoding Format

```
Hybrid Signature Wire Format:

+--------+--------+--------+--------+--------+--------+
| Version| Count  | Entry 1 ...     | Entry 2 ...     |
| 1 byte | 1 byte | variable        | variable        |
+--------+--------+--------+--------+--------+--------+

Entry Format:
+--------+--------+--------+--------+--------+--------+
| AlgLen | AlgID  | SigLen | Signature        | PkLen  | PublicKey  |
| 1 byte | var    | 2 bytes| variable         | 2 bytes| variable   |
+--------+--------+--------+--------+--------+--------+
```

**Example dual-signature envelope (Phase 2):**
```
Version: 0x01
Count:   0x02

Entry 1 (Classical):
  AlgLen: 0x10 (16 bytes)
  AlgID:  "ECDSA-secp256k1"
  SigLen: 0x0041 (65 bytes)
  Signature: [65 bytes]
  PkLen:  0x0021 (33 bytes)
  PublicKey: [33 bytes]

Entry 2 (PQC):
  AlgLen: 0x09 (9 bytes)
  AlgID:  "ML-DSA-65"
  SigLen: 0x0CED (3309 bytes)
  Signature: [3309 bytes]
  PkLen:  0x07A0 (1952 bytes)
  PublicKey: [1952 bytes]

Total: ~5360 bytes
```

### 5.3 Verification Procedure

```typescript
function verifyHybridSignature(
  hash: bytes32,
  envelope: HybridSignature,
  registry: ICryptoRegistry,
  policy: SignaturePolicy
): boolean {
  // Check required algorithms are present
  const presentAlgorithms = new Set(envelope.signatures.map(s => s.algorithmId));
  for (const required of policy.required) {
    if (!presentAlgorithms.has(required)) {
      return false;  // Missing required algorithm
    }
  }

  // Verify each signature
  for (const entry of envelope.signatures) {
    if (!registry.isSupported(entry.algorithmId)) {
      // Unknown algorithm - skip if optional, fail if required
      if (policy.required.includes(entry.algorithmId)) {
        return false;
      }
      continue;
    }

    const verifier = registry.getVerifier(entry.algorithmId);
    if (!verifier.verify(hash, entry.signature, entry.publicKey)) {
      return false;  // Any invalid signature fails entire verification
    }
  }

  return true;
}
```

---

## 6. ERC-4337 Integration

### 6.1 Account Abstraction for Custom Signatures

ERC-4337 Account Abstraction enables custom signature schemes on Ethereum, which is critical for post-quantum cryptography support. Standard EOAs (Externally Owned Accounts) are locked to secp256k1 ECDSA.

**Smart Account Validation:**

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {IAccount} from "@account-abstraction/contracts/interfaces/IAccount.sol";

/**
 * @title GalileoSmartAccount
 * @notice ERC-4337 compatible account with crypto-agile signature validation
 */
contract GalileoSmartAccount is IAccount {

    ICryptoRegistry public immutable cryptoRegistry;

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        // Decode hybrid signature envelope from userOp.signature
        HybridSignature memory envelope = abi.decode(
            userOp.signature,
            (HybridSignature)
        );

        // Get current signature policy
        SignaturePolicy memory policy = getCurrentPolicy();

        // Verify using crypto-agile pattern
        bool valid = verifyHybridSignature(
            userOpHash,
            envelope,
            cryptoRegistry,
            policy
        );

        return valid ? 0 : SIG_VALIDATION_FAILED;
    }
}
```

### 6.2 Bundler Compatibility

Bundlers validate UserOperations before including them in bundles. Key considerations for PQC signatures:

| Aspect | Impact | Mitigation |
|--------|--------|------------|
| **Signature size** | ML-DSA-65: 3309 bytes vs ECDSA: 65 bytes | Bundlers must accept larger signatures |
| **Gas estimation** | PQC verification costs more gas | Update gas estimation algorithms |
| **Mempool storage** | Larger UserOperations | Increase mempool size limits |
| **Bandwidth** | More data per operation | Consider compression |

### 6.3 Paymaster Support

Paymasters that sponsor transactions must also update for hybrid signatures:

```solidity
function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external returns (bytes memory context, uint256 validationData) {
    // Paymaster may have its own signature in paymasterAndData
    // Must also support hybrid signatures for paymaster approval
    bytes memory paymasterSig = extractPaymasterSignature(userOp.paymasterAndData);

    // Validate using same crypto-agile pattern
    bool valid = verifyHybridSignature(
        keccak256(abi.encode(userOpHash, maxCost)),
        decodeHybridSignature(paymasterSig),
        cryptoRegistry,
        getCurrentPolicy()
    );

    return (context, valid ? 0 : SIG_VALIDATION_FAILED);
}
```

---

## 7. Key Rotation Procedures

### 7.1 Product Key Rotation

Products may need key rotation without losing provenance chain. This is critical for luxury items with 10+ year lifecycles where:
- Original signing keys may become compromised
- Algorithm upgrades require new key types
- Ownership transfer may require key handover

**Key Rotation Protocol:**

```
Key Rotation Flow:

1. ANNOUNCE ROTATION
   - Emit KeyRotationInitiated event on-chain
   - Include old key hash, new key commitment
   - Grace period starts (7 days recommended)

   event KeyRotationInitiated(
       bytes32 indexed tokenId,
       bytes32 oldKeyHash,
       bytes32 newKeyCommitment,
       uint256 gracePeriodEnd
   );

2. DUAL-VALIDITY PERIOD
   - Both old and new keys accepted for verification
   - New attestations use new key
   - Old attestations remain valid
   - Duration: 7-30 days depending on product category

3. COMPLETE ROTATION
   - Emit KeyRotationCompleted event
   - Old key deactivated for NEW signatures only
   - Historical signatures with old key remain valid forever

   event KeyRotationCompleted(
       bytes32 indexed tokenId,
       bytes32 oldKeyHash,
       bytes32 newKeyHash,
       uint256 timestamp
   );

4. ARCHIVE OLD KEY
   - Store old public key in rotation history
   - Enable verification of historical signatures
   - NEVER delete - needed for provenance verification
```

### 7.2 Algorithm Upgrade Path

When upgrading from classical (ECDSA) to hybrid (ECDSA + ML-DSA):

| Step | Action | On-Chain Event |
|------|--------|----------------|
| 1 | Generate new PQC keypair | - |
| 2 | Register PQC key alongside ECDSA | `PQCKeyRegistered(tokenId, algorithmId, publicKey)` |
| 3 | Issue dual-key attestation | Links old and new keys cryptographically |
| 4 | Begin signing with hybrid format | Both signatures required |
| 5 | Historical signatures remain valid | No re-signing needed |

**Critical Rule:** NEVER invalidate old signatures. Products have 10+ year lifecycle and provenance chain must remain verifiable.

### 7.3 Emergency Key Revocation

In case of key compromise:

```solidity
event KeyRevoked(
    bytes32 indexed tokenId,
    bytes32 keyHash,
    string reason,
    uint256 timestamp
);
```

**Revocation does NOT invalidate historical signatures** - it only prevents new signatures from being accepted with that key.

---

## 8. Implementation Notes

### 8.1 Library Recommendations

| Language | Classical Crypto | Post-Quantum Crypto |
|----------|------------------|---------------------|
| TypeScript | @noble/curves, @noble/secp256k1 | @noble/post-quantum (when stable) |
| Rust | ring, ed25519-dalek, secp256k1 | pqcrypto, oqs-rs, ml-dsa |
| Solidity | ecrecover (native), OpenZeppelin | Precompile (future EIP), custom verifier |
| Go | crypto/ecdsa, crypto/ed25519 | cloudflare/circl, go-pqcrypto |
| Python | cryptography, ecdsa | pqcrypto, liboqs-python |

### 8.2 Performance Considerations

| Algorithm | Sign Time | Verify Time | Gas (EVM) | Notes |
|-----------|-----------|-------------|-----------|-------|
| ECDSA-secp256k1 | ~50 us | ~100 us | 3000 | Native ecrecover |
| Ed25519 | ~40 us | ~80 us | ~10000 | No native support |
| ML-DSA-44 | ~150 us | ~80 us | TBD | Awaiting precompile |
| ML-DSA-65 | ~200 us | ~100 us | TBD | Comparable verify time |
| ML-DSA-87 | ~300 us | ~150 us | TBD | Higher security |
| SLH-DSA-128s | ~5 ms | ~500 us | TBD | Slower, conservative |

**Hybrid overhead:** Expect ~2x verify time during transition (both algorithms checked).

### 8.3 Storage Impact

Plan for larger key and signature storage in off-chain systems:

| Data Type | Classical (ECDSA) | PQC (ML-DSA-65) | Hybrid |
|-----------|-------------------|-----------------|--------|
| Public Key | 33 bytes | 1952 bytes | ~2000 bytes |
| Signature | 65 bytes | 3309 bytes | ~3400 bytes |
| Private Key | 32 bytes | 4032 bytes | ~4100 bytes |

**Storage recommendations:**
- Off-chain databases must accommodate larger blobs
- IPFS CIDs remain constant size (hash-based addressing)
- On-chain storage should minimize PQC material (store commitments, not full keys)

### 8.4 Testing Strategy

1. **Unit tests**: Each algorithm verifier independently
2. **Integration tests**: Hybrid verification with mock policies
3. **Interoperability tests**: Verify against NIST test vectors
4. **Fuzz testing**: Invalid signature/key combinations
5. **Performance benchmarks**: Track regression as algorithms change

---

## Appendix A: NIST PQC Timeline Reference

| Date | Milestone |
|------|-----------|
| August 2024 | FIPS 203, 204, 205 published |
| 2024-2026 | Early adopter implementations |
| 2027 | Expected widespread library support |
| 2030 | NIST recommended full transition |
| 2030+ | Classical algorithms deprecated |

## Appendix B: Related Specifications

- [IDENTITY](../identity/onchainid-specification.md) - Uses crypto-agile signatures for DID authentication
- [TOKEN](../token/ownership-transfer.md) - Token attestations use hybrid signatures
- [RESOLVER](../resolver/resolution-protocol.md) - Resolver responses signed with crypto-agile scheme

---

*This specification addresses FOUND-06: Crypto-agile specification for post-quantum readiness.*
