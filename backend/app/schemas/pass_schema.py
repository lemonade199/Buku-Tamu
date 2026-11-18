from typing import Optional, Literal
from pydantic import BaseModel, Field

class PassCreateRequest(BaseModel):
    no_pass: str = Field(..., min_length=1, max_length=50, description="Nomor kartu pass fisik (misal: 21)")
    slot: Optional[str] = Field(None, max_length=50, description="Posisi slot rak fisik")

class PassStatusUpdateRequest(BaseModel):
    status: Literal['AVAILABLE', 'PENDING', 'IN_USE', 'MAINTENANCE', 'LOST', 'INACTIVE'] = Field(
        ..., description="Status kondisi kartu pass"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Catatan perubahan status")
