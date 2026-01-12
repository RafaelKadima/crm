# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Instalar dependências de compilação
RUN apk add --no-cache gcc musl-dev

# Copiar go.mod e go.sum
COPY go.mod go.sum* ./

# Download dependências
RUN go mod download

# Copiar código fonte
COPY . .

# Compilar
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o whatsapp-api ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Instalar certificados SSL e timezone
RUN apk add --no-cache ca-certificates tzdata

# Criar diretórios necessários
RUN mkdir -p /app/data/media

# Copiar binário
COPY --from=builder /build/whatsapp-api .

# Expor porta
EXPOSE 3000

# Volume para dados persistentes
VOLUME ["/app/data"]

# Executar
CMD ["./whatsapp-api"]
