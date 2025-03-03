// internal/websocket/handler.go
package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"hashhedge/internal/models"
	"hashhedge/internal/orderbook"
)

// Client represents a WebSocket client
type Client struct {
	conn     *websocket.Conn
	send     chan interface{}
	channels map[string]bool
}

// Server manages WebSocket connections and subscriptions
type Server struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan interface{}
	mu         sync.RWMutex
}

// NewWebSocketServer creates a new WebSocket server
func NewWebSocketServer() *Server {
	return &Server{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan interface{}, 256),
	}
}

// Run starts the WebSocket server management loop
func (s *Server) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case client := <-s.register:
			s.mu.Lock()
			s.clients[client] = true
			s.mu.Unlock()
		case client := <-s.unregister:
			s.mu.Lock()
			if _, ok := s.clients[client]; ok {
				delete(s.clients, client)
				close(client.send)
			}
			s.mu.Unlock()
		case message := <-s.broadcast:
			s.mu.RLock()
			for client := range s.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(s.clients, client)
				}
			}
			s.mu.RUnlock()
		}
	}
}

// Upgrade handles WebSocket connection upgrades
func (s *Server) Upgrade(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	var upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// In production, implement proper origin checking
			return true
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		conn:     conn,
		send:     make(chan interface{}, 256),
		channels: make(map[string]bool),
	}

	s.register <- client

	go s.handleClient(ctx, client)
}

// handleClient manages individual WebSocket client connections
func (s *Server) handleClient(ctx context.Context, client *Client) {
	defer func() {
		s.unregister <- client
		client.conn.Close()
	}()

	// Handle incoming messages
	go func() {
		for {
			_, message, err := client.conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				return
			}

			var msg struct {
				Type    string   `json:"type"`
				Channels []string `json:"channels"`
			}

			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("WebSocket message parse error: %v", err)
				continue
			}

			switch msg.Type {
			case "subscribe":
				s.mu.Lock()
				for _, channel := range msg.Channels {
					client.channels[channel] = true
				}
				s.mu.Unlock()
			case "unsubscribe":
				s.mu.Lock()
				for _, channel := range msg.Channels {
					delete(client.channels, channel)
				}
				s.mu.Unlock()
			}
		}
	}()

	// Send messages to client
	for {
		select {
		case <-ctx.Done():
			return
		case message, ok := <-client.send:
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := client.conn.WriteJSON(message)
			if err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}

// BroadcastTradeEvent sends trade events to subscribed clients
func (s *Server) BroadcastTradeEvent(trade *models.Trade, contract *models.Contract) {
	event := models.TradeEvent{
		ID:             trade.ID,
		ContractID:     contract.ID,
		ContractType:   contract.ContractType,
		StrikeHashRate: contract.StrikeHashRate,
		Price:          trade.Price,
		Quantity:       trade.Quantity,
		ExecutedAt:     trade.ExecutedAt,
	}

	s.broadcast <- map[string]interface{}{
		"type":    "trade",
		"payload": event,
	}
}

// SetupWebSocketIntegration connects WebSocket server to order book
func SetupWebSocketIntegration(orderBook *orderbook.OrderBook, wsServer *Server) {
	// Create a channel for trade events
	tradeEventChan := make(chan models.TradeEvent, 100)
	
	// Set the event publisher in the order book
	orderBook.SetEventPublisher(tradeEventChan)

	// Start a goroutine to handle trade events
	go func() {
		for {
			select {
			case tradeEvent := <-tradeEventChan:
				// Find the corresponding contract (this would typically be done via database lookup)
				// For this example, we'll create a minimal contract object
				contract := &models.Contract{
					ID:             tradeEvent.ContractID,
					ContractType:   tradeEvent.ContractType,
					StrikeHashRate: tradeEvent.StrikeHashRate,
				}

				wsServer.BroadcastTradeEvent(&models.Trade{
					ID:           tradeEvent.ID,
					ContractID:   tradeEvent.ContractID,
					Price:        tradeEvent.Price,
					Quantity:     tradeEvent.Quantity,
					ExecutedAt:   tradeEvent.ExecutedAt.String(),
				}, contract)
			}
		}
	}()
}
