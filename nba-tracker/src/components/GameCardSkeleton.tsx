import { Card, Box, Skeleton } from '@mui/material';

/**
 * Skeleton loading placeholder for game cards.
 * Matches the layout and dimensions of the actual GameCard component.
 */
const GameCardSkeleton = () => {
  return (
    <Card
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Status badge skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
      </Box>

      {/* Teams and scores skeleton */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Away team */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Skeleton variant="text" width={50} height={40} />
        </Box>

        {/* Divider */}
        <Box
          sx={{
            height: 1,
            backgroundColor: 'divider',
            mx: -3,
            opacity: 0.5,
          }}
        />

        {/* Home team */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Skeleton variant="text" width={50} height={40} />
        </Box>
      </Box>

      {/* Game leaders skeleton */}
      <Box
        sx={{
          mt: 2.5,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 2,
          justifyContent: 'space-around',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={50} height={12} />
          <Skeleton variant="text" width={30} height={14} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={50} height={12} />
          <Skeleton variant="text" width={30} height={14} />
        </Box>
      </Box>
    </Card>
  );
};

export default GameCardSkeleton;

