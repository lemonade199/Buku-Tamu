from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, description="Username atau email")
    password: str = Field(..., min_length=4, description="Password pengguna")

class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Token refresh yang valid")

class UserInfoResponse(BaseModel):
    id_user: int
    fullname: str
    username: str
    email: str
    role_code: str
    role_name: str
    telephone: Optional[str] = None
    permissions: List[str] = []

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserInfoResponse

class StandardResponse(BaseModel):
    success: bool = True
    message: str = "Success"
    data: Optional[Any] = None
