from typing import Optional
from pydantic import BaseModel, Field

class CheckinRequest(BaseModel):
    fullname: str = Field(..., min_length=2, max_length=150, description="Nama lengkap pengunjung")
    telephone: Optional[str] = Field(default="-", max_length=25, description="Nomor telepon / kontak")
    institution: Optional[str] = Field(None, max_length=150, description="Asal instansi atau perusahaan")
    representing: Optional[str] = Field(None, max_length=150, description="Pihak atau pejabat yang dikunjungi")
    purpose: Optional[str] = Field(None, max_length=1000, description="Tujuan atau keperluan kunjungan")
    id_pass: Optional[int] = Field(None, description="ID pass yang dipilih")
    no_pass: Optional[str] = Field(None, description="Nomor pass yang dipilih (misal: 01)")
    photo_base64: str = Field(..., min_length=100, description="Data foto wajib format base64 dari kamera")

class VisitorResponse(BaseModel):
    id_visitor: int
    id_pass: int
    no_pass: Optional[str] = None
    fullname: str
    telephone: str
    institution: Optional[str] = None
    representing: Optional[str] = None
    purpose: Optional[str] = None
    check_in_at: str
    check_out_at: Optional[str] = None
    capture_id: str
    is_active: bool
