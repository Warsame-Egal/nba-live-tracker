import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

// 404 page for invalid routes
const NotFound = () => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'background.default',
      overflowY: 'visible',
    }}
  >
    <Typography variant="h2" sx={{ fontWeight: 700, mb: 2 }}>
      Page Not Found
    </Typography>
    <Button component={Link} to="/" variant="contained" size="large">
      Go back home
    </Button>
  </Box>
);

export default NotFound;
