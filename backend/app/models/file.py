"""
File model for file management
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class File(Base):
    """File model"""
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    file_size = Column(BigInteger, nullable=False)  # in bytes
    
    # Links
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Auto-delete settings
    retention_days = Column(Integer, nullable=True)  # None = permanent, otherwise days until deletion
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Calculated deletion date
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    card = relationship("Card", back_populates="files")
    uploaded_by = relationship("User", back_populates="files")
    
    def __repr__(self):
        return f"<File {self.original_filename}>"

