import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FiSend } from "react-icons/fi";
import { useSocial } from "../../context/SocialContext";
import { useAuth } from "../../context/AuthContext";

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MessageList = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MessageLine = styled.div<{ $isSelf: boolean }>`
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 0.85rem;
  margin-bottom: 5px;
  background-color: ${(props) => (props.$isSelf ? "#1e2b42" : "transparent")};
  padding: 8px;
  border-radius: 4px;
`;

const User = styled.span<{ $isSelf: boolean }>`
  color: ${(props) =>
    props.$isSelf ? props.theme.colors.success : props.theme.colors.primary};
  font-weight: bold;
  margin-right: 8px;
`;

const InputArea = styled.form`
  padding: 10px;
  border-top: 1px solid ${(props) => props.theme.colors.border};
  display: flex;
  gap: 10px;
`;

const Input = styled.input`
  flex: 1;
  background: #111;
  border: 1px solid #333;
  color: #fff;
  padding: 8px;
  border-radius: 4px;
  &:disabled {
    opacity: 0.5;
  }
`;

export const ChatBox: React.FC = () => {
  const { messages, sendMessage } = useSocial();
  const { userId, isConnected } = useAuth();
  const [text, setText] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !isConnected) return;

    await sendMessage(text);
    setText("");
  };

  return (
    <ChatContainer>
      <MessageList>
        {messages.map((msg) => {
          const isSelf = msg.senderId === userId;
          const content = msg.content;

          return (
            <MessageLine key={msg.messageId} $isSelf={isSelf}>
              <User $isSelf={isSelf}>{msg.username}:</User>
              {content || "Mensaje sin texto"}
            </MessageLine>
          );
        })}
        <div ref={endOfMessagesRef} />
      </MessageList>
      <InputArea onSubmit={handleSubmit}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isConnected ? "Escribe en el lobby..." : "Conectando..."}
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={!isConnected || !text.trim()}
          style={{
            background: "none",
            border: "none",
            color: isConnected && text.trim() ? "#00f3ff" : "#555",
            cursor: isConnected && text.trim() ? "pointer" : "default",
          }}
        >
          <FiSend size={20} />
        </button>
      </InputArea>
    </ChatContainer>
  );
};
