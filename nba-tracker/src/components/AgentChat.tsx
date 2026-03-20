import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  Chip,
  Fab,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';

import { API_BASE_URL } from '../utils/apiConfig';

type ToolStatus = {
  name: string;
  done: boolean;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolStatus?: ToolStatus[];
};

// The backend streams SSE JSON "events". We keep the parsed payload as `unknown`
// and narrow at runtime to avoid `any` and satisfy strict linting.
type AgentSseEventShape = {
  type?: unknown;
  tool_name?: unknown;
  toolName?: unknown;
  token?: unknown;
  tools_used?: unknown;
  toolsUsed?: unknown;
  message?: unknown;
};

const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const AGENT_STREAM_URL = `${API_BASE_URL}/api/v1/agent/stream`;

export default function AgentChat() {
  const [open, setOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const requestHistory = useMemo(() => {
    // Only pass the last 10 messages to reduce payload size.
    const last = messages.slice(-10);
    return last.map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, loading]);

  const close = () => {
    setOpen(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  };

  const appendToken = (assistantId: string, token: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m)),
    );
  };

  const updateToolStatus = (assistantId: string, toolName: string, done: boolean) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;
        const prevTools = m.toolStatus ?? [];
        const existing = prevTools.find((t) => t.name === toolName);
        let nextTools: ToolStatus[];
        if (existing) {
          nextTools = prevTools.map((t) => (t.name === toolName ? { ...t, done } : t));
        } else {
          nextTools = [...prevTools, { name: toolName, done }];
        }
        return { ...m, toolStatus: nextTools };
      }),
    );
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    // Close any prior stream.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: question };
    const assistantId = makeId();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', toolStatus: [] };

    // Optimistically update UI.
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setLoading(true);

    // Build history including the just-added user message.
    const historyForRequest = [...requestHistory, { role: 'user' as const, content: question }].slice(-10);

    try {
      const res = await fetch(AGENT_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: historyForRequest }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line.
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          const jsonText = line.replace(/^data:\s?/, '');
          if (!jsonText) continue;

          let evt: AgentSseEventShape | null = null;
          try {
            const parsed = JSON.parse(jsonText) as unknown;
            if (!parsed || typeof parsed !== 'object') continue;
            evt = parsed as AgentSseEventShape;
          } catch {
            continue;
          }

          if (!evt) continue;

          const type = typeof evt.type === 'string' ? evt.type : undefined;
          if (type === 'tool_call') {
            const toolName =
              typeof evt.tool_name === 'string'
                ? evt.tool_name
                : typeof evt.toolName === 'string'
                  ? evt.toolName
                  : 'tool';
            updateToolStatus(assistantId, toolName, false);
          } else if (type === 'tool_result') {
            const toolName =
              typeof evt.tool_name === 'string'
                ? evt.tool_name
                : typeof evt.toolName === 'string'
                  ? evt.toolName
                  : 'tool';
            updateToolStatus(assistantId, toolName, true);
          } else if (type === 'token') {
            appendToken(assistantId, typeof evt.token === 'string' ? evt.token : String(evt.token ?? ''));
          } else if (type === 'done') {
            // If backend provides tools_used, sync tool list.
            const toolsUsedRaw = evt.tools_used ?? evt.toolsUsed;
            if (Array.isArray(toolsUsedRaw) && toolsUsedRaw.length) {
              const toolNames = toolsUsedRaw
                .map((t) => {
                  if (!t || typeof t !== 'object') return undefined;
                  const name = (t as { name?: unknown }).name;
                  return typeof name === 'string' ? name : undefined;
                })
                .filter((name): name is string => name !== undefined);

              if (toolNames.length) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolStatus: toolNames.map((name) => ({ name, done: true })),
                        }
                      : m,
                  ),
                );
              }
            }
          } else if (type === 'error') {
            const message = typeof evt.message === 'string' ? evt.message : 'Agent request failed';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content?.trim() ? m.content : message,
                    }
                  : m,
              ),
            );
          }
        }
      }
    } catch (e: unknown) {
      // Last-resort message if the stream fails.
      const message = e instanceof Error ? e.message : 'unknown error';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: m.content
                  ? m.content
                  : `Sorry, something went wrong: ${message}`,
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      <ClickAwayListener onClickAway={() => open && close()}>
        <Box>
          <Fab color="primary" onClick={() => setOpen((v) => !v)} aria-label="Open CourtIQ Agent chat">
            <ChatIcon />
          </Fab>

          {open && (
            <Paper
              elevation={8}
              sx={{
                position: 'absolute',
                bottom: 70,
                right: 0,
                width: 400,
                height: 500,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  CourtIQ Agent
                </Typography>
                <IconButton size="small" onClick={() => close()} aria-label="Close chat">
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: 2,
                  py: 1.5,
                  backgroundColor: 'background.paper',
                }}
              >
                {messages.length === 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Ask about live games, standings, or player stats.
                    </Typography>
                  </Box>
                ) : (
                  messages.map((m) => {
                    const isUser = m.role === 'user';
                    return (
                      <Box key={m.id} sx={{ display: 'flex', flexDirection: 'column', mb: 1.5 }}>
                        <Box
                          sx={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '95%',
                            borderRadius: 2,
                            px: 1.5,
                            py: 1,
                            backgroundColor: isUser ? 'primary.main' : 'grey.800',
                            color: isUser ? 'primary.contrastText' : 'common.white',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <Typography variant="body2">{m.content}</Typography>
                        </Box>

                        {!isUser && m.toolStatus && m.toolStatus.length > 0 && (
                          <Box sx={{ mt: 0.75, alignSelf: 'flex-start', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                            {m.toolStatus.map((t) => (
                              <Chip
                                key={t.name}
                                size="small"
                                variant="outlined"
                                label={`🔧 ${t.name}${t.done ? ' ✓' : ''}`}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })
                )}

                {loading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mt: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      Thinking...
                    </Typography>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Box>

              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <TextField
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the agent..."
                  size="small"
                  fullWidth
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button variant="contained" onClick={() => handleSend()} disabled={loading || !input.trim()}>
                  Send
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      </ClickAwayListener>
    </Box>
  );
}

