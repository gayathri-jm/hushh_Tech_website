/**
 * ChatNode Component - Hushh Intelligence Chat Interface
 * 
 * Free, unlimited AI chat powered by Gemini with Hushh branding
 * Features: Chat, File Upload, Image Upload
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Icon,
  IconButton,
  Spinner,
  Avatar,
  Flex,
  useToast,
  Textarea,
  Image,
  Badge,
  Tooltip,
  Collapse,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSend,
  FiPaperclip,
  FiImage,
  FiX,
  FiChevronDown,
  FiTrash2,
  FiMessageCircle,
} from 'react-icons/fi';
import {
  sendChatMessage,
  createUserMessage,
  createAssistantMessage,
  isFileTypeSupported,
  isFileSizeValid,
  getReadableFileSize,
  ChatMessage,
} from '../services/hushhIntelligence';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

// Storage key for chat persistence
const CHAT_STORAGE_KEY = 'hushh_chatnode_messages';

// Welcome message from Hushh Intelligence
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 Welcome to **Hushh Intelligence** - the world's first privacy-first AI assistant!

I'm here to help you with anything you need:
- 💬 Chat about any topic
- 📁 Analyze documents and files
- 🖼️ Understand images
- 💡 Get creative ideas
- 🔧 Help with coding and technical questions

Feel free to upload images or files - I can analyze them for you!

*How can I assist you today?*`,
  timestamp: new Date(),
};

// Helper to load messages from localStorage
const loadMessagesFromStorage = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (e) {
    console.warn('Failed to load chat history:', e);
  }
  return [WELCOME_MESSAGE];
};

// Helper to save messages to localStorage
const saveMessagesToStorage = (messages: ChatMessage[]) => {
  try {
    // Only save last 100 messages to avoid storage limits
    const toSave = messages.slice(-100);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
};

interface ChatNodeProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ChatNode: React.FC<ChatNodeProps> = ({ isOpen = true, onClose }) => {
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State - Load from localStorage on init
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessagesFromStorage());

  // Save messages to localStorage whenever they change
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isFileTypeSupported(file)) {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload text, code, or image files',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!isFileSizeValid(file)) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setAttachedFile(file);
    toast({
      title: 'File attached',
      description: file.name,
      status: 'success',
      duration: 2000,
    });
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!isFileSizeValid(file)) {
      toast({
        title: 'Image too large',
        description: 'Maximum size is 10MB',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setAttachedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove attachments
  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Send message
  const handleSend = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput && !attachedFile && !attachedImage) return;

    // Create user message
    const userMessage = createUserMessage(
      trimmedInput || (attachedImage ? 'What do you see in this image?' : 'Please analyze this file'),
      [
        ...(attachedImage ? [{ type: 'image' as const, name: attachedImage.name, mimeType: attachedImage.type }] : []),
        ...(attachedFile ? [{ type: 'file' as const, name: attachedFile.name, mimeType: attachedFile.type }] : []),
      ]
    );

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Send to API
    const response = await sendChatMessage(
      trimmedInput,
      messages.filter((m) => m.id !== 'welcome'),
      attachedImage || undefined,
      attachedFile || undefined
    );

    // Clear attachments
    removeFile();
    removeImage();

    // Add assistant response
    const assistantMessage = createAssistantMessage(response.response);
    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    toast({
      title: 'Chat cleared',
      status: 'info',
      duration: 2000,
    });
  };

  // Render markdown-style text (simple version)
  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Bold text
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic text
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Code
      processedLine = processedLine.replace(/`(.*?)`/g, '<code style="background:#2d2d2d;padding:2px 6px;border-radius:4px;font-size:0.9em;">$1</code>');

      return (
        <Text
          key={i}
          dangerouslySetInnerHTML={{ __html: processedLine || '&nbsp;' }}
          lineHeight="1.7"
          sx={{
            '& strong': { fontWeight: 600 },
            '& em': { fontStyle: 'italic' },
          }}
        />
      );
    });
  };

  if (!isOpen) return null;

  return (
    <Box
      w="100%"
      h="100vh"
      bg="linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Header */}
      <Flex
        px={4}
        py={3}
        bg="whiteAlpha.50"
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <HStack spacing={3}>
          <Box
            bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            p={2}
            borderRadius="full"
          >
            <Icon as={FiMessageCircle} color="white" boxSize={5} />
          </Box>
          <VStack align="start" spacing={0}>
            <Text color="white" fontWeight="600" fontSize="md">
              Hushh Intelligence
            </Text>
            <Text color="gray.400" fontSize="xs">
              Privacy-First AI • Free & Unlimited
            </Text>
          </VStack>
        </HStack>

        <HStack spacing={2}>
          <Tooltip label="Clear chat">
            <IconButton
              aria-label="Clear chat"
              icon={<FiTrash2 />}
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'red.400', bg: 'whiteAlpha.100' }}
              size="sm"
              onClick={handleClearChat}
            />
          </Tooltip>
          {onClose && (
            <IconButton
              aria-label="Close"
              icon={<FiX />}
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
              size="sm"
              onClick={onClose}
            />
          )}
        </HStack>
      </Flex>

      {/* Messages */}
      <Box flex={1} overflowY="auto" px={4} py={4}>
        <VStack spacing={4} align="stretch" maxW="800px" mx="auto">
          <AnimatePresence>
            {messages.map((message) => (
              <MotionBox
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Flex
                  gap={3}
                  flexDirection={message.role === 'user' ? 'row-reverse' : 'row'}
                >
                  {/* Avatar */}
                  <Avatar
                    size="sm"
                    bg={message.role === 'user' ? 'purple.500' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
                    icon={message.role === 'user' ? undefined : <Icon as={FiMessageCircle} />}
                    name={message.role === 'user' ? 'You' : undefined}
                  />

                  {/* Message Bubble */}
                  <Box
                    maxW="75%"
                    bg={message.role === 'user' ? 'purple.600' : 'whiteAlpha.100'}
                    color="white"
                    px={4}
                    py={3}
                    borderRadius={message.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px'}
                    boxShadow="lg"
                  >
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <HStack mb={2} flexWrap="wrap" gap={2}>
                        {message.attachments.map((att, i) => (
                          <Badge
                            key={i}
                            colorScheme={att.type === 'image' ? 'green' : 'blue'}
                            variant="subtle"
                            fontSize="xs"
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {att.type === 'image' ? '🖼️' : '📎'} {att.name}
                          </Badge>
                        ))}
                      </HStack>
                    )}

                    {/* Content */}
                    <Box fontSize="sm">{renderMessageContent(message.content)}</Box>
                  </Box>
                </Flex>
              </MotionBox>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isLoading && (
            <MotionFlex
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              gap={3}
            >
              <Avatar
                size="sm"
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                icon={<Icon as={FiMessageCircle} />}
              />
              <Box
                bg="whiteAlpha.100"
                px={4}
                py={3}
                borderRadius="20px 20px 20px 4px"
              >
                <HStack spacing={1}>
                  <Spinner size="xs" color="purple.400" />
                  <Text fontSize="sm" color="gray.400">
                    Thinking...
                  </Text>
                </HStack>
              </Box>
            </MotionFlex>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input Area */}
      <Box
        px={4}
        py={3}
        bg="whiteAlpha.50"
        backdropFilter="blur(10px)"
        borderTop="1px solid"
        borderColor="whiteAlpha.100"
        flexShrink={0}
      >
        {/* Attachment Preview */}
        <Collapse in={!!(attachedFile || imagePreview)} animateOpacity>
          <HStack mb={3} flexWrap="wrap" gap={2}>
            {imagePreview && (
              <Box position="relative">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  maxH="80px"
                  borderRadius="md"
                  border="2px solid"
                  borderColor="purple.500"
                />
                <IconButton
                  aria-label="Remove image"
                  icon={<FiX />}
                  size="xs"
                  colorScheme="red"
                  borderRadius="full"
                  position="absolute"
                  top="-8px"
                  right="-8px"
                  onClick={removeImage}
                />
              </Box>
            )}
            {attachedFile && (
              <Badge
                colorScheme="blue"
                variant="solid"
                px={3}
                py={2}
                borderRadius="full"
                display="flex"
                alignItems="center"
                gap={2}
              >
                📎 {attachedFile.name} ({getReadableFileSize(attachedFile.size)})
                <IconButton
                  aria-label="Remove file"
                  icon={<FiX />}
                  size="xs"
                  variant="ghost"
                  minW="auto"
                  h="auto"
                  p={0}
                  onClick={removeFile}
                />
              </Badge>
            )}
          </HStack>
        </Collapse>

        {/* Input Row */}
        <HStack spacing={2} maxW="800px" mx="auto">
          {/* File Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".txt,.json,.js,.ts,.py,.html,.css,.md,.pdf"
            style={{ display: 'none' }}
          />
          <Tooltip label="Attach file">
            <IconButton
              aria-label="Attach file"
              icon={<FiPaperclip />}
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'purple.400', bg: 'whiteAlpha.100' }}
              onClick={() => fileInputRef.current?.click()}
              isDisabled={isLoading}
            />
          </Tooltip>

          {/* Image Upload */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <Tooltip label="Upload image">
            <IconButton
              aria-label="Upload image"
              icon={<FiImage />}
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'green.400', bg: 'whiteAlpha.100' }}
              onClick={() => imageInputRef.current?.click()}
              isDisabled={isLoading}
            />
          </Tooltip>

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hushh Intelligence anything..."
            size="md"
            bg="whiteAlpha.100"
            border="none"
            color="white"
            _placeholder={{ color: 'gray.500' }}
            _focus={{ boxShadow: 'none', bg: 'whiteAlpha.150' }}
            resize="none"
            rows={1}
            minH="44px"
            maxH="120px"
            borderRadius="full"
            px={4}
            py={3}
            isDisabled={isLoading}
            sx={{
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          />

          {/* Send Button */}
          <Button
            colorScheme="purple"
            borderRadius="full"
            px={6}
            onClick={handleSend}
            isLoading={isLoading}
            isDisabled={!inputValue.trim() && !attachedFile && !attachedImage}
            leftIcon={<FiSend />}
            bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            _hover={{
              transform: 'scale(1.02)',
              boxShadow: '0 0 20px rgba(102, 126, 234, 0.4)',
            }}
          >
            Send
          </Button>
        </HStack>

        {/* Footer Note */}
        <Text
          color="gray.600"
          fontSize="xs"
          textAlign="center"
          mt={2}
        >
          Hushh Intelligence • Your conversations are private
        </Text>
      </Box>
    </Box>
  );
};

export default ChatNode;
