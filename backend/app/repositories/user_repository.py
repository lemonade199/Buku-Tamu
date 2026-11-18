from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.models.entities import User, Role, RefreshToken

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id_user == user_id).first()

    def get_by_username_or_email(self, identifier: str) -> User | None:
        return self.db.query(User).filter(
            or_(User.username == identifier, User.email == identifier)
        ).first()

    def update_last_login(self, user: User):
        user.last_login_at = datetime.utcnow()
        self.db.commit()

    def save_refresh_token(self, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        token_record = RefreshToken(
            id_user=user_id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        self.db.add(token_record)
        self.db.commit()
        return token_record

    def get_active_refresh_token(self, token_hash: str) -> RefreshToken | None:
        now = datetime.utcnow()
        return self.db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now
        ).first()

    def revoke_refresh_token(self, token_hash: str):
        record = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if record:
            record.revoked_at = datetime.utcnow()
            self.db.commit()

    def revoke_all_user_tokens(self, user_id: int):
        self.db.query(RefreshToken).filter(
            RefreshToken.id_user == user_id,
            RefreshToken.revoked_at.is_(None)
        ).update({'revoked_at': datetime.utcnow()})
        self.db.commit()

    def update_profile(self, user: User, fullname: str, email: str, telephone: str, username: str) -> User:
        user.fullname = fullname
        user.email = email
        user.telephone = telephone
        user.username = username
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_password(self, user: User, new_hash_password: str) -> User:
        user.hash_password = new_hash_password
        user.updated_at = datetime.utcnow()
        self.db.commit()
        return user
