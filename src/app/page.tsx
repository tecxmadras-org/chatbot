"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What are the fees for B.Tech CSE?",
  "Which colleges have the lowest cutoff?",
  "What courses are available in MBA?",
  "Tell me about scholarship options",
  "What is the admission deadline?",
  "Compare fees across engineering colleges",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Prepare history for context
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantId = (Date.now() + 1).toString();

    // Add empty assistant message for streaming
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let sources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6); // Remove "data: "

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.text }
                    : m
                )
              );
            }

            if (parsed.sources) {
              sources = parsed.sources;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Add sources to the message
      if (sources.length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, sources } : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "I'm sorry, I couldn't process your request. Please check your connection and try again.",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: "860px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Header */}
      <header
        className="glass"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          borderBottom: "1px solid var(--color-border)",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderRadius: "0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            flexShrink: 0,
            boxShadow: "0 4px 15px var(--color-primary-glow)",
          }}
        >
          🎓
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            College Info{" "}
            <span className="gradient-text">AI</span>
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              marginTop: "2px",
            }}
          >
            Ask about fees, courses, cutoffs & more
          </p>
        </div>
        <a
          href="/admin"
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border-hover)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          Admin
        </a>
      </header>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Welcome state */}
        {messages.length === 0 && (
          <div
            className="animate-fade-in-up"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "24px",
              padding: "20px",
            }}
          >
            <div
              className="animate-float"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "24px",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                boxShadow: "0 8px 40px var(--color-primary-glow)",
              }}
            >
              🎓
            </div>
            <div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginBottom: "8px",
                }}
              >
                Welcome to{" "}
                <span className="gradient-text">College Info AI</span>
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  maxWidth: "400px",
                }}
              >
                I can help you find information about college fees, courses,
                eligibility criteria, cutoff scores, and more.
              </p>
            </div>

            {/* Suggested Questions */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: "center",
                maxWidth: "500px",
              }}
            >
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: "backwards",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-secondary)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-primary)";
                    e.currentTarget.style.color = "var(--color-text)";
                    e.currentTarget.style.background =
                      "var(--color-surface-hover)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.color =
                      "var(--color-text-secondary)";
                    e.currentTarget.style.background =
                      "var(--color-surface)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="animate-fade-in-up"
            style={{
              animationDuration: "0.35s",
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
              gap: "10px",
              maxWidth: "100%",
            }}
          >
            {/* Assistant avatar */}
            {message.role === "assistant" && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                  marginTop: "4px",
                }}
              >
                🎓
              </div>
            )}

            <div
              style={{
                maxWidth: "75%",
                minWidth: "60px",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius:
                    message.role === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  background:
                    message.role === "user"
                      ? "var(--gradient-primary)"
                      : "var(--color-surface)",
                  border:
                    message.role === "user"
                      ? "none"
                      : "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  fontSize: "14px",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow:
                    message.role === "user"
                      ? "0 4px 20px var(--color-primary-glow)"
                      : "0 2px 10px rgba(0,0,0,0.2)",
                }}
              >
                {message.content}
                {isLoading &&
                  message.role === "assistant" &&
                  index === messages.length - 1 &&
                  message.content === "" && (
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                {/* Blinking cursor during streaming */}
                {isLoading &&
                  message.role === "assistant" &&
                  index === messages.length - 1 &&
                  message.content !== "" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "16px",
                        background: "var(--color-primary-light)",
                        marginLeft: "2px",
                        verticalAlign: "text-bottom",
                        animation: "typing-dot 1s ease-in-out infinite",
                      }}
                    />
                  )}
              </div>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  {message.sources.map((src, si) => (
                    <span
                      key={si}
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        color: "var(--color-primary-light)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      📄 {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                  marginTop: "4px",
                  textAlign:
                    message.role === "user" ? "right" : "left",
                  paddingInline: "4px",
                }}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="glass"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "none",
          borderLeft: "none",
          borderRight: "none",
          borderRadius: "0",
          position: "sticky",
          bottom: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "10px",
          }}
        >
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about colleges, fees, courses..."
            rows={1}
            disabled={isLoading}
            className="input-glass"
            style={{
              flex: 1,
              resize: "none",
              minHeight: "46px",
              maxHeight: "120px",
            }}
          />
          <button
            id="send-button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="btn-glow"
            style={{
              padding: "12px 16px",
              minWidth: "46px",
              height: "46px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
            aria-label="Send message"
          >
            {isLoading ? (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "typing-dot 0.8s linear infinite",
                }}
              />
            ) : (
              "➤"
            )}
          </button>
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            textAlign: "center",
            marginTop: "8px",
          }}
        >
          AI answers are based on uploaded college documents only
        </p>
      </div>
    </div>
  );
}
