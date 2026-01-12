package whatsapp

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
	waLog "go.mau.fi/whatsmeow/util/log"

	"whatsapp-api/internal/store"
	"whatsapp-api/internal/webhook"
)

// Simple logger for whatsmeow
type stdLogger struct {
	module string
}

func (l *stdLogger) Debugf(msg string, args ...interface{}) {
	log.Printf("[WA DEBUG][%s] "+msg, append([]interface{}{l.module}, args...)...)
}
func (l *stdLogger) Infof(msg string, args ...interface{}) {
	log.Printf("[WA INFO][%s] "+msg, append([]interface{}{l.module}, args...)...)
}
func (l *stdLogger) Warnf(msg string, args ...interface{}) {
	log.Printf("[WA WARN][%s] "+msg, append([]interface{}{l.module}, args...)...)
}
func (l *stdLogger) Errorf(msg string, args ...interface{}) {
	log.Printf("[WA ERROR][%s] "+msg, append([]interface{}{l.module}, args...)...)
}
func (l *stdLogger) Sub(module string) waLog.Logger {
	return &stdLogger{module: l.module + "/" + module}
}

func newLogger() waLog.Logger {
	return &stdLogger{module: "whatsmeow"}
}

type Manager struct {
	clients  map[string]*Client
	store    *store.PostgresStore
	webhook  *webhook.Sender
	mu       sync.RWMutex
}

func NewManager(store *store.PostgresStore, webhookSender *webhook.Sender) *Manager {
	return &Manager{
		clients: make(map[string]*Client),
		store:   store,
		webhook: webhookSender,
	}
}

// CreateSession cria uma nova sessão para um cliente do CRM
func (m *Manager) CreateSession(clientID string) (*Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Verificar se já existe sessão para este cliente
	for _, c := range m.clients {
		if c.ClientID == clientID {
			return c, nil
		}
	}

	// Gerar ID único para a sessão
	sessionID := uuid.New().String()

	// Criar device store
	device := m.store.Container().NewDevice()
	waClient := whatsmeow.NewClient(device, newLogger())

	// Criar cliente wrapper
	client := NewClient(sessionID, clientID, waClient, m.store, m.webhook)
	m.clients[sessionID] = client

	// Salvar sessão no banco
	m.store.SaveSession(sessionID, clientID, "", false)

	return client, nil
}

// GetSession retorna uma sessão existente pelo ID
func (m *Manager) GetSession(sessionID string) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	client, exists := m.clients[sessionID]
	return client, exists
}

// GetSessionByClientID retorna a sessão de um cliente do CRM
func (m *Manager) GetSessionByClientID(clientID string) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, c := range m.clients {
		if c.ClientID == clientID {
			return c, true
		}
	}
	return nil, false
}

// DeleteSession remove uma sessão
func (m *Manager) DeleteSession(sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	client, exists := m.clients[sessionID]
	if !exists {
		return fmt.Errorf("session not found")
	}

	client.Disconnect()
	delete(m.clients, sessionID)
	return m.store.DeleteSession(sessionID)
}

// ListSessions retorna todas as sessões ativas
func (m *Manager) ListSessions() []SessionInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var sessions []SessionInfo
	for _, c := range m.clients {
		phoneNumber := ""
		if c.WAClient.Store.ID != nil {
			phoneNumber = c.WAClient.Store.ID.User
		}

		sessions = append(sessions, SessionInfo{
			ID:          c.ID,
			ClientID:    c.ClientID,
			PhoneNumber: phoneNumber,
			Connected:   c.IsConnected(),
		})
	}
	return sessions
}

// LoadExistingSessions carrega sessões salvas no banco ao iniciar
func (m *Manager) LoadExistingSessions(ctx context.Context) error {
	sessions, err := m.store.ListSessions()
	if err != nil {
		return err
	}

	devices, err := m.store.Container().GetAllDevices()
	if err != nil {
		return err
	}

	for _, session := range sessions {
		// Encontrar device correspondente
		var device *whatsmeow.Client
		for _, d := range devices {
			if d.ID != nil && d.ID.String() == session.ID {
				device = whatsmeow.NewClient(d, newLogger())
				break
			}
		}

		if device == nil {
			// Device não encontrado, criar novo
			newDevice := m.store.Container().NewDevice()
			device = whatsmeow.NewClient(newDevice, newLogger())
		}

		client := NewClient(session.ID, session.ClientID, device, m.store, m.webhook)
		m.clients[session.ID] = client

		// Reconectar se estava conectado antes
		if session.Connected {
			go client.Connect(ctx)
		}
	}

	return nil
}

// Shutdown desconecta todas as sessões
func (m *Manager) Shutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, client := range m.clients {
		client.Disconnect()
	}
}

type SessionInfo struct {
	ID          string `json:"id"`
	ClientID    string `json:"client_id"`
	PhoneNumber string `json:"phone_number"`
	Connected   bool   `json:"connected"`
}
