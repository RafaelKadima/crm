package whatsapp

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/proto"

	"whatsapp-api/internal/store"
	"whatsapp-api/internal/webhook"
)

type Client struct {
	ID        string
	ClientID  string
	WAClient  *whatsmeow.Client
	Store     *store.PostgresStore
	Webhook   *webhook.Sender
	QRChannel chan string
	Connected bool
	mu        sync.RWMutex
}

func NewClient(id, clientID string, device *whatsmeow.Client, store *store.PostgresStore, webhookSender *webhook.Sender) *Client {
	client := &Client{
		ID:        id,
		ClientID:  clientID,
		WAClient:  device,
		Store:     store,
		Webhook:   webhookSender,
		QRChannel: make(chan string, 1),
		Connected: false,
	}

	device.AddEventHandler(client.handleEvent)
	return client
}

func (c *Client) handleEvent(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		c.handleMessage(v)
	case *events.Receipt:
		c.handleReceipt(v)
	case *events.Connected:
		c.handleConnected()
	case *events.Disconnected:
		c.handleDisconnected()
	case *events.LoggedOut:
		c.handleLoggedOut()
	}
}

func (c *Client) handleMessage(msg *events.Message) {
	// Ignorar mensagens de status/broadcast
	if msg.Info.Chat.Server == "broadcast" {
		return
	}

	data := webhook.MessageData{
		MessageID: msg.Info.ID,
		From:      msg.Info.Sender.User,
		To:        msg.Info.Chat.User,
		IsFromMe:  msg.Info.IsFromMe,
		IsGroup:   msg.Info.IsGroup,
		PushName:  msg.Info.PushName,
	}

	if msg.Info.IsGroup {
		ctx := context.Background()
		groupInfo, err := c.WAClient.GetGroupInfo(ctx, msg.Info.Chat)
		if err == nil {
			data.GroupName = groupInfo.Name
		}
	}

	// Extrair conteúdo da mensagem
	if msg.Message.GetConversation() != "" {
		data.Type = "text"
		data.Body = msg.Message.GetConversation()
	} else if msg.Message.GetExtendedTextMessage() != nil {
		data.Type = "text"
		data.Body = msg.Message.GetExtendedTextMessage().GetText()
		if msg.Message.GetExtendedTextMessage().GetContextInfo() != nil {
			data.QuotedMsgID = msg.Message.GetExtendedTextMessage().GetContextInfo().GetStanzaID()
		}
	} else if msg.Message.GetImageMessage() != nil {
		data.Type = "image"
		data.Body = msg.Message.GetImageMessage().GetCaption()
		data.MimeType = msg.Message.GetImageMessage().GetMimetype()
		// Download e salvar mídia
		ctx := context.Background()
		mediaData, err := c.WAClient.Download(ctx, msg.Message.GetImageMessage())
		if err == nil {
			data.MediaURL = c.saveMedia(msg.Info.ID, data.MimeType, mediaData)
		}
	} else if msg.Message.GetDocumentMessage() != nil {
		data.Type = "document"
		data.Body = msg.Message.GetDocumentMessage().GetCaption()
		data.FileName = msg.Message.GetDocumentMessage().GetFileName()
		data.MimeType = msg.Message.GetDocumentMessage().GetMimetype()
		ctx := context.Background()
		mediaData, err := c.WAClient.Download(ctx, msg.Message.GetDocumentMessage())
		if err == nil {
			data.MediaURL = c.saveMedia(msg.Info.ID, data.MimeType, mediaData)
		}
	} else if msg.Message.GetAudioMessage() != nil {
		data.Type = "audio"
		data.MimeType = msg.Message.GetAudioMessage().GetMimetype()
		ctx := context.Background()
		mediaData, err := c.WAClient.Download(ctx, msg.Message.GetAudioMessage())
		if err == nil {
			data.MediaURL = c.saveMedia(msg.Info.ID, data.MimeType, mediaData)
		}
	} else if msg.Message.GetVideoMessage() != nil {
		data.Type = "video"
		data.Body = msg.Message.GetVideoMessage().GetCaption()
		data.MimeType = msg.Message.GetVideoMessage().GetMimetype()
		ctx := context.Background()
		mediaData, err := c.WAClient.Download(ctx, msg.Message.GetVideoMessage())
		if err == nil {
			data.MediaURL = c.saveMedia(msg.Info.ID, data.MimeType, mediaData)
		}
	}

	c.Webhook.SendMessage(c.ID, c.ClientID, data)
}

func (c *Client) handleReceipt(receipt *events.Receipt) {
	var status string
	switch receipt.Type {
	case types.ReceiptTypeDelivered:
		status = "delivered"
	case types.ReceiptTypeRead:
		status = "read"
	default:
		return
	}

	for _, msgID := range receipt.MessageIDs {
		c.Webhook.SendStatus(c.ID, c.ClientID, webhook.StatusData{
			MessageID: msgID,
			Status:    status,
			To:        receipt.Chat.User,
		})
	}
}

