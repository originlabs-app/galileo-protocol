import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";

/**
 * Compute a CIDv1 from a file buffer.
 *
 * Uses SHA-256 hash with the `raw` codec — the same approach used by IPFS
 * for content-addressing. Deterministic: same bytes always produce the same CID.
 */
export async function computeCid(buffer: Buffer): Promise<string> {
  const hash = await sha256.digest(new Uint8Array(buffer));
  const cid = CID.create(1, raw.code, hash);
  return cid.toString();
}
