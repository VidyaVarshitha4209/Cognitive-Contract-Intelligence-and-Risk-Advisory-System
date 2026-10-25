def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_login_me(client):
    body = {"name": "Test User", "email": "test@example.com", "password": "StrongPass123"}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 201
    assert "password" not in r.text  # never leak password or hash
    assert "password_hash" not in r.text

    # duplicate email
    assert client.post("/api/auth/register", json=body).status_code == 409

    r = client.post("/api/auth/login", json={"email": "test@example.com", "password": "StrongPass123"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "test@example.com"


def test_wrong_password(client):
    r = client.post("/api/auth/login", json={"email": "test@example.com", "password": "WrongPass999"})
    assert r.status_code == 401


def test_validation_errors(client):
    r = client.post("/api/auth/register", json={"name": "A", "email": "not-an-email", "password": "123"})
    assert r.status_code == 422


def test_protected_route_needs_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/settings/ai-status").status_code == 401


def test_ai_status_when_not_configured(client):
    r = client.post("/api/auth/login", json={"email": "test@example.com", "password": "StrongPass123"})
    token = r.json()["access_token"]
    r = client.get("/api/settings/ai-status", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["configured"] is False


def test_cascade_delete(client):
    """Deleting a user must delete their policies (checks SQLite foreign keys are ON)."""
    from sqlalchemy import select
    from app.database.session import SessionLocal
    from app.models import Policy, User

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "test@example.com"))
        db.add(Policy(user_id=user.id, name="P", category="payment"))
        db.commit()
        db.delete(user)
        db.commit()
        assert db.scalar(select(Policy).where(Policy.name == "P")) is None
