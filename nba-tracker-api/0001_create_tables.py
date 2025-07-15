"""initial tables"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("abbreviation", sa.String, nullable=False),
    )
    op.create_table(
        "players",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id")),
        sa.Column("position", sa.String),
    )
    op.create_table(
        "games",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("date", sa.DateTime, nullable=False),
        sa.Column("home_team_id", sa.Integer, sa.ForeignKey("teams.id")),
        sa.Column("away_team_id", sa.Integer, sa.ForeignKey("teams.id")),
    )
    op.create_table(
        "game_stats",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("player_id", sa.Integer, sa.ForeignKey("players.id")),
        sa.Column("game_id", sa.Integer, sa.ForeignKey("games.id")),
        sa.Column("points", sa.Integer, default=0),
        sa.Column("rebounds", sa.Integer, default=0),
        sa.Column("assists", sa.Integer, default=0),
    )


def downgrade() -> None:
    op.drop_table("game_stats")
    op.drop_table("games")
    op.drop_table("players")
    op.drop_table("teams")