"""add_board_status_field

Revision ID: 1c1ab5843e01
Revises: 3656f8fa9c14
Create Date: 2025-10-31 19:43:34.932079

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1c1ab5843e01'
down_revision = '3656f8fa9c14'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Сначала создаем enum тип
    op.execute("CREATE TYPE boardstatus AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'FAILED')")
    # Затем добавляем колонку с default значением
    op.add_column('boards', sa.Column('status', sa.Enum('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'FAILED', name='boardstatus'), nullable=False, server_default='PLANNING'))


def downgrade() -> None:
    op.drop_column('boards', 'status')
    op.execute("DROP TYPE boardstatus")

