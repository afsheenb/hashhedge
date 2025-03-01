
/**
 * Validate a Bitcoin public key
 * @param pubKey Public key in hex format
 * @returns Whether the key is valid
 */
export const isValidPublicKey = (pubKey: string): boolean => {
  // Simple validation - in reality, would check more thoroughly
  const hexRegex = /^[0-9a-fA-F]{64,66}$/;
  return hexRegex.test(pubKey);
};

/**
 * Validate Bitcoin transaction hex
 * @param txHex Transaction hex string
 * @returns Whether the transaction is valid
 */
export const isValidTransactionHex = (txHex: string): boolean => {
  // Simple validation - in reality, would check more thoroughly
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(txHex) && txHex.length > 20;
};

/**
 * Validate a Bitcoin block height
 * @param height Block height
 * @returns Whether the height is valid
 */
export const isValidBlockHeight = (height: number): boolean => {
  return Number.isInteger(height) && height >= 0;
};

/**
 * Validate a hash rate value
 * @param hashRate Hash rate in EH/s
 * @returns Whether the hash rate is valid
 */
export const isValidHashRate = (hashRate: number): boolean => {
  return !isNaN(hashRate) && hashRate > 0;
};

