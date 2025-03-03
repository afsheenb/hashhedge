// src/pages/OfflineExitTool.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Textarea,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Code,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Divider,
  Link,
  HStack,
  Badge,
  useClipboard,
  Select,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import {
  WarningIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  DownloadIcon,
  CopyIcon,
} from '@chakra-ui/icons';

// We'll use these in a real implementation
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as varuint from 'varuint-bitcoin';

// Initialize libraries
bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

const OfflineExitTool: React.FC = () => {
  const [exitTxHex, setExitTxHex] = useState('');
  const [exitTxJson, setExitTxJson] = useState('');
  const [inputMethod, setInputMethod] = useState('hex');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [feeRate, setFeeRate] = useState('5');
  const [network, setNetwork] = useState('mainnet');
  const [isLoading, setIsLoading] = useState(false);
  const [psbtBase64, setPsbtBase64] = useState('');
  const [txData, setTxData] = useState<any>(null);
  const [formErrors, setFormErrors] = useState({
    exitTxHex: '',
    exitTxJson: '',
    destinationAddress: '',
  });
  
  const toast = useToast();
  const { hasCopied: hasCopiedPsbt, onCopy: onCopyPsbt } = useClipboard(psbtBase64);
  
  // Process exit transaction
  const handleCreatePSBT = () => {
    // Reset errors and state
    setFormErrors({
      exitTxHex: '',
      exitTxJson: '',
      destinationAddress: '',
    });
    setPsbtBase64('');
    setTxData(null);
    
    // Validate inputs
    let isValid = true;
    
    if (inputMethod === 'hex') {
      if (!exitTxHex.trim()) {
        setFormErrors(prev => ({ ...prev, exitTxHex: 'Exit transaction hex is required' }));
        isValid = false;
      } else if (!/^[0-9a-fA-F]+$/.test(exitTxHex.trim())) {
        setFormErrors(prev => ({ ...prev, exitTxHex: 'Invalid hex format' }));
        isValid = false;
      }
    } else {
      if (!exitTxJson.trim()) {
        setFormErrors(prev => ({ ...prev, exitTxJson: 'Exit transaction JSON is required' }));
        isValid = false;
      } else {
        try {
          JSON.parse(exitTxJson);
        } catch (e) {
          setFormErrors(prev => ({ ...prev, exitTxJson: 'Invalid JSON format' }));
          isValid = false;
        }
      }
    }
    
    if (!destinationAddress.trim()) {
      setFormErrors(prev => ({ ...prev, destinationAddress: 'Destination address is required' }));
      isValid = false;
    } else {
      try {
        // Validate Bitcoin address
        const networkObj = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        bitcoin.address.toOutputScript(destinationAddress, networkObj);
      } catch (e) {
        setFormErrors(prev => ({ ...prev, destinationAddress: 'Invalid Bitcoin address' }));
        isValid = false;
      }
    }
    
    if (!isValid) return;
    
    // Process the transaction
    setIsLoading(true);
    
    try {
      const networkObj = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
      let exitTransaction;
      
      // Parse the input transaction
      if (inputMethod === 'hex') {
        const txBuffer = Buffer.from(exitTxHex, 'hex');
        exitTransaction = bitcoin.Transaction.fromBuffer(txBuffer);
      } else {
        const txData = JSON.parse(exitTxJson);
        // Reconstruct transaction from JSON format
        // This assumes a specific JSON structure that matches your export format
        exitTransaction = new bitcoin.Transaction();
        
        // Populate the transaction from the JSON data
        exitTransaction.version = txData.version;
        
        // Add inputs
        txData.inputs.forEach((input: any) => {
          const txid = Buffer.from(input.txid, 'hex').reverse(); // Bitcoin uses little-endian
          const txInput = new bitcoin.TxInput(txid, input.vout);
          txInput.sequence = input.sequence;
          if (input.scriptSig) {
            txInput.scriptSig = Buffer.from(input.scriptSig, 'hex');
          }
          exitTransaction.ins.push(txInput);
        });
        
        // Add outputs
        txData.outputs.forEach((output: any) => {
          exitTransaction.outs.push({
            value: output.value,
            scriptPubKey: Buffer.from(output.scriptPubKey, 'hex')
          });
        });
        
        // Set locktime if present
        if (txData.locktime) {
          exitTransaction.locktime = txData.locktime;
        }
      }
      
      // Create a PSBT
      const psbt = new bitcoin.Psbt({ network: networkObj });
      
      // Add input from the exit transaction
      // Assuming the exit transaction output 0 is the one we want to spend
      // In a real scenario, you might need to analyze the transaction to find the correct output
      const txid = exitTransaction.getId();
      const outputIndex = 0; // This might need to be determined dynamically
      
      // We need the previous output's script and value
      // This would typically come from an indexer or blockchain API
      // For this tool, we'll assume it's provided in the transaction data
      const prevOutValue = exitTransaction.outs[outputIndex].value;
      const prevOutScript = exitTransaction.outs[outputIndex].scriptPubKey;
      
      // Add input to the PSBT - this is a simplified example
      psbt.addInput({
        hash: txid,
        index: outputIndex,
        witnessUtxo: {
          script: prevOutScript,
          value: prevOutValue,
        },
        // For Taproot, we need to add tap internal key and merkle root
        // This would come from analyzing the script in a real implementation
      });
      
      // Add output to the destination address
      // Deduct fee based on fee rate
      const feeRateValue = parseInt(feeRate);
      const estimatedSize = 200; // Approximate size in bytes, would be calculated properly in production
      const fee = estimatedSize * feeRateValue;
      const outputValue = prevOutValue - fee;
      
      if (outputValue <= 0) {
        throw new Error(`Fee (${fee} sats) exceeds available amount (${prevOutValue} sats)`);
      }
      
      psbt.addOutput({
        address: destinationAddress,
        value: outputValue,
      });
      
      // Convert PSBT to base64 string
      const psbtBase64String = psbt.toBase64();
      setPsbtBase64(psbtBase64String);
      
      // Save transaction data for display
      setTxData({
        txid: txid,
        inputValue: prevOutValue,
        outputValue: outputValue,
        fee: fee,
        feeRate: feeRateValue,
        destinationAddress: destinationAddress,
      });
      
      toast({
        title: 'PSBT created successfully',
        description: 'You can now download this PSBT to sign offline',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error creating PSBT:', error);
      toast({
        title: 'Error creating PSBT',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Download PSBT file
  const handleDownloadPSBT = () => {
    if (!psbtBase64) return;
    
    const element = document.createElement('a');
    const file = new Blob([psbtBase64], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `emergency-exit-${new Date().toISOString().slice(0, 10)}.psbt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: 'PSBT downloaded',
      description: 'You can now sign this file with your offline wallet',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  return (
    <Box maxW="800px" mx="auto" p={5}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={3}>HashHedge Offline Exit Tool</Heading>
          <Text>
            This tool helps you prepare an exit transaction to recover your funds when HashHedge services are unavailable.
            You can create a PSBT (Partially Signed Bitcoin Transaction) and sign it offline.
          </Text>
        </Box>
        
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>Emergency Use Only</AlertTitle>
            <AlertDescription>
              This tool is designed for emergency situations when normal withdrawal methods are unavailable.
              The generated transaction will exit all your funds from the platform.
            </AlertDescription>
          </Box>
        </Alert>
        
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Create PSBT</Tab>
            <Tab>Sign & Broadcast</Tab>
            <Tab>How to Use</Tab>
          </TabList>
          
          <TabPanels>
            {/* Create PSBT Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Network</FormLabel>
                  <Select 
                    value={network} 
                    onChange={(e) => setNetwork(e.target.value)}
                  >
                    <option value="mainnet">Mainnet</option>
                    <option value="testnet">Testnet</option>
                  </Select>
                  <FormHelperText>
                    Select the Bitcoin network of your transaction
                  </FormHelperText>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Input Method</FormLabel>
                  <RadioGroup onChange={setInputMethod} value={inputMethod}>
                    <Stack direction="row">
                      <Radio value="hex">Transaction Hex</Radio>
                      <Radio value="json">Transaction JSON</Radio>
                    </Stack>
                  </RadioGroup>
                </FormControl>
                
                {inputMethod === 'hex' ? (
                  <FormControl isInvalid={!!formErrors.exitTxHex}>
                    <FormLabel>Exit Transaction Hex</FormLabel>
                    <Textarea
                      placeholder="Paste your exit transaction hex here"
                      value={exitTxHex}
                      onChange={(e) => setExitTxHex(e.target.value)}
                      height="100px"
                    />
                    {formErrors.exitTxHex ? (
                      <FormHelperText color="red.500">{formErrors.exitTxHex}</FormHelperText>
                    ) : (
                      <FormHelperText>
                        This is the pre-signed exit transaction you downloaded from HashHedge
                      </FormHelperText>
                    )}
                  </FormControl>
                ) : (
                  <FormControl isInvalid={!!formErrors.exitTxJson}>
                    <FormLabel>Exit Transaction JSON</FormLabel>
                    <Textarea
                      placeholder="Paste your exit transaction JSON here"
                      value={exitTxJson}
                      onChange={(e) => setExitTxJson(e.target.value)}
                      height="100px"
                    />
                    {formErrors.exitTxJson ? (
                      <FormHelperText color="red.500">{formErrors.exitTxJson}</FormHelperText>
                    ) : (
                      <FormHelperText>
                        The JSON representation of your exit transaction
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
                
                <FormControl isInvalid={!!formErrors.destinationAddress}>
                  <FormLabel>Your Bitcoin Destination Address</FormLabel>
                  <Input
                    placeholder="Enter the Bitcoin address where you want to receive funds"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                  />
                  {formErrors.destinationAddress ? (
                    <FormHelperText color="red.500">{formErrors.destinationAddress}</FormHelperText>
                  ) : (
                    <FormHelperText>
                      Your funds will be sent to this address after signing and broadcasting
                    </FormHelperText>
                  )}
                </FormControl>
                
                <FormControl>
                  <FormLabel>Fee Rate (sat/vB)</FormLabel>
                  <Select 
                    value={feeRate} 
                    onChange={(e) => setFeeRate(e.target.value)}
                  >
                    <option value="1">Economic (1 sat/vB)</option>
                    <option value="5">Standard (5 sat/vB)</option>
                    <option value="10">Priority (10 sat/vB)</option>
                    <option value="20">High Priority (20 sat/vB)</option>
                  </Select>
                  <FormHelperText>
                    Higher fees result in faster confirmation times
                  </FormHelperText>
                </FormControl>
                
                <Button
                  colorScheme="blue"
                  onClick={handleCreatePSBT}
                  isLoading={isLoading}
                  loadingText="Creating PSBT"
                  isDisabled={
                    (inputMethod === 'hex' && !exitTxHex) || 
                    (inputMethod === 'json' && !exitTxJson) || 
                    !destinationAddress
                  }
                >
                  Create PSBT
                </Button>
                
                {psbtBase64 && (
                  <Box p={4} borderWidth="1px" borderRadius="md" mt={3}>
                    <HStack mb={2}>
                      <CheckCircleIcon color="green.500" />
                      <Text fontWeight="bold">PSBT Created Successfully</Text>
                    </HStack>
                    
                    {txData && (
                      <Box mb={3}>
                        <Text fontSize="sm">Transaction ID: {txData.txid}</Text>
                        <Text fontSize="sm">Input Amount: {txData.inputValue} sats</Text>
                        <Text fontSize="sm">Output Amount: {txData.outputValue} sats</Text>
                        <Text fontSize="sm">Fee: {txData.fee} sats ({txData.feeRate} sat/vB)</Text>
                        <Text fontSize="sm">Destination: {txData.destinationAddress}</Text>
                      </Box>
                    )}
                    
                    <Text mb={2}>Your PSBT is ready for offline signing:</Text>
                    
                    <Box position="relative" mb={3}>
                      <Code p={2} borderRadius="md" w="full" fontSize="xs" overflowX="auto">
                        {psbtBase64.substring(0, 60)}...
                      </Code>
                      <Button
                        size="xs"
                        position="absolute"
                        top={1}
                        right={1}
                        onClick={onCopyPsbt}
                      >
                        {hasCopiedPsbt ? "Copied!" : "Copy"}
                      </Button>
                    </Box>
                    
                    <Button
                      leftIcon={<DownloadIcon />}
                      colorScheme="green"
                      onClick={handleDownloadPSBT}
                      width="full"
                    >
                      Download PSBT File
                    </Button>
                  </Box>
                )}
              </VStack>
            </TabPanel>
            
            {/* Sign & Broadcast Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text>
                  After creating and signing your PSBT offline, you can broadcast it to the Bitcoin network:
                </Text>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>Option 1: Use a Block Explorer</Heading>
                  <Text fontSize="sm" mb={3}>
                    Upload your signed PSBT or transaction to one of these block explorers:
                  </Text>
                  
                  <VStack align="stretch" spacing={2}>
                    <Link href="https://mempool.space/tx/push" isExternal color="blue.500">
                      Mempool.space <ExternalLinkIcon mx="2px" />
                    </Link>
                    <Link href="https://blockstream.info/tx/push" isExternal color="blue.500">
                      Blockstream.info <ExternalLinkIcon mx="2px" />
                    </Link>
                    <Link href="https://www.blockchain.com/explorer/assets/btc/broadcast-transaction" isExternal color="blue.500">
                      Blockchain.com <ExternalLinkIcon mx="2px" />
                    </Link>
                  </VStack>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>Option 2: Use a Bitcoin Node</Heading>
                  <Text fontSize="sm" mb={3}>
                    If you run a Bitcoin node, you can broadcast using:
                  </Text>
                  
                  <Code p={2} borderRadius="md" fontSize="sm" mb={3}>
                    bitcoin-cli sendrawtransaction &lt;signed_transaction_hex&gt;
                  </Code>
                  
                  <HStack>
                    <Badge colorScheme="green">Recommended</Badge>
                    <Text fontSize="sm">Most reliable method for transaction broadcast</Text>
                  </HStack>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>Option 3: Use a Wallet</Heading>
                  <Text fontSize="sm">
                    Many Bitcoin wallets (such as Sparrow, BlueWallet, or Electrum) can import and broadcast signed PSBTs.
                  </Text>
                </Box>
                
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Confirmation Time</AlertTitle>
                    <AlertDescription>
                      After broadcasting, your transaction may take some time to confirm depending on the fee rate.
                      You can check its status using a block explorer.
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>
            
            {/* How to Use Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text>
                  This offline tool allows you to prepare emergency exit transactions and sign them
                  independently when HashHedge services are unavailable. Follow these steps:
                </Text>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>1. Locate Your Exit Transaction</Heading>
                  <Text fontSize="sm">
                    Find the exit transaction file you downloaded when you deposited funds to HashHedge.
                    It could be in hex format or JSON format.
                  </Text>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>2. Create a PSBT</Heading>
                  <Text fontSize="sm">
                    Paste your exit transaction data, specify your destination address, and choose a fee rate.
                    Then click "Create PSBT" to generate a PSBT file.
                  </Text>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>3. Sign the PSBT Offline</Heading>
                  <Text fontSize="sm">
                    Download the PSBT file and transfer it to your offline device. Use your hardware wallet
                    or offline software wallet to sign the PSBT. Common options include:
                  </Text>
                  <VStack align="stretch" spacing={1} mt={2} pl={4}>
                    <Text fontSize="sm">• Sparrow Wallet</Text>
                    <Text fontSize="sm">• Bitcoin Core with HWI</Text>
                    <Text fontSize="sm">• Electrum Wallet</Text>
                    <Text fontSize="sm">• BlueWallet with hardware wallet</Text>
                  </VStack>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Heading size="sm" mb={2}>4. Broadcast the Signed Transaction</Heading>
                  <Text fontSize="sm">
                    Once signed, bring the transaction back to a connected device and broadcast it using
                    a block explorer, your own Bitcoin node, or a wallet with broadcast capabilities.
                  </Text>
                </Box>
                
                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Security Notice</AlertTitle>
                    <AlertDescription>
                      This tool runs entirely in your browser and does not transmit sensitive data to any server.
                      For maximum security, we recommend processing exit transactions on an air-gapped computer.
                    </AlertDescription>
                  </Box>
                </Alert>
                
                <Divider />
                
                <Box>
                  <Heading size="sm" mb={3}>Need More Help?</Heading>
                  <Text fontSize="sm" mb={3}>
                    If you're experiencing issues with HashHedge and need to use this emergency
                    tool, you can find additional resources:
                  </Text>
                  
                  <VStack align="stretch" spacing={2}>
                    <Link href="https://docs.hashhedge.com/emergency-exit" isExternal color="blue.500">
                      Emergency Exit Documentation <ExternalLinkIcon mx="2px" />
                    </Link>
                    <Link href="https://t.me/HashHedgeCommunity" isExternal color="blue.500">
                      Community Support Telegram <ExternalLinkIcon mx="2px" />
                    </Link>
                    <Link href="mailto:support@hashhedge.com" color="blue.500">
                      Email Support
                    </Link>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

export default OfflineExitTool;
