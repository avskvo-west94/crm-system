"""
Contact model for managing clients and partners
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


# Association table for contact visibility
contact_shared_users = Table(
    "contact_shared_users",
    Base.metadata,
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"))
)


class ContactType(str, enum.Enum):
    """Contact type enum"""
    CLIENT = "client"
    PARTNER = "partner"
    SUPPLIER = "supplier"
    OTHER = "other"


class Contact(Base):
    """Contact (Client/Partner) model"""
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    company_name = Column(String, nullable=False)
    contact_person = Column(String, nullable=True)
    type = Column(SQLEnum(ContactType), default=ContactType.CLIENT)
    
    # Contact details
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    
    # Additional info
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", back_populates="created_contacts")
    cards = relationship("Card", back_populates="contact")
    shared_with_users = relationship("User", secondary=contact_shared_users, back_populates="shared_contacts")
    
    def __repr__(self):
        return f"<Contact {self.company_name}>"

