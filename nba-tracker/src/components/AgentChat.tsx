import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Fab,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { API_BASE_URL } from '../utils/apiConfig';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}

export default function AgentChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingTools, setStreamingTools] = useState<string[]>([]);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    setStreamingContent('');
    setStreamingTools([]);
    setActiveToolCall(null);
    abortRef.current = new AbortController();

    const history = messages
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Error: ${res.status} ${res.statusText}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const toolsUsed: string[] = [];
      let fullAnswer = '';
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'tool_call') {
                const tool = data.tool ?? '';
                toolsUsed.push(tool);
                setStreamingTools([...toolsUsed]);
                setActiveToolCall(tool);
              } else if (data.type === 'tool_result') {
                setActiveToolCall(null);
              } else if (data.type === 'token' && data.text) {
                fullAnswer += data.text;
                setStreamingContent(fullAnswer);
              } else if (data.type === 'done') {
                receivedDone = true;
                const finalTools = data.tools_used ?? toolsUsed;
                setMessages(prev => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: fullAnswer,
                    toolsUsed: finalTools.length ? finalTools : undefined,
                  },
                ]);
                setStreamingContent('');
                setStreamingTools([]);
                setActiveToolCall(null);
                fullAnswer = '';
              } else if (data.type === 'error') {
                receivedDone = true;
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: data.text ?? 'Error' },
                ]);
                setStreamingContent('');
                setStreamingTools([]);
                setActiveToolCall(null);
              }
            } catch {
              // skip invalid json
            }
          }
        }
        scrollToBottom();
      }

      if (!receivedDone && (fullAnswer || toolsUsed.length)) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: fullAnswer,
            toolsUsed: toolsUsed.length ? [...toolsUsed] : undefined,
          },
        ]);
        setStreamingContent('');
        setStreamingTools([]);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const err = e as Error;
      const isNetworkErr = /network error|failed to fetch|load failed/i.test(err.message);
      const hint = isNetworkErr
        ? ' Make sure the API is running (e.g. run uvicorn in nba-tracker-api).'
        : '';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Request failed: ${err.message}.${hint}` },
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }, [input, loading, messages, scrollToBottom]);

  return (
    <>
      <Fab
        color="primary"
        aria-label="Ask NBA agent"
        onClick={() => setOpen(!open)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1300,
        }}
      >
        <ChatIcon />
      </Fab>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            width: { xs: 'calc(100vw - 48px)', sm: 400 },
            maxWidth: 400,
            maxHeight: '70vh',
            zIndex: 1299,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              NBA Agent
            </Typography>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: m.role === 'user' ? 'primary.main' : 'action.hover',
                    color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  {m.content}
                </Typography>
                {m.toolsUsed && m.toolsUsed.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {m.toolsUsed.map(t => (
                      <Chip key={t} size="small" label={`🔧 ${t}`} variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            {loading && (
              <>
                {activeToolCall && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    🔧 Calling {activeToolCall}…
                  </Typography>
                )}
                {streamingTools.length > 0 && !activeToolCall && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {streamingTools.map(t => (
                      <Chip key={t} size="small" label={`✓ ${t}`} variant="outlined" />
                    ))}
                  </Box>
                )}
                {streamingContent && (
                  <Typography variant="body2" sx={{ bgcolor: 'action.hover', px: 1.5, py: 1, borderRadius: 2 }}>
                    {streamingContent}
                  </Typography>
                )}
                {!streamingContent && !streamingTools.length && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">
                      Thinking…
                    </Typography>
                  </Box>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </Box>
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Ask about games, players, standings…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <IconButton color="primary" onClick={sendMessage} disabled={loading || !input.trim()}>
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
}
