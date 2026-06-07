package tenantmgr

import (
	"context"
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/navigator/vms/internal/config"
	"github.com/navigator/vms/pkg/migrate"
	"golang.org/x/crypto/bcrypt"
)

type TenantInfo struct {
	ID         uuid.UUID
	Subdomain  string
	DBName     string
	Name       string
	ConnURL    string
}

type Manager struct {
	cfg    *config.Config
	main   *pgxpool.Pool
	pools  map[uuid.UUID]*pgxpool.Pool
	mu     sync.RWMutex
}

func New(cfg *config.Config, main *pgxpool.Pool) *Manager {
	return &Manager{cfg: cfg, main: main, pools: map[uuid.UUID]*pgxpool.Pool{}}
}

func (m *Manager) Main() *pgxpool.Pool { return m.main }

func (m *Manager) InitMain(ctx context.Context) error {
	return migrate.MainUp(ctx, m.main)
}

func (m *Manager) Pool(ctx context.Context, tenantID uuid.UUID) (*pgxpool.Pool, error) {
	m.mu.RLock()
	if p, ok := m.pools[tenantID]; ok {
		m.mu.RUnlock()
		return p, nil
	}
	m.mu.RUnlock()

	info, err := m.ByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	p, err := m.connect(ctx, info.ConnURL)
	if err != nil {
		return nil, err
	}
	if err := migrate.TenantUp(ctx, p); err != nil {
		p.Close()
		return nil, err
	}
	m.mu.Lock()
	m.pools[tenantID] = p
	m.mu.Unlock()
	return p, nil
}

func (m *Manager) connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	return pgxpool.NewWithConfig(ctx, cfg)
}

func (m *Manager) BySubdomain(ctx context.Context, subdomain string) (*TenantInfo, error) {
	row := m.main.QueryRow(ctx, `
		SELECT t.tenant_id, t.subdomain, t.db_name, t.name, t.status,
		       c.host, c.port, c.database_name, c.username, c.password_encrypted
		FROM tenants t
		JOIN tenant_db_connections c ON c.tenant_id = t.tenant_id
		WHERE t.subdomain = $1`, subdomain)
	return m.scanTenant(row)
}

func (m *Manager) ByID(ctx context.Context, id uuid.UUID) (*TenantInfo, error) {
	row := m.main.QueryRow(ctx, `
		SELECT t.tenant_id, t.subdomain, t.db_name, t.name, t.status,
		       c.host, c.port, c.database_name, c.username, c.password_encrypted
		FROM tenants t
		JOIN tenant_db_connections c ON c.tenant_id = t.tenant_id
		WHERE t.tenant_id = $1`, id)
	return m.scanTenant(row)
}

type scanner interface {
	Scan(dest ...any) error
}

func (m *Manager) scanTenant(row scanner) (*TenantInfo, error) {
	var id uuid.UUID
	var subdomain, dbName, name, status string
	var host, dbNameConn, user, pass string
	var port int
	if err := row.Scan(&id, &subdomain, &dbName, &name, &status, &host, &port, &dbNameConn, &user, &pass); err != nil {
		return nil, err
	}
	if status == "suspended" {
		return nil, fmt.Errorf("tenant suspended")
	}
	url := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable", user, pass, host, port, dbNameConn)
	return &TenantInfo{ID: id, Subdomain: subdomain, DBName: dbName, Name: name, ConnURL: url}, nil
}

func (m *Manager) CreateDatabase(ctx context.Context, dbName string) error {
	adminURL := fmt.Sprintf("postgres://%s:%s@%s:%s/postgres?sslmode=disable",
		m.cfg.DBUser, m.cfg.DBPassword, m.cfg.DBHost, m.cfg.DBPort)
	admin, err := m.connect(ctx, adminURL)
	if err != nil {
		return err
	}
	defer admin.Close()
	var exists int
	_ = admin.QueryRow(ctx, "SELECT 1 FROM pg_database WHERE datname = $1", dbName).Scan(&exists)
	if exists == 0 {
		_, err = admin.Exec(ctx, fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
		if err != nil {
			return err
		}
	}
	return nil
}

func (m *Manager) Provision(ctx context.Context, name, subdomain, adminEmail, adminPassword, adminName string) (uuid.UUID, error) {
	dbName := fmt.Sprintf("vms_tenant_%s", subdomain)
	if err := m.CreateDatabase(ctx, dbName); err != nil {
		return uuid.Nil, err
	}
	tenantURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		m.cfg.DBUser, m.cfg.DBPassword, m.cfg.DBHost, m.cfg.DBPort, dbName)
	tp, err := m.connect(ctx, tenantURL)
	if err != nil {
		return uuid.Nil, err
	}
	if err := migrate.TenantUp(ctx, tp); err != nil {
		tp.Close()
		return uuid.Nil, err
	}

	tx, err := m.main.Begin(ctx)
	if err != nil {
		tp.Close()
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	var tenantID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO tenants (name, subdomain, db_name) VALUES ($1,$2,$3) RETURNING tenant_id`,
		name, subdomain, dbName).Scan(&tenantID)
	if err != nil {
		tp.Close()
		return uuid.Nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO tenant_db_connections (tenant_id, host, port, database_name, username, password_encrypted)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		tenantID, m.cfg.DBHost, mustAtoi(m.cfg.DBPort), dbName, m.cfg.DBUser, m.cfg.DBPassword)
	if err != nil {
		tp.Close()
		return uuid.Nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		tp.Close()
		return uuid.Nil, err
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), 10)
	_, _ = tp.Exec(ctx, `INSERT INTO work_locations (name, type, address) VALUES ('Main Site', 'construction', 'Head office')`)
	_, err = tp.Exec(ctx, `INSERT INTO users (name, email, role, password_hash) VALUES ($1,$2,'admin',$3)`, adminName, adminEmail, string(hash))
	if err != nil {
		tp.Close()
		return tenantID, err
	}
	m.mu.Lock()
	m.pools[tenantID] = tp
	m.mu.Unlock()
	return tenantID, nil
}

func (m *Manager) ListActiveTenants(ctx context.Context) ([]uuid.UUID, error) {
	rows, err := m.main.Query(ctx, `SELECT tenant_id FROM tenants WHERE status = 'active' ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func mustAtoi(s string) int {
	var n int
	fmt.Sscanf(s, "%d", &n)
	if n == 0 {
		return 5432
	}
	return n
}
