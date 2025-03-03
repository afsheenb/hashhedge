// src/components/security/SecurityExplainer.tsx
import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Divider,
  Alert,
  AlertIcon,
  Flex,
  Image,
  Link,
  Badge,
  HStack,
  Button,
  useColorMode,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  LockIcon,
  UnlockIcon,
  InfoIcon,
  WarningIcon,
  ExternalLinkIcon,
  TimeIcon,
  DownloadIcon,
} from '@chakra-ui/icons';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { downloadExitTransactions } from '../../features/wallet/arkWalletSlice';

const SecurityExplainer: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  
  const handleDownloadExitTx = () => {
    dispatch(downloadExitTransactions());
  };
  
  return (
    <Box p={5} borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={4}>How HashHedge Protects Your Funds</Heading>
      
      <Text mb={5}>
        HashHedge is built on the Ark protocol, which provides cryptographic guarantees for fund
        safety. No matter what happens, you always maintain ultimate control over your Bitcoin.
      </Text>
      
      <Accordion allowToggle>
        <AccordionItem mb={3}>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontWeight="medium" py={2}>
                <HStack>
                  <LockIcon color="green.500" />
                  <Text>Pre-signed Exit Transactions</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={3}>
              <Text>
                When you deposit funds to HashHedge, we create and co-sign a special exit transaction
                that you can broadcast at any time to withdraw your funds.
              </Text>
              
              <Box p={3} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                <Heading size="xs" mb={2}>How It Works</Heading>
                <Text fontSize="sm">
                  1. During onboarding, a withdrawal transaction is created
                </Text>
                <Text fontSize="sm">
                  2. Both you and HashHedge sign this transaction
                </Text>
                <Text fontSize="sm">
                  3. You store this pre-signed transaction
                </Text>
                <Text fontSize="sm">
                  4. You can broadcast it anytime to withdraw funds
                </Text>
              </Box>
              
              <Alert status="info" variant="left-accent">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Why this matters</Text>
                  <Text fontSize="sm">
                    This guarantees that even if HashHedge becomes unresponsive or unavailable,
                    you can always recover your funds independently.
                  </Text>
                </Box>
              </Alert>
              
              <Button 
                leftIcon={<DownloadIcon />} 
                size="sm" 
                onClick={handleDownloadExitTx}
              >
                Download Exit Transactions
              </Button>
            </VStack>
          </AccordionPanel>
        </AccordionItem>
        
        <AccordionItem mb={3}>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontWeight="medium" py={2}>
                <HStack>
                  <TimeIcon color="orange.500" />
                  <Text>Timelock Escape Paths</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={3}>
              <Text>
                All funds in HashHedge are secured by timelocks. After a predefined period,
                the timelock expires and you can unilaterally withdraw your funds using just your key.
              </Text>
              
              <Box p={3} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                <Heading size="xs" mb={2}>How Timelocks Work</Heading>
                <Text fontSize="sm">
                  1. When you deposit, a Bitcoin timelock is created (typically 30 days)
                </Text>
                <Text fontSize="sm">
                  2. During this period, normal cooperative operations continue
                </Text>
                <Text fontSize="sm">
                  3. If the timelock expires, an alternative script path activates
                </Text>
                <Text fontSize="sm">
                  4. You can then spend using just your signature (no ASP cooperation needed)
                </Text>
              </Box>
              
              <Alert status="info" variant="left-accent">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Technical details</Text>
                  <Text fontSize="sm">
                    This uses Bitcoin's OP_CHECKLOCKTIMEVERIFY instruction in a Taproot script path
                    to enforce that funds can be spent unilaterally after the timelock expires.
                  </Text>
                </Box>
              </Alert>
              
              <Flex justify="center">
                <Box position="relative" p={3} width="full" maxW="400px">
                  <Box bg={colorMode === "light" ? "white" : "gray.800"} borderWidth="1px" borderRadius="md" p={4}>
                    <Heading size="xs" mb={3} textAlign="center">Timelock Visualization</Heading>
                    <Box position="relative" height="60px">
                      <Divider orientation="horizontal" position="absolute" top="30px" width="100%" />
                      
                      {/* Start marker */}
                      <Box position="absolute" left="0" top="20px">
                        <LockIcon color="orange.500" />
                        <Text fontSize="xs" mt={1}>Deposit</Text>
                      </Box>
                      
                      {/* Current position marker */}
                      <Box position="absolute" left="40%" top="15px">
                        <TimeIcon color="blue.500" />
                        <Text fontSize="xs" mt={1}>Now</Text>
                      </Box>
                      
                      {/* End marker */}
                      <Box position="absolute" right="0" top="20px">
                        <UnlockIcon color="green.500" />
                        <Text fontSize="xs" mt={1}>Unlocked</Text>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Flex>
            </VStack>
          </AccordionPanel>
        </AccordionItem>
        
        <AccordionItem mb={3}>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontWeight="medium" py={2}>
                <HStack>
                  <CheckCircleIcon color="blue.500" />
                  <Text>2-of-2 Multisig with Timeout</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={3}>
              <Text>
                Contracts in HashHedge use 2-of-2 multisig (requiring both parties' signatures)
                for normal operation, but include timeout mechanisms to prevent either party from
                blocking settlement.
              </Text>
              
              <Box p={3} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                <Heading size="xs" mb={2}>How It Works</Heading>
                <Text fontSize="sm">
                  1. Both parties sign transactions in the normal case
                </Text>
                <Text fontSize="sm">
                  2. If one party becomes unresponsive, the timeout activates
                </Text>
                <Text fontSize="sm">
                  3. After timeout, alternative paths allow unilateral settlement
                </Text>
                <Text fontSize="sm">
                  4. Contract outcome is determined by verifiable on-chain data
                </Text>
              </Box>
              
              <Alert status="info" variant="left-accent">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Anti-griefing protection</Text>
                  <Text fontSize="sm">
                    This prevents malicious actors from griefing by refusing to cooperate.
                    No matter what, contracts will eventually settle and funds will be returned
                    to their rightful owner.
                  </Text>
                </Box>
              </Alert>
            </VStack>
          </AccordionPanel>
        </AccordionItem>
        
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontWeight="medium" py={2}>
                <HStack>
                  <InfoIcon color="purple.500" />
                  <Text>Advanced Security Details</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={3}>
              <Text>
                HashHedge uses several advanced Bitcoin scripting techniques to provide these
                security guarantees.
              </Text>
              
              <Divider />
              
              <Box>
                <Heading size="xs" mb={2}>Taproot Scripts</Heading>
                <Text fontSize="sm">
                  We use Bitcoin's Taproot feature to hide multiple spending paths in a single address.
                  This provides both privacy and the ability to include multiple exit conditions.
                </Text>
              </Box>
              
              <Box>
                <Heading size="xs" mb={2}>MuSig2 Signatures</Heading>
                <Text fontSize="sm">
                  We use MuSig2 for multi-signature cooperation, allowing multiple parties to
                  create a single signature that's indistinguishable from a regular signature.
                </Text>
              </Box>
              
              <Box>
                <Heading size="xs" mb={2}>VTXO Sweeper</Heading>
                <Text fontSize="sm">
                  The HashHedge system includes an automated VTXO sweeper that continuously
                  monitors for expired contracts and attempts to recover funds.
                </Text>
              </Box>
              
              <Divider />
              
              <Link 
                href="https://docs.hashhedge.com/security" 
                isExternal 
                color="blue.500"
                display="inline-flex"
                alignItems="center"
              >
                Read our full security documentation <ExternalLinkIcon mx="2px" />
              </Link>
            </VStack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      
      <Alert status="success" mt={5}>
        <AlertIcon />
        <Box>
          <AlertTitle>Your Keys, Your Bitcoin</AlertTitle>
          <AlertDescription>
            HashHedge is built on the principle that you should always maintain ultimate
            control over your funds, with multiple paths to recover your Bitcoin in any circumstance.
          </AlertDescription>
        </Box>
      </Alert>
    </Box>
  );
};

export default SecurityExplainer;
