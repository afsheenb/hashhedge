import React from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  IconButton,
  useToast,
  Tooltip,
  useClipboard,
  useColorMode,
} from '@chakra-ui/react';
import { DeleteIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { UserKey } from '../../types';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { deleteUserKey } from '../../store/auth-slice';

interface UserKeyItemProps {
  userKey: UserKey;
}

const UserKeyItem: React.FC<UserKeyItemProps> = ({ userKey }) => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(userKey.pub_key);

  const handleDelete = async () => {
    try {
      await dispatch(deleteUserKey(userKey.id)).unwrap();
      toast({
        title: 'Key deleted',
        description: `The key "${userKey.label}" has been removed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      shadow="sm"
    >
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Box flex="1">
          <Flex alignItems="center" mb={2}>
            <Text fontWeight="bold" mr={2}>
              {userKey.label}
            </Text>
            <Badge colorScheme="blue">{userKey.key_type}</Badge>
          </Flex>
          <Flex alignItems="center">
            <Text
              fontSize="sm"
              color="gray.500"
              isTruncated
              maxWidth="300px"
              mr={2}
            >
              {userKey.pub_key}
            </Text>
            <Tooltip
              label={hasCopied ? 'Copied!' : 'Copy to clipboard'}
              placement="top"
              hasArrow
            >
              <IconButton
                aria-label="Copy public key"
                icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                size="xs"
                variant="ghost"
                onClick={onCopy}
              />
            </Tooltip>
          </Flex>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Added on {format(new Date(userKey.created_at), 'MMM d, yyyy')}
          </Text>
        </Box>
        <IconButton
          aria-label="Delete key"
          icon={<DeleteIcon />}
          colorScheme="red"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
        />
      </Flex>
    </Box>
  );
};

export default UserKeyItem;

