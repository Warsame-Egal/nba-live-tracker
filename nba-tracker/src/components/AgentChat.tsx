import { Box, Fab } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

export default function AgentChat() {
  const navigate = useNavigate();

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      <Fab color="primary" onClick={() => navigate('/agent')} aria-label="Open CourtIQ Agent">
        <ChatIcon />
      </Fab>
    </Box>
  );
}

