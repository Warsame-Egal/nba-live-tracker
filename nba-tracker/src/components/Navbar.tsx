import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

const Navbar = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#121212', color: '#ffffff' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to="/" sx={{ fontWeight: 'bold', color: 'inherit' }}>
          NBA Scoreboard
        </Button>
        <div>
          <Button component={RouterLink} to="/" sx={{ color: 'inherit' }}>
            Home
          </Button>
          <Button component={RouterLink} to="/standings" sx={{ color: 'inherit' }}>
            Standings
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
