package store

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
)

type PostgresStore struct {
	db        *sql.DB
	container *sqlstore.Container
}

func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Criar tabela de sessões do CRM se não existir
	if err := createSessionsTable(db); err != nil {
		return nil, err
	}

	// Container do whatsmeow para armazenar dados do WhatsApp
	container := sqlstore.NewWithDB(db, "postgres", nil)
	ctx := context.Background()
	if err := container.Upgrade(ctx); err != nil {
		return nil, fmt.Errorf("failed to upgrade database schema: %w", err)
	}

	return &PostgresStore{
		db:        db,
		container: container,
	}, nil
}

func createSessionsTable(db *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS whatsapp_sessions (
			id VARCHAR(255) PRIMARY KEY,
			client_id VARCHAR(255) NOT NULL,
			phone_number VARCHAR(50),
			connected BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_client_id ON whatsapp_sessions(client_id);
	`
	_, err := db.Exec(query)
	return err
}

func (s *PostgresStore) GetDevice(sessionID string) (*store.Device, error) {
	ctx := context.Background()
	return s.container.GetFirstDevice(ctx)
}

func (s *PostgresStore) GetOrCreateDevice(sessionID string) (*store.Device, error) {
	ctx := context.Background()
	devices, err := s.container.GetAllDevices(ctx)
	if err != nil {
		return nil, err
	}

	// Procurar device existente
	for _, d := range devices {
		if d.ID.String() == sessionID {
			return d, nil
		}
	}

	// Criar novo device
	return s.container.NewDevice(), nil
}

func (s *PostgresStore) Container() *sqlstore.Container {
	return s.container
}

func (s *PostgresStore) SaveSession(sessionID, clientID, phoneNumber string, connected bool) error {
	query := `
		INSERT INTO whatsapp_sessions (id, client_id, phone_number, connected, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET
			phone_number = EXCLUDED.phone_number,
			connected = EXCLUDED.connected,
			updated_at = CURRENT_TIMESTAMP
	`
	_, err := s.db.Exec(query, sessionID, clientID, phoneNumber, connected)
	return err
}

func (s *PostgresStore) GetSession(sessionID string) (*Session, error) {
	query := `SELECT id, client_id, phone_number, connected FROM whatsapp_sessions WHERE id = $1`
	row := s.db.QueryRow(query, sessionID)

	var session Session
	err := row.Scan(&session.ID, &session.ClientID, &session.PhoneNumber, &session.Connected)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *PostgresStore) GetSessionByClientID(clientID string) (*Session, error) {
	query := `SELECT id, client_id, phone_number, connected FROM whatsapp_sessions WHERE client_id = $1`
	row := s.db.QueryRow(query, clientID)

	var session Session
	err := row.Scan(&session.ID, &session.ClientID, &session.PhoneNumber, &session.Connected)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *PostgresStore) DeleteSession(sessionID string) error {
	_, err := s.db.Exec(`DELETE FROM whatsapp_sessions WHERE id = $1`, sessionID)
	return err
}

func (s *PostgresStore) ListSessions() ([]Session, error) {
	query := `SELECT id, client_id, phone_number, connected FROM whatsapp_sessions`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var session Session
		if err := rows.Scan(&session.ID, &session.ClientID, &session.PhoneNumber, &session.Connected); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, nil
}

func (s *PostgresStore) Close() error {
	return s.db.Close()
}

type Session struct {
	ID          string `json:"id"`
	ClientID    string `json:"client_id"`
	PhoneNumber string `json:"phone_number"`
	Connected   bool   `json:"connected"`
}
