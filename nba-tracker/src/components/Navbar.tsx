import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';

const Navbar = () => {
  return (
    <AppBar position="static" color="default">
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button color="inherit" component={RouterLink} to="/" sx={{ fontWeight: 'bold' }}>
          NBA Scoreboard
        </Button>
        <div>
          <Button color="inherit" component={RouterLink} to="/">
            Home
          </Button>
          <Button color="inherit" component={RouterLink} to="/standings">
            Standings
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
