
/**
 * Format a Bitcoin amount in satoshis to a human-readable string
 * @param sats Amount in satoshis
 * @param includeBTC Whether to show BTC for large amounts
 * @returns Formatted string
 */
export const formatSats = (sats: number, includeBTC: boolean = true): string => {
  if (includeBTC && sats >= 100000000) {
    return `${(sats / 100000000).toFixed(8)} BTC`;
  } else {
    return `${sats.toLocaleString()} sats`;
  }
};

/**
 * Return a placeholder value for the current Bitcoin block height
 * In a real implementation, this would fetch from an API or blockchain source
 */
export const getBestBlockHeight = (): number => {
  // Placeholder for current block height, would be fetched from API in production
  return 800500;
};

/**
 * Format a timestamp string to a human-readable date format
 * @param timestamp ISO timestamp string
 * @param includeTime Whether to include the time
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: string, includeTime: boolean = true): string => {
  const date = new Date(timestamp);
  if (includeTime) {
    return date.toLocaleString();
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Return a CSS color based on contract type
 * @param type Contract type ('CALL' or 'PUT')
 * @returns Color string
 */
export const getContractTypeColor = (type: string): string => {
  return type === 'CALL' ? 'teal' : 'purple';
};

/**
 * Return a CSS color based on contract status
 * @param status Contract status
 * @returns Color string
 */
export const getContractStatusColor = (status: string): string => {
  switch (status) {
    case 'CREATED':
      return 'yellow';
    case 'ACTIVE':
      return 'green';
    case 'SETTLED':
      return 'blue';
    case 'EXPIRED':
      return 'orange';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Calculate time remaining until a target date
 * @param targetDate Target date as ISO string
 * @returns Formatted time remaining string
 */
export const getTimeRemaining = (targetDate: string): string => {
  const target = new Date(targetDate).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

