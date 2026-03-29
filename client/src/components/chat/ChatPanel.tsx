import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Users, X } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

interface ChatMessage {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface ChatPanelProps {
  tournamentId: string;
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  isOverlay?: boolean;
}

export default function ChatPanel({
  tournamentId,
  userId,
  userName,
  isOpen,
  onClose,
  isOverlay = false
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!isOpen) return;

    // Join chat room
    socket.emit('chat:join', { tournamentId });

    // Listen for chat history
    const handleHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    // Listen for new messages
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('chat:history', handleHistory);
    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:history', handleHistory);
      socket.off('chat:message', handleMessage);
    };
  }, [socket, tournamentId, isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('chat:message', {
      tournamentId,
      userId,
      userName,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (!isOpen) return null;

  // Overlay mode - minimal design for streaming
  if (isOverlay) {
    return (
      <div className="fixed bottom-4 right-4 w-80 max-h-[300px] overflow-hidden">
        <div className="space-y-2">
          {messages.slice(-10).map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-2 rounded-lg backdrop-blur-sm ${
                msg.isSystem
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-black/50 text-white'
              }`}
            >
              {!msg.isSystem && (
                <span className="font-semibold text-primary-400">{msg.userName}: </span>
              )}
              <span className={msg.isSystem ? 'italic' : ''}>{msg.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full chat panel
  return (
    <div className="fixed bottom-24 right-6 w-96 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary-600 to-purple-700">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Live Chat</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Users size={12} />
              <span>Auction Commentary</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${
                msg.isSystem
                  ? 'text-center'
                  : msg.userId === userId
                  ? 'ml-8'
                  : 'mr-8'
              }`}
            >
              {msg.isSystem ? (
                <div className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm">
                  {msg.message}
                </div>
              ) : (
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    msg.userId === userId
                      ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                      : 'bg-slate-800/80 text-white'
                  }`}
                >
                  {msg.userId !== userId && (
                    <p className="text-xs text-primary-400 font-semibold mb-1">
                      {msg.userName}
                    </p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.userId === userId ? 'text-white/60' : 'text-slate-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
