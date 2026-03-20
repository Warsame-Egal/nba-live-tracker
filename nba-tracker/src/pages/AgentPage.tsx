import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import PageContainer from '../components/PageContainer';
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

type AgentSseEventShape = {
  type?: unknown;
  tool_name?: unknown;
  toolName?: unknown;
  token?: unknown;
  tools_used?: unknown;
  toolsUsed?: unknown;
  message?: unknown;
};

const AGENT_STREAM_URL = `${API_BASE_URL}/api/v1/agent/stream`;
const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const SUGGESTIONS = [
  'Which games are live right now?',
  'Who leads the league in scoring?',
  'Show me Eastern Conference standings',
  'How is LeBron James playing this season?',
];

export default function AgentPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [limitError, setLimitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const requestHistory = useMemo(() => {
    const last = messages.slice(-10);
    return last.map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

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
        const toolStatus = existing
          ? prevTools.map((t) => (t.name === toolName ? { ...t, done } : t))
          : [...prevTools, { name: toolName, done }];
        return { ...m, toolStatus };
      }),
    );
  };

  const handleSend = async (overrideText?: string) => {
    const question = (overrideText ?? input).trim();
    if (!question || loading) return;

    setLimitError(null);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: question };
    const assistantId = makeId();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', toolStatus: [] };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setLoading(true);

    const historyForRequest = [...requestHistory, { role: 'user' as const, content: question }].slice(-10);

    try {
      const res = await fetch(AGENT_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: historyForRequest }),
        signal: controller.signal,
      });

      if (res.status === 429) {
        setLimitError('You have sent too many questions. Try again in a minute.');
        throw new Error('Rate limit reached');
      }
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
          if (type === 'tool_call' || type === 'tool_result') {
            const toolName =
              typeof evt.tool_name === 'string'
                ? evt.tool_name
                : typeof evt.toolName === 'string'
                  ? evt.toolName
                  : 'tool';
            updateToolStatus(assistantId, toolName, type === 'tool_result');
          } else if (type === 'token') {
            appendToken(assistantId, typeof evt.token === 'string' ? evt.token : String(evt.token ?? ''));
          } else if (type === 'done') {
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
                      ? { ...m, toolStatus: toolNames.map((name) => ({ name, done: true })) }
                      : m,
                  ),
                );
              }
            }
          } else if (type === 'error') {
            const message = typeof evt.message === 'string' ? evt.message : 'Agent request failed';
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || message } : m)),
            );
          }
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'unknown error';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content || `Sorry, something went wrong: ${message}` } : m,
        ),
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <PageContainer maxWidth={1400} sx={{ py: 2, height: 'calc(100dvh - 72px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}>
            CourtIQ Agent
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ask about live games, players, or standings
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => setMessages([])} disabled={loading || messages.length === 0}>
          Clear chat
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 2, height: '100%' }}>
        <Paper sx={{ p: 2, display: { xs: 'none', md: 'block' }, bgcolor: '#111111', borderColor: '#222222' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Suggestions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {SUGGESTIONS.map((s) => (
              <Button
                key={s}
                variant="text"
                sx={{ justifyContent: 'flex-start', border: '1px solid #222222', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => handleSend(s)}
              >
                {s}
              </Button>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#111111', borderColor: '#222222' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {messages.length === 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {SUGGESTIONS.map((s) => (
                  <Paper
                    key={s}
                    variant="outlined"
                    sx={{ p: 1.5, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                    onClick={() => handleSend(s)}
                  >
                    <Typography variant="body2">{s}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <Box key={m.id} sx={{ display: 'flex', flexDirection: 'column', mb: 1.5 }}>
                    <Box
                      sx={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '92%',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                        backgroundColor: isUser ? 'primary.main' : '#1A1A1A',
                        color: isUser ? 'primary.contrastText' : 'common.white',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      <Typography variant="body2">{m.content}</Typography>
                    </Box>
                    {!isUser && m.toolStatus && m.toolStatus.length > 0 && (
                      <Box sx={{ mt: 1, alignSelf: 'flex-start' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Data sources:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {m.toolStatus.map((t) => (
                            <Chip
                              key={t.name}
                              size="small"
                              variant="outlined"
                              label={`🔧 ${t.name}${t.done ? ' ✓' : ''}`}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })
            )}

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      animation: 'agentDots 0.9s ease-in-out infinite',
                      animationDelay: `${i * 0.12}s`,
                      '@keyframes agentDots': {
                        '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.6 },
                        '40%': { transform: 'scale(1)', opacity: 1 },
                      },
                    }}
                  />
                ))}
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            {limitError && (
              <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 0.75 }}>
                {limitError}
              </Typography>
            )}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 0.75, mb: 1, overflowX: 'auto' }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} clickable onClick={() => handleSend(s)} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={input}
                placeholder="Ask the agent..."
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                inputProps={{ maxLength: 500 }}
                helperText={`${input.length}/500`}
              />
              <Button variant="contained" disabled={loading || !input.trim()} onClick={() => handleSend()}>
                Send
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
}

