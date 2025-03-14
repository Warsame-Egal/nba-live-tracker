export interface PlayerSummary {
    player_id: number;
    full_name: string;
    team_id?: number;
    team_name?: string;
    team_abbreviation?: string;
    jersey_number?: string;
    position?: string;
    height?: string;
    weight?: number;
    college?: string;
    country?: string;
    draft_year?: number;
    draft_round?: number;
    draft_number?: number;
    from_year?: number;
    to_year?: number;
    points_per_game?: number;
    rebounds_per_game?: number;
    assists_per_game?: number;
}
