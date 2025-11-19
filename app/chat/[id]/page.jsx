'use client';

import { use } from 'react';
import ChatPage from '../page';

export default function ChatWithId({ params }) {
  const { id } = use(params);
  return <ChatPage conversationId={id} />;
}