func (c *Client) handleConnected() {
	c.mu.Lock()
	c.Connected = true
	c.mu.Unlock()

	phoneNumber := ""
	if c.WAClient.Store.ID != nil {
		phoneNumber = c.WAClient.Store.ID.User
	}

	c.Store.SaveSession(c.ID, c.ClientID, phoneNumber, true)
	c.Webhook.SendConnection(c.ID, c.ClientID, webhook.ConnectionData{
		Status:      "connected",
		PhoneNumber: phoneNumber,
	})
}

func (c *Client) handleDisconnected() {
	c.mu.Lock()
	c.Connected = false
	c.mu.Unlock()

	c.Store.SaveSession(c.ID, c.ClientID, "", false)
	c.Webhook.SendConnection(c.ID, c.ClientID, webhook.ConnectionData{
		Status: "disconnected",
	})
}

func (c *Client) handleLoggedOut() {
	c.mu.Lock()
	c.Connected = false
	c.mu.Unlock()

	c.Store.DeleteSession(c.ID)
	c.Webhook.SendConnection(c.ID, c.ClientID, webhook.ConnectionData{
		Status: "logged_out",
	})
}

func (c *Client) Connect(ctx context.Context) error {
	if c.WAClient.Store.ID == nil {
		// Novo device - precisa QR code
		qrChan, _ := c.WAClient.GetQRChannel(ctx)
		err := c.WAClient.Connect()
		if err != nil {
			return err
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					// Gerar QR code como base64
					png, err := qrcode.Encode(evt.Code, qrcode.Medium, 256)
					if err == nil {
						qrBase64 := base64.StdEncoding.EncodeToString(png)
						select {
						case c.QRChannel <- qrBase64:
						default:
						}
						c.Webhook.SendConnection(c.ID, c.ClientID, webhook.ConnectionData{
							Status: "qr_ready",
							QRCode: qrBase64,
						})
					}
				}
			}
		}()
	} else {
		// Device existente - reconectar
		err := c.WAClient.Connect()
		if err != nil {
			return err
		}
	}

	return nil
}

func (c *Client) Disconnect() {
	c.WAClient.Disconnect()
}

func (c *Client) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Connected && c.WAClient.IsConnected()
}

func (c *Client) SendText(to, text string) (string, error) {
	jid, err := types.ParseJID(to + "@s.whatsapp.net")
	if err != nil {
		return "", err
	}

	msg := &waE2E.Message{
		Conversation: proto.String(text),
	}

	resp, err := c.WAClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

func (c *Client) SendImage(to string, imageData []byte, caption, mimeType string) (string, error) {
	jid, err := types.ParseJID(to + "@s.whatsapp.net")
	if err != nil {
		return "", err
	}

	uploaded, err := c.WAClient.Upload(context.Background(), imageData, whatsmeow.MediaImage)
	if err != nil {
		return "", fmt.Errorf("failed to upload image: %w", err)
	}

	msg := &waE2E.Message{
		ImageMessage: &waE2E.ImageMessage{
			URL:           proto.String(uploaded.URL),
			DirectPath:    proto.String(uploaded.DirectPath),
			MediaKey:      uploaded.MediaKey,
			Mimetype:      proto.String(mimeType),
			FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256:    uploaded.FileSHA256,
			FileLength:    proto.Uint64(uint64(len(imageData))),
			Caption:       proto.String(caption),
		},
	}

	resp, err := c.WAClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

func (c *Client) SendDocument(to string, docData []byte, filename, caption, mimeType string) (string, error) {
	jid, err := types.ParseJID(to + "@s.whatsapp.net")
	if err != nil {
		return "", err
	}

	uploaded, err := c.WAClient.Upload(context.Background(), docData, whatsmeow.MediaDocument)
	if err != nil {
		return "", fmt.Errorf("failed to upload document: %w", err)
	}

	msg := &waE2E.Message{
		DocumentMessage: &waE2E.DocumentMessage{
			URL:           proto.String(uploaded.URL),
			DirectPath:    proto.String(uploaded.DirectPath),
			MediaKey:      uploaded.MediaKey,
			Mimetype:      proto.String(mimeType),
			FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256:    uploaded.FileSHA256,
			FileLength:    proto.Uint64(uint64(len(docData))),
			FileName:      proto.String(filename),
			Caption:       proto.String(caption),
		},
	}

	resp, err := c.WAClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

func (c *Client) saveMedia(msgID, mimeType string, data []byte) string {
	// Criar diretório de mídia se não existir
	mediaDir := "/app/data/media"
	os.MkdirAll(mediaDir, 0755)

	ext := getExtension(mimeType)
	filename := fmt.Sprintf("%s_%d%s", msgID, time.Now().Unix(), ext)
	filepath := fmt.Sprintf("%s/%s", mediaDir, filename)

	os.WriteFile(filepath, data, 0644)

	// Retornar URL relativa (você pode configurar um endpoint para servir esses arquivos)
	return fmt.Sprintf("/media/%s", filename)
}

func getExtension(mimeType string) string {
	switch mimeType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "audio/ogg; codecs=opus":
		return ".ogg"
	case "audio/mpeg":
		return ".mp3"
	case "video/mp4":
		return ".mp4"
	case "application/pdf":
		return ".pdf"
	default:
		return ".bin"
	}
}
