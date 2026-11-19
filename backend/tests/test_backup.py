import os
import pytest
from backend.app import create_app

@pytest.fixture
def client(tmp_path):
    test_db_file = tmp_path / "test_backup.db"
    test_db_url = f"sqlite:///{test_db_file}"

    app = create_app('development', db_url=test_db_url)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret-test-key-32-chars-long'
    app.config['UPLOAD_FOLDER'] = str(tmp_path / "photos")

    with app.test_client() as client:
        yield client

def test_backup_unauthorized(client):
    res = client.post('/api/v1/settings/backup')
    assert res.status_code == 401

def test_backup_forbidden_for_receptionist(client):
    login_res = client.post('/api/v1/auth/login', json={'username': 'petugas', 'password': 'Petugas123!'})
    token = login_res.get_json()['data']['access_token']
    res = client.post('/api/v1/settings/backup', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 403

def test_backup_lifecycle(client):
    # 1. Login as Admin
    login_res = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'Admin123!'})
    token = login_res.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Create Backup
    create_res = client.post('/api/v1/settings/backup', headers=headers)
    assert create_res.status_code == 201
    create_data = create_res.get_json()
    assert create_data['success'] is True
    filename = create_data['data']['filename']
    assert filename.startswith('bukutamu_backup_')

    # 3. List Backups
    list_res = client.get('/api/v1/settings/backups', headers=headers)
    assert list_res.status_code == 200
    backups = list_res.get_json()['data']
    assert len(backups) >= 1
    assert any(b['filename'] == filename for b in backups)

    # 4. Download Backup
    download_res = client.get(f'/api/v1/settings/backup/download/{filename}', headers=headers)
    assert download_res.status_code == 200
    assert download_res.mimetype == 'application/json'
    download_res.close()

    # 5. Restore Database from backup
    restore_res = client.post('/api/v1/settings/restore', json={'filename': filename}, headers=headers)
    assert restore_res.status_code == 200, restore_res.get_json()
    assert restore_res.get_json()['success'] is True

    # 6. Delete Backup
    del_res = client.delete(f'/api/v1/settings/backup/{filename}', headers=headers)
    assert del_res.status_code == 200
    assert del_res.get_json()['success'] is True
