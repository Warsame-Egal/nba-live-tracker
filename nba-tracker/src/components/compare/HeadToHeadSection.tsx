import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { HeadToHeadSummary } from '../../types/compare';

interface HeadToHeadSectionProps {
  player1Name: string;
  player2Name: string;
  headToHead: HeadToHeadSummary;
}

export default function HeadToHeadSection({
  player1Name,
  player2Name,
  headToHead,
}: HeadToHeadSectionProps) {
  const { games } = headToHead;
  return (
    <TableContainer
      sx={{
        maxHeight: 320,
        overflowX: 'auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Table size="small" stickyHeader sx={{ minWidth: 280 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              {player1Name}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              {player2Name}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {games.map((g, i) => (
            <TableRow key={`${g.date}-${i}`}>
              <TableCell>{g.date}</TableCell>
              <TableCell align="right">
                {g.player1_stats.pts} PTS, {g.player1_stats.reb} REB, {g.player1_stats.ast} AST (
                {g.player1_stats.result})
              </TableCell>
              <TableCell align="right">
                {g.player2_stats.pts} PTS, {g.player2_stats.reb} REB, {g.player2_stats.ast} AST (
                {g.player2_stats.result})
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
