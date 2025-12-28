import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

/**
 * 404 error page that shows when user navigates to a page that doesn't exist.
 * Provides a button to go back to the home page.
 */
const NotFound = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'background.default',
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
