import express from 'express';
import { protect } from '../../middleware/auth';
import * as chat from './chat.controller';

const router = express.Router();

router.use(protect);

router.get('/conversations', chat.getConversations);
router.post('/conversations', chat.createConversation);
router.get('/conversations/:conversationId/messages', chat.getMessages);
router.patch('/conversations/:conversationId', chat.updateConversation);
router.delete('/conversations/:conversationId', chat.deleteConversation);
router.delete('/messages/:messageId', chat.deleteMessage);
router.get('/users/search', chat.searchUsers);

export default router;
