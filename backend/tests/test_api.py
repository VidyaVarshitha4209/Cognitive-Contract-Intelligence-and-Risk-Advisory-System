def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "healthy"]

def test_policies_list(client):
    response = client.get("/api/policies")
    assert response.status_code == 200
    policies = response.json()
    assert len(policies) >= 5
    names = [p["name"] for p in policies]
    assert any("Liability" in n for n in names)
    assert any("Notice" in n or "Termination" in n for n in names)

def test_dashboard_stats(client):
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_contracts" in data
    assert "risk_distribution" in data
    assert "status_distribution" in data
