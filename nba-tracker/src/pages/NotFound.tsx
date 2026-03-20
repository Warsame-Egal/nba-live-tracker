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
    <Typography
      sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, mb: 1, fontSize: '6rem', color: 'primary.main' }}
    >
      404
    </Typography>
    <Typography variant="h5" sx={{ mb: 2 }}>
      Page not found
    </Typography>
    <Button component={Link} to="/" variant="contained" size="large">
      Go home
    </Button>
  </Box>
);

export default NotFound;
