"""add scoreboard snapshot table

Revision ID: 31c4a0c8d3e5
Revises: 30d1973e3b20
Create Date: 2025-08-30 00:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '31c4a0c8d3e5'
down_revision = '30d1973e3b20'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'scoreboard_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('game_date', sa.Text(), index=True, nullable=False),
        sa.Column('fetched_at', sa.DateTime(), nullable=False),
        sa.Column('data', sa.Text(), nullable=False),
    )
    op.create_index('ix_scoreboard_snapshots_id', 'scoreboard_snapshots', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_scoreboard_snapshots_id', table_name='scoreboard_snapshots')
    op.drop_table('scoreboard_snapshots')