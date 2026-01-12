package api

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"

	"whatsapp-api/internal/whatsapp"
)

type Handler struct {
	manager *whatsapp.Manager
}

func NewHandler(manager *whatsapp.Manager) *Handler {
	return &Handler{manager: manager}
}

// HealthCheck verifica se a API está funcionando
func (h *Handler) HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
		"time":   time.Now().Unix(),
	})
}

// CreateSession cria uma nova sessão WhatsApp para um cliente
func (h *Handler) CreateSession(c *fiber.Ctx) error {
	var req struct {
		ClientID string `json:"client_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.ClientID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "client_id is required"})
	}

	client, err := h.manager.CreateSession(req.ClientID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"session_id": client.ID,
		"client_id":  client.ClientID,
		"status":     "created",
	})
}

// ConnectSession conecta uma sessão existente
func (h *Handler) ConnectSession(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	if client.IsConnected() {
		return c.JSON(fiber.Map{
			"status":       "already_connected",
			"phone_number": client.WAClient.Store.ID.User,
		})
	}

	ctx := context.Background()
	if err := client.Connect(ctx); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Aguardar QR code ou conexão (timeout 10s)
	select {
	case qr := <-client.QRChannel:
		return c.JSON(fiber.Map{
			"status":  "qr_ready",
			"qr_code": qr,
		})
	case <-time.After(10 * time.Second):
		if client.IsConnected() {
			return c.JSON(fiber.Map{
				"status":       "connected",
				"phone_number": client.WAClient.Store.ID.User,
			})
		}
		return c.JSON(fiber.Map{
			"status":  "connecting",
			"message": "connection in progress, check webhook for updates",
		})
	}
}

// GetQRCode retorna o QR code atual para uma sessão
func (h *Handler) GetQRCode(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	if client.IsConnected() {
		return c.JSON(fiber.Map{
			"status":       "already_connected",
			"phone_number": client.WAClient.Store.ID.User,
		})
	}

	// Tentar obter QR code com timeout
	select {
	case qr := <-client.QRChannel:
		return c.JSON(fiber.Map{
			"status":  "qr_ready",
			"qr_code": qr,
		})
	case <-time.After(30 * time.Second):
		return c.Status(408).JSON(fiber.Map{"error": "qr code timeout"})
	}
}

// DisconnectSession desconecta uma sessão
func (h *Handler) DisconnectSession(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	client.Disconnect()

	return c.JSON(fiber.Map{
		"status": "disconnected",
	})
}

// DeleteSession remove uma sessão permanentemente
func (h *Handler) DeleteSession(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	if err := h.manager.DeleteSession(sessionID); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status": "deleted",
	})
}

// GetSessionStatus retorna o status de uma sessão
func (h *Handler) GetSessionStatus(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	phoneNumber := ""
	if client.WAClient.Store.ID != nil {
		phoneNumber = client.WAClient.Store.ID.User
	}

	return c.JSON(fiber.Map{
		"session_id":   client.ID,
		"client_id":    client.ClientID,
		"connected":    client.IsConnected(),
		"phone_number": phoneNumber,
	})
}

// ListSessions lista todas as sessões
func (h *Handler) ListSessions(c *fiber.Ctx) error {
	sessions := h.manager.ListSessions()
	return c.JSON(fiber.Map{
		"sessions": sessions,
		"total":    len(sessions),
	})
}

// SendText envia mensagem de texto
func (h *Handler) SendText(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	var req struct {
		To   string `json:"to"`
		Text string `json:"text"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.To == "" || req.Text == "" {
		return c.Status(400).JSON(fiber.Map{"error": "to and text are required"})
	}

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	if !client.IsConnected() {
		return c.Status(400).JSON(fiber.Map{"error": "session not connected"})
	}

	msgID, err := client.SendText(req.To, req.Text)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":     "sent",
		"message_id": msgID,
	})
}

// SendImage envia imagem
func (h *Handler) SendImage(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	if !client.IsConnected() {
		return c.Status(400).JSON(fiber.Map{"error": "session not connected"})
	}

	to := c.FormValue("to")
	caption := c.FormValue("caption")

	if to == "" {
		return c.Status(400).JSON(fiber.Map{"error": "to is required"})
	}

	// Tentar obter imagem do form ou do body JSON
	var imageData []byte
	var mimeType string

	file, err := c.FormFile("image")
	if err == nil {
		// Upload via multipart form
		f, err := file.Open()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "failed to read image"})
		}
		defer f.Close()

		imageData, _ = io.ReadAll(f)
		mimeType = file.Header.Get("Content-Type")
	} else {
		// Tentar via JSON com base64
		var req struct {
			To       string `json:"to"`
			Image    string `json:"image"` // base64
			Caption  string `json:"caption"`
			MimeType string `json:"mime_type"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "image is required (form upload or base64)"})
		}
		to = req.To
		caption = req.Caption
		mimeType = req.MimeType
		imageData, _ = base64.StdEncoding.DecodeString(req.Image)
	}

	if len(imageData) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "image data is empty"})
	}

	if mimeType == "" {
		mimeType = http.DetectContentType(imageData)
	}

	msgID, err := client.SendImage(to, imageData, caption, mimeType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":     "sent",
		"message_id": msgID,
	})
}

// SendDocument envia documento
func (h *Handler) SendDocument(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	client, exists := h.manager.GetSession(sessionID)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	if !client.IsConnected() {
		return c.Status(400).JSON(fiber.Map{"error": "session not connected"})
	}

	to := c.FormValue("to")
	caption := c.FormValue("caption")
	filename := c.FormValue("filename")

	if to == "" {
		return c.Status(400).JSON(fiber.Map{"error": "to is required"})
	}

	var docData []byte
	var mimeType string

	file, err := c.FormFile("document")
	if err == nil {
		f, err := file.Open()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "failed to read document"})
		}
		defer f.Close()

		docData, _ = io.ReadAll(f)
		mimeType = file.Header.Get("Content-Type")
		if filename == "" {
			filename = file.Filename
		}
	} else {
		var req struct {
			To       string `json:"to"`
			Document string `json:"document"` // base64
			Filename string `json:"filename"`
			Caption  string `json:"caption"`
			MimeType string `json:"mime_type"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "document is required"})
		}
		to = req.To
		caption = req.Caption
		filename = req.Filename
		mimeType = req.MimeType
		docData, _ = base64.StdEncoding.DecodeString(req.Document)
	}

	if len(docData) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "document data is empty"})
	}

	if mimeType == "" {
		mimeType = http.DetectContentType(docData)
	}

	msgID, err := client.SendDocument(to, docData, filename, caption, mimeType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":     "sent",
		"message_id": msgID,
	})
}
