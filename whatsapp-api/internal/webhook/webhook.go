package webhook

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type Sender struct {
	url    string
	apiKey string
	client *http.Client
}

func NewSender(url, apiKey string) *Sender {
	return &Sender{
		url:    url,
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type Event struct {
	Type      string      `json:"type"`
	SessionID string      `json:"session_id"`
	ClientID  string      `json:"client_id"`
	Timestamp int64       `json:"timestamp"`
	Data      interface{} `json:"data"`
}

type MessageData struct {
	MessageID   string `json:"message_id"`
	From        string `json:"from"`
	To          string `json:"to"`
	Body        string `json:"body"`
	Type        string `json:"type"` // text, image, document, audio, video
	MediaURL    string `json:"media_url,omitempty"`
	MimeType    string `json:"mime_type,omitempty"`
	FileName    string `json:"file_name,omitempty"`
	IsFromMe    bool   `json:"is_from_me"`
	IsGroup     bool   `json:"is_group"`
	GroupName   string `json:"group_name,omitempty"`
	PushName    string `json:"push_name,omitempty"`
	QuotedMsgID string `json:"quoted_msg_id,omitempty"`
}

type StatusData struct {
	MessageID string `json:"message_id"`
	Status    string `json:"status"` // sent, delivered, read
	To        string `json:"to"`
}

type ConnectionData struct {
	Status      string `json:"status"` // connected, disconnected, qr_ready
	PhoneNumber string `json:"phone_number,omitempty"`
	QRCode      string `json:"qr_code,omitempty"`
}

func (s *Sender) Send(event Event) error {
	log.Printf("[WEBHOOK] Sending event type=%s to url=%s", event.Type, s.url)

	if s.url == "" {
		log.Printf("[WEBHOOK] URL is empty, skipping webhook")
		return nil
	}

	body, err := json.Marshal(event)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to marshal event: %v", err)
		return err
	}

	log.Printf("[WEBHOOK] Request body: %s", string(body))

	req, err := http.NewRequest("POST", s.url, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[WEBHOOK] Failed to create request: %v", err)
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", s.apiKey)
	req.Header.Set("X-Webhook-Event", event.Type)

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to send request: %v", err)
		return err
	}
	defer resp.Body.Close()

	log.Printf("[WEBHOOK] Response status: %d", resp.StatusCode)
	return nil
}

func (s *Sender) SendMessage(sessionID, clientID string, data MessageData) error {
	return s.Send(Event{
		Type:      "message",
		SessionID: sessionID,
		ClientID:  clientID,
		Timestamp: time.Now().Unix(),
		Data:      data,
	})
}

func (s *Sender) SendStatus(sessionID, clientID string, data StatusData) error {
	return s.Send(Event{
		Type:      "status",
		SessionID: sessionID,
		ClientID:  clientID,
		Timestamp: time.Now().Unix(),
		Data:      data,
	})
}

func (s *Sender) SendConnection(sessionID, clientID string, data ConnectionData) error {
	return s.Send(Event{
		Type:      "connection",
		SessionID: sessionID,
		ClientID:  clientID,
		Timestamp: time.Now().Unix(),
		Data:      data,
	})
}
